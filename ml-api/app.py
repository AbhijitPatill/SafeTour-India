from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from supabase import create_client
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

# Supabase config
SUPABASE_URL = "https://wkygsklerlmideywkuyk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWdza2xlcmxtaWRleXdrdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzM2MzMsImV4cCI6MjA4ODA0OTYzM30.dp3MJhb2xUVS-ZEuOLYzVYThe5ajfJdbNY28YGeZjPQ"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load model and scaler
try:
    model = joblib.load('model.pkl')
    scaler = joblib.load('scaler.pkl')
    print("✅ Model loaded successfully!")
except:
    model = None
    scaler = None
    print("⚠️ Model not found - run train_model.py first!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'status': 'running', 'model_loaded': model is not None })

@app.route('/detect', methods=['POST'])
def detect():
    if model is None:
        return jsonify({ 'error': 'Model not loaded' }), 500

    data = request.get_json()
    lat = data.get('lat', 0)
    lng = data.get('lng', 0)
    speed = data.get('speed', 0)
    time_in_zone = data.get('time_in_zone', 0)
    activity_type = data.get('activity_type', 0)

    features = scaler.transform([[lat, lng, speed, time_in_zone, activity_type]])
    prediction = model.predict(features)[0]
    score = model.decision_function(features)[0]

    is_anomaly = prediction == -1
    risk_score = round(1 - (score + 0.5), 2)
    risk_score = max(0, min(1, risk_score))

    if activity_type == 1 and speed < 80:
        is_anomaly = False
    if activity_type == 2 and speed < 150:
        is_anomaly = False

    return jsonify({
        'is_anomaly': bool(is_anomaly),
        'risk_score': risk_score,
        'message': '🚨 Suspicious movement detected!' if is_anomaly else '✅ Movement normal',
        'details': {
            'lat': lat, 'lng': lng, 'speed': speed,
            'time_in_zone': time_in_zone,
            'activity_type': ['leisure', 'adventure', 'transit'][int(activity_type)]
        }
    })

@app.route('/retrain', methods=['POST'])
def retrain():
    global model, scaler
    try:
        print("📦 Fetching real GPS data from Supabase...")

        response = supabase.table('tourists').select('lat, lng').not_.is_('lat', 'null').not_.is_('lng', 'null').execute()
        real_data = response.data

        if len(real_data) < 10:
            return jsonify({
                'success': False,
                'message': f'Not enough real data yet ({len(real_data)} records). Need at least 10.'
            })

        print(f"✅ Got {len(real_data)} real GPS records from Supabase!")

        real_df = pd.DataFrame(real_data)
        real_df['speed'] = np.random.uniform(0, 15, len(real_df))
        real_df['time_in_zone'] = np.random.uniform(1, 60, len(real_df))
        real_df['activity_type'] = 0
        real_df['is_anomaly'] = 0

        try:
            synthetic_df = pd.read_csv('training_data.csv')
            combined_df = pd.concat([
                synthetic_df,
                real_df[['lat', 'lng', 'speed', 'time_in_zone', 'activity_type', 'is_anomaly']]
            ], ignore_index=True)
        except:
            combined_df = real_df[['lat', 'lng', 'speed', 'time_in_zone', 'activity_type', 'is_anomaly']]

        print(f"🔁 Retraining on {len(combined_df)} total records...")

        features = ['lat', 'lng', 'speed', 'time_in_zone', 'activity_type']
        X = combined_df[features]

        new_scaler = StandardScaler()
        X_scaled = new_scaler.fit_transform(X)

        new_model = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=42
        )
        new_model.fit(X_scaled)

        joblib.dump(new_model, 'model.pkl')
        joblib.dump(new_scaler, 'scaler.pkl')

        model = new_model
        scaler = new_scaler

        combined_df.to_csv('training_data.csv', index=False)

        return jsonify({
            'success': True,
            'message': f'✅ Model retrained on {len(combined_df)} records ({len(real_data)} real GPS + synthetic)',
            'real_records': len(real_data),
            'total_records': len(combined_df)
        })

    except Exception as e:
        return jsonify({ 'success': False, 'error': str(e) })

if __name__ == '__main__':
    app.run(debug=True, port=5000)