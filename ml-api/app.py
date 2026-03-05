from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os
from supabase import create_client
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from web3 import Web3
import json

app = Flask(__name__)
CORS(app)

# ── Supabase ──────────────────────────────────────────────
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://wkygsklerlmideywkuyk.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWdza2xlcmxtaWRleXdrdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzM2MzMsImV4cCI6MjA4ODA0OTYzM30.dp3MJhb2xUVS-ZEuOLYzVYThe5ajfJdbNY28YGeZjPQ')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Blockchain Relayer ────────────────────────────────────
CONTRACT_ADDRESS = '0xD5E653dC4494B5e2cB6ff80C9A659672aDb0Efa3'
RELAYER_PRIVATE_KEY = os.environ.get('RELAYER_PRIVATE_KEY', '')
ALCHEMY_URL = 'https://eth-sepolia.g.alchemy.com/v2/n10eM18VGMrvNFTr9Fbba'

CONTRACT_ABI = [
  {"anonymous":False,"inputs":[{"indexed":True,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":True,"internalType":"address","name":"wallet","type":"address"},{"indexed":False,"internalType":"string","name":"name","type":"string"},{"indexed":False,"internalType":"uint256","name":"issuedAt","type":"uint256"}],"name":"TouristIDMinted","type":"event"},
  {"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_nationality","type":"string"},{"internalType":"string","name":"_idType","type":"string"},{"internalType":"string","name":"_idNumber","type":"string"}],"name":"mintTouristID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_wallet","type":"address"}],"name":"isRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_wallet","type":"address"}],"name":"getTouristByWallet","outputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"nationality","type":"string"},{"internalType":"string","name":"idType","type":"string"},{"internalType":"string","name":"idNumber","type":"string"},{"internalType":"address","name":"walletAddress","type":"address"},{"internalType":"uint256","name":"issuedAt","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"internalType":"struct TouristID.Tourist","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"walletToTokenId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
]

def get_web3():
    return Web3(Web3.HTTPProvider(ALCHEMY_URL))

# ── ML Model ──────────────────────────────────────────────
try:
    model = joblib.load('model.pkl')
    scaler = joblib.load('scaler.pkl')
    print('✅ Model loaded successfully!')
except:
    model = None
    scaler = None
    print('⚠️ Model not found!')

# ── Routes ────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'status': 'running', 'model_loaded': model is not None })

@app.route('/mint', methods=['POST'])
def mint():
    try:
        data = request.get_json()
        name = data.get('name')
        nationality = data.get('nationality')
        id_type = data.get('idType')
        id_number = data.get('idNumber')
        wallet_address = data.get('walletAddress')

        if not all([name, nationality, id_type, id_number, wallet_address]):
            return jsonify({ 'success': False, 'error': 'Missing required fields' }), 400

        if not RELAYER_PRIVATE_KEY:
            return jsonify({ 'success': False, 'error': 'Relayer not configured' }), 500

        w3 = get_web3()
        if not w3.is_connected():
            return jsonify({ 'success': False, 'error': 'Blockchain connection failed' }), 500

        # Check if already registered
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=CONTRACT_ABI
        )

        already_registered = contract.functions.isRegistered(
            Web3.to_checksum_address(wallet_address)
        ).call()

        if already_registered:
            tourist = contract.functions.getTouristByWallet(
                Web3.to_checksum_address(wallet_address)
            ).call()
            return jsonify({
                'success': True,
                'already_registered': True,
                'tokenId': f'#TID-{tourist[0]}',
                'txHash': 'On-chain ✅',
                'walletAddress': wallet_address,
                'name': tourist[1],
                'nationality': tourist[2],
                'idType': tourist[3],
                'idNumber': tourist[4],
            })

        # Build transaction from relayer wallet
        relayer = w3.eth.account.from_key(RELAYER_PRIVATE_KEY)
        nonce = w3.eth.get_transaction_count(relayer.address)

        tx = contract.functions.mintTouristID(
            name, nationality, id_type, id_number
        ).build_transaction({
            'from': relayer.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
        })

        # Sign and send
        signed = w3.eth.account.sign_transaction(tx, RELAYER_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        # Parse tokenId from event logs
        token_id = None
        try:
            logs = contract.events.TouristIDMinted().process_receipt(receipt)
            if logs:
                token_id = logs[0]['args']['tokenId']
        except:
            pass

        if token_id is None:
            token_id_raw = contract.functions.walletToTokenId(
                Web3.to_checksum_address(wallet_address)
            ).call()
            token_id = token_id_raw

        tx_hash_str = tx_hash.hex()

        # Save to Supabase
        supabase.table('tourists').insert({
            'name': name,
            'nationality': nationality,
            'id_type': id_type,
            'aadhaar': id_number,
            'wallet_address': wallet_address,
            'token_id': f'#TID-{token_id}',
            'tx_hash': tx_hash_str,
        }).execute()

        return jsonify({
            'success': True,
            'already_registered': False,
            'tokenId': f'#TID-{token_id}',
            'txHash': tx_hash_str,
            'walletAddress': wallet_address,
            'name': name,
            'nationality': nationality,
            'idType': id_type,
            'idNumber': id_number,
        })

    except Exception as e:
        return jsonify({ 'success': False, 'error': str(e) }), 500

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
        response = supabase.table('tourists').select('lat, lng').not_.is_('lat', 'null').not_.is_('lng', 'null').execute()
        real_data = response.data

        if len(real_data) < 10:
            return jsonify({ 'success': False, 'message': f'Not enough data ({len(real_data)} records). Need 10+.' })

        real_df = pd.DataFrame(real_data)
        real_df['speed'] = np.random.uniform(0, 15, len(real_df))
        real_df['time_in_zone'] = np.random.uniform(1, 60, len(real_df))
        real_df['activity_type'] = 0
        real_df['is_anomaly'] = 0

        try:
            synthetic_df = pd.read_csv('training_data.csv')
            combined_df = pd.concat([synthetic_df, real_df[['lat','lng','speed','time_in_zone','activity_type','is_anomaly']]], ignore_index=True)
        except:
            combined_df = real_df[['lat','lng','speed','time_in_zone','activity_type','is_anomaly']]

        X = combined_df[['lat','lng','speed','time_in_zone','activity_type']]
        new_scaler = StandardScaler()
        X_scaled = new_scaler.fit_transform(X)
        new_model = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
        new_model.fit(X_scaled)

        joblib.dump(new_model, 'model.pkl')
        joblib.dump(new_scaler, 'scaler.pkl')
        model = new_model
        scaler = new_scaler
        combined_df.to_csv('training_data.csv', index=False)

        return jsonify({ 'success': True, 'message': f'Retrained on {len(combined_df)} records' })

    except Exception as e:
        return jsonify({ 'success': False, 'error': str(e) })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)