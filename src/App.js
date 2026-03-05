import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import LandingPage from './pages/LandingPage';
import TouristApp from './pages/TouristApp';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import AdminLogin from './pages/AdminLogin';

const loadingStyle = {
  backgroundColor: '#09090b',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#3b82f6',
  fontSize: '18px',
  fontFamily: "'Outfit', sans-serif",
  flexDirection: 'column',
  gap: '12px',
};

function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={loadingStyle}>
        <span style={{ fontSize: '36px' }}>🛡️</span>
        <span style={{ fontFamily: 'Outfit', fontWeight: 500, color: '#a1a1aa' }}>Loading SafeTour...</span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Landing — always accessible */}
        <Route path="/" element={<LandingPage />} />

        {/* Tourist login — redirect if already logged in */}
        <Route path="/login" element={
          !user ? <LoginPage /> :
          role === 'tourist' ? <Navigate to="/tourist" replace /> :
          role === 'admin' ? <Navigate to="/admin" replace /> :
          <LoginPage />
        } />

        {/* Admin login — redirect if already logged in */}
        <Route path="/admin-login" element={
          !user ? <AdminLogin /> :
          role === 'admin' ? <Navigate to="/admin" replace /> :
          role === 'tourist' ? <Navigate to="/tourist" replace /> :
          <AdminLogin />
        } />

        {/* Tourist portal — only tourists, not admins */}
        <Route path="/tourist" element={
          !user ? <Navigate to="/login" replace /> :
          role === 'tourist' ? <TouristApp user={user} /> :
          role === 'admin' ? <Navigate to="/admin" replace /> :
          <Navigate to="/login" replace />
        } />

        {/* Admin dashboard — only admins, not tourists */}
        <Route path="/admin" element={
          !user ? <Navigate to="/admin-login" replace /> :
          role === 'admin' ? <AdminDashboard user={user} /> :
          role === 'tourist' ? <Navigate to="/tourist" replace /> :
          <Navigate to="/admin-login" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;