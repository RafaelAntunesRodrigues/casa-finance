# syntax=docker/dockerfile:1

# ---- Etapa 1: build do frontend (React + Vite) ----------------------------
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install --no-audit --no-fund

COPY client client
COPY server server
RUN npm run build --workspace client

# ---- Etapa 2: runtime de produção (somente dependências do server) --------
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install --workspace server --omit=dev --no-audit --no-fund

COPY server/src server/src
COPY server/scripts server/scripts
COPY --from=builder /app/client/dist client/dist

EXPOSE 3000

CMD ["node", "server/src/server.js"]
