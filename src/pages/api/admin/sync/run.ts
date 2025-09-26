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

  try {
    await runSync();
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Manual sync failed', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    res.status(502).json({ ok: false, error: message });
  }
}
