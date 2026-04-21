import { Router } from 'express';
import { getPrisma } from '../db';
import { authenticate } from '../auth';
import { calculateMockGrade } from '../mockGrade';

export const measurementsRouter = Router();

measurementsRouter.get('/cattle/:earTagId/measurements', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const earTagId = req.params.earTagId;
  try {
    const cattle = await prisma.cattleProfile.findUnique({ where: { earTagId } });
    if (!cattle) return res.status(404).json({ error: 'Cattle not found' });
    const items = await prisma.measurement.findMany({ where: { cattleProfileId: cattle.id }, orderBy: { measurementDate: 'asc' } });
    return res.json(items.map(m => ({
      id: m.id,
      measurement_date: m.measurementDate.toISOString(),
      backfat_thickness: m.backfatThickness,
      ribeye_area: m.ribeyeArea,
      intramuscular_fat_imf: m.intramuscularFatImf,
      ribeye_height: m.ribeyeHeight,
      ribeye_width: m.ribeyeWidth,
      notes: m.notes,
      simulated_grade: m.simulatedGrade,
    })));
  } catch (e) {
    return res.json([]);
  }
});

measurementsRouter.post('/measurements', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const body = req.body || {};
  const earTagId: string = body.ear_tag_id;
  try {
    const cattle = await prisma.cattleProfile.findUnique({ where: { earTagId } });
    if (!cattle) return res.status(400).json({ error: 'Cattle not found' });

    const userId = (req as any).user?.id || null;
    if (!userId) return res.status(401).json({ error: 'No user' });

    const grade = calculateMockGrade(body.intramuscular_fat_imf ? Number(body.intramuscular_fat_imf) : null);
    const created = await prisma.measurement.create({ data: {
      cattleProfileId: cattle.id,
      userId,
      measurementDate: body.measurement_date ? new Date(body.measurement_date) : new Date(),
      backfatThickness: body.backfat_thickness != null ? Number(body.backfat_thickness) : null,
      ribeyeArea: body.ribeye_area != null ? Number(body.ribeye_area) : null,
      intramuscularFatImf: body.intramuscular_fat_imf != null ? Number(body.intramuscular_fat_imf) : null,
      ribeyeHeight: body.ribeye_height != null ? Number(body.ribeye_height) : null,
      ribeyeWidth: body.ribeye_width != null ? Number(body.ribeye_width) : null,
      notes: body.notes || null,
      simulatedGrade: grade,
    }});
    return res.json({ id: created.id, simulated_grade: grade });
  } catch (e) {
    return res.status(503).json({ error: 'DB not ready' });
  }
});
