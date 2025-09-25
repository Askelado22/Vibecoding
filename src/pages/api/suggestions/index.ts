import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import { getSuggestions } from '../../../lib/services/suggestionsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const title = (req.query.title as string) || '';
  const description = (req.query.description as string) || '';
  const suggestions = await getSuggestions(title, description);
  res.status(200).json({ suggestions });
}
