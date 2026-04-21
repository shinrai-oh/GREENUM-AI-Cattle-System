import { fileURLToPath } from 'url';
import path from 'path';
import { Service } from 'node-windows';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodePath = path.resolve(__dirname, '../node-v20.17.0-win-x64/node.exe');
const scriptPath = path.resolve(__dirname, 'index.js');

// Create a new service object
const svc = new Service({
  name: 'TMRMonitoringBackend',
  description: 'TMR 饲料配比智能监测系统 后端服务',
  script: scriptPath,
  nodePath,
  env: [{ name: 'PORT', value: '3001' }],
  wait: 2,
  grow: 0.5,
  maxRestarts: 10
});

svc.on('install', () => {
  console.log('Service installed. Starting...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Service already installed. Restarting...');
  svc.restart();
});

svc.on('error', (e) => {
  console.error('Service error:', e);
});

svc.install();

