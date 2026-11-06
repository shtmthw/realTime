<div align="center">
  
# Realtime

**Minimal realtime chat. Direct messages and group chats, delivered instantly.**

[![CI](https://github.com/shtmthw/realTime/actions/workflows/ci.yml/badge.svg)](https://github.com/shtmthw/realTime/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/v/matthew552/realtime?label=docker%20hub&sort=semver)](https://hub.docker.com/r/matthew552/realtime)

<img src="docs/screenshots/desktop-chat-light.png" alt="Realtime on desktop" width="760">

</div>

## Quick start

All you need is Docker. Download the compose file, pull the image and start it:

```bash
curl -O https://raw.githubusercontent.com/shtmthw/realTime/master/docker-compose.yml
docker compose pull
docker compose up -d
```

Open **http://localhost:8080** and create an account. To try a conversation, open a second browser (or a private window), create another account and message the first one.

The defaults are fine for a quick trial. For anything longer-lived, set your own secrets:

```bash
curl -O https://raw.githubusercontent.com/shtmthw/realTime/master/.env.example
cp .env.example .env     # then set JWT_SECRET and POSTGRES_PASSWORD
docker compose up -d
```

To stop, run `docker compose down`. Your data is kept in the `realtime_db` volume; add `-v` to delete it.

## Features

- **Instant delivery.** Messages, typing indicators, unread counts and online status arrive live over WebSockets, with no polling.
- **Direct messages and group chats.** Find people by username with live search. Create groups, add members later, rename or leave them.
- **Pleasant to use.** Messages appear immediately and retry if sending fails. Unread badges, a "new messages" pill, infinite scroll through history, day separators, a reconnecting banner, and `Ctrl/⌘ + K` to start a new chat.
- **Mobile-first.** A single pane with back navigation on phones and two panes on desktop. Respects safe areas, uses 44 px tap targets, follows your system's light or dark theme, and can be installed as a PWA.
- **Secure by default.** argon2id password hashing, httpOnly session cookies, rate limiting, input validation, and membership checks on every operation.
- **One image.** The API and the web app ship together as `matthew552/realtime`. The only other container is PostgreSQL.

## Screenshots

<div align="center">

<img src="docs/screenshots/mobile-list-light.png" alt="Chat list on a phone" width="190">
<img src="docs/screenshots/mobile-chat-light.png" alt="Conversation on a phone" width="190">
<img src="docs/screenshots/mobile-chat-dark.png" alt="Conversation on a phone, dark theme" width="190">
<img src="docs/screenshots/mobile-list-dark.png" alt="Chat list on a phone, dark theme" width="190">

</div>



| Light                                                    | Dark                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| ![Group chat](docs/screenshots/desktop-group-light.png)  | ![Group chat, dark theme](docs/screenshots/desktop-group-dark.png) |
| ![Sign up](docs/screenshots/auth-light.png)              | ![Direct message, dark theme](docs/screenshots/desktop-chat-dark.png) |
              

## Configuration

Set these in `.env` next to `docker-compose.yml`.

| Variable            | Default    | Description                                                                                       |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `APP_PORT`          | `8080`     | Port the app is published on                                                                      |
| `JWT_SECRET`        | _(random)_ | Signs session cookies. If unset, a random secret is generated at startup, so everyone is signed out whenever the container restarts |
| `POSTGRES_PASSWORD` | `realtime` | Database password                                                                                 |
| `COOKIE_SECURE`     | `false`    | Set to `true` when serving over HTTPS so cookies are marked `Secure`                              |

### Behind a reverse proxy

If you put Realtime behind Caddy, nginx or Traefik, the proxy must forward WebSocket upgrades on `/graphql` and preserve the `Host` header. Serve it over HTTPS and set `COOKIE_SECURE=true`.

## Updating

```bash
docker compose pull
docker compose up -d
```

Your data lives in the `realtime_db` volume and is kept across updates.

## Upgrading from v1

v2 is a full rewrite (TypeScript, PostgreSQL, GraphQL subscriptions). The data model changed, so v1 MySQL data is **not** migrated. See [REFRACTOR.md](REFRACTOR.md) for the plan and the reasoning behind it.

## How it works

```mermaid
flowchart LR
  B[Browser<br/>React SPA] -- "HTTP: queries and mutations" --> S
  B <-- "WebSocket: subscriptions<br/>(same /graphql path)" --> S
  subgraph App container
    S[Fastify + GraphQL Yoga + graphql-ws]
  end
  S --> P[(PostgreSQL)]
```

- **One conversation model.** Direct messages and groups are both conversations with members. Each direct-message pair has a unique key, so two people can never end up with two separate chats.
- **One event stream per user.** New messages, conversation changes, typing and presence all arrive on a single subscription. Events are published only to current members, so nobody can listen in on a chat they are not part of.
- **Sessions** are a signed JWT in an `httpOnly`, `SameSite=Lax` cookie. The WebSocket handshake authenticates with the same cookie and rejects cross-origin connections.
- **Presence** is tracked in memory by counting each user's open sockets. This works for a single instance; running several instances behind a load balancer is not supported.

| Layer  | Stack                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------- |
| Server | Node 24, TypeScript, Fastify 5, GraphQL Yoga, graphql-ws, Prisma, PostgreSQL 17, zod, jose, argon2 |
| Web    | React 19, Vite, TypeScript, Tailwind CSS 4, Apollo Client, Radix Dialog, lucide icons              |

<details>
<summary><strong>Running from source</strong></summary>

<br>

Requirements: Node 22+ and a PostgreSQL database.

```bash
git clone https://github.com/shtmthw/realTime.git
cd realTime
npm install

# a throwaway database
docker run -d --name realtime-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=realtime -p 5432:5432 postgres:17-alpine

cp .env.example .env     # set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/realtime
npm run db:migrate -w apps/server
npm run db:seed -w apps/server    # optional demo users: alice, bob, carol, dave, erin (password: password123)
npm run dev
```

The web app runs on http://localhost:5173. Vite proxies `/graphql`, including WebSockets, to the API on port 4000.

| Command               | What it does                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run dev`         | API in watch mode plus the web dev server                               |
| `npm run build`       | Compile the API and bundle the web app                                  |
| `npm run lint`        | ESLint                                                                  |
| `npm run typecheck`   | TypeScript checks for both apps                                         |
| `npm test`            | Server integration tests (needs `DATABASE_URL_TEST`) and web unit tests |
| `npm run e2e`         | Playwright tests in a real browser against the production-mode server   |
| `npm run screenshots` | Regenerate `docs/screenshots` from seeded demo data                     |

Tests use their own databases and never touch your development data: `DATABASE_URL_TEST` for the server tests and `DATABASE_URL_E2E` for Playwright. Both default to `localhost:55432` (see `apps/server/vitest.config.ts` and `e2e/server.ts`).

To build the image locally instead of pulling it: `docker build -t realtime .`

```
apps/server   Fastify + GraphQL API, Prisma schema and migrations, tests
apps/web      React app
e2e           Playwright tests and the screenshot generator
Dockerfile    Builds the single runtime image
```

</details>
