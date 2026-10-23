# Realtime

A clean, dark-themed realtime chat app with direct messages and group chats, built with React, Apollo GraphQL, Node, Prisma and MySQL.

## Run with Docker Compose

```bash
git clone https://github.com/<you>/realTime.git
cd realTime
docker compose up
```

Open `http://localhost:5173`. The API is at `http://localhost:4000/graphql`.

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
| `JWT_SECRET` | auth | Secret for signing session tokens |
| `PORT` | api | API port (default 4000) |
| `VITE_API_URL` | client | GraphQL endpoint |

## Docker Hub images

Build and push to your Docker Hub repo:

```bash
docker build -t matthew552/realtime-api ./project
docker build -t matthew552/realtime-client ./client/Client-GraphQL-Chat
docker push matthew552/realtime-api
docker push matthew552/realtime-client
```

## Features

- Sign up / sign in with JWT sessions
- Direct messages between users
- Group chats with member management
- Realtime message sync (polling)
- Dark, minimal UI
