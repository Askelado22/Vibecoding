import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { prisma } from './repositories/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_NAME = 'ggsel_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: 'admin' | 'worker';
};

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_MAX_AGE });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}

export function setAuthCookie(res: NextApiResponse, token: string) {
  res.setHeader(
    'Set-Cookie',
    serialize(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_MAX_AGE
    })
  );
}

export function clearAuthCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    serialize(TOKEN_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: -1
    })
  );
}

export async function getUserFromRequest(req: NextApiRequest) {
  const token = req.cookies[TOKEN_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  return user;
}

export const requireAuth = async (
  req: NextApiRequest,
  res: NextApiResponse,
  roles?: Array<'admin' | 'worker'>
) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return user;
};

export async function getUserFromContext(context: {
  req: NextApiRequest;
}) {
  const token = context.req.cookies[TOKEN_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.userId } });
}

export function getTokenName() {
  return TOKEN_NAME;
}
