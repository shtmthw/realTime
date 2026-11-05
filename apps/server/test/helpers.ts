import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { signInLimiter } from '../src/services/users.js';
import { sendLimiter, typingLimiter } from '../src/services/messages.js';

export async function resetDb() {
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();
  signInLimiter.clear();
  sendLimiter.clear();
  typingLimiter.clear();
}

export interface GqlResult<T = Record<string, any>> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string; field?: string } }>;
}

/** A tiny GraphQL client that keeps its own cookie jar, like a browser tab. */
export class Client {
  cookie = '';
  constructor(private app: FastifyInstance) {}

  async gql<T = Record<string, any>>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GqlResult<T>> {
    const res = await this.app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      payload: { query, variables },
    });
    const setCookie = res.headers['set-cookie'];
    for (const header of [setCookie].flat()) {
      if (!header) continue;
      const pair = header.split(';')[0]!;
      this.cookie = pair.endsWith('=') ? '' : pair;
      // An expired/cleared cookie has an empty value.
      if (/expires=Thu, 01 Jan 1970/i.test(header) || pair.split('=')[1] === '') this.cookie = '';
    }
    return res.json() as GqlResult<T>;
  }
}

export async function signUp(client: Client, username: string, extra: Record<string, string> = {}) {
  const res = await client.gql(
    `mutation($input: SignUpInput!) { signUp(input: $input) { id username displayName } }`,
    { input: { username, email: `${username}@test.dev`, password: 'password123', ...extra } },
  );
  if (res.errors) throw new Error(res.errors[0]!.message);
  return res.data!.signUp as { id: string; username: string; displayName: string };
}

export async function newApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}
