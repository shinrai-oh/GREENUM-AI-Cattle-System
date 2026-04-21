import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from '../api.js';

const STATUS_LABEL = {
  idle: '空闲',
  mixing: '混料中',
  done: '完成',
};

const STATUS_COLOR = {
  idle: '#9e9e9e',
  mixing: '#2196f3',
  done: '#4caf50',
};

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  // Map deviceId -> latest status payload from socket
  const [statuses, setStatuses] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    api.get('/devices').then(res => setDevices(res.data)).catch(() => {});

    const socket = io('/', {
      path: '/socket.io',
      auth: { token: getToken() },
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Server emits one object per device; accumulate into a map keyed by deviceId
    socket.on('status', (payload) => {
      setStatuses(prev => ({ ...prev, [payload.deviceId]: payload }));
    });

    return () => socket.close();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>实时监控看板</h3>
        <span style={{ fontSize: 13, color: connected ? '#4caf50' : '#9e9e9e' }}>
          ● {connected ? 'WebSocket 已连接' : '等待连接...'}
        </span>
      </div>

      {devices.length === 0 && (
        <p style={{ color: '#999' }}>正在加载设备信息...</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {devices.map(d => {
          const st = statuses[d.id];
          const status = st?.status ?? d.status ?? 'idle';
          const progress = st?.progressPct ?? 0;
          const items = st?.items ?? [];

          return (
            <div key={d.id} style={{
              border: '1px solid #e0e0e0',
              borderRadius: 10,
              padding: 16,
              background: '#fafafa',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 15 }}>{d.name}</strong>
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: STATUS_COLOR[status] + '22',
                  color: STATUS_COLOR[status],
                  fontWeight: 600,
                }}>
                  {STATUS_LABEL[status] ?? status}
                </span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>混料进度</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: STATUS_COLOR[status],
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {items.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>当前配方原料：</div>
                  {items.map(item => (
                    <div key={item.material} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      padding: '3px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <span>{item.material}</span>
                      <span style={{ color: '#555' }}>目标 {item.targetWeightKg} kg</span>
                    </div>
                  ))}
                </div>
              )}

              {items.length === 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#bbb' }}>暂无今日配方数据</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
