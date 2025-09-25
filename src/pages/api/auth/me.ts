import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName
    }
  });
}
