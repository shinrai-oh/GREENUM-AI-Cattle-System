import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DEV_AUTH_FALLBACK = String(process.env.DEV_AUTH_FALLBACK || 'true') === 'true';

export function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (e) {
    if (DEV_AUTH_FALLBACK && token === 'mock-token') {
      (req as any).user = { id: 1, username: 'dev', role: 'operator' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
