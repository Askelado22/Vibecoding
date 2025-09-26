import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, hashPassword } from '../../../../lib/auth';
import { prisma } from '../../../../lib/repositories/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'worker']).optional(),
  displayName: z.string().min(1).optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  if (req.method === 'PATCH') {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const data: any = { ...parsed.data };
    if (data.password) {
      data.passwordHash = await hashPassword(data.password);
      delete data.password;
    }
    const updated = await prisma.user.update({
      where: { id },
      data
    });
    res.status(200).json({ user: { id: updated.id, email: updated.email, role: updated.role, displayName: updated.displayName } });
    return;
  }

  if (req.method === 'DELETE') {
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
