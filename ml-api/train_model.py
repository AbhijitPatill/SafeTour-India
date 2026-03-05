import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

# Load training data
df = pd.read_csv('training_data.csv')
features = ['lat', 'lng', 'speed', 'time_in_zone', 'activity_type']
X = df[features]

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train Isolation Forest
model = IsolationForest(
    n_estimators=100,
    contamination=0.2,   # 20% anomaly rate in training data
    random_state=42
)
model.fit(X_scaled)

# Save model and scaler
joblib.dump(model, 'model.pkl')
joblib.dump(scaler, 'scaler.pkl')

print("✅ Model trained and saved!")

# Quick test
test_normal = scaler.transform([[20.5, 78.9, 5, 30, 0]])
test_anomaly = scaler.transform([[20.5, 78.9, 300, 500, 0]])

print(f"Normal GPS prediction: {'✅ Normal' if model.predict(test_normal)[0] == 1 else '🚨 Anomaly'}")
print(f"Anomalous GPS prediction: {'✅ Normal' if model.predict(test_anomaly)[0] == 1 else '🚨 Anomaly'}")