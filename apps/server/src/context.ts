import { fail } from './errors.js';

/** Mutated by resolvers; the HTTP layer turns it into Set-Cookie headers. */
export interface SessionChange {
  /** string = set this token, null = clear the cookie, undefined = leave as is. */
  token?: string | null;
}

export interface Context {
  userId: string | null;
  ip: string;
  session: SessionChange;
}

export function requireUser(ctx: Context): string {
  if (!ctx.userId) throw fail('UNAUTHENTICATED', 'Please sign in to continue');
  return ctx.userId;
}
