import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/repositories/prisma';
import { hashPassword } from '../../../../lib/auth';
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'worker']),
  displayName: z.string().min(1)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, displayName: true, createdAt: true }
    });
    res.status(200).json({ users });
    return;
  }

  if (req.method === 'POST') {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { email, password, role, displayName } = parsed.data;
    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: { email, passwordHash, role, displayName }
    });
    res.status(201).json({ user: { id: created.id, email, role, displayName } });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
