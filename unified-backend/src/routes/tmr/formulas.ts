import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/tmr/formulas
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const formulas = await prisma.tmrFeedFormula.findMany({ orderBy: { id: 'asc' } });
  res.json(formulas);
});

// GET /api/v1/tmr/formulas/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const formula = await prisma.tmrFeedFormula.findUnique({ where: { id: Number(req.params.id) } });
  if (!formula) { res.status(404).json({ error: '配方不存在' }); return; }
  res.json(formula);
});

// POST /api/v1/tmr/formulas
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, items } = req.body;
  if (!name || !items) { res.status(400).json({ error: 'name 和 items 不能为空' }); return; }
  const formula = await prisma.tmrFeedFormula.create({ data: { name, items } });
  res.status(201).json(formula);
});

// PUT /api/v1/tmr/formulas/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, items } = req.body;
  const formula = await prisma.tmrFeedFormula.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(items !== undefined && { items }),
    },
  });
  res.json(formula);
});

// DELETE /api/v1/tmr/formulas/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.tmrFeedFormula.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
