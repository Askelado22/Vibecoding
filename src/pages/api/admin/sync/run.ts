import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { runSync } from '../../../../lib/sync/engine';
import { ensureScheduler } from '../../../../lib/sync/scheduler';

ensureScheduler();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await runSync();
  res.status(200).json({ ok: true });
}
