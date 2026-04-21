// 简易折线图：dataPoints: [{x: Date|string|number, y: number}], label: string
function drawLineChart(canvas, dataPoints, options = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight;
  ctx.clearRect(0,0,width,height);

  const padding = 32;
  const xs = dataPoints.map(p => new Date(p.x).getTime());
  const ys = dataPoints.map(p => Number(p.y || 0));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const yRange = maxY - minY || 1;
  const xRange = maxX - minX || 1;

  const scaleX = x => padding + (x - minX) / xRange * (width - 2*padding);
  const scaleY = y => height - padding - (y - minY) / yRange * (height - 2*padding);

  // axes
  ctx.strokeStyle = '#ddd';
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // line
  ctx.strokeStyle = options.color || '#0d6efd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  dataPoints.forEach((p, i) => {
    const x = scaleX(new Date(p.x).getTime());
    const y = scaleY(Number(p.y || 0));
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points
  ctx.fillStyle = options.color || '#0d6efd';
  dataPoints.forEach(p => {
    const x = scaleX(new Date(p.x).getTime());
    const y = scaleY(Number(p.y || 0));
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
  });

  // title
  if (options.title) {
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.fillText(options.title, padding, padding - 10);
  }
}

window.drawLineChart = drawLineChart;

