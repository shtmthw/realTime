#!/bin/sh
set -e

# Apply database migrations, then start the app. Safe to run on every start.
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma

exec "$@"
