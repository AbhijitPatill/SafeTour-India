import { supabase } from '../supabase';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Please fill all fields.'); return; }
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { setError('Invalid credentials. Access denied.'); return; }
    if (data.user.email !== 'admin@safetour.in') {
      await supabase.auth.signOut();
      setError('Access denied. Authorized personnel only.');
      return;
    }
    navigate('/admin');
  };

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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .admin-input {
          width: 100%; padding: 11px 14px;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-1);
          font-family: 'Outfit', sans-serif; font-size: 14px;
          outline: none; transition: border-color 0.15s;
          margin-bottom: 10px;
        }
        .admin-input:focus { border-color: var(--amber); }
        .admin-input::placeholder { color: var(--text-3); }
        .btn-admin {
          width: 100%; padding: 12px 20px;
          background: #78350f; color: #fbbf24;
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 8px; font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; margin-top: 4px;
          letter-spacing: 0.3px;
        }
        .btn-admin:hover { background: #92400e; border-color: rgba(245,158,11,0.5); box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
        .btn-admin:disabled { opacity: 0.5; cursor: not-allowed; }
        .nav-btn {
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 500;
          color: var(--text-2); background: transparent;
          border: 1px solid var(--border); padding: 7px 16px;
          border-radius: 7px; cursor: pointer; transition: all 0.15s;
        }
        .nav-btn:hover { color: var(--text-1); border-color: var(--border-light); }
      `}</style>

      {/* Background grid */}
      <div style={s.gridBg} />

      {/* Amber glow */}
      <div style={s.amberGlow} />

      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <div style={s.logoBox}>🛡️</div>
          <span style={s.logoText}>SafeTour <span style={{ color: '#a1a1aa', fontWeight: 400 }}>India</span></span>
        </div>
        <button className="nav-btn" onClick={() => navigate('/')}>← Back to Home</button>
      </nav>

      {/* Center */}
      <div style={s.center}>
        <div style={s.card}>

          {/* Header */}
          <div style={s.cardHeader}>
            <div style={s.lockBox}>🔒</div>
            <div>
              <p style={s.eyebrow}>Restricted Access</p>
              <h1 style={s.title}>Authority Portal</h1>
            </div>
          </div>

          <p style={s.subtitle}>
            Secure access for law enforcement and tourism authority personnel only.
          </p>

          {/* Divider */}
          <div style={s.divider} />

          {/* Warning */}
          <div style={s.warningBox}>
            <span style={s.warningDot} />
            <span style={{ fontFamily: 'Outfit', fontSize: '13px', color: '#f59e0b', lineHeight: 1.6 }}>
              Unauthorized access attempts are logged and reported. This portal is monitored 24/7.
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={s.errorBox}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0, display: 'inline-block', marginRight: 8 }} />
              {error}
            </div>
          )}

          {/* Inputs */}
          <div style={{ marginBottom: '4px' }}>
            <label style={s.label}>Official email address</label>
            <input className="admin-input" type="email" placeholder="authority@safetour.in"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

            <label style={s.label}>Password</label>
            <input className="admin-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          {/* Login button */}
          <button className="btn-admin" onClick={handleLogin} disabled={loading}>
            {loading ? '⏳ Verifying credentials...' : '🔐 Access Dashboard →'}
          </button>

          {/* Credentials hint */}
          <div style={s.hintBox}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#52525b' }}>
              SESSION · ENCRYPTED · MONITORED
            </span>
          </div>

          {/* Tourist link */}
          <div style={s.touristRow}>
            <button style={s.touristLink} onClick={() => navigate('/login')}>
              👤 Tourist Portal →
            </button>
          </div>

        </div>

        {/* Security badges */}
        <div style={s.badges}>
          {[
            { icon: '🔐', text: 'End-to-end encrypted' },
            { icon: '📋', text: 'Access logged' },
            { icon: '👁️', text: '24/7 monitored' },
          ].map((b, i) => (
            <div key={i} style={s.badge}>
              <span>{b.icon}</span>
              <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: '#52525b' }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { background: '#09090b', minHeight: '100vh', fontFamily: 'Outfit, sans-serif', color: '#fafafa', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },

  gridBg: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(245,158,11,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.02) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },

  amberGlow: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '600px', height: '400px', zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.06) 0%, transparent 65%)',
  },

  nav: { position: 'relative', zIndex: 10, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid #27272a', background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(16px)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: { width: '30px', height: '30px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 },
  logoText: { fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700, color: '#fafafa' },

  center: { position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },

  card: { background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', animation: 'fadeUp 0.5s ease both' },

  cardHeader: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  lockBox: { width: '44px', height: '44px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  eyebrow: { fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 500, color: '#f59e0b', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px' },
  title: { fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: '#fafafa', margin: 0 },
  subtitle: { fontFamily: 'Outfit', fontSize: '13px', color: '#71717a', lineHeight: 1.6, marginBottom: '20px' },

  divider: { height: '1px', background: '#27272a', marginBottom: '20px' },

  warningBox: { display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' },
  warningDot: { width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block', marginTop: '4px' },

  errorBox: { display: 'flex', alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontFamily: 'Outfit', fontSize: '13px', color: '#ef4444' },

  label: { fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: '5px' },

  hintBox: { textAlign: 'center', marginTop: '12px', padding: '8px', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px' },

  touristRow: { textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #27272a' },
  touristLink: { fontFamily: 'Outfit', fontSize: '12px', color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' },

  badges: { display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' },
  badge: { display: 'flex', alignItems: 'center', gap: '6px', background: '#18181b', border: '1px solid #27272a', borderRadius: '100px', padding: '6px 12px' },
};