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

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      onLogin();
    } catch (err) {
      setError('登录失败：用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        width: 360,
      }}>
        <h2 style={{ margin: '0 0 8px', color: '#2e7d32' }}>🌾 TMR 饲料配比系统</h2>
        <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14 }}>请登录以继续</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          {error && <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: loading ? '#a5d6a7' : '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  useEffect(() => {
    const handler = () => setAuthed(false);
    window.addEventListener('tmr-auth-expired', handler);
    return () => window.removeEventListener('tmr-auth-expired', handler);
  }, []);

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <BrowserRouter>
      <div>
        <header style={headerStyle}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#2e7d32' }}>🌾 TMR 饲料配比智能监测系统</h2>
              <button
                onClick={() => { logout(); setAuthed(false); }}
                style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', color: '#666' }}
              >
                退出
              </button>
            </div>
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
