# Realtime

A clean, dark-themed realtime chat app with direct messages and group chats, built with React, Apollo GraphQL, Node, Prisma and MySQL.

## Features

- Sign up / sign in with JWT sessions
- Add people by the exact username they signed up with; the chat appears in Direct Messages
- Direct messages between users
- Group chats with multi-member selection, plus add more members by username at any time
- Realtime message sync (polling)
- Dark, minimal UI

## Run with Docker Compose

```bash
git clone https://github.com/shtmthw/realTime.git
cd realTime
docker compose up --build
```

Open `http://localhost:5173`. The client is served by nginx on port `5173`
and proxies `/graphql` to the API at `http://localhost:4000/graphql`.

The API applies Prisma migrations automatically at startup.

## Pull and run pre-built images

Pre-built images are published to Docker Hub under `matthew552`:

```bash
docker pull matthew552/realtime-api
docker pull matthew552/realtime-client
docker compose up
```

The images are tagged `matthew552/realtime-api` and `matthew552/realtime-client`.
Compose builds locally when an image is missing.

## Build and push images to Docker Hub

```bash
docker compose build
docker compose push

# or build explicitly
docker build -t matthew552/realtime-api ./project
docker build -t matthew552/realtime-client ./client/Client-GraphQL-Chat
docker push matthew552/realtime-api
docker push matthew552/realtime-client
```

## Environment

Compose works out of the box with sensible defaults. Override any value in
`docker-compose.yml`, or create a local `.env` from the examples for non-Docker
development:

```bash
cp project/.env.example project/.env
cp client/Client-GraphQL-Chat/.env.example client/Client-GraphQL-Chat/.env
```

The `.env` files are gitignored; Compose injects the values via the
`environment` block in `docker-compose.yml`.

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api | MySQL connection string |
| `JWT_SECRET` | api | Secret for signing session tokens |
| `PORT` | api | API port (default 4000) |
| `CORS_ORIGIN` | api | Allowed CORS origins (comma-separated) |
| `VITE_API_URL` | client | GraphQL endpoint; defaults to `/graphql` behind nginx |

## Local development (without Docker)

```bash
# API
cd project
npm install
npx prisma migrate deploy
npm run dev

# Client (separate terminal)
cd client/Client-GraphQL-Chat
npm install
npm run dev
```

Vite proxies `/graphql` to `http://localhost:4000`, so no CORS setup is needed.
