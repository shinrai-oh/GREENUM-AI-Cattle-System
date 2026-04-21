import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function FormulaEditor({ value, onChange }) {
  const [name, setName] = useState(value?.name || '');
  const [items, setItems] = useState(value?.items || []);

  useEffect(() => {
    onChange({ name, items });
  }, [name, items]);

  const addItem = () => setItems([...items, { material: '', targetWeightKg: 0 }]);
  const updateItem = (idx, patch) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input placeholder="配方名称" value={name} onChange={e => setName(e.target.value)} />
      <div>
        <button onClick={addItem}>添加原料</button>
      </div>
      {items.map((it, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ flex: 2 }} placeholder="原料名称" value={it.material} onChange={e => updateItem(idx, { material: e.target.value })} />
          <input style={{ flex: 1 }} type="number" placeholder="目标重量(kg)" value={it.targetWeightKg} onChange={e => updateItem(idx, { targetWeightKg: Number(e.target.value) })} />
          <button onClick={() => removeItem(idx)}>删除</button>
        </div>
      ))}
    </div>
  );
}

export default function Formulas() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formValue, setFormValue] = useState(null);

  const load = () => api.get('/formulas').then(res => setList(res.data));
  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing('new');
    setFormValue({ name: '', items: [] });
  };
  const startEdit = (f) => {
    setEditing(f.id);
    setFormValue({ name: f.name, items: f.items });
  };
  const cancel = () => {
    setEditing(null);
    setFormValue(null);
  };
  const save = async () => {
    if (editing === 'new') {
      await api.post('/formulas', formValue);
    } else {
      await api.put(`/formulas/${editing}`, formValue);
    }
    cancel();
    load();
  };
  const remove = async (id) => {
    await api.delete(`/formulas/${id}`);
    load();
  };

  return (
    <div>
      <h3>配方管理</h3>
      {editing ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <FormulaEditor value={formValue} onChange={setFormValue} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save}>保存</button>
            <button onClick={cancel}>取消</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button onClick={startCreate}>新建配方</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>名称</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>组成</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(f => (
                <tr key={f.id}>
                  <td style={{ borderBottom: '1px solid #eee' }}>{f.name}</td>
                  <td style={{ borderBottom: '1px solid #eee' }}>
                    {f.items.map(it => `${it.material}(${it.targetWeightKg}kg)`).join('，')}
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <button onClick={() => startEdit(f)}>编辑</button>
                    <button onClick={() => remove(f.id)} style={{ marginLeft: 6 }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

