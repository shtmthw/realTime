import { GraphQLError } from 'graphql';
import { z } from 'zod';

export type ErrorCode =
  'BAD_USER_INPUT' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED';

export const fail = (code: ErrorCode, message: string, extensions: Record<string, unknown> = {}) =>
  new GraphQLError(message, { extensions: { code, ...extensions } });

/** Validate untrusted input; throws a friendly BAD_USER_INPUT error naming the field. */
export function parseInput<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
  /** Field name to report when the schema validates a bare value rather than an object. */
  field?: string,
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    throw fail('BAD_USER_INPUT', issue.message, { field: issue.path.join('.') || field });
  }
  return result.data;
}
