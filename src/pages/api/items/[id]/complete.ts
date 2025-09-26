import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/repositories/prisma';
import { nowInMoscow } from '../../../../lib/time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = Number(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (!item.finalBreadcrumbs || !item.moveStatus) {
    res.status(400).json({ error: 'Перед завершением заполните статус и хлебные крошки' });
    return;
  }

  const now = nowInMoscow();
  const updated = await prisma.item.update({
    where: { id },
    data: {
      priorityRaw: 'Средний',
      completedBy: user.email,
      completedAt: now,
      isCompleted: true,
      updatedAt: now
    }
  });

  res.status(200).json({ item: updated });
}
