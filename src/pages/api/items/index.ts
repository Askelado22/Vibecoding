import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import { listItems } from '../../../lib/repositories/itemRepository';
import { paginationSchema } from '../../../lib/validation';
import { MOVE_STATUS_OPTIONS } from '../../../lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const pagination = paginationSchema.parse({
    page: req.query.page ?? '1',
    pageSize: req.query.pageSize ?? '25'
  });

  const status = req.query.status;
  const filters = {
    assignee: (req.query.assignee as string) || undefined,
    status: status && MOVE_STATUS_OPTIONS.includes(status as any)
      ? (status as any)
      : undefined,
    hasBreadcrumbs: (req.query.hasBreadcrumbs as 'yes' | 'no' | undefined) || undefined,
    isCompleted: (req.query.isCompleted as 'yes' | 'no' | undefined) || undefined,
    query: (req.query.query as string) || undefined,
    dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
    dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
  } as const;

  const { items, total } = await listItems(filters, pagination.page, pagination.pageSize);

  res.status(200).json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
}
