# syntax=docker/dockerfile:1

# --- Build the static client ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relative by default: nginx proxies /graphql to the API.
ARG VITE_API_URL=/graphql
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Serve it ---
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
