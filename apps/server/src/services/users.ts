import { Prisma, type User } from '@prisma/client';
import { z } from 'zod';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../auth.js';
import { prisma } from '../db.js';
import { fail, parseInput } from '../errors.js';
import { RateLimiter } from '../rateLimit.js';

const usernameSchema = z
  .string({ required_error: 'Choose a username' })
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3–20 letters, numbers or underscores');

const signUpSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name can’t be empty')
    .max(40, 'Display name is too long')
    .optional(),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name can’t be empty').max(40, 'Display name is too long'),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid color'),
});

export const AVATAR_COLORS = [
  '#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#a855f7',
];

const colorFor = (username: string) => {
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
};

// 10 failed sign-ins per identifier+IP per 15 minutes.
export const signInLimiter = new RateLimiter(10, 15 * 60 * 1000);

export async function signUp(input: unknown): Promise<User> {
  const data = parseInput(signUpSchema, input);
  try {
    return await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        displayName: data.displayName ?? data.username,
        passwordHash: await hashPassword(data.password),
        avatarColor: colorFor(data.username),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = String(err.meta?.target ?? '');
      if (target.includes('email')) {
        throw fail('CONFLICT', 'An account with that email already exists', { field: 'email' });
      }
      throw fail('CONFLICT', 'That username is taken', { field: 'username' });
    }
    throw err;
  }
}

export async function signIn(input: { identifier: string; password: string }, ip: string): Promise<User> {
  const identifier = String(input.identifier ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  if (!identifier || !password) throw fail('BAD_USER_INPUT', 'Enter your username or email and password');

  const key = `${ip}|${identifier}`;
  if (!signInLimiter.allow(key)) {
    throw fail('RATE_LIMITED', 'Too many attempts. Try again in a few minutes.');
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  const ok = user ? await verifyPassword(user.passwordHash, password) : (await burnPasswordCheck(password), false);
  if (!user || !ok) {
    signInLimiter.hit(key);
    throw fail('UNAUTHENTICATED', 'Incorrect username/email or password');
  }
  signInLimiter.reset(key);
  return user;
}

export const getUser = (id: string) => prisma.user.findUnique({ where: { id } });

export async function searchUsers(viewerId: string, query: string): Promise<User[]> {
  const q = query.trim().toLowerCase().replace(/^@/, '');
  if (q.length < 2) return [];
  return prisma.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [
        { username: { startsWith: q } },
        { displayName: { startsWith: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { username: 'asc' },
    take: 10,
  });
}

export async function updateProfile(userId: string, input: unknown): Promise<User> {
  const data = parseInput(profileSchema, input);
  return prisma.user.update({ where: { id: userId }, data });
}
