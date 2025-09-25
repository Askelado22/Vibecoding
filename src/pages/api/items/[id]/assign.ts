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

  const updated = await prisma.item.update({
    where: { id },
    data: {
      assigneeName: user.displayName,
      updatedAt: nowInMoscow()
    }
  });

  res.status(200).json({ item: updated });
}
