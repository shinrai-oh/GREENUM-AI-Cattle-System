import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function signToken(payload: { id: number; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}
