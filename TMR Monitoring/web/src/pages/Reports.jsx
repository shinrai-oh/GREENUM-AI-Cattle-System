import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// Group events by deviceId and sum weight per material
function groupEventsByDevice(events) {
  const map = {};
  for (const e of events) {
    if (!map[e.deviceId]) map[e.deviceId] = {};
    map[e.deviceId][e.material] = (map[e.deviceId][e.material] || 0) + e.weight;
  }
  return map;
}

export default function Reports() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    // Correct path: /api/v1/tmr/tasks/reports/daily
    api.get('/tasks/reports/daily', { params: { date } })
      .then(res => setData(res.data))
      .catch(err => setError('加载失败：' + (err.response?.data?.error || err.message)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]);

  const eventsByDevice = data ? groupEventsByDevice(data.events || []) : {};

  return (
    <div>
      <h3>数据报表（日报）</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          日期：
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }}
          />
        </label>
        <button onClick={load}
          style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>
          刷新
        </button>
      </div>

      {loading && <p style={{ color: '#999' }}>加载中...</p>}
      {error && <p style={{ color: '#d32f2f' }}>{error}</p>}

      {data && !loading && (
        <div>
          {/* Summary header */}
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#e8f5e9', borderRadius: 6, fontSize: 13 }}>
            <strong>{date}</strong> — 共 {(data.tasks || []).length} 个任务，
            {(data.events || []).length} 条投喂记录
          </div>

          {(data.tasks || []).length === 0 && (
            <p style={{ color: '#999' }}>该日期暂无任务数据，请先在「任务下发」页创建当日任务</p>
          )}

          {(data.tasks || []).map(task => {
            const deviceActual = eventsByDevice[task.deviceId] || {};
            const plannedItems = task.formula?.items || [];

            // All materials (union of planned + actual)
            const allMaterials = Array.from(new Set([
              ...plannedItems.map(p => p.material),
              ...Object.keys(deviceActual),
            ]));

            const plannedTotal = plannedItems.reduce((sum, p) => sum + (p.targetWeightKg || 0), 0);
            const actualTotal = Object.values(deviceActual).reduce((sum, v) => sum + v, 0);
            const progressPct = plannedTotal > 0 ? Math.min(100, Math.round((actualTotal / plannedTotal) * 100)) : 0;

            return (
              <div key={task.id} style={{
                marginBottom: 20,
                border: '1px solid #e0e0e0',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {/* Device header */}
                <div style={{
                  padding: '12px 16px',
                  background: '#f5f5f5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <strong>{task.device?.name ?? `设备#${task.deviceId}`}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13 }}>
                      计划 {plannedTotal.toLocaleString()} kg | 实际 {actualTotal.toLocaleString()} kg
                    </span>
                    <span style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: progressPct >= 90 ? '#e8f5e9' : progressPct > 0 ? '#fff3e0' : '#fafafa',
                      color: progressPct >= 90 ? '#2e7d32' : progressPct > 0 ? '#e65100' : '#9e9e9e',
                      fontWeight: 600,
                    }}>
                      完成率 {progressPct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: '#e0e0e0' }}>
                  <div style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: progressPct >= 90 ? '#4caf50' : '#ff9800',
                    transition: 'width 0.4s',
                  }} />
                </div>

                {/* Ingredient table */}
                <div style={{ padding: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: '6px 10px', borderBottom: '1px solid #e0e0e0', textAlign: 'left' }}>原料</th>
                        <th style={{ padding: '6px 10px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>计划 (kg)</th>
                        <th style={{ padding: '6px 10px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>实际 (kg)</th>
                        <th style={{ padding: '6px 10px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>误差</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMaterials.map(mat => {
                        const planned = plannedItems.find(p => p.material === mat);
                        const planKg = planned?.targetWeightKg ?? 0;
                        const actKg = deviceActual[mat] ?? 0;
                        const errPct = planKg > 0 ? (((actKg - planKg) / planKg) * 100).toFixed(1) : null;
                        const errColor = errPct === null ? '#999' : Math.abs(Number(errPct)) <= 5 ? '#4caf50' : '#ff9800';

                        return (
                          <tr key={mat}>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>{mat}</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5', textAlign: 'right', color: '#555' }}>
                              {planKg > 0 ? planKg.toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5', textAlign: 'right' }}>
                              {actKg > 0 ? actKg.toLocaleString() : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5', textAlign: 'right', color: errColor, fontWeight: 500 }}>
                              {errPct !== null ? `${errPct > 0 ? '+' : ''}${errPct}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9f9f9', fontWeight: 600 }}>
                        <td style={{ padding: '8px 10px' }}>合计</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{plannedTotal.toLocaleString()} kg</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{actualTotal.toLocaleString()} kg</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#666' }}>—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
