import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookie } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  clearAuthCookie(res);
  res.status(200).json({ ok: true });
}
