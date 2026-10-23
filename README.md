# Realtime

A clean, dark-themed realtime chat app with direct messages and group chats, built with React, Apollo GraphQL, Node, Prisma and MySQL.

## Run with Docker Compose

```bash
git clone https://github.com/shtmthw/realTime.git
cd realTime
docker compose up
```

Open `http://localhost:5173`. The API is at `http://localhost:4000/graphql`.

## Pull and run pre-built images

Pre-built images are published to Docker Hub under `matthew552`, pull and run them without building:

```bash
docker pull matthew552/realtime-api
docker pull matthew552/realtime-client
```

The images are tagged `matthew552/realtime-api` and `matthew552/realtime-client`.

## Environment

Compose works out of the box with sensible defaults. Override any value in
`docker-compose.yml`, or create a local `.env` from the examples for non-Docker
development:

```bash
cp project/.env.example project/.env
cp client/Client-GraphQL-Chat/.env.example client/Client-GraphQL-Chat/.env
```

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api | MySQL connection string |
| `JWT_SECRET` | api | Secret for signing session tokens |
| `PORT` | api | API port (default 4000) |
| `CORS_ORIGIN` | api | Allowed CORS origin |
| `VITE_API_URL` | client | GraphQL endpoint |

=======
The `.env` files are gitignored; Compose injects the values via the `environment`
block in `docker-compose.yml`.

## Features

- Sign up / sign in with JWT sessions
- Direct messages between users
- Group chats with member management
- Realtime message sync (polling)
- Dark, minimal UI
