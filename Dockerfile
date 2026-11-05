# syntax=docker/dockerfile:1

# ---------- build: install, compile the API, bundle the web app ----------
FROM node:24-slim AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY e2e/package.json e2e/
# Install scripts (prisma/esbuild engines) are required to build, and are allowed in package.json.
RUN npm ci --workspace apps/server --workspace apps/web --include-workspace-root

COPY tsconfig.base.json ./
COPY apps/server apps/server
COPY apps/web apps/web
RUN npm run build

# Keep only what the server needs at runtime.
RUN npm prune --omit=dev --workspace apps/server --workspace apps/web --include-workspace-root

# ---------- runtime ----------
FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    WEB_DIST=/app/web
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/server/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/server/dist ./dist
COPY --from=build --chown=node:node /repo/apps/server/prisma ./prisma
COPY --from=build --chown=node:node /repo/apps/web/dist ./web
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
