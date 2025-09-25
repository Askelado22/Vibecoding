import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { setAutoSync, ensureScheduler } from '../../../../lib/sync/scheduler';

ensureScheduler();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const enabled = Boolean(req.body?.enabled);
  await setAutoSync(enabled);
  res.status(200).json({ enabled });
}
