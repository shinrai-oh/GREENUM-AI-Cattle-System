/**
 * 绿姆山牛场AI系统 — 自动截图工具
 * 使用 Edge CDP (Chrome DevTools Protocol) + Node.js 22 内置 WebSocket
 * 无需安装任何 npm 包
 *
 * 用法: node take-screenshots.mjs
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ─── 配置 ────────────────────────────────────────────────────────────────────

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT  = 9223;   // 专用调试端口，避免与现有 Edge 冲突
const OUT_DIR   = new URL('../screenshots', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const SYSTEMS = {
  imf: {
    name: 'IMF肉质评估系统',
    baseUrl: 'http://localhost:8081',
    loginUrl: 'http://localhost:8081',
    loginScript: `
      // 直接调用后端API登录，写入 localStorage 并同步更新 Api 内存对象
      // IMF 是 SPA hash 路由，hashchange 不重新加载页面，
      // 所以只写 localStorage 不够，还需同步 Api.token 让 router() 看到登录状态
      const r = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      if (!r.ok) throw new Error('IMF login API failed: ' + r.status);
      const d = await r.json();
      localStorage.setItem('imf_token', d.token);
      localStorage.setItem('imf_user', JSON.stringify(d.user));
      if (typeof Api !== 'undefined') {
        Api.token = d.token;
        Api.me = d.user;
      }
    `,
    pages: [
      { name: '01_登录页面',    url: 'http://localhost:8081',         skipLogin: true,  waitMs: 2000 },
      { name: '02_牛群档案',    url: 'http://localhost:8081/#/cattle', waitMs: 3000 },
      { name: '03_新测量',      url: 'http://localhost:8081/#/measure', waitMs: 2000 },
      { name: '04_报表',        url: 'http://localhost:8081/#/reports', waitMs: 3000 },
    ],
  },
  monitoring: {
    name: '行为监控系统',
    baseUrl: 'http://localhost:8082',
    loginUrl: 'http://localhost:8082',
    loginScript: `
      await waitFor(() => document.querySelector('input[placeholder*="用户名"], input[placeholder*="username"], input[type="text"]'));
      const u = document.querySelector('input[placeholder*="用户名"], input[placeholder*="username"], input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      const b = document.querySelector('button[type="submit"], button.login-btn, button');
      if (u) { u.value = 'admin'; u.dispatchEvent(new Event('input', {bubbles:true})); }
      if (p) { p.value = 'admin123'; p.dispatchEvent(new Event('input', {bubbles:true})); }
      if (b) b.click();
    `,
    pages: [
      { name: '01_登录页面',    url: 'http://localhost:8082',                     skipLogin: true, waitMs: 2000 },
      { name: '02_仪表板',      url: 'http://localhost:8082/dashboard',            waitMs: 4000 },
      { name: '03_视频监控',    url: 'http://localhost:8082/monitoring',           waitMs: 4000 },
      { name: '04_数据统计',    url: 'http://localhost:8082/statistics',           waitMs: 4000 },
      { name: '05_发情分析',    url: 'http://localhost:8082/statistics/estrus',    waitMs: 3000 },
      { name: '06_牛只管理',    url: 'http://localhost:8082/cattle',               waitMs: 3000 },
      { name: '07_系统管理',    url: 'http://localhost:8082/management',           waitMs: 3000 },
    ],
  },
  tmr: {
    name: 'TMR饲料配比系统',
    baseUrl: 'http://localhost:8083',
    loginUrl: 'http://localhost:8083',
    loginScript: `
      // 直接调用后端API登录，将 token 写入 localStorage
      // React 18 合成事件不响应普通 DOM input 事件，UI 交互方式无效
      const r = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      if (!r.ok) throw new Error('TMR login API failed: ' + r.status);
      const d = await r.json();
      localStorage.setItem('tmr_token', d.token);
    `,
    pages: [
      { name: '01_登录页面',    url: 'http://localhost:8083',                waitLogin: true, skipLogin: true, waitMs: 2000 },
      { name: '02_实时看板',    url: 'http://localhost:8083',                waitMs: 4000 },
      { name: '03_配方管理',    url: 'http://localhost:8083/formulas',       waitMs: 3000 },
      { name: '04_任务下发',    url: 'http://localhost:8083/tasks',          waitMs: 3000 },
      { name: '05_数据报表',    url: 'http://localhost:8083/reports',        waitMs: 3000 },
    ],
  },
};

// ─── CDP 辅助函数 ────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = e => reject(e);
      this.ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method) {
          const cbs = this.eventListeners.get(msg.method) || [];
          cbs.forEach(cb => cb(msg.params));
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      // 60s timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 60000);
    });
  }

  on(event, cb) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(cb);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function getOrCreateTab(cdpPort) {
  const info = await httpGet(`http://localhost:${cdpPort}/json`);
  const tabs = JSON.parse(info);
  const page = tabs.find(t => t.type === 'page');
  if (page) return page;
  // Create new tab
  await httpGet(`http://localhost:${cdpPort}/json/new?about:blank`);
  await sleep(500);
  const info2 = await httpGet(`http://localhost:${cdpPort}/json`);
  const tabs2 = JSON.parse(info2);
  return tabs2.find(t => t.type === 'page');
}

async function navigate(client, url, waitMs) {
  await client.send('Page.enable');
  await client.send('Page.navigate', { url });
  // Wait for load
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 15000);
    client.on('Page.loadEventFired', () => { clearTimeout(timeout); resolve(); });
  });
  if (waitMs > 0) await sleep(waitMs);
}

async function screenshot(client, filePath) {
  // Set viewport to 1440x900
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const buf = Buffer.from(result.data, 'base64');
  fs.writeFileSync(filePath, buf);
  console.log(`  ✓ 已保存: ${path.basename(filePath)} (${Math.round(buf.length / 1024)}KB)`);
}

async function executeLogin(client, loginScript) {
  // Wrap in async function with waitFor helper
  const wrappedScript = `
    (async () => {
      function waitFor(fn, timeout = 8000) {
        return new Promise((resolve, reject) => {
          const start = Date.now();
          const check = () => {
            const el = fn();
            if (el) { resolve(el); return; }
            if (Date.now() - start > timeout) { reject(new Error('waitFor timeout')); return; }
            setTimeout(check, 200);
          };
          check();
        });
      }
      try {
        ${loginScript}
        return { ok: true };
      } catch(e) {
        return { ok: false, error: e.message };
      }
    })()
  `;
  const result = await client.send('Runtime.evaluate', {
    expression: wrappedScript,
    awaitPromise: true,
    returnByValue: true,
  });
  return result?.result?.value;
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

async function main() {
  // 确保输出目录存在
  for (const key of Object.keys(SYSTEMS)) {
    fs.mkdirSync(path.join(OUT_DIR, key), { recursive: true });
  }

  console.log('🚀 启动 Edge（调试模式）...');
  // 杀死已有调试端口的 Edge 实例（如有）
  try { execSync(`powershell -Command "Stop-Process -Name msedge -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' }); } catch {}
  await sleep(1000);

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--start-maximized',
    'about:blank',
  ], { detached: false, stdio: 'ignore' });

  console.log(`  Edge PID: ${edgeProc.pid}`);
  await sleep(3000);

  // 验证 CDP 可访问
  let tabInfo;
  for (let i = 0; i < 10; i++) {
    try {
      tabInfo = await httpGet(`http://localhost:${CDP_PORT}/json`);
      break;
    } catch {
      await sleep(1000);
    }
  }
  if (!tabInfo) throw new Error('Edge CDP 无法连接，请重试');
  console.log('  CDP 已连接\n');

  // 遍历三个系统
  for (const [key, sys] of Object.entries(SYSTEMS)) {
    console.log(`\n📂 [${sys.name}]`);

    // 获取标签页
    const tab = await getOrCreateTab(CDP_PORT);
    const client = new CDPClient(tab.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Runtime.enable');

    let loggedIn = false;

    for (const page of sys.pages) {
      console.log(`  → ${page.name}`);

      if (page.skipLogin) {
        // 只截登录页（未登录状态）
        await navigate(client, page.url, page.waitMs || 2000);
      } else {
        // 需要登录状态
        if (!loggedIn) {
          // 先导航到登录页，执行登录
          await navigate(client, sys.loginUrl, 2000);
          const loginResult = await executeLogin(client, sys.loginScript);
          if (!loginResult?.ok) {
            console.log(`    ⚠ 登录脚本警告: ${loginResult?.error || '未知'}（继续尝试）`);
          }
          await sleep(3000);
          loggedIn = true;
        }
        await navigate(client, page.url, page.waitMs || 3000);
      }

      const filePath = path.join(OUT_DIR, key, `${page.name}.png`);
      await screenshot(client, filePath);
    }

    client.close();
  }

  console.log('\n\n✅ 所有截图完成！');
  console.log(`📁 保存位置: ${OUT_DIR}`);
  console.log('\n截图文件列表:');
  for (const key of Object.keys(SYSTEMS)) {
    const dir = path.join(OUT_DIR, key);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    console.log(`  ${key}/`);
    files.forEach(f => console.log(`    - ${f}`));
  }

  edgeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
