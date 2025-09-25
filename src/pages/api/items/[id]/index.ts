import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/repositories/prisma';
import { updateItemSchema } from '../../../../lib/validation';
import { nowInMoscow } from '../../../../lib/time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = Number(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const parseResult = updateItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const { finalBreadcrumbs, moveStatus, comment, updatedAt } = parseResult.data;

  if (updatedAt) {
    const updatedAtDate = new Date(updatedAt);
    if (existing.updatedAt.getTime() > updatedAtDate.getTime()) {
      res.status(409).json({ error: 'Запись была обновлена другим пользователем', item: existing });
      return;
    }
  }

  const data: Record<string, any> = { comment: comment ?? undefined };

  if (moveStatus !== undefined) {
    data.moveStatus = moveStatus ?? null;
    data.moveStatusSetBy = user.email;
    data.moveStatusSetAt = nowInMoscow();
  }

  if (finalBreadcrumbs !== undefined) {
    data.finalBreadcrumbs = finalBreadcrumbs ?? null;
    data.breadcrumbsSetBy = user.email;
    data.breadcrumbsSetAt = nowInMoscow();
  }

  data.updatedAt = nowInMoscow();

  const updated = await prisma.item.update({
    where: { id },
    data
  });

  res.status(200).json({ item: updated });
}
