import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const GEOFENCES = [
  { id: 1, name: 'Taj Mahal Safe Zone', lat: 27.1751, lng: 78.0421, radius: 500, type: 'safe' },
  { id: 2, name: 'Restricted Area - Agra Fort', lat: 27.1795, lng: 78.0211, radius: 300, type: 'restricted' },
  { id: 3, name: 'Pahalgam Safe Zone', lat: 34.0151, lng: 75.3147, radius: 800, type: 'safe' },
  { id: 4, name: 'Danger Zone - Flood Area', lat: 34.0251, lng: 75.3300, radius: 400, type: 'danger' },
];

const PIE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#a78bfa'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tourists, setTourists] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [newAlert, setNewAlert] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: t } = await supabase.from('tourists').select('*').order('created_at', { ascending: false });
    const { data: i } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    const { data: s } = await supabase.from('sos_alerts').select('*').order('created_at', { ascending: false });
    setTourists(t || []);
    setIncidents(i || []);
    setSosAlerts(s || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const sosChannel = supabase.channel('sos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, (payload) => {
        setSosAlerts(prev => [payload.new, ...prev]);
        setNewAlert(payload.new);
        setActiveTab('sos');
        setTimeout(() => setNewAlert(null), 5000);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts' }, (payload) => {
        setSosAlerts(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      })
      .subscribe((status) => setRealtimeStatus(status === 'SUBSCRIBED' ? 'live' : 'connecting'));

    const incidentChannel = supabase.channel('incidents-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        setIncidents(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, (payload) => {
        setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
      })
      .subscribe();

    const touristChannel = supabase.channel('tourists-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tourists' }, (payload) => {
        setTourists(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tourists' }, (payload) => {
        setTourists(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sosChannel);
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(touristChannel);
    };
  }, []);

  const handleLogout = async () => {
  // 1. Clear localStorage cache first
  localStorage.removeItem('st_user');
  localStorage.removeItem('st_role');
  // 2. Sign out from Supabase
  await supabase.auth.signOut();
  // 3. Hard reload — clears all React state, no stale memory
  window.location.href = '/';
};

  // ✅ FIXED: Both resolve functions now update local state immediately + sync DB
  const resolveIncident = async (id) => {
    setResolvingId(id);
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;
    const newDesc = '[RESOLVED] ' + inc.description;
    // Optimistic update — UI changes instantly
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, description: newDesc } : i));
    const { error } = await supabase.from('incidents').update({ description: newDesc }).eq('id', id);
    if (error) {
      // Rollback on failure
      setIncidents(prev => prev.map(i => i.id === id ? inc : i));
      alert('Failed to resolve: ' + error.message);
    }
    setResolvingId(null);
  };

  const resolveSOSAlert = async (id) => {
    setResolvingId(id);
    // Optimistic update — UI changes instantly
    setSosAlerts(prev => prev.map(s => s.id === id ? { ...s, status: 'resolved' } : s));
    const { error } = await supabase.from('sos_alerts').update({ status: 'resolved' }).eq('id', id);
    if (error) {
      // Rollback on failure
      setSosAlerts(prev => prev.map(s => s.id === id ? { ...s, status: 'active' } : s));
      alert('Failed to resolve: ' + error.message);
    }
    setResolvingId(null);
  };

  const activeSOS = sosAlerts.filter(s => s.status === 'active');

  const navItems = [
    { id: 'overview', icon: '▣', label: 'Overview' },
    { id: 'sos', icon: '⚡', label: 'SOS Alerts', badge: activeSOS.length, danger: true },
    { id: 'tourists', icon: '◎', label: 'Tourists', badge: tourists.length },
    { id: 'incidents', icon: '◈', label: 'Incidents', badge: incidents.length },
    { id: 'map', icon: '⊕', label: 'Live Map' },
    { id: 'analytics', icon: '◐', label: 'Analytics' },
  ];

  const incidentPieData = [
    { name: 'Danger Zone', value: incidents.filter(i => i.type === 'Danger Zone Entry').length },
    { name: 'Restricted', value: incidents.filter(i => i.type === 'Restricted Zone Entry').length },
    { name: 'Safe Zone', value: incidents.filter(i => i.type === 'Safe Zone Entry').length },
    { name: 'AI Anomaly', value: incidents.filter(i => i.type === 'AI Anomaly').length },
  ].filter(d => d.value > 0);

  const overviewBarData = [
    { name: 'Total', SOS: sosAlerts.length, Incidents: incidents.length, Tourists: tourists.length },
    { name: 'Active', SOS: activeSOS.length, Incidents: incidents.filter(i => !i.description?.startsWith('[RESOLVED]')).length, Tourists: tourists.filter(t => t.lat).length },
    { name: 'Resolved', SOS: sosAlerts.filter(s => s.status === 'resolved').length, Incidents: incidents.filter(i => i.description?.startsWith('[RESOLVED]')).length, Tourists: 0 },
  ];

  const gpsPieData = [
    { name: 'GPS Active', value: tourists.filter(t => t.lat).length },
    { name: 'No GPS', value: tourists.filter(t => !t.lat).length },
  ];

  const tooltipStyle = { backgroundColor: '#18181b', border: '1px solid #27272a', color: '#fafafa', fontFamily: 'Outfit', fontSize: '13px', borderRadius: '8px' };

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

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.15); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .content-area { animation: fadeIn 0.25s ease both; }

        /* ── Sidebar nav items ── */
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 9px 12px; border-radius: 8px;
          border: 1px solid transparent; cursor: pointer;
          transition: all 0.15s ease;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500;
          text-align: left; background: transparent; color: #71717a;
        }
        .nav-item:hover {
          background: #1c1c1f; color: #d4d4d8; border-color: #27272a;
        }
        .nav-item.active {
          background: rgba(59,130,246,0.08);
          color: #60a5fa;
          border-color: rgba(59,130,246,0.2);
          box-shadow: inset 3px 0 0 #3b82f6;
        }
        .nav-item.sos-hot {
          background: rgba(239,68,68,0.08);
          color: #f87171;
          border-color: rgba(239,68,68,0.2);
          animation: sos-pulse 2s infinite;
        }
        .nav-item.sos-hot.active {
          box-shadow: inset 3px 0 0 #ef4444;
          animation: none;
        }

        /* ── Resolve button ── */
        .resolve-btn {
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600;
          padding: 6px 14px; border-radius: 6px; cursor: pointer;
          background: rgba(34,197,94,0.08); color: #22c55e;
          border: 1px solid rgba(34,197,94,0.25);
          transition: all 0.15s; white-space: nowrap; letter-spacing: 0.2px;
          flex-shrink: 0;
        }
        .resolve-btn:hover:not(:disabled) {
          background: rgba(34,197,94,0.16);
          border-color: rgba(34,197,94,0.4);
          transform: translateY(-1px);
        }
        .resolve-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Data table ── */
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th {
          padding: 11px 16px; text-align: left;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          font-weight: 500; color: #3f3f46; text-transform: uppercase;
          letter-spacing: 1px; border-bottom: 1px solid #1c1c1f;
          background: #111113;
        }
        .data-table td {
          padding: 13px 16px; font-family: 'Outfit', sans-serif;
          font-size: 14px; color: #a1a1aa;
          border-bottom: 1px solid #111113; transition: background 0.1s;
        }
        .data-table tbody tr:hover td { background: rgba(255,255,255,0.015); }
        .data-table tbody tr:last-child td { border-bottom: none; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }

        /* ── Stat card hover ── */
        .stat-card { transition: transform 0.15s, border-color 0.15s; }
        .stat-card:hover { transform: translateY(-2px); }

        /* ── Incident / SOS row hover ── */
        .list-row { transition: border-color 0.15s; }
        .list-row:hover { border-color: #3f3f46 !important; }

        /* ── Refresh btn hover ── */
        .refresh-btn:hover { color: #fafafa; border-color: #3f3f46; }
      `}</style>

      {/* ── Flash SOS popup ── */}
      {newAlert && (
        <div style={s.flashAlert}>
          <div style={s.flashIcon}>⚡</div>
          <div>
            <p style={{ fontFamily: 'Outfit', fontSize: '13px', fontWeight: 700, color: '#ef4444', margin: '0 0 2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>New SOS Alert</p>
            <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: '#fafafa', margin: '0 0 4px', fontWeight: 500 }}>{newAlert.tourist_name} needs immediate help</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#22c55e', margin: 0 }}>📍 {newAlert.lat?.toFixed(5)}, {newAlert.lng?.toFixed(5)}</p>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: '18px', marginLeft: 'auto', alignSelf: 'flex-start' }} onClick={() => setNewAlert(null)}>×</button>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <div style={s.logoBox}>🛡️</div>
          <span style={s.logoText}>SafeTour <span style={{ color: '#52525b', fontWeight: 400 }}>India</span></span>
          <span style={s.portalBadge}>Authority</span>
        </div>
        <div style={s.navRight}>
          {/* Realtime status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '100px', border: `1px solid ${realtimeStatus === 'live' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`, background: realtimeStatus === 'live' ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: realtimeStatus === 'live' ? '#22c55e' : '#f59e0b', animation: 'live-pulse 2s infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: realtimeStatus === 'live' ? '#22c55e' : '#f59e0b', letterSpacing: '0.5px' }}>
              {realtimeStatus === 'live' ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>

          {loading && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#f59e0b', letterSpacing: '0.5px' }}>SYNCING...</span>
          )}

          <button className="refresh-btn" style={s.refreshBtn} onClick={fetchData}>↻ Refresh</button>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ── Layout ── */}
      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          <div style={s.sidebarInner}>
            <p style={s.sidebarLabel}>Navigation</p>
            {navItems.map(item => {
              const isSosHot = item.id === 'sos' && activeSOS.length > 0;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item${isActive ? ' active' : ''}${isSosHot ? ' sos-hot' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span style={{ fontSize: '13px', opacity: 0.8, fontFamily: 'monospace' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{
                      fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600,
                      padding: '2px 6px', borderRadius: '4px',
                      background: isSosHot ? 'rgba(239,68,68,0.15)' : '#1c1c1f',
                      color: isSosHot ? '#f87171' : '#52525b',
                      border: `1px solid ${isSosHot ? 'rgba(239,68,68,0.2)' : '#27272a'}`,
                    }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={s.sidebarFooter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>👮</div>
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '13px', fontWeight: 600, color: '#d4d4d8', margin: 0 }}>Admin</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#3f3f46', margin: '1px 0 0', letterSpacing: '0.3px' }}>admin@safetour.in</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={s.main}>

          {/* ════════════════ OVERVIEW ════════════════ */}
          {activeTab === 'overview' && (
            <div className="content-area">
              <div style={s.pageHeader}>
                <p style={s.pageEyebrow}>Dashboard</p>
                <h1 style={s.pageTitle}>Overview</h1>
              </div>

              {/* Stat cards */}
              <div style={s.statsGrid}>
                {[
                  { label: 'Registered Tourists', value: tourists.length, icon: '👥', color: '#60a5fa', glow: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.2)', bg: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.03) 100%)' },
                  { label: 'Active SOS', value: activeSOS.length, icon: '⚡', color: '#f87171', glow: 'rgba(239,68,68,0.15)', border: activeSOS.length > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.15)', bg: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)' },
                  { label: 'Total Incidents', value: incidents.length, icon: '🚨', color: '#fbbf24', glow: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.2)', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)' },
                  { label: 'Safe Entries', value: incidents.filter(i => i.type === 'Safe Zone Entry').length, icon: '✓', color: '#4ade80', glow: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.2)', bg: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)' },
                ].map((stat, i) => (
                  <div key={i} className="stat-card" style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    {/* Glow blob */}
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: stat.glow, filter: 'blur(20px)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative' }}>
                      <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '32px', fontWeight: 500, color: stat.color, lineHeight: 1 }}>{stat.value}</span>
                    </div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#71717a', margin: 0, letterSpacing: '0.2px' }}>{stat.label}</p>
                    {stat.label === 'Active SOS' && stat.value > 0 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Active SOS section */}
              {activeSOS.length > 0 && (
                <div style={s.sosSection}>
                  <div style={s.sosSectionHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, color: '#ef4444', letterSpacing: '1.5px', textTransform: 'uppercase' }}>⚡ Emergency</span>
                    </div>
                    <h2 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 700, color: '#fafafa', margin: '4px 0 0' }}>
                      Active SOS — Immediate Response Required
                    </h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeSOS.map(sos => (
                      <div key={sos.id} className="list-row" style={s.sosCard}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 600, color: '#fafafa', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sos.tourist_name}</p>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#52525b' }}>{sos.token_id}</span>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#22c55e' }}>📍 {sos.lat?.toFixed(5)}, {sos.lng?.toFixed(5)}</span>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#3f3f46' }}>{new Date(sos.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          className="resolve-btn"
                          disabled={resolvingId === sos.id}
                          onClick={() => resolveSOSAlert(sos.id)}
                        >
                          {resolvingId === sos.id ? '...' : '✓ Resolve'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent incidents */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <h2 style={s.sectionTitle}>Recent Incidents</h2>
                  <span style={s.sectionCount}>{incidents.length}</span>
                </div>
                {incidents.length === 0 && !loading && <p style={s.emptyText}>No incidents recorded yet.</p>}
                {incidents.slice(0, 5).map(inc => (
                  <IncidentRow key={inc.id} inc={inc} onResolve={resolveIncident} resolvingId={resolvingId} />
                ))}
              </div>

              {/* Recently registered */}
              <div style={s.section}>
                <div style={s.sectionHeader}>
                  <h2 style={s.sectionTitle}>Recently Registered</h2>
                  <span style={s.sectionCount}>{tourists.length}</span>
                </div>
                {tourists.length === 0 && !loading && <p style={s.emptyText}>No tourists registered yet.</p>}
                {tourists.slice(0, 4).map(t => (
                  <div key={t.id} className="list-row" style={s.touristRow}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#60a5fa', minWidth: '90px' }}>{t.token_id}</span>
                    <span style={{ flex: 1, fontFamily: 'Outfit', fontSize: '14px', color: '#d4d4d8', fontWeight: 500 }}>{t.name}</span>
                    {t.lat
                      ? <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#22c55e', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', padding: '2px 8px', borderRadius: '4px' }}>GPS Active</span>
                      : <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#3f3f46' }}>No GPS</span>
                    }
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#3f3f46', marginLeft: '16px' }}>{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ SOS TAB ════════════════ */}
          {activeTab === 'sos' && (
            <div className="content-area">
              <div style={s.pageHeader}>
                <p style={{ ...s.pageEyebrow, color: '#ef4444' }}>Emergency</p>
                <h1 style={s.pageTitle}>SOS Alerts <span style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', color: '#3f3f46', fontWeight: 400 }}>({sosAlerts.length})</span></h1>
              </div>

              {sosAlerts.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#27272a', letterSpacing: '1px' }}>NO SOS ALERTS</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: '#3f3f46', marginTop: '8px' }}>All tourists are safe.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sosAlerts.map(sos => (
                  <div key={sos.id} className="list-row" style={{ ...s.sosCard, opacity: sos.status === 'resolved' ? 0.45 : 1, border: `1px solid ${sos.status === 'active' ? 'rgba(239,68,68,0.25)' : '#1c1c1f'}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sos.status === 'active' ? '#ef4444' : '#27272a', boxShadow: sos.status === 'active' ? '0 0 6px rgba(239,68,68,0.6)' : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 600, color: sos.status === 'active' ? '#fafafa' : '#71717a', margin: 0 }}>{sos.tourist_name}</p>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: sos.status === 'active' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)', color: sos.status === 'active' ? '#f87171' : '#4ade80', border: `1px solid ${sos.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          {sos.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#52525b' }}>{sos.token_id}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#22c55e' }}>📍 {sos.lat?.toFixed(5)}, {sos.lng?.toFixed(5)}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#3f3f46' }}>{new Date(sos.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {sos.status === 'active'
                      ? <button className="resolve-btn" disabled={resolvingId === sos.id} onClick={() => resolveSOSAlert(sos.id)}>
                          {resolvingId === sos.id ? '...' : '✓ Resolve'}
                        </button>
                      : <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#4ade80', letterSpacing: '0.5px' }}>RESOLVED</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ TOURISTS TAB ════════════════ */}
          {activeTab === 'tourists' && (
            <div className="content-area">
              <div style={s.pageHeader}>
                <p style={s.pageEyebrow}>Registry</p>
                <h1 style={s.pageTitle}>Tourists <span style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', color: '#3f3f46', fontWeight: 400 }}>({tourists.length})</span></h1>
              </div>
              <div style={s.tableWrap}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Token ID', 'Name', 'ID Number', 'Wallet', 'Location', 'Registered'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tourists.map(t => (
                      <tr key={t.id}>
                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#60a5fa' }}>{t.token_id}</span></td>
                        <td><span style={{ color: '#fafafa', fontWeight: 500 }}>{t.name}</span></td>
                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#71717a' }}>{t.aadhaar}</span></td>
                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#a78bfa' }}>{t.wallet_address?.slice(0, 6)}...{t.wallet_address?.slice(-4)}</span></td>
                        <td>
                          {t.lat
                            ? <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#22c55e', background: 'rgba(34,197,94,0.06)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.15)' }}>📍 {t.lat?.toFixed(4)}, {t.lng?.toFixed(4)}</span>
                            : <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#27272a' }}>—</span>
                          }
                        </td>
                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#3f3f46' }}>{new Date(t.created_at).toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tourists.length === 0 && !loading && <p style={{ ...s.emptyText, padding: '32px', textAlign: 'center' }}>No tourists registered yet.</p>}
              </div>
            </div>
          )}

          {/* ════════════════ INCIDENTS TAB ════════════════ */}
          {activeTab === 'incidents' && (
            <div className="content-area">
              <div style={s.pageHeader}>
                <p style={s.pageEyebrow}>Safety</p>
                <h1 style={s.pageTitle}>Incidents <span style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', color: '#3f3f46', fontWeight: 400 }}>({incidents.length})</span></h1>
              </div>
              {incidents.length === 0 && !loading && <p style={s.emptyText}>No incidents recorded yet.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {incidents.map(inc => (
                  <IncidentRow key={inc.id} inc={inc} onResolve={resolveIncident} resolvingId={resolvingId} />
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ MAP TAB ════════════════ */}
          {activeTab === 'map' && (
            <div className="content-area" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...s.pageHeader, flexShrink: 0 }}>
                <p style={s.pageEyebrow}>Tracking</p>
                <h1 style={s.pageTitle}>Live Map <span style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#3f3f46', fontWeight: 400 }}>{tourists.filter(t => t.lat).length} active</span></h1>
              </div>
              <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #1c1c1f', minHeight: 0 }}>
                <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© CARTO © OpenStreetMap" />
                  {GEOFENCES.map(zone => (
                    <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={zone.radius}
                      pathOptions={{ color: zone.type === 'safe' ? '#22c55e' : zone.type === 'restricted' ? '#f59e0b' : '#ef4444', fillOpacity: 0.12, weight: 1.5 }}>
                      <Popup>{zone.name}</Popup>
                    </Circle>
                  ))}
                  {tourists.filter(t => t.lat).map(t => (
                    <Marker key={t.id} position={[t.lat, t.lng]}>
                      <Popup><b>{t.name}</b><br />{t.token_id}<br />{t.wallet_address?.slice(0, 6)}...{t.wallet_address?.slice(-4)}<br />📍 {t.lat?.toFixed(5)}, {t.lng?.toFixed(5)}</Popup>
                    </Marker>
                  ))}
                  {sosAlerts.filter(s => s.status === 'active' && s.lat).map(sos => (
                    <Marker key={sos.id} position={[sos.lat, sos.lng]}>
                      <Popup><b>⚡ SOS — {sos.tourist_name}</b><br />Token: {sos.token_id}<br />📍 {sos.lat?.toFixed(5)}, {sos.lng?.toFixed(5)}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}

          {/* ════════════════ ANALYTICS TAB ════════════════ */}
          {activeTab === 'analytics' && (
            <div className="content-area">
              <div style={s.pageHeader}>
                <p style={s.pageEyebrow}>Intelligence</p>
                <h1 style={s.pageTitle}>Analytics</h1>
              </div>

              <div style={s.statsGrid}>
                {[
                  { label: 'SOS Resolution Rate', value: sosAlerts.length > 0 ? Math.round((sosAlerts.filter(s => s.status === 'resolved').length / sosAlerts.length) * 100) + '%' : '—', icon: '✓', color: '#4ade80', glow: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.18)', bg: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.02) 100%)' },
                  { label: 'GPS Coverage', value: tourists.length > 0 ? Math.round((tourists.filter(t => t.lat).length / tourists.length) * 100) + '%' : '—', icon: '📍', color: '#60a5fa', glow: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.18)', bg: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(59,130,246,0.02) 100%)' },
                  { label: 'AI Anomalies', value: incidents.filter(i => i.type === 'AI Anomaly').length, icon: '◈', color: '#c084fc', glow: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.18)', bg: 'linear-gradient(135deg, rgba(167,139,250,0.07) 0%, rgba(167,139,250,0.02) 100%)' },
                  { label: 'Total Registered', value: tourists.length, icon: '◎', color: '#fbbf24', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.18)', bg: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.02) 100%)' },
                ].map((stat, i) => (
                  <div key={i} className="stat-card" style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: stat.glow, filter: 'blur(20px)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative' }}>
                      <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '32px', fontWeight: 500, color: stat.color, lineHeight: 1 }}>{stat.value}</span>
                    </div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#71717a', margin: 0 }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
                <div style={s.chartCard}>
                  <p style={s.chartTitle}>Incidents by Type</p>
                  {incidentPieData.length === 0
                    ? <p style={{ ...s.emptyText, textAlign: 'center', padding: '40px 0' }}>No data yet.</p>
                    : <PieChart width={220} height={200}>
                        <Pie data={incidentPieData} cx={110} cy={90} outerRadius={68} innerRadius={28} dataKey="value" paddingAngle={3}>
                          {incidentPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontFamily: 'Outfit', fontSize: '11px', color: '#71717a' }} />
                      </PieChart>
                  }
                </div>

                <div style={s.chartCard}>
                  <p style={s.chartTitle}>SOS vs Incidents</p>
                  <BarChart width={220} height={200} data={overviewBarData} barSize={14}>
                    <XAxis dataKey="name" stroke="#27272a" tick={{ fontFamily: 'Outfit', fontSize: '11px', fill: '#52525b' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#27272a" tick={{ fontFamily: 'Outfit', fontSize: '11px', fill: '#52525b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Legend wrapperStyle={{ fontFamily: 'Outfit', fontSize: '11px', color: '#71717a' }} />
                    <Bar dataKey="SOS" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Incidents" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Tourists" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </div>

                <div style={s.chartCard}>
                  <p style={s.chartTitle}>GPS Coverage</p>
                  <PieChart width={220} height={200}>
                    <Pie data={gpsPieData} cx={110} cy={90} outerRadius={68} innerRadius={28} dataKey="value" paddingAngle={3}>
                      <Cell fill="#22c55e" />
                      <Cell fill="#1c1c1f" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontFamily: 'Outfit', fontSize: '11px', color: '#71717a' }} />
                  </PieChart>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

/* ── Extracted IncidentRow component for reuse ── */
function IncidentRow({ inc, onResolve, resolvingId }) {
  const isResolved = inc.description?.startsWith('[RESOLVED]');
  const severity = inc.type === 'Danger Zone Entry' ? 'HIGH' : inc.type === 'Restricted Zone Entry' ? 'MED' : 'LOW';
  const colors = {
    HIGH: { color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    MED:  { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    LOW:  { color: '#4ade80', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  };
  const c = colors[severity];

  return (
    <div className="list-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: '#111113', border: '1px solid #1c1c1f', borderRadius: '10px', opacity: isResolved ? 0.5 : 1 }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700, padding: '3px 7px', borderRadius: '4px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: '0.8px', flexShrink: 0 }}>{severity}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 500, color: '#d4d4d8', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {inc.type} — {inc.reported_by}
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: '#52525b' }}>{inc.description?.replace('[RESOLVED] ', '')}</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#27272a' }}>{new Date(inc.created_at).toLocaleString()}</span>
          {inc.lat && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#3b82f6' }}>📍 {inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}</span>}
        </div>
      </div>
      {!isResolved
        ? <button className="resolve-btn" disabled={resolvingId === inc.id} onClick={() => onResolve(inc.id)}>
            {resolvingId === inc.id ? '...' : '✓ Resolve'}
          </button>
        : <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#4ade80', letterSpacing: '0.8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', padding: '3px 8px', borderRadius: '4px' }}>RESOLVED</span>
      }
    </div>
  );
}

const s = {
  root: { background: '#09090b', minHeight: '100vh', fontFamily: 'Outfit, sans-serif', color: '#fafafa', display: 'flex', flexDirection: 'column' },

  flashAlert: {
    position: 'fixed', top: '16px', right: '16px',
    background: '#111113', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px', padding: '14px 16px',
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    zIndex: 9999, boxShadow: '0 0 0 1px rgba(239,68,68,0.1), 0 20px 40px rgba(0,0,0,0.6)',
    animation: 'slideIn 0.3s ease', maxWidth: '340px',
  },
  flashIcon: { width: 36, height: 36, borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 },

  nav: { height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#09090b', borderBottom: '1px solid #111113', flexShrink: 0, zIndex: 10 },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoBox: { width: '28px', height: '28px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 },
  logoText: { fontFamily: 'Outfit', fontSize: '15px', fontWeight: 700, color: '#fafafa' },
  portalBadge: { fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', padding: '3px 8px', borderRadius: '4px', letterSpacing: '1px', textTransform: 'uppercase' },
  refreshBtn: { fontFamily: 'Outfit', fontSize: '12px', color: '#52525b', background: 'transparent', border: '1px solid #1c1c1f', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' },
  logoutBtn: { fontFamily: 'Outfit', fontSize: '12px', fontWeight: 500, color: '#f87171', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' },

  layout: { display: 'flex', flex: 1, height: 'calc(100vh - 56px)', overflow: 'hidden' },

  sidebar: { width: '220px', background: '#09090b', borderRight: '1px solid #111113', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarInner: { flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto' },
  sidebarLabel: { fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 500, color: '#27272a', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px' },
  sidebarFooter: { padding: '14px 12px', borderTop: '1px solid #111113' },

  main: { flex: 1, overflowY: 'auto', padding: '28px 32px' },

  pageHeader: { marginBottom: '24px' },
  pageEyebrow: { fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 500, color: '#3b82f6', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px' },
  pageTitle: { fontFamily: 'Outfit', fontSize: '24px', fontWeight: 700, color: '#fafafa', margin: 0, letterSpacing: '-0.3px' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },

  sosSection: { background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '18px', marginBottom: '20px' },
  sosSectionHeader: { marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(239,68,68,0.1)' },
  sosCard: { background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' },

  section: { marginBottom: '20px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #111113' },
  sectionTitle: { fontFamily: 'Outfit', fontSize: '14px', fontWeight: 600, color: '#a1a1aa', margin: 0, letterSpacing: '0.2px' },
  sectionCount: { fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#27272a', background: '#111113', border: '1px solid #1c1c1f', padding: '1px 7px', borderRadius: '4px' },
  emptyText: { fontFamily: 'Outfit', fontSize: '13px', color: '#27272a', fontStyle: 'italic' },

  touristRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 14px', background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px', marginBottom: '5px' },

  tableWrap: { background: '#111113', border: '1px solid #1c1c1f', borderRadius: '10px', overflow: 'hidden' },

  chartCard: { background: '#111113', border: '1px solid #1c1c1f', borderRadius: '10px', padding: '18px' },
  chartTitle: { fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 500, color: '#3f3f46', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '1px' },
};