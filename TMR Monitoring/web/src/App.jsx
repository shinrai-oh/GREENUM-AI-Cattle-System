import React, { useState, useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import ROI from './pages/ROI.jsx';
import Formulas from './pages/Formulas.jsx';
import Tasks from './pages/Tasks.jsx';
import Reports from './pages/Reports.jsx';
import { login, logout, getToken } from './api.js';

const navStyle = {
  display: 'flex',
  gap: '12px',
  padding: '12px 16px',
  borderBottom: '1px solid #e0e0e0',
  background: '#fff',
};

const headerStyle = {
  background: '#fff',
  borderBottom: '2px solid #4caf50',
  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
};

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  // Auto-login with default credentials on first load
  useEffect(() => {
    if (!getToken()) {
      login('admin', 'admin123')
        .then(() => setAuthed(true))
        .catch(() => {});
    }

    const handler = () => {
      // Token expired — re-login automatically
      login('admin', 'admin123')
        .then(() => setAuthed(true))
        .catch(() => setAuthed(false));
    };
    window.addEventListener('tmr-auth-expired', handler);
    return () => window.removeEventListener('tmr-auth-expired', handler);
  }, []);

  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        color: '#555',
        fontSize: 16,
      }}>
        正在连接系统...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div>
        <header style={headerStyle}>
          <div style={{ padding: '12px 16px' }}>
            <h2 style={{ margin: 0, color: '#2e7d32' }}>🌾 TMR 饲料配比智能监测系统</h2>
            <nav style={navStyle}>
              <NavLink to="/" end style={({ isActive }) => ({ color: isActive ? '#2e7d32' : '#333', fontWeight: isActive ? 600 : 400, textDecoration: 'none' })}>实时看板</NavLink>
              <NavLink to="/roi" style={({ isActive }) => ({ color: isActive ? '#2e7d32' : '#333', fontWeight: isActive ? 600 : 400, textDecoration: 'none' })}>摄像机标定</NavLink>
              <NavLink to="/formulas" style={({ isActive }) => ({ color: isActive ? '#2e7d32' : '#333', fontWeight: isActive ? 600 : 400, textDecoration: 'none' })}>配方管理</NavLink>
              <NavLink to="/tasks" style={({ isActive }) => ({ color: isActive ? '#2e7d32' : '#333', fontWeight: isActive ? 600 : 400, textDecoration: 'none' })}>任务下发</NavLink>
              <NavLink to="/reports" style={({ isActive }) => ({ color: isActive ? '#2e7d32' : '#333', fontWeight: isActive ? 600 : 400, textDecoration: 'none' })}>数据报表</NavLink>
            </nav>
          </div>
        </header>
        <main style={{ padding: '16px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/roi" element={<ROI />} />
            <Route path="/formulas" element={<Formulas />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
