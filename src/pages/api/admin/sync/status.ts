import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { getOrCreateSyncSettings } from '../../../../lib/repositories/syncSettingsRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const settings = await getOrCreateSyncSettings();
  res.status(200).json({ settings });
}
