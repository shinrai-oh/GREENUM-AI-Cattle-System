import { Router } from 'express';
import { getPrisma } from '../db';
import { authenticate } from '../auth';

export const cattleRouter = Router();

cattleRouter.get('/', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const search = String(req.query.search || '').trim();

  const where = search ? {
    OR: [
      { earTagId: { contains: search } },
      { breed: { contains: search } },
    ]
  } : {};

  try {
    const [items, total] = await Promise.all([
      prisma.cattleProfile.findMany({ where, skip: (page-1)*pageSize, take: pageSize }),
      prisma.cattleProfile.count({ where }),
    ]);
    return res.json({ items: items.map(m => ({
      id: m.id,
      ear_tag_id: m.earTagId,
      birth_date: m.birthDate?.toISOString().slice(0,10),
      breed: m.breed,
      sex: m.sex,
      sire_ear_tag_id: m.sireEarTagId,
      dam_ear_tag_id: m.damEarTagId,
      group_id: m.groupId || null,
    })), total });
  } catch (e) {
    // Fallback: DB 未就绪时返回空列表，避免前端页面报错
    return res.json({ items: [], total: 0 });
  }
});

cattleRouter.post('/', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const payload = req.body || {};
  try {
    const created = await prisma.cattleProfile.create({ data: {
      earTagId: payload.ear_tag_id,
      birthDate: payload.birth_date ? new Date(payload.birth_date) : null,
      breed: payload.breed || null,
      sex: payload.sex || null,
      sireEarTagId: payload.sire_ear_tag_id || null,
      damEarTagId: payload.dam_ear_tag_id || null,
      groupId: payload.group_id || null,
    }});
    res.json({ id: created.id, ear_tag_id: created.earTagId });
  } catch (e) {
    res.status(400).json({ error: 'Create failed', detail: String(e) });
  }
});

cattleRouter.get('/:earTagId', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const earTagId = req.params.earTagId;
  try {
    const c = await prisma.cattleProfile.findUnique({ where: { earTagId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: c.id,
      ear_tag_id: c.earTagId,
      birth_date: c.birthDate?.toISOString().slice(0,10),
      breed: c.breed,
      sex: c.sex,
      sire_ear_tag_id: c.sireEarTagId,
      dam_ear_tag_id: c.damEarTagId,
      group_id: c.groupId || null,
    });
  } catch (e) {
    return res.status(404).json({ error: 'Not found' });
  }
});

cattleRouter.put('/:earTagId', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const earTagId = req.params.earTagId;
  const payload = req.body || {};
  try {
    const updated = await prisma.cattleProfile.update({ where: { earTagId }, data: {
      birthDate: payload.birth_date ? new Date(payload.birth_date) : undefined,
      breed: payload.breed,
      sex: payload.sex,
      sireEarTagId: payload.sire_ear_tag_id,
      damEarTagId: payload.dam_ear_tag_id,
      groupId: payload.group_id,
    }});
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Update failed', detail: String(e) });
  }
});
