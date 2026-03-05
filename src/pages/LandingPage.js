import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [counts, setCounts] = useState({ tourists: 0, alerts: 0, zones: 0, uptime: 0 });

  const goTourist = () => {
    if (user && role === 'tourist') navigate('/tourist');
    else if (user && role === 'admin') navigate('/admin');
    else navigate('/login');
  };

  const goAdmin = () => {
    if (user && role === 'admin') navigate('/admin');
    else if (user && role === 'tourist') navigate('/tourist');
    else navigate('/admin-login');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const targets = { tourists: 12400, alerts: 340, zones: 28, uptime: 99 };
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / 60, 3);
      setCounts({
        tourists: Math.floor(targets.tourists * ease),
        alerts: Math.floor(targets.alerts * ease),
        zones: Math.floor(targets.zones * ease),
        uptime: Math.floor(targets.uptime * ease),
      });
      if (step >= 60) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #09090b; --surface: #18181b; --surface2: #27272a;
          --border: #27272a; --border-light: #3f3f46;
          --text-1: #fafafa; --text-2: #a1a1aa; --text-3: #52525b;
          --blue: #3b82f6; --blue-dim: rgba(59,130,246,0.12);
          --blue-border: rgba(59,130,246,0.25);
          --green: #22c55e; --green-dim: rgba(34,197,94,0.1);
          --red: #ef4444; --amber: #f59e0b;
        }
        body { background: var(--bg); color: var(--text-1); font-family: 'Outfit', sans-serif; }
        @keyframes in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        .in1 { animation: in-up 0.55s 0.05s both; }
        .in2 { animation: in-up 0.55s 0.15s both; }
        .in3 { animation: in-up 0.55s 0.25s both; }
        .in4 { animation: in-up 0.55s 0.35s both; }
        .in5 { animation: in-up 0.55s 0.45s both; }
        .topnav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 99;
          height: 68px; display: flex; align-items: center;
          padding: 0 40px; transition: background 0.2s, border-color 0.2s;
          border-bottom: 1px solid transparent;
        }
        .topnav.solid { background: rgba(9,9,11,0.92); backdrop-filter: blur(16px); border-bottom-color: var(--border); }
        .topnav-inner { width: 100%; max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .btn { font-family: 'Outfit', sans-serif; font-weight: 500; cursor: pointer; border-radius: 8px; transition: all 0.15s; letter-spacing: 0; outline: none; }
        .btn-sm { font-size: 15px; padding: 9px 20px; }
        .btn-md { font-size: 15px; padding: 11px 28px; }
        .btn-lg { font-size: 16px; padding: 13px 36px; }
        .btn-ghost { background: transparent; color: var(--text-2); border: 1px solid transparent; }
        .btn-ghost:hover { color: var(--text-1); background: var(--surface); border-color: var(--border); }
        .btn-outline { background: transparent; color: var(--text-1); border: 1px solid var(--border-light); }
        .btn-outline:hover { background: var(--surface); border-color: #71717a; }
        .btn-blue { background: var(--blue); color: #fff; border: 1px solid var(--blue); }
        .btn-blue:hover { background: #2563eb; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .nav-link { font-family: 'Outfit'; font-size: 15px; font-weight: 400; color: var(--text-2); background: none; border: none; cursor: pointer; padding: 4px 14px; border-radius: 6px; transition: color 0.15s; }
        .nav-link:hover { color: var(--text-1); }
        .feat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px; transition: border-color 0.2s, transform 0.2s; }
        .feat-card:hover { border-color: var(--border-light); transform: translateY(-2px); }
        .alert-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; transition: background 0.15s; }
        .alert-item:hover { background: rgba(255,255,255,0.03); }
        .cta-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 48px 40px; transition: border-color 0.2s; }
        .cta-card:hover { border-color: var(--border-light); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 3px; }
      `}</style>

      {/* NAVBAR */}
      <nav className={`topnav${scrolled ? ' solid' : ''}`}>
        <div className="topnav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={s.logoBox}>🛡️</div>
            <span style={s.logoText}>SafeTour <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>India</span></span>
            <span style={s.liveBadge}><span style={s.liveDot} />Live</span>
          </div>

          <div style={{ display: 'flex', gap: '2px' }}>
            {['Features', 'How it works', 'Impact'].map((l, i) => (
              <button key={i} className="nav-link" onClick={() => scrollTo(['features', 'how', 'stats'][i])}>{l}</button>
            ))}
          </div>

          {/* ── FIXED NAV BUTTONS ── */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-ghost" onClick={
              user && role === 'admin' ? () => navigate('/admin') :
              user && role === 'tourist' ? () => navigate('/tourist') :
              () => navigate('/login')
            }>
              {user && role === 'tourist' ? 'My Dashboard' :
               user && role === 'admin' ? 'Admin Panel' :
               'Sign in'}
            </button>
            <button className="btn btn-sm btn-blue" onClick={
              user && role === 'admin' ? () => navigate('/admin') :
              user && role === 'tourist' ? () => navigate('/tourist') :
              () => navigate('/login')
            }>
              {user && role === 'admin' ? 'Open Admin Panel →' :
               user && role === 'tourist' ? 'Go to Dashboard →' :
               'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroGlow} />
        <div style={s.heroInner}>
          <div style={s.eyebrow} className="in1">
            <span style={s.eyebrowDot} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', letterSpacing: '0.5px', color: 'var(--text-2)' }}>Tourist Safety · Blockchain · AI · India</span>
          </div>
          <h1 style={s.headline} className="in2">
            Protect Every Tourist.<br />
            <span style={s.headlineBlue}>Everywhere in India.</span>
          </h1>
          <p style={s.subline} className="in3">
            SafeTour India combines blockchain identity, real-time GPS geofencing,<br />
            and AI anomaly detection into one unified safety platform.
          </p>
          <div style={s.ctaRow} className="in4">
            <button className="btn btn-lg btn-blue" onClick={goTourist}>
              {user && role === 'tourist' ? 'Go to Dashboard →' :
               user && role === 'admin' ? 'Open Admin Panel →' :
               'Register as Tourist'}
            </button>
            <button className="btn btn-lg btn-outline" onClick={goAdmin}>
              {user && role === 'admin' ? 'Open Admin Panel →' :
               user && role === 'tourist' ? 'Go to Dashboard →' :
               'Authority Dashboard'}
            </button>
          </div>
          <div style={s.tags} className="in5">
            {['Ethereum Sepolia', 'Isolation Forest ML', 'Supabase Realtime', 'SIH 2025'].map((t, i) => (
              <span key={i} style={s.tag}>{t}</span>
            ))}
          </div>
        </div>

        {/* Live Feed Card */}
        <div style={s.feedCard} className="in4">
          <div style={s.feedHeader}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbe2e' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)', marginLeft: '10px' }}>safetour — live monitoring</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ ...s.liveDot, animation: 'live-pulse 2s infinite' }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--green)' }}>LIVE</span>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {[
              { time: '09:41:32', tag: 'SOS', tagColor: 'var(--red)', tagBg: 'rgba(239,68,68,0.12)', msg: 'Tourist #4821 near Taj Mahal — alert sent' },
              { time: '09:41:28', tag: 'ZONE', tagColor: 'var(--green)', tagBg: 'rgba(34,197,94,0.1)', msg: 'Safe zone entry confirmed — Jaipur Fort' },
              { time: '09:41:15', tag: 'AI', tagColor: 'var(--amber)', tagBg: 'rgba(245,158,11,0.1)', msg: 'Anomaly detected — route deviation ×2' },
              { time: '09:41:02', tag: 'GPS', tagColor: '#60a5fa', tagBg: 'rgba(96,165,250,0.1)', msg: '7 tourists active — Agra cluster' },
              { time: '09:40:58', tag: 'ID', tagColor: '#a78bfa', tagBg: 'rgba(167,139,250,0.1)', msg: 'NFT minted — Token #4822 confirmed on-chain' },
            ].map((row, i) => (
              <div key={i} className="alert-item">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)', minWidth: '64px' }}>{row.time}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 500, color: row.tagColor, background: row.tagBg, padding: '2px 7px', borderRadius: '4px', minWidth: '42px', textAlign: 'center' }}>{row.tag}</span>
                <span style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-2)', flex: 1 }}>{row.msg}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '10px', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--green)' }}>▶</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-3)' }}>monitoring active</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--green)', animation: 'blink 1.1s step-end infinite' }}>█</span>
          </div>
        </div>

        {/* Mini stat row */}
        <div style={s.miniRow} className="in5">
          {[
            { n: '7', label: 'Active Tourists', c: 'var(--green)' },
            { n: '1', label: 'Open SOS Alerts', c: 'var(--red)' },
            { n: '28', label: 'Geo-Fenced Zones', c: '#60a5fa' },
            { n: '99.9%', label: 'System Uptime', c: 'var(--text-1)' },
          ].map((m, i) => (
            <div key={i} style={s.miniCard}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '26px', fontWeight: 500, color: m.c, lineHeight: 1 }}>{m.n}</span>
              <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', fontWeight: 400 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <div id="stats" style={s.statsStrip}>
        {[
          { n: counts.tourists.toLocaleString() + '+', label: 'Tourists Protected' },
          { n: counts.alerts + '+', label: 'SOS Resolved' },
          { n: counts.zones, label: 'Active Zones' },
          { n: counts.uptime + '.9%', label: 'Platform Uptime' },
        ].map((stat, i) => (
          <div key={i} style={s.statItem}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '30px', fontWeight: 500, color: 'var(--text-1)' }}>{stat.n}</span>
            <span style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section id="features" style={s.section}>
        <div style={s.sectionInner}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={s.sectionEyebrow}>Platform Capabilities</p>
            <h2 style={s.sectionTitle}>Everything needed for<br />modern tourist safety.</h2>
            <p style={s.sectionSub}>Purpose-built for India's diverse and high-traffic tourist destinations.</p>
          </div>
          <div style={s.featureGrid}>
            {[
              { icon: '⛓️', title: 'Blockchain Digital ID', desc: 'Each tourist gets a non-transferable NFT on Ethereum Sepolia. Tamper-proof, permanent, and verifiable by any authority in seconds.' },
              { icon: '📡', title: 'Live GPS Geofencing', desc: 'Sub-second breach detection across customizable safe, restricted, and danger zones with push alerts to the authority dashboard.' },
              { icon: '🧠', title: 'AI Anomaly Detection', desc: 'Isolation Forest ML model trained on GPS movement data. Automatically flags deviations and escalates risk scores in real-time.' },
              { icon: '🆘', title: 'One-Tap SOS', desc: 'Emergency button pushes verified identity, GPS coordinates, and incident history to authorities in under 500ms.' },
              { icon: '📊', title: 'Authority Analytics', desc: 'Live dashboards with incident heatmaps, resolution rates, GPS coverage, and AI anomaly tracking for command decisions.' },
              { icon: '🔐', title: 'Role-Based Security', desc: 'Completely separate portals for tourists and authorities. Zero crossover. Session-based auth with Supabase and localStorage cache.' },
            ].map((f, i) => (
              <div key={i} className="feat-card">
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontFamily: 'Outfit', fontSize: '13.5px', color: 'var(--text-2)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ ...s.section, background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={s.sectionInner}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={s.sectionEyebrow}>The Process</p>
            <h2 style={s.sectionTitle}>From registration<br />to safe departure.</h2>
          </div>
          <div style={s.stepsGrid}>
            {[
              { n: '01', title: 'Connect & Register', desc: 'Tourist connects MetaMask wallet, submits details, and receives a permanent NFT Digital ID minted on Ethereum Sepolia.' },
              { n: '02', title: 'GPS Activates', desc: 'Live tracking begins immediately. The Isolation Forest AI model starts scoring movement patterns every few seconds.' },
              { n: '03', title: 'Continuous Protection', desc: 'Geo-fence alerts, real-time AI anomaly scoring, and a one-tap SOS button protect the tourist throughout their journey.' },
              { n: '04', title: 'Authority Response', desc: 'Admin dashboard receives instant alerts with verified blockchain identity and GPS coordinates for rapid coordinated response.' },
            ].map((step, i) => (
              <div key={i} style={s.stepBox}>
                <div style={s.stepNumber}>{step.n}</div>
                <div style={s.stepLine} />
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DUAL CTA */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="cta-card">
              <p style={s.sectionEyebrow}>For Tourists</p>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.25, margin: '10px 0 14px' }}>Travel India with<br />total confidence.</h3>
              <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.75, marginBottom: '32px' }}>Register in under 2 minutes. Get a blockchain Digital ID, live GPS protection, and a direct emergency line to local authorities.</p>
              <button className="btn btn-md btn-blue" onClick={goTourist}>
                {user && role === 'tourist' ? 'Go to Dashboard →' :
                 user && role === 'admin' ? 'Open Admin Panel →' :
                 'Register Now →'}
              </button>
            </div>
            <div className="cta-card">
              <p style={s.sectionEyebrow}>For Authorities</p>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.25, margin: '10px 0 14px' }}>Full situational<br />awareness. Always.</h3>
              <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.75, marginBottom: '32px' }}>Real-time dashboard with live tourist locations, instant SOS alerts, AI analytics, geofence management, and incident tracking.</p>
              <button className="btn btn-md btn-outline" onClick={goAdmin}>
                {user && role === 'admin' ? 'Open Admin Panel →' :
                 user && role === 'tourist' ? 'Go to Dashboard →' :
                 'Access Dashboard →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={s.logoBox}>🛡️</div>
            <span style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>SafeTour India</span>
          </div>
          <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-3)' }}>© 2025 SafeTour India · Team Deadline Dodgers · Smart India Hackathon 2025</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-ghost" onClick={goTourist}>Tourist Portal</button>
            <button className="btn btn-sm btn-ghost" onClick={goAdmin}>Admin Access</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

const s = {
  root: { background: '#09090b', minHeight: '100vh', overflowX: 'hidden' },
  logoBox: { width: '32px', height: '32px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 },
  logoText: { fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, color: '#fafafa' },
  liveBadge: { display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '100px', padding: '3px 10px', fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600, color: '#22c55e', letterSpacing: '0.3px' },
  liveDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 },
  hero: { paddingTop: '128px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', height: '500px', background: 'radial-gradient(ellipse at top, rgba(59,130,246,0.1) 0%, transparent 65%)', pointerEvents: 'none' },
  heroInner: { textAlign: 'center', maxWidth: '780px', padding: '0 32px', position: 'relative', zIndex: 1 },
  eyebrow: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#18181b', border: '1px solid #27272a', borderRadius: '100px', padding: '6px 16px', marginBottom: '32px' },
  eyebrowDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 },
  headline: { fontFamily: 'Outfit', fontSize: 'clamp(40px, 5.5vw, 68px)', fontWeight: 800, color: '#fafafa', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '22px' },
  headlineBlue: { color: '#60a5fa' },
  subline: { fontFamily: 'Outfit', fontSize: '17px', fontWeight: 400, color: '#71717a', lineHeight: 1.75, marginBottom: '40px' },
  ctaRow: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' },
  tags: { display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
  tag: { fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#52525b', background: 'transparent', border: '1px solid #27272a', padding: '4px 12px', borderRadius: '4px' },
  feedCard: { position: 'relative', zIndex: 1, width: '100%', maxWidth: '700px', background: '#111113', border: '1px solid #27272a', borderRadius: '12px', overflow: 'hidden', marginTop: '48px', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' },
  feedHeader: { display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#18181b', borderBottom: '1px solid #27272a' },
  miniRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', width: '100%', maxWidth: '700px', marginTop: '12px', background: '#111113', border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden' },
  miniCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 12px', borderRight: '1px solid #27272a' },
  statsStrip: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #27272a', borderBottom: '1px solid #27272a' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', borderRight: '1px solid #27272a' },
  section: { padding: '96px 32px' },
  sectionInner: { maxWidth: '1120px', margin: '0 auto' },
  sectionEyebrow: { fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 500, color: '#3b82f6', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' },
  sectionTitle: { fontFamily: 'Outfit', fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#fafafa', lineHeight: 1.15, letterSpacing: '-0.8px', marginBottom: '14px' },
  sectionSub: { fontFamily: 'Outfit', fontSize: '15px', color: '#71717a', lineHeight: 1.7 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' },
  stepBox: { position: 'relative' },
  stepNumber: { fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 500, color: '#3b82f6', letterSpacing: '1px', marginBottom: '20px' },
  stepLine: { width: '32px', height: '2px', background: 'rgba(59,130,246,0.3)', borderRadius: '2px', marginBottom: '16px' },
  stepTitle: { fontFamily: 'Outfit', fontSize: '16px', fontWeight: 700, color: '#fafafa', marginBottom: '10px' },
  stepDesc: { fontFamily: 'Outfit', fontSize: '13.5px', color: '#71717a', lineHeight: 1.7 },
  footer: { borderTop: '1px solid #27272a', padding: '24px 40px' },
  footerInner: { maxWidth: '1120px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
};