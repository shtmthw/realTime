# REFRACTOR.md — Realtime v2 rewrite plan

> **Status: implemented.** The sections below are the plan; “Deviations” at the end lists where the implementation differs from it.

A step-by-step plan for rebuilding Realtime in TypeScript with a minimal,
mobile-first UI, true realtime (GraphQL subscriptions), a hardened backend,
tests, CI and a single Docker image.

## 1. Where we are (audit of v1)

| Area | v1 state | Problem |
|------|----------|---------|
| API | JS, Apollo Server 3 + Express, one 500-line `resolvers.js` | No types, no tests, deprecated Apollo Server 3 |
| Realtime | Client polls every 3 s (`chatscreen.jsx`) | Not realtime, wasteful, laggy |
| Auth | JWT in `localStorage`, bcryptjs | XSS-stealable token; no rate limiting |
| Data | MySQL; DMs and groups use separate tables and code paths | Duplicate logic; usernames not unique so "add by username" can fail |
| Dead code | `friendRequest` model, `createSimpleUser` (hard-coded password), no-op "sexbot" migration | Attack surface and confusion |
| UI | React 18 + MUI, 533-line `side.jsx`, fixed two-pane layout | Breaks on phones, heavy bundle, no unread/typing/presence |
| Ops | Two images (api + nginx client), MySQL, no CI | Harder to pull and run |

## 2. Where we are going

**Core idea kept intact:** sign up, find people by username, 1:1 direct
messages and group chats, messages arrive live.

| Area | v2 |
|------|----|
| Language | Strict TypeScript end to end (`noUncheckedIndexedAccess`) |
| Layout | npm-workspaces monorepo: `apps/server`, `apps/web`, `e2e` |
| Backend | Fastify 5 + GraphQL Yoga + `graphql-ws` subscriptions + Prisma |
| DB | PostgreSQL 17, one unified `Conversation` model (DIRECT / GROUP) |
| Auth | argon2id hashing, JWT in httpOnly SameSite cookie, rate-limited sign-in, unique usernames |
| Frontend | React + Vite + Tailwind + Radix primitives, light/dark, mobile-first |
| Delivery | **One image** `matthew552/realtime` (API + UI) + official `postgres` image |
| Quality | Vitest (server + web), Playwright e2e, ESLint, Prettier, GitHub Actions |

## 3. Phases

Each phase ends with an acceptance check. Do not start the next phase until it passes.

### Phase 1 — Monorepo and tooling
1. Root `package.json` with workspaces `apps/*` and `e2e`; Node >= 22.
2. `tsconfig.base.json` (strict), flat ESLint config (typescript-eslint, react-hooks), Prettier.
3. Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `e2e`, `screenshots`.

**Check:** `npm run typecheck && npm run lint` pass.

### Phase 2 — Data model
1. `User`: unique lowercase `username`, `displayName`, unique `email`, `passwordHash`, `avatarColor`, `lastSeenAt`.
2. `Conversation`: `type` (DIRECT|GROUP), `name?`, unique `directKey?` (`minId:maxId`) so a DM pair exists once, `lastMessageAt`.
3. `ConversationMember`: composite PK, `role`, `lastReadAt` (drives unread counts).
4. `Message`: `body`, `createdAt`, indexed `(conversationId, createdAt, id)` for cursor pagination.
5. Drop `friendRequest`, `directConversation` and all MySQL migrations; one fresh Postgres baseline.

**Check:** `prisma migrate deploy` applies on an empty database; seed runs.

### Phase 3 — Backend
1. Fastify with helmet, cookies, rate limit, static SPA hosting, `/healthz`, `/readyz`, graceful shutdown.
2. GraphQL Yoga on `/graphql`; `graphql-ws` on the same path.
3. Auth: `signUp`, `signIn`, `signOut`; cookie session; the WS handshake authenticates from the same cookie.
4. Queries: `me`, `conversations`, `messages` (cursor), `searchUsers`.
   Mutations: `startDirect`, `createGroup`, `addMembers`, `leaveGroup`, `sendMessage`, `markRead`, `setTyping`, `updateProfile`.
   Subscription: `events` (one per-user stream: messages, conversation updates, typing, presence).
5. Single `requireMember` guard for every conversation-scoped operation.
6. Integration tests against a real Postgres.

**Check:** `npm test -w apps/server` green.

### Phase 4 — Frontend
1. Auth screen (sign-in / sign-up tabs, inline validation).
2. Conversation list: previews, unread badges, relative time, online dots, filter.
3. Chat: grouped bubbles, day separators, optimistic send with retry, infinite scroll up, "new messages" pill, typing indicator, reconnecting banner.
4. New chat (live username search) and New group (multi-select) dialogs.
5. Mobile: single pane with back navigation, `100dvh`, safe-area insets, 44 px touch targets.
6. Light/dark theme, PWA manifest.

**Check:** two browsers chat live on desktop and mobile viewports.

### Phase 5 — E2E and screenshots
Playwright drives two users through DM and group flows, and generates the README screenshots from seeded data.

### Phase 6 — Docker
Multi-stage root `Dockerfile` → one runtime image (non-root, healthcheck, migrations on start). `docker-compose.yml` with `db` + `app`, working with zero config.

**Check:** `docker compose up --build` on a clean volume works end to end.

### Phase 7 — CI
GitHub Actions: lint, typecheck, test (Postgres service), build; on `master` build and push `matthew552/realtime` to Docker Hub.

### Phase 8 — README, publish, commit
README with screenshots and a quick start; push images to Docker Hub; commit to `master`.

## 4. Decisions

- One app image (API serves the built UI) + official Postgres image.
- PostgreSQL with a fresh start; v1 MySQL data is not migrated.
- CI pushes to Docker Hub on `master` (needs `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets).
- Docker Hub namespace: `matthew552`.

## 5. Deviations from the plan (what changed while building)

| Plan | Built | Why |
|------|-------|-----|
| graphql-codegen for typed documents | Hand-written typed documents in `apps/web/src/lib/gql.ts` | Fewer moving parts for a schema this size; the server and e2e tests catch drift |
| shadcn/ui, react-hook-form | Small in-repo components on Radix Dialog + Tailwind; plain controlled forms with a shared validation module | No generator step or extra dependencies for a handful of components |
| Apollo Client 4 | Apollo Client 3.x | Stable, widely documented API |
| `schema.graphql` file | SDL string in `apps/server/src/schema.ts` | Simpler to bundle with `tsc` |
| Node 24 everywhere | Node 24 in Docker and CI, `engines: >=22` | Works on current LTS lines |
| Inline theme script | `public/theme-init.js` | The production Content-Security-Policy blocks inline scripts |

Bugs the end-to-end suite caught while building (kept as regression tests): sign-out followed by sign-in left the UI stuck (fixed by `resetSession`), typing indicators were swallowed right after sending, and dark mode did not apply in production because of the CSP.
