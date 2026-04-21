import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

function RectEditor({ color, rect, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState(null);

  const onMouseDown = (e) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    setStart({ x, y });
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragging || !start) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const w = x - start.x;
    const h = y - start.y;
    onChange({ x: start.x, y: start.y, width: Math.max(1, w), height: Math.max(1, h) });
  };
  const onMouseUp = () => setDragging(false);

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {rect && (
        <div
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            border: `2px solid ${color}`,
            background: `${color}22`
          }}
        />
      )}
    </div>
  );
}

export default function ROI() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [roi1, setRoi1] = useState(null);
  const [roi2, setRoi2] = useState(null);
  const [loadingROI, setLoadingROI] = useState(false);

  useEffect(() => {
    api.get('/devices').then(res => setDevices(res.data));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingROI(true);
    api.get(`/roi/${selected}`).then(res => {
      setRoi1(res.data.roi1);
      setRoi2(res.data.roi2);
    }).finally(() => setLoadingROI(false));
  }, [selected]);

  const save = async () => {
    await api.post(`/roi/${selected}`, { roi1, roi2 });
    alert('ROI 已保存');
  };

  return (
    <div>
      <h3>摄像机标定 (ROI 配置)</h3>
      <div style={{ display: 'flex', gap: 12 }}>
        <select value={selected || ''} onChange={e => setSelected(Number(e.target.value))}>
          <option value="" disabled>选择 TMR 车</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button onClick={save} disabled={!selected}>保存 ROI</button>
      </div>
      {!selected && <p style={{ marginTop: 12 }}>请选择设备以进行标定。</p>}
      {selected && (
        <div style={{ position: 'relative', width: 960, height: 540, marginTop: 12, border: '1px solid #ddd' }}>
          {/* 占位视频画面：此处用静态图示意，后续可切换为实时视频 */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 960 540"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <rect width="960" height="540" fill="#2a2a2a" />
            <line x1="0" y1="0" x2="960" y2="540" stroke="#444" strokeWidth="1" />
            <line x1="960" y1="0" x2="0" y2="540" stroke="#444" strokeWidth="1" />
            <rect x="380" y="220" width="200" height="100" rx="6" fill="#3a3a3a" stroke="#555" strokeWidth="1" />
            <text x="480" y="264" fontFamily="sans-serif" fontSize="14" fill="#888" textAnchor="middle">摄像机画面</text>
            <text x="480" y="286" fontFamily="sans-serif" fontSize="12" fill="#555" textAnchor="middle">（未连接 / 离线占位）</text>
          </svg>
          <RectEditor color="#00aa00" rect={roi1} onChange={setRoi1} />
          <RectEditor color="#cc0000" rect={roi2} onChange={setRoi2} />
          <div style={{ position: 'absolute', left: 8, bottom: 8, background: '#0008', color: '#fff', padding: '6px 8px', borderRadius: 4 }}>
            <div>绿色框: ROI-1（投料区）</div>
            <div>红色框: ROI-2（仪表区）</div>
          </div>
        </div>
      )}
    </div>
  );
}

