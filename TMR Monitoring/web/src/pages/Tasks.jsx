import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const STATUS_LABEL = {
  pending: '待执行',
  mixing: '进行中',
  done: '已完成',
};

const STATUS_COLOR = {
  pending: '#ff9800',
  mixing: '#2196f3',
  done: '#4caf50',
};

export default function Tasks() {
  const [devices, setDevices] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [date, setDate] = useState('2021-06-15');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ deviceId: '', formulaId: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/devices').then(res => setDevices(res.data)).catch(() => {});
    api.get('/formulas').then(res => setFormulas(res.data)).catch(() => {});
  }, []);

  const loadTasks = () => {
    api.get('/tasks', { params: { date } })
      .then(res => setTasks(res.data))
      .catch(() => setTasks([]));
  };

  useEffect(() => { loadTasks(); }, [date]);

  const createTask = async () => {
    if (!newTask.deviceId || !newTask.formulaId) {
      alert('请选择设备和配方');
      return;
    }
    setCreating(true);
    try {
      await api.post('/tasks', {
        deviceId: Number(newTask.deviceId),
        formulaId: Number(newTask.formulaId),
        taskDate: date,
      });
      setNewTask({ deviceId: '', formulaId: '' });
      loadTasks();
    } catch (err) {
      alert('创建失败：' + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tasks/${id}`, { status });
      loadTasks();
    } catch (err) {
      alert('更新失败');
    }
  };

  return (
    <div>
      <h3>任务下发</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          日期：
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }} />
        </label>
        <button onClick={loadTasks}
          style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>
          刷新
        </button>
      </div>

      <div style={{ marginBottom: 20, padding: 16, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>新建任务</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={newTask.deviceId}
            onChange={e => setNewTask(t => ({ ...t, deviceId: e.target.value }))}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }}
          >
            <option value="">选择设备</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            value={newTask.formulaId}
            onChange={e => setNewTask(t => ({ ...t, formulaId: e.target.value }))}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }}
          >
            <option value="">选择配方</option>
            {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button
            onClick={createTask}
            disabled={creating}
            style={{ padding: '6px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {creating ? '创建中...' : '创建任务'}
          </button>
        </div>
      </div>

      <h4 style={{ marginBottom: 8 }}>当日任务（{date}）</h4>
      {tasks.length === 0 && <p style={{ color: '#999' }}>当日暂无任务</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>设备</th>
            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>配方</th>
            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>原料组成</th>
            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e0e0e0', textAlign: 'center' }}>状态</th>
            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e0e0e0', textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                {t.device?.name ?? `设备#${t.deviceId}`}
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                {t.formula?.name ?? '-'}
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                {t.formula?.items?.map(it => `${it.material}(${it.targetWeightKg}kg)`).join('，') ?? '-'}
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: (STATUS_COLOR[t.status] ?? '#999') + '22',
                  color: STATUS_COLOR[t.status] ?? '#999',
                  fontWeight: 600,
                }}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                <button onClick={() => updateStatus(t.id, 'pending')}
                  style={{ marginRight: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, border: '1px solid #ddd' }}>
                  待执行
                </button>
                <button onClick={() => updateStatus(t.id, 'mixing')}
                  style={{ marginRight: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, border: '1px solid #2196f3', color: '#2196f3' }}>
                  进行中
                </button>
                <button onClick={() => updateStatus(t.id, 'done')}
                  style={{ padding: '3px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, border: '1px solid #4caf50', color: '#4caf50' }}>
                  完成
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
