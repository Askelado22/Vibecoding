import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@prisma/client';
import { prisma } from '../../../lib/repositories/prisma';
import { loginSchema } from '../../../lib/validation';
import { setAuthCookie, signToken, verifyPassword } from '../../../lib/auth';
import { isUserRole } from '../../../lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const { email, password } = parseResult.data;
  let user: User | null = null;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error('[auth/login] Prisma error', error);
    res.status(500).json({
      error:
        'Не удалось подключиться к базе данных. Убедитесь, что файл .env создан и выполнены миграции (npm run prisma:migrate).'
    });
    return;
  }
  if (!user) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }

  const role = isUserRole(user.role) ? user.role : 'worker';
  const token = signToken({ userId: user.id, email: user.email, role });
  setAuthCookie(res, token);
  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      role,
      displayName: user.displayName
    }
  });
}
