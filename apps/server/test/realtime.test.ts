import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { createClient, type Client as WsClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { Client, newApp, resetDb, signUp } from './helpers.js';

let app: FastifyInstance;
let port: number;
const sockets: WsClient[] = [];

beforeAll(async () => {
  app = await newApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  port = (app.server.address() as AddressInfo).port;
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});
beforeEach(resetDb);
afterEach(async () => {
  await Promise.all(sockets.splice(0).map((s) => s.dispose()));
});

const EVENTS = `subscription { events {
  __typename
  ... on MessageAdded { conversationId message { body sender { username } } }
  ... on TypingStarted { conversationId user { username } }
  ... on PresenceChanged { userId online }
  ... on ConversationUpdated { conversationId conversation { title unreadCount } }
} }`;

/** Opens a subscription as the given (signed-in) client and collects what arrives. */
function listen(cookie: string) {
  class CookieSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols, { headers: { cookie } });
    }
  }
  const events: any[] = [];
  const errors: unknown[] = [];
  const client = createClient({
    url: `ws://127.0.0.1:${port}/graphql`,
    webSocketImpl: CookieSocket,
    retryAttempts: 0,
  });
  sockets.push(client);
  client.subscribe(
    { query: EVENTS },
    {
      next: (r) => events.push(r.data!.events),
      error: (e) => errors.push(e),
      complete: () => undefined,
    },
  );
  return { events, errors };
}

const until = async (cond: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 25));
  }
};
const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms));

async function setup() {
  const [a, b, eve] = [new Client(app), new Client(app), new Client(app)];
  await signUp(a, 'alice');
  await signUp(b, 'bob');
  await signUp(eve, 'eve');
  const dm = (await a.gql(`mutation { startDirect(username: "bob") { id } }`)).data!.startDirect;
  return { a, b, eve, dm };
}

describe('realtime events', () => {
  it('delivers new messages to members instantly, including the sender’s other tabs', async () => {
    const { a, b, dm } = await setup();
    const bob = listen(b.cookie);
    const aliceTab = listen(a.cookie);
    await settle();

    await a.gql(`mutation($c: ID!) { sendMessage(conversationId: $c, body: "hello bob") { id } }`, {
      c: dm.id,
    });

    await until(() => bob.events.some((e) => e.__typename === 'MessageAdded'));
    const received = bob.events.find((e) => e.__typename === 'MessageAdded');
    expect(received).toMatchObject({
      conversationId: dm.id,
      message: { body: 'hello bob', sender: { username: 'alice' } },
    });
    await until(() => aliceTab.events.some((e) => e.__typename === 'MessageAdded'));
  });

  it('never leaks conversations to non-members', async () => {
    const { a, eve, dm } = await setup();
    const spy = listen(eve.cookie);
    await settle();

    await a.gql(`mutation($c: ID!) { sendMessage(conversationId: $c, body: "private") { id } }`, {
      c: dm.id,
    });
    await a.gql(`mutation($c: ID!) { setTyping(conversationId: $c) }`, { c: dm.id });
    await settle(600);

    expect(
      spy.events.filter((e) => e.__typename === 'MessageAdded' || e.__typename === 'TypingStarted'),
    ).toEqual([]);
  });

  it('streams typing indicators to the other members only', async () => {
    const { a, b, dm } = await setup();
    const bob = listen(b.cookie);
    const alice = listen(a.cookie);
    await settle();

    await a.gql(`mutation($c: ID!) { setTyping(conversationId: $c) }`, { c: dm.id });
    await until(() => bob.events.some((e) => e.__typename === 'TypingStarted'));
    expect(bob.events.find((e) => e.__typename === 'TypingStarted')).toMatchObject({
      user: { username: 'alice' },
    });
    await settle();
    expect(alice.events.some((e) => e.__typename === 'TypingStarted')).toBe(false);
  });

  it('notifies a user when they are added to a new group (resolved from their point of view)', async () => {
    const { a, b } = await setup();
    const bob = listen(b.cookie);
    await settle();

    await a.gql(`mutation { createGroup(name: "Trip", usernames: ["bob"]) { id } }`);
    await until(() =>
      bob.events.some(
        (e) => e.__typename === 'ConversationUpdated' && e.conversation?.title === 'Trip',
      ),
    );
  });

  it('tracks presence for people you share a conversation with', async () => {
    const { a, b } = await setup();
    const alice = listen(a.cookie);
    await settle();

    const bobId = (await prisma.user.findUniqueOrThrow({ where: { username: 'bob' } })).id;
    const bob = listen(b.cookie);
    await until(() =>
      alice.events.some(
        (e) => e.__typename === 'PresenceChanged' && e.userId === bobId && e.online,
      ),
    );
    expect(
      (await a.gql(`{ conversations { peer { online } } }`)).data!.conversations[0].peer.online,
    ).toBe(true);

    await sockets[sockets.length - 1]!.dispose();
    await until(() =>
      alice.events.some(
        (e) => e.__typename === 'PresenceChanged' && e.userId === bobId && !e.online,
      ),
    );
    expect(bob.errors).toEqual([]);
  });

  it('refuses unauthenticated sockets', async () => {
    const { errors } = listen('');
    await until(() => errors.length > 0);
  });

  it('rejects cross-origin WebSocket upgrades', async () => {
    const { a } = await setup();
    const result = await new Promise<string>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/graphql`, 'graphql-transport-ws', {
        headers: { cookie: a.cookie, origin: 'https://evil.example' },
      });
      ws.on('unexpected-response', (_req, res) => resolve(`status ${res.statusCode}`));
      ws.on('open', () => resolve('open'));
      ws.on('error', () => undefined);
    });
    expect(result).toBe('status 403');
  });
});
