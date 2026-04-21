import { Service } from 'node-windows';

const svc = new Service({ name: 'TMRMonitoringBackend' });

svc.on('uninstall', () => {
  console.log('Service uninstalled.');
});

svc.on('error', (e) => {
  console.error('Service error:', e);
});

svc.uninstall();

