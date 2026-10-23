#!/bin/sh
set -e

# Wait for Prisma client to be generated, then run migrations
npx prisma migrate deploy

exec "$@"
