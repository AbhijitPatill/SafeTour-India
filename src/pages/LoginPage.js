import { supabase } from '../supabase';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Please fill all fields.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (error) {
      setError(error.message.includes('Email not confirmed')
        ? 'Please confirm your email first — check your inbox.'
        : error.message);
      return;
    }
    navigate('/tourist');
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.confirmPassword) { setError('Please fill all fields.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    alert('✅ Account created! Please check your email and click the confirmation link before logging in.');
    setMode('login');
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
        @keyframes gridMove {
          from { transform: translateY(0); }
          to   { transform: translateY(40px); }
        }
        .login-input {
          width: 100%; padding: 11px 14px;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-1);
          font-family: 'Outfit', sans-serif; font-size: 14px;
          outline: none; transition: border-color 0.15s;
          margin-bottom: 10px;
        }
        .login-input:focus { border-color: var(--blue); }
        .login-input::placeholder { color: var(--text-3); }
        .btn-primary {
          width: 100%; padding: 12px 20px;
          background: var(--blue); color: #fff; border: none;
          border-radius: 8px; font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; margin-top: 4px;
        }
        .btn-primary:hover { background: #2563eb; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline {
          width: 100%; padding: 11px 20px;
          background: transparent; color: var(--text-1);
          border: 1px solid var(--border); border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 14px;
          font-weight: 500; cursor: pointer; transition: all 0.15s;
        }
        .btn-outline:hover { border-color: var(--border-light); background: var(--surface); }
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
            <div style={s.logoBox}>🛡️</div>
            <div>
              <p style={s.eyebrow}>Tourist Portal</p>
              <h1 style={s.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
            </div>
          </div>

          <p style={s.subtitle}>
            {mode === 'login'
              ? 'Sign in to access your Digital Tourist ID and live safety tracking.'
              : 'Register to get your blockchain-verified Digital Tourist ID.'}
          </p>

          {/* Divider */}
          <div style={s.divider} />

          {/* Error */}
          {error && (
            <div style={s.errorBox}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0, display: 'inline-block', marginRight: 8 }} />
              {error}
            </div>
          )}

          {/* Inputs */}
          <div style={{ marginBottom: '4px' }}>
            <label style={s.label}>Email address</label>
            <input className="login-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

            <label style={s.label}>Password</label>
            <input className="login-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleLogin()} />

            {mode === 'register' && (
              <>
                <label style={s.label}>Confirm password</label>
                <input className="login-input" type="password" placeholder="••••••••"
                  value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
              </>
            )}
          </div>

          {/* Primary button */}
          <button className="btn-primary" onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
            {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>

          {/* Switch mode */}
          <div style={s.switchRow}>
            <span style={s.switchText}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button style={s.switchLink} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>

          {/* Admin link */}
          <div style={s.adminRow}>
            <button style={s.adminLink} onClick={() => navigate('/admin-login')}>
              🔒 Authority Portal →
            </button>
          </div>

        </div>

        {/* Feature hints */}
        <div style={s.hints}>
          {[
            { icon: '🔗', text: 'Blockchain-verified Digital ID' },
            { icon: '📍', text: 'Real-time GPS safety tracking' },
            { icon: '🆘', text: 'One-tap SOS to authorities' },
          ].map((h, i) => (
            <div key={i} style={s.hintChip}>
              <span>{h.icon}</span>
              <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: '#71717a' }}>{h.text}</span>
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
    backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },

  nav: { position: 'relative', zIndex: 10, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid #27272a', background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(16px)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: { width: '30px', height: '30px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 },
  logoText: { fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700, color: '#fafafa' },

  center: { position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },

  card: { background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', animation: 'fadeUp 0.5s ease both' },

  cardHeader: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  eyebrow: { fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 500, color: '#3b82f6', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px' },
  title: { fontFamily: 'Outfit', fontSize: '22px', fontWeight: 700, color: '#fafafa', margin: 0 },
  subtitle: { fontFamily: 'Outfit', fontSize: '13px', color: '#71717a', lineHeight: 1.6, marginBottom: '20px' },

  divider: { height: '1px', background: '#27272a', marginBottom: '20px' },

  errorBox: { display: 'flex', alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontFamily: 'Outfit', fontSize: '13px', color: '#ef4444' },

  label: { fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: '5px' },

  switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' },
  switchText: { fontFamily: 'Outfit', fontSize: '13px', color: '#71717a' },
  switchLink: { fontFamily: 'Outfit', fontSize: '13px', fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },

  adminRow: { textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #27272a' },
  adminLink: { fontFamily: 'Outfit', fontSize: '12px', color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' },

  hints: { display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' },
  hintChip: { display: 'flex', alignItems: 'center', gap: '6px', background: '#18181b', border: '1px solid #27272a', borderRadius: '100px', padding: '6px 12px' },
};