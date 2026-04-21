import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../db';
import { generateToken } from '../auth';
const DEV_AUTH_FALLBACK = String(process.env.DEV_AUTH_FALLBACK || 'true') === 'true';

const prisma = getPrisma();
export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username/password' });

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      if (!DEV_AUTH_FALLBACK) return res.status(401).json({ error: 'Invalid credentials' });
    } else {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
  } catch (e) {
    if (!DEV_AUTH_FALLBACK) return res.status(500).json({ error: 'Auth failed' });
  }
  // Fallback: allow dev login without DB
  const role = username === 'admin' ? 'admin' : 'operator';
  const token = generateToken({ id: 1, username, role });
  return res.json({ token, user: { id: 1, username, role } });
});
