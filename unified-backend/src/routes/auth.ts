import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { signToken, authenticate, AuthRequest } from '../auth';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const user = await prisma.sharedUser.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

// POST /api/v1/auth/users  (仅管理员)
router.post('/users', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  const { username, password, role = 'operator' } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const exists = await prisma.sharedUser.findUnique({ where: { username } });
  if (exists) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.sharedUser.create({
    data: { username, passwordHash, role },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  res.status(201).json(user);
});

// GET /api/v1/auth/users  (仅管理员)
router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  const users = await prisma.sharedUser.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

export default router;
