import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import { getQueueItems } from '../../../lib/repositories/itemRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const queue = await getQueueItems(user.displayName);
  if (queue.length === 0) {
    res.status(200).json({ item: null, index: -1, total: 0 });
    return;
  }

  const currentId = req.query.currentId ? Number(req.query.currentId) : undefined;
  let index = 0;
  if (currentId) {
    const currentIndex = queue.findIndex((item) => item.id === currentId);
    index = currentIndex >= 0 && currentIndex < queue.length - 1 ? currentIndex + 1 : currentIndex;
  }
  index = Math.min(Math.max(index, 0), queue.length - 1);
  res.status(200).json({ item: queue[index], index, total: queue.length });
}
