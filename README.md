<div align="center">

# Realtime

## **Minimal realtime chat. Direct messages and group chats, delivered instantly.**

[![CI](https://github.com/shtmthw/realTime/actions/workflows/ci.yml/badge.svg)](https://github.com/shtmthw/realTime/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/v/matthew552/realtime?label=docker%20hub&sort=semver)](https://hub.docker.com/r/matthew552/realtime)

<img src="docs/screenshots/desktop-chat-light.png" alt="Realtime on desktop" width="760">

<p>
  <img src="docs/screenshots/mobile-list-light.png" alt="Chat list on a phone" width="190">
  <img src="docs/screenshots/mobile-chat-light.png" alt="Conversation on a phone" width="190">
  <img src="docs/screenshots/mobile-chat-dark.png" alt="Conversation on a phone, dark theme" width="190">
  <img src="docs/screenshots/mobile-list-dark.png" alt="Chat list on a phone, dark theme" width="190">
</p>

</div>

## Features

- **Instant delivery.** GraphQL subscriptions over WebSockets; no polling. Messages, typing indicators, unread counts and online status all arrive live.
- **Direct messages and group chats.** Find people by username with live search, create groups, add people later, rename, leave.
- **Feels good to use.** Optimistic sending with retry, unread badges, "new messages" pill, infinite scroll into history, day separators, a reconnecting banner, `Ctrl/⌘ + K` for a new chat.
- **Minimal, mobile-first UI.** Single pane with back navigation on phones, two panes on desktop. Safe-area aware, 44 px tap targets, light and dark themes (follows your system), installable as a PWA.
- **Solid backend.** TypeScript end to end, PostgreSQL, argon2id password hashing, httpOnly session cookies, rate limiting, input validation and  membership checks on every operation.
- **One image.** The API and the web app ship together as `matthew552/realtime`; the only other container is Postgres.

<details>
<summary>More screenshots</summary>

|                                                           |                                                           |
| --------------------------------------------------------- | --------------------------------------------------------- |
| ![Group chat](docs/screenshots/desktop-group-light.png)   | ![Group chat, dark](docs/screenshots/desktop-group-dark.png) |
| ![New chat](docs/screenshots/new-chat-light.png)          | ![Direct message, dark](docs/screenshots/desktop-chat-dark.png) |
| ![Sign up](docs/screenshots/auth-light.png)               | ![Sign up, dark](docs/screenshots/auth-dark.png)          |

</details>

## Quick start

You only need Docker. Grab the compose file, pull the image and start:

```bash
curl -O https://raw.githubusercontent.com/shtmthw/realTime/master/docker-compose.yml
docker compose pull
docker compose up -d
```

Open **http://localhost:8080**, create an account, then open a second browser (or a private window) and create another to chat with yourself.

That runs with safe defaults. For anything beyond a trial, set your own secrets:

```bash
curl -O https://raw.githubusercontent.com/shtmthw/realTime/master/.env.example
cp .env.example .env     # then edit JWT_SECRET and POSTGRES_PASSWORD
docker compose up -d
```

Stop with `docker compose down` (your data stays in the `realtime_db` volume; add `-v` to wipe it).

### Configuration

| Variable            | Default    | Description                                                                              |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `APP_PORT`          | `8080`     | Port the app is published on                                                             |
| `JWT_SECRET`        | _(random)_ | Signs session cookies. If unset a random one is used, so everyone is signed out on restart |
| `POSTGRES_PASSWORD` | `realtime` | Database password                                                                        |
| `COOKIE_SECURE`     | `false`    | Set `true` when serving over HTTPS so cookies are marked `Secure`                        |

Behind a reverse proxy (Caddy, nginx, Traefik), forward WebSocket upgrades on `/graphql` and preserve the `Host` Header.

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>React SPA] -- "HTTP: queries and mutations" --> S
  B <-- "WebSocket: subscriptions<br/>(same /graphql path)" --> S
  subgraph App container
    S[Fastify + GraphQL Yoga + graphql-ws]
  end
  S --> P[(PostgreSQL)]
```

- **One conversation model.** Direct messages and groups are both `Conversation`s with members. A DM pair is made unique by a sorted `directKey`, so two people can never end up with two chats.
- **One event stream per user.** `subscription { events }` carries new messages, conversation changes, typing and presence. Events are only published to current members, so nobody can listen in on a chat they are not part of.
- **Sessions** are a signed JWT in an `httpOnly`, `SameSite=Lax` cookie. The WebSocket handshake authenticates from the same cookie and rejects cross-origin upgrades.
- **Presence** is tracked in memory by counting open sockets per user, which is right for a single instance. Running several instances would need a shared pub/sub (for example Redis) behind `apps/server/src/pubsub.ts`.

### Tech stack

|          |                                                                                        |
| -------- | -------------------------------------------------------------------------------------- |
| Server   | Node 24, TypeScript, Fastify 5, GraphQL Yoga, graphql-ws, Prisma, PostgreSQL 17, zod, jose, argon2 |
| Web      | React 19, Vite, TypeScript, Tailwind CSS 4, Apollo Client, Radix Dialog, lucide icons  |
| Quality  | Vitest (server integration tests on a real database, web unit tests), Playwright end-to-end, ESLint, Prettier |
| Delivery | Multi-stage Docker build, GitHub Actions                                               |

## Development

Requirements: Node 22+ and a PostgreSQL database.

```bash
git clone https://github.com/shtmthw/realTime.git
cd realTime
npm install

# a throwaway database
docker run -d --name realtime-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=realtime -p 5432:5432 postgres:17-alpine

cp .env.example .env     # set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/realtime
npm run db:migrate -w apps/server
npm run db:seed -w apps/server    # optional demo data: alice, bob, carol, dave, erin (password: password123)
npm run dev
```

The web app runs on http://localhost:5173 (Vite proxies `/graphql`, including WebSockets, to the API on :4000).

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `npm run dev`       | API (watch mode) and web dev server                                    |
| `npm run build`     | Compile the API and bundle the web app                                 |
| `npm run lint`      | ESLint                                                                 |
| `npm run typecheck` | TypeScript for both apps                                               |
| `npm test`          | Server integration tests (needs `DATABASE_URL_TEST`) and web unit tests |
| `npm run e2e`       | Playwright flows in a real browser against the production-mode server  |
| `npm run screenshots` | Regenerates `docs/screenshots` from seeded demo data                 |

Tests use their own databases and never touch your development data: `DATABASE_URL_TEST` for the server tests, `DATABASE_URL_E2E` for Playwright (both default to `localhost:55432`; see `apps/server/vitest.config.ts` and `e2e/server.ts`).

### Project layout

```
apps/server   Fastify + GraphQL API, Prisma schema and migrations, tests
apps/web      React app
e2e           Playwright tests and the screenshot generator
Dockerfile    Builds the single runtime image
```

## CI and releases

`.github/workflows/ci.yml` runs on every push and pull request: lint, typecheck, tests (with a Postgres service), build and the Playwright suite. On pushes to `master` it also builds a multi-arch image (`linux/amd64`, `linux/arm64`) and pushes `matthew552/realtime` (`latest` and `sha-<commit>`).

To enable publishing, add two repository secrets in GitHub (Settings, Secrets and variables, Actions): `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a Docker Hub access token with write access).

To publish by hand:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t matthew552/realtime:latest -t matthew552/realtime:2.0.0 --push .
```

## Upgrading from v1

v2 is a rewrite (TypeScript, PostgreSQL, subscriptions). The data model changed, so v1 MySQL data is not migrated. See [REFRACTOR.md](REFRACTOR.md) for the full plan and the reasoning.
