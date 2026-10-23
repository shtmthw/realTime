# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite dev server, exposed on all interfaces for Docker
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
