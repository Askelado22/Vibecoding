import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import { prisma } from '../../../lib/repositories/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const items = await prisma.item.findMany();

  const completedByUser: Record<string, number> = {};
  let totalCompletionTime = 0;
  let completionCount = 0;
  const statusChanges: Record<string, number> = {};
  const breadcrumbsChanges: Record<string, number> = {};
  const dailyActivity: Record<string, number> = {};

  for (const item of items) {
    if (item.completedBy) {
      completedByUser[item.completedBy] = (completedByUser[item.completedBy] || 0) + 1;
      if (item.completedAt) {
        const diff = item.completedAt.getTime() - item.createdAt.getTime();
        totalCompletionTime += diff;
        completionCount += 1;
        const dayKey = item.completedAt.toISOString().slice(0, 10);
        dailyActivity[dayKey] = (dailyActivity[dayKey] || 0) + 1;
      }
    }
    if (item.moveStatusSetBy) {
      statusChanges[item.moveStatusSetBy] = (statusChanges[item.moveStatusSetBy] || 0) + 1;
    }
    if (item.breadcrumbsSetBy) {
      breadcrumbsChanges[item.breadcrumbsSetBy] = (breadcrumbsChanges[item.breadcrumbsSetBy] || 0) + 1;
    }
  }

  const averageCompletionMs = completionCount ? totalCompletionTime / completionCount : 0;

  res.status(200).json({
    completedByUser,
    averageCompletionMs,
    statusChanges,
    breadcrumbsChanges,
    dailyActivity
  });
}
