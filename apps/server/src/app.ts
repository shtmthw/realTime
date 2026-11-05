import { existsSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { useServer } from 'graphql-ws/use/ws';
import { createYoga } from 'graphql-yoga';
import { WebSocketServer, type WebSocket } from 'ws';
import { SESSION_COOKIE, SESSION_MAX_AGE_S, sessionFromCookieHeader } from './auth.js';
import { config } from './config.js';
import type { Context, SessionChange } from './context.js';
import { prisma } from './db.js';
import { schema } from './schema.js';
import { userConnected, userDisconnected } from './services/presence.js';

interface ServerContext {
  req: FastifyRequest;
  reply: FastifyReply;
  session: SessionChange;
}

/** The browser sends Origin on WebSocket upgrades; it must match the host being served. */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: config.isTest ? false : { level: config.isProd ? 'info' : 'debug' },
    trustProxy: true,
    bodyLimit: 64 * 1024,
    disableRequestLogging: config.isProd,
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: null,
          },
        }
      : false,
    strictTransportSecurity: false, // plain-HTTP deployments are supported; terminate TLS in a proxy
    crossOriginEmbedderPolicy: false,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 600,
    timeWindow: '1 minute',
    allowList: (req) => req.url === '/healthz' || req.url === '/readyz',
  });

  // ---- health ----
  app.get('/healthz', async () => ({ ok: true }));
  app.get('/readyz', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch {
      return reply.status(503).send({ ok: false });
    }
  });

  // ---- GraphQL over HTTP ----
  const yoga = createYoga<ServerContext>({
    schema,
    graphqlEndpoint: '/graphql',
    landingPage: false,
    graphiql: !config.isProd,
    logging: config.isTest ? false : 'warn',
    plugins: config.isProd ? [useDisableIntrospection()] : [],
    context: async ({ req, session }): Promise<Context> => ({
      userId: await sessionFromCookieHeader(req.headers.cookie),
      ip: req.ip,
      session,
    }),
  });

  app.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: async (req, reply) => {
      const session: SessionChange = {};
      const response = await yoga.handleNodeRequestAndResponse(req, reply, { req, reply, session });
      response.headers.forEach((value, key) => reply.header(key, value));

      if (typeof session.token === 'string') {
        reply.setCookie(SESSION_COOKIE, session.token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: config.cookieSecure,
          path: '/',
          maxAge: SESSION_MAX_AGE_S,
        });
      } else if (session.token === null) {
        reply.clearCookie(SESSION_COOKIE, { path: '/' });
      }
      reply.header('Cache-Control', 'no-store');
      return reply.status(response.status).send(response.body);
    },
  });

  // ---- GraphQL subscriptions over WebSocket (same path) ----
  const wsServer = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  const socketUsers = new WeakMap<WebSocket, string>();

  app.server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/graphql') return; // leave other upgrades (e.g. dev tooling) alone
    if (!sameOrigin(req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wsServer.handleUpgrade(req, socket, head, (ws) => wsServer.emit('connection', ws, req));
  });

  const disposeWs = useServer(
    {
      schema,
      onConnect: async (ctx) => {
        const userId = await sessionFromCookieHeader(ctx.extra.request.headers.cookie);
        if (!userId) return false; // closes with 4403; the client treats it as fatal
        socketUsers.set(ctx.extra.socket, userId);
        await userConnected(userId);
        return true;
      },
      onClose: async (ctx) => {
        const userId = socketUsers.get(ctx.extra.socket);
        if (!userId) return;
        socketUsers.delete(ctx.extra.socket);
        await userDisconnected(userId);
      },
      context: (ctx): Context => ({
        userId: socketUsers.get(ctx.extra.socket) ?? null,
        ip: ctx.extra.request.socket.remoteAddress ?? '',
        session: {},
      }),
    },
    wsServer,
    30_000, // ping every 30s so dead connections are detected and presence stays accurate
  );

  app.addHook('onClose', async () => {
    await disposeWs.dispose();
    for (const client of wsServer.clients) client.terminate();
    wsServer.close();
  });

  // ---- the built web app ----
  if (existsSync(config.webDist)) {
    await app.register(fastifyStatic, {
      root: config.webDist,
      wildcard: false,
      setHeaders: (res, path) => {
        res.setHeader(
          'Cache-Control',
          path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });
    app.get('/*', (req, reply) => {
      const accepts = String(req.headers.accept ?? '');
      if (accepts.includes('text/html') || accepts.includes('*/*') || accepts === '') {
        return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
      }
      return reply.status(404).send({ error: 'Not found' });
    });
  }

  return app;
}
