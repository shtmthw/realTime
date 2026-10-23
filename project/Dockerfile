# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install system deps for Prisma (MySQL client libs, OpenSSL for Prisma engines on musl/alpine) and native modules
RUN apk add --no-cache python3 make g++ openssl

# Copy dependency files first for layer caching
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy Prisma schema and migrations
COPY prisma ./prisma
COPY server.js ./
COPY gqlControls ./gqlControls
COPY lib ./lib

# Generate Prisma client
RUN npx prisma generate

# Run migrations at startup via entrypoint so DB must be reachable
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
