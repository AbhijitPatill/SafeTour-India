import { supabase } from '../supabase';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/TouristID';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const GEOFENCES = [
  { id: 1, name: 'Taj Mahal Safe Zone', lat: 27.1751, lng: 78.0421, radius: 500, type: 'safe' },
  { id: 2, name: 'Restricted Area - Agra Fort', lat: 27.1795, lng: 78.0211, radius: 300, type: 'restricted' },
  { id: 3, name: 'Pahalgam Safe Zone', lat: 34.0151, lng: 75.3147, radius: 800, type: 'safe' },
  { id: 4, name: 'Danger Zone - Flood Area', lat: 34.0251, lng: 75.3300, radius: 400, type: 'danger' },
];

const SERVICE_CONFIG = {
  hospital: {
    color: '#60a5fa',
    label: 'Hospital',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z"/></svg>`
  },
  police: {
    color: '#a78bfa',
    label: 'Police Station',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l4 2v3h-2v2h2v1c0 2.61-1.67 5.07-4 6.32C9.67 16.07 8 13.61 8 11v-1h2V8h-2V7l4-2z"/></svg>`
  },
  fire_station: {
    color: '#f97316',
    label: 'Fire Station',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>`
  },
};

function RecenterMap({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView([pos.lat, pos.lng], 15); }, [pos]);
  return null;
}

function LocationTracker({ setUserPos, geofences, setAlerts, setGpsStatus, digitalId, setMlStatus, fetchEmergencyServices, fetchWeather }) {
  useEffect(() => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setGpsStatus('searching');
    let prevPos = null;
    let timeInZone = 0;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserPos({ lat, lng });
        setGpsStatus('active');

        if (!prevPos) {
          fetchEmergencyServices(lat, lng);
          fetchWeather(lat, lng);
        }

        if (digitalId?.tokenId) {
          await supabase.from('tourists').update({ lat, lng }).eq('token_id', digitalId.tokenId);
        }

        let speed = 0;
        if (prevPos) {
          const dist = Math.sqrt(Math.pow((lat - prevPos.lat) * 111000, 2) + Math.pow((lng - prevPos.lng) * 111000, 2));
          speed = dist / 10 * 3.6;
        }
        prevPos = { lat, lng };

        geofences.forEach(zone => {
          const dist = Math.sqrt(Math.pow((lat - zone.lat) * 111000, 2) + Math.pow((lng - zone.lng) * 111000, 2));
          if (dist < zone.radius) timeInZone += 1;
        });

        try {
          const mlResponse = await fetch('https://safetour-india.onrender.com/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng, speed: position.coords.speed ? position.coords.speed * 3.6 : speed, time_in_zone: timeInZone, activity_type: 0 })
          });
          const mlData = await mlResponse.json();
          setMlStatus({ active: true, anomaly: mlData.is_anomaly, risk: mlData.risk_score });

          if (mlData.is_anomaly) {
            setAlerts(prev => {
              const alreadyFlagged = prev.some(a => a.zone === 'AI Anomaly Detected');
              if (!alreadyFlagged) {
                supabase.from('incidents').insert([{ type: 'AI Anomaly', description: `Suspicious movement detected. Risk Score: ${mlData.risk_score}`, lat, lng, reported_by: digitalId?.name || 'Unknown' }]);
                return [...prev, { id: Date.now(), zone: 'AI Anomaly Detected', type: 'danger', time: new Date().toLocaleTimeString(), message: `Risk: ${mlData.risk_score}` }];
              }
              return prev;
            });
          }
        } catch (err) {
          setMlStatus({ active: false, anomaly: false, risk: 0 });
        }

        geofences.forEach(async (zone) => {
          const dist = Math.sqrt(Math.pow((lat - zone.lat) * 111000, 2) + Math.pow((lng - zone.lng) * 111000, 2));
          if (dist < zone.radius) {
            setAlerts(prev => {
              const alreadyAlerted = prev.some(a => a.zone === zone.name);
              if (!alreadyAlerted) {
                supabase.from('incidents').insert([{ type: zone.type === 'safe' ? 'Safe Zone Entry' : zone.type === 'restricted' ? 'Restricted Zone Entry' : 'Danger Zone Entry', description: `Tourist entered ${zone.name}`, lat, lng, reported_by: digitalId?.name || 'Unknown' }]);
                return [...prev, { id: Date.now(), zone: zone.name, type: zone.type, time: new Date().toLocaleTimeString() }];
              }
              return prev;
            });
          }
        });
      },
      (error) => { console.error('GPS Error:', error); setGpsStatus('error'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function TouristApp() {
  // FIX 1: removed servicesLoading (unused) — setServicesLoading kept inside fetchEmergencyServices only
  // FIX 2: renamed error → mintError so it's used in JSX (no more alert-only pattern)
  const [mintError, setMintError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [digitalId, setDigitalId] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ name: '', nationality: '', idType: 'Aadhaar', idNumber: '' });
  const [step, setStep] = useState('connect');
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [mlStatus, setMlStatus] = useState({ active: false, anomaly: false, risk: 0 });
  const [mapDark, setMapDark] = useState(true);
  const [emergencyServices, setEmergencyServices] = useState([]);
  const [weather, setWeather] = useState(null);

  const fetchEmergencyServices = async (lat, lng) => {
    const radius = 5000;
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="fire_station"](around:${radius},${lat},${lng});
      );
      out body;
    `;
    try {
      const res = await fetch('https://maps.mail.ru/osm/tools/overpass/api/interpreter', {
        method: 'POST',
        body: query,
      });
      const data = await res.json();
      const services = data.elements.map(el => ({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        type: el.tags.amenity,
        name: el.tags.name || SERVICE_CONFIG[el.tags.amenity]?.label || el.tags.amenity,
      }));
      setEmergencyServices(services.slice(0, 20));
    } catch (err) {
      console.error('Overpass fetch failed:', err);
    }
  };

  const fetchWeather = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=47f86829b3371e87d31a80b0e66f5350&units=metric`
      );
      const data = await res.json();
      setWeather({
        temp: Math.round(data.main.temp),
        feels: Math.round(data.main.feels_like),
        condition: data.weather[0].main,
        desc: data.weather[0].description,
        humidity: data.main.humidity,
        wind: Math.round(data.wind.speed * 3.6),
        icon: data.weather[0].icon,
      });
    } catch (err) {
      console.error('Weather fetch failed:', err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) { alert('MetaMask not found! Please install MetaMask.'); return; }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const connectedWallet = accounts[0];

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0xaa36a7') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            });
          } else {
            throw switchErr;
          }
        }
      }

      setWallet(connectedWallet);
      const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/n10eM18VGMrvNFTr9Fbba');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const alreadyRegistered = await contract.isRegistered(connectedWallet);
      if (alreadyRegistered) {
        const tourist = await contract.getTouristByWallet(connectedWallet);
        setDigitalId({
          walletAddress: connectedWallet,
          name: tourist.name,
          nationality: tourist.nationality,
          idType: tourist.idType,
          idNumber: tourist.idNumber,
          tokenId: '#TID-' + tourist.tokenId.toString(),
          issuedAt: new Date(Number(tourist.issuedAt) * 1000).toISOString(),
          txHash: 'On-chain ✅'
        });
        setStep('map');
      } else {
        setStep('register');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const generateDigitalId = async () => {
    if (!form.name || !form.nationality || !form.idNumber) { setMintError('Please fill all fields.'); return; }
    setSaving(true); setMintError('');
    try {
      const res = await fetch('https://safetour-india.onrender.com/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: wallet,
          name: form.name,
          nationality: form.nationality,
          id_type: form.idType,
          id_number: form.idNumber,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMintError('Minting failed: ' + (data.error || 'Unknown error'));
        setSaving(false); return;
      }
      const id = {
        walletAddress: wallet,
        name: form.name,
        nationality: form.nationality,
        idType: form.idType,
        idNumber: form.idNumber,
        tokenId: '#TID-' + data.token_id,
        issuedAt: new Date().toISOString(),
        txHash: data.tx_hash,
      };
      const { error: dbError } = await supabase.from('tourists').insert([{
        name: form.name,
        aadhaar: form.idNumber,
        wallet_address: wallet,
        token_id: id.tokenId,
        lat: null, lng: null
      }]);
      setSaving(false);
      if (dbError) { setMintError('Failed to save: ' + dbError.message); return; }
      setDigitalId(id);
      setStep('map');
    } catch (err) {
      setSaving(false);
      setMintError('Error: ' + err.message);
    }
  };

  const sendSOS = async () => {
    if (!userPos) { alert('⚠️ GPS not active yet!'); return; }
    if (!window.confirm('Send SOS Emergency Alert to authorities? Your exact location will be shared!')) return;
    const { error } = await supabase.from('sos_alerts').insert([{ tourist_name: digitalId.name, token_id: digitalId.tokenId, wallet_address: digitalId.walletAddress, lat: userPos.lat, lng: userPos.lng, status: 'active' }]);
    if (error) alert('❌ Failed to send SOS: ' + error.message);
    else setSosSent(true);
  };

  const handleLogout = async () => {
    localStorage.removeItem('st_user');
    localStorage.removeItem('st_role');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const gpsColor = gpsStatus === 'active' ? '#22c55e' : gpsStatus === 'searching' ? '#f59e0b' : gpsStatus === 'error' ? '#ef4444' : '#52525b';
  const gpsLabel = gpsStatus === 'active' ? 'GPS Active' : gpsStatus === 'searching' ? 'Searching...' : gpsStatus === 'error' ? 'GPS Error' : 'GPS Idle';

  const hospitalCount = emergencyServices.filter(s => s.type === 'hospital').length;
  const policeCount = emergencyServices.filter(s => s.type === 'police').length;
  const fireCount = emergencyServices.filter(s => s.type === 'fire_station').length;

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #09090b; --surface: #18181b; --surface2: #27272a;
          --border: #27272a; --border-light: #3f3f46;
          --text-1: #fafafa; --text-2: #a1a1aa; --text-3: #52525b;
          --blue: #3b82f6; --green: #22c55e; --red: #ef4444; --amber: #f59e0b;
        }
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%       { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .tourist-input {
          width: 100%; padding: 10px 13px;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-1);
          font-family: 'Outfit', sans-serif; font-size: 14px;
          outline: none; transition: border-color 0.15s; margin-bottom: 10px;
        }
        .tourist-input:focus { border-color: var(--blue); }
        .tourist-input::placeholder { color: var(--text-3); }
        .tourist-select {
          width: 100%; padding: 10px 13px;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-1);
          font-family: 'Outfit', sans-serif; font-size: 14px;
          outline: none; transition: border-color 0.15s;
          margin-bottom: 10px; cursor: pointer; appearance: none;
        }
        .tourist-select:focus { border-color: var(--blue); }
        .tourist-select option { background: #18181b; }
        .btn-primary {
          width: 100%; padding: 11px 20px;
          background: var(--blue); color: #fff;
          border: 1px solid var(--blue); border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; margin-top: 4px;
        }
        .btn-primary:hover { background: #2563eb; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-sos {
          width: 100%; padding: 14px 20px;
          background: var(--red); color: #fff; border: none;
          border-radius: 10px; font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 700; cursor: pointer;
          letter-spacing: 0.3px; animation: sos-pulse 2s infinite; transition: all 0.2s;
        }
        .btn-sos:hover { background: #dc2626; transform: scale(1.01); }
        .btn-sos.sent { background: #166534; animation: none; border: 1px solid #22c55e; }
        .btn-sos:disabled { cursor: not-allowed; }
        .map-toggle-btn {
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500;
          padding: 5px 12px; border-radius: 7px; cursor: pointer; transition: all 0.15s; outline: none;
        }
        .alert-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
          margin-bottom: 8px; animation: fadeIn 0.3s ease both;
        }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 2px; }
        .id-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .id-field { padding: 10px 12px; border-bottom: 1px solid var(--border); }
        .id-field:nth-child(odd) { border-right: 1px solid var(--border); }
        .id-field-full { padding: 10px 12px; border-bottom: 1px solid var(--border); }
        .id-field:last-child, .id-field-full:last-child { border-bottom: none; }
        .leaflet-popup-content-wrapper {
          background: #18181b !important; border: 1px solid #27272a !important;
          border-radius: 8px !important; color: #fafafa !important;
          font-family: 'Outfit', sans-serif !important; font-size: 13px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
        }
        .leaflet-popup-tip { background: #18181b !important; }
        .leaflet-popup-content b { color: #fafafa; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <div style={s.logoBox}>🛡️</div>
          <span style={s.logoText}>SafeTour <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>India</span></span>
          <span style={s.portalBadge}>Tourist Portal</span>
        </div>
        <div style={s.navRight}>
          {mlStatus.active && (
            <div style={{ ...s.statusChip, borderColor: mlStatus.anomaly ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)', background: mlStatus.anomaly ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: mlStatus.anomaly ? '#ef4444' : '#22c55e', flexShrink: 0 }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: mlStatus.anomaly ? '#ef4444' : '#22c55e' }}>
                AI {mlStatus.anomaly ? `ANOMALY · ${mlStatus.risk ?? 'N/A'}` : `Normal · ${typeof mlStatus.risk === 'number' ? mlStatus.risk.toFixed(2) : '0.00'}`}
              </span>
            </div>
          )}
          {gpsStatus !== 'idle' && (
            <div style={{ ...s.statusChip, borderColor: `${gpsColor}44`, background: `${gpsColor}10` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: gpsColor, flexShrink: 0 }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: gpsColor }}>{gpsLabel}</span>
            </div>
          )}
          <button className="map-toggle-btn" style={{ color: mapDark ? '#f59e0b' : '#a1a1aa', background: mapDark ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${mapDark ? 'rgba(245,158,11,0.25)' : '#27272a'}` }} onClick={() => setMapDark(p => !p)}>
            {mapDark ? '🌙 Dark Map' : '☀️ Light Map'}
          </button>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div style={s.body}>
        <aside style={s.sidebar} className="sidebar-scroll">

          {/* STEP: Connect */}
          {step === 'connect' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={s.sideSection}>
                <p style={s.sectionEyebrow}>Step 1 of 2</p>
                <h2 style={s.sectionTitle}>Connect your wallet</h2>
                <p style={s.sectionDesc}>Link your MetaMask wallet to create a blockchain-verified Digital Tourist ID on Ethereum Sepolia.</p>
              </div>
              <div style={s.infoBox}>
                {[
                  { icon: '🔗', title: 'Blockchain Identity', desc: 'Your ID is minted as an NFT — permanent and tamper-proof' },
                  { icon: '📡', title: 'Live Protection', desc: 'GPS tracking and AI monitoring activate instantly' },
                  { icon: '🆘', title: 'SOS Emergency', desc: 'One tap sends your location to authorities' },
                ].map((item, i) => (
                  <div key={i} style={{ ...s.infoRow, borderBottom: i < 2 ? '1px solid #27272a' : 'none' }}>
                    <span style={s.infoIcon}>{item.icon}</span>
                    <div><p style={s.infoTitle}>{item.title}</p><p style={s.infoDesc}>{item.desc}</p></div>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary"
                onClick={connectWallet}
                disabled={connecting}
                style={{ marginTop: '20px', opacity: connecting ? 0.7 : 1 }}
              >
                {connecting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Checking blockchain...
                  </span>
                ) : 'Connect MetaMask →'}
              </button>
            </div>
          )}

          {/* STEP: Register */}
          {step === 'register' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={s.sideSection}>
                <p style={s.sectionEyebrow}>Step 2 of 2</p>
                <h2 style={s.sectionTitle}>Register Tourist ID</h2>
                <p style={s.sectionDesc}>Fill your details to mint a Digital ID on Ethereum. No gas fees required.</p>
              </div>
              <div style={s.walletRow}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)' }}>Connected wallet</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#60a5fa' }}>{wallet?.slice(0, 6)}...{wallet?.slice(-4)}</span>
              </div>

              {/* FIX 2: mintError shown in JSX — no more unused state warning */}
              {mintError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginTop: '12px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Outfit', fontSize: '13px', color: '#ef4444' }}>{mintError}</span>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <label style={s.inputLabel}>Full Name</label>
                <input id="name" name="name" className="tourist-input" placeholder="e.g. Arjun Sharma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <label style={s.inputLabel}>Nationality</label>
                <input id="nationality" name="nationality" className="tourist-input" placeholder="e.g. Indian" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
                <label style={s.inputLabel}>ID Type</label>
                <select id="idType" name="idType" className="tourist-select" value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })}>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">Driving License</option>
                  <option value="PAN Card">PAN Card</option>
                </select>
                <label style={s.inputLabel}>{form.idType} Number</label>
                <input id="idNumber" name="idNumber" className="tourist-input" placeholder={`Enter ${form.idType} number`} value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
              </div>
              <button className="btn-primary" onClick={generateDigitalId} disabled={saving}>
                {saving ? '⏳ Minting on Blockchain...' : 'Mint Digital ID →'}
              </button>
            </div>
          )}

          {/* STEP: Map / Active */}
          {step === 'map' && digitalId && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>

              {/* Digital ID Card */}
              <div style={s.idCardWrap}>
                <div style={s.idCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={s.logoBox}>🛡️</div>
                    <div>
                      <p style={{ fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Digital Tourist ID</p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-3)', margin: 0 }}>Ethereum Sepolia</p>
                    </div>
                  </div>
                  <span style={s.verifiedBadge}>VERIFIED</span>
                </div>
                <div style={s.idCardBody}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>{digitalId.name}</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-2)', margin: '0 0 16px' }}>{digitalId.nationality}</p>
                  <div className="id-card-grid">
                    <div className="id-field"><p style={s.idFieldLabel}>Token ID</p><p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#60a5fa', margin: 0 }}>{digitalId.tokenId}</p></div>
                    <div className="id-field"><p style={s.idFieldLabel}>{digitalId.idType}</p><p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-1)', margin: 0 }}>{digitalId.idNumber}</p></div>
                    <div className="id-field-full"><p style={s.idFieldLabel}>Wallet</p><p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-2)', margin: 0 }}>{digitalId.walletAddress?.slice(0, 12)}...{digitalId.walletAddress?.slice(-6)}</p></div>
                    <div className="id-field-full" style={{ borderBottom: 'none' }}><p style={s.idFieldLabel}>Tx Hash</p><p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#a78bfa', margin: 0 }}>{digitalId.txHash === 'On-chain ✅' ? 'On-chain ✅' : digitalId.txHash?.slice(0, 24) + '...'}</p></div>
                  </div>
                </div>
              </div>

              {/* GPS + AI Status Row */}
              <div style={s.statusRow}>
                <div style={s.statusBox}>
                  <p style={s.statusBoxLabel}>Location</p>
                  {userPos
                    ? <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#22c55e', margin: 0 }}>{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</p>
                    : <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#f59e0b', margin: 0 }}>Waiting for GPS...</p>
                  }
                </div>
                <div style={{ ...s.statusBox, borderLeft: '1px solid var(--border)' }}>
                  <p style={s.statusBoxLabel}>AI Risk Score</p>
                  {mlStatus.active
                    ? <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: mlStatus.anomaly ? '#ef4444' : '#22c55e', margin: 0 }}>
                        {mlStatus.anomaly ? `⚠ ${mlStatus.risk ?? 'N/A'}` : `✓ ${typeof mlStatus.risk === 'number' ? mlStatus.risk.toFixed(2) : '0.00'}`}
                      </p>
                    : <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>Inactive</p>
                  }
                </div>
              </div>

              {/* Weather Card */}
              {weather && (
                <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '12px 14px', marginTop: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>Weather</p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: '#fafafa', margin: '0 0 2px' }}>{weather.temp}°C</p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '12px', color: '#a1a1aa', margin: 0, textTransform: 'capitalize' }}>{weather.desc}</p>
                    </div>
                    <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.condition} style={{ width: 52, height: 52, filter: 'brightness(1.2)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #27272a' }}>
                    {[
                      { label: 'Feels', value: `${weather.feels}°` },
                      { label: 'Humidity', value: `${weather.humidity}%` },
                      { label: 'Wind', value: `${weather.wind} km/h` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' }}>{label}</p>
                        <p style={{ fontFamily: 'Outfit', fontSize: '13px', fontWeight: 600, color: '#d4d4d8', margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {(weather.condition === 'Thunderstorm' || weather.condition === 'Tornado' || weather.temp > 42 || weather.wind > 60) && (
                    <div style={{ marginTop: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '7px 10px' }}>
                      <p style={{ fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600, color: '#ef4444', margin: 0 }}>⚠ Extreme weather — exercise caution</p>
                    </div>
                  )}
                </div>
              )}

              {/* SOS Button */}
              <div style={{ padding: '16px 0 8px' }}>
                <button className={`btn-sos${sosSent ? ' sent' : ''}`} onClick={sendSOS} disabled={sosSent}>
                  {sosSent ? '✅ SOS Sent — Help is on the way' : '🆘 SEND SOS EMERGENCY'}
                </button>
              </div>

              {/* Nearby Services */}
              {emergencyServices.length > 0 && (
                <div style={s.servicesSection}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontFamily: 'Outfit', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Nearby Services</p>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-3)', background: 'var(--surface2)', padding: '2px 7px', borderRadius: '100px' }}>5 km radius</span>
                  </div>
                  {/* FIX 3: removed cfg.symbol reference — use svg icon instead */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {[
                      { type: 'hospital', count: hospitalCount },
                      { type: 'police', count: policeCount },
                      { type: 'fire_station', count: fireCount },
                    ].map(({ type, count }) => {
                      const cfg = SERVICE_CONFIG[type];
                      return (
                        <div key={type} style={{ background: '#09090b', border: `1px solid ${cfg.color}33`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: cfg.svg.replace('fill="white"', `fill="${cfg.color}"`) }} />
                          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 600, color: cfg.color, margin: '0 0 2px' }}>{count}</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '10px', color: 'var(--text-3)', margin: 0 }}>{cfg.label.split(' ')[0]}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3f3f46', marginTop: '8px', textAlign: 'center' }}>Powered by OpenStreetMap · Coverage may vary</p>
                </div>
              )}

              {/* Zone Alerts */}
              <div style={s.alertsSection}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Zone Alerts</p>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: '100px' }}>{alerts.length}</span>
                </div>
                {alerts.length === 0 && (
                  <div style={s.emptyAlerts}>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>No alerts · GPS tracking active</p>
                  </div>
                )}
                {alerts.map(a => (
                  <div key={a.id} className="alert-chip" style={{ background: a.type === 'safe' ? 'rgba(34,197,94,0.06)' : a.type === 'restricted' ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)', borderColor: a.type === 'safe' ? 'rgba(34,197,94,0.2)' : a.type === 'restricted' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.type === 'safe' ? '#22c55e' : a.type === 'restricted' ? '#f59e0b' : '#ef4444', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Outfit', fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{a.zone}</p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-3)', margin: '2px 0 0' }}>{a.message || a.time}</p>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: a.type === 'safe' ? 'rgba(34,197,94,0.15)' : a.type === 'restricted' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: a.type === 'safe' ? '#22c55e' : a.type === 'restricted' ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>
                      {a.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── MAP ── */}
        <main style={s.mapArea}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              key={mapDark ? 'dark' : 'light'}
              url={mapDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution='© <a href="https://carto.com/">CARTO</a> © OpenStreetMap'
            />
            {GEOFENCES.map(zone => (
              <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={zone.radius}
                pathOptions={{ color: zone.type === 'safe' ? '#22c55e' : zone.type === 'restricted' ? '#f59e0b' : '#ef4444', fillOpacity: 0.15, weight: 2 }}>
                <Popup>{zone.name}</Popup>
              </Circle>
            ))}
            {userPos && (
              <Marker position={[userPos.lat, userPos.lng]}>
                <Popup><b>📍 You are here</b><br />Lat: {userPos.lat.toFixed(5)}<br />Lng: {userPos.lng.toFixed(5)}</Popup>
              </Marker>
            )}
            {emergencyServices.map(service => {
              const cfg = SERVICE_CONFIG[service.type] || { color: '#a1a1aa', label: service.type, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14"><circle cx="12" cy="12" r="6"/></svg>` };
              const customIcon = L.divIcon({
                html: `
                  <div style="position:relative;width:32px;height:38px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 38" width="32" height="38">
                      <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 26 12 26S28 21 28 12C28 5.37 22.63 0 16 0z" fill="${cfg.color}"/>
                      <circle cx="16" cy="12" r="9" fill="rgba(0,0,0,0.25)"/>
                    </svg>
                    <div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);width:18px;height:18px;display:flex;align-items:center;justify-content:center;">${cfg.svg}</div>
                  </div>`,
                className: '',
                iconSize: [32, 38],
                iconAnchor: [16, 38],
                popupAnchor: [0, -40],
              });
              return (
                <Marker key={service.id} position={[service.lat, service.lng]} icon={customIcon}>
                  <Popup>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                      <b style={{ color: '#fafafa', fontFamily: 'Outfit', fontSize: '13px' }}>{service.name}</b>
                    </div>
                    <span style={{ color: '#a1a1aa', fontSize: '12px', fontFamily: 'Outfit', textTransform: 'capitalize' }}>{service.type.replace('_', ' ')}</span><br />
                    <span style={{ color: '#52525b', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>{service.lat.toFixed(4)}, {service.lng.toFixed(4)}</span>
                  </Popup>
                </Marker>
              );
            })}
            {step === 'map' && (
              <LocationTracker
                setUserPos={setUserPos}
                geofences={GEOFENCES}
                setAlerts={setAlerts}
                setGpsStatus={setGpsStatus}
                digitalId={digitalId}
                setMlStatus={setMlStatus}
                fetchEmergencyServices={fetchEmergencyServices}
                fetchWeather={fetchWeather}
              />
            )}
            {userPos && <RecenterMap pos={userPos} />}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}

const s = {
  root: { background: '#09090b', minHeight: '100vh', fontFamily: 'Outfit, sans-serif', color: '#fafafa', display: 'flex', flexDirection: 'column' },
  nav: { height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#09090b', borderBottom: '1px solid #27272a', flexShrink: 0, zIndex: 10 },
  navLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: { width: '30px', height: '30px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 },
  logoText: { fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700, color: '#fafafa' },
  portalBadge: { fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '3px 10px', borderRadius: '100px' },
  statusChip: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '100px', border: '1px solid' },
  logoutBtn: { fontFamily: 'Outfit', fontSize: '13px', fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 14px', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s' },
  body: { display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' },
  sidebar: { width: '340px', padding: '20px', overflowY: 'auto', borderRight: '1px solid #27272a', flexShrink: 0, background: '#09090b' },
  mapArea: { flex: 1, overflow: 'hidden' },
  sideSection: { marginBottom: '20px' },
  sectionEyebrow: { fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 500, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' },
  sectionTitle: { fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: '#fafafa', lineHeight: 1.2, marginBottom: '8px' },
  sectionDesc: { fontFamily: 'Outfit', fontSize: '13px', color: '#71717a', lineHeight: 1.65 },
  infoBox: { background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden' },
  infoRow: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px' },
  infoIcon: { fontSize: '18px', flexShrink: 0, marginTop: '1px' },
  infoTitle: { fontFamily: 'Outfit', fontSize: '13px', fontWeight: 600, color: '#fafafa', margin: '0 0 2px' },
  infoDesc: { fontFamily: 'Outfit', fontSize: '12px', color: '#71717a', margin: 0, lineHeight: 1.5 },
  walletRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '10px 14px' },
  inputLabel: { fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: '5px' },
  idCardWrap: { background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' },
  idCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderBottom: '1px solid #27272a', background: 'rgba(59,130,246,0.04)' },
  idCardBody: { padding: '16px 14px 0' },
  idFieldLabel: { fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 3px' },
  verifiedBadge: { fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '3px 10px', borderRadius: '100px' },
  statusRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden', marginBottom: '4px' },
  statusBox: { padding: '12px 14px' },
  statusBoxLabel: { fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' },
  servicesSection: { background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '12px', marginBottom: '12px', marginTop: '8px' },
  alertsSection: { paddingTop: '8px' },
  emptyAlerts: { background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '14px', textAlign: 'center' },
};