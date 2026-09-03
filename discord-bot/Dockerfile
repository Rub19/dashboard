# ==========================================
# Étape 1 : Build du Frontend React (Vite)
# ==========================================
FROM node:22-alpine AS web-builder

WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# ==========================================
# Étape 2 : Runner Bun de Production
# ==========================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copie des manifestes de dépendances
COPY package.json bun.lock* package-lock.json* ./

# Installation des dépendances de production
RUN bun install --production

# Copie du code backend et du frontend compilé
COPY src/ ./src/
COPY --from=web-builder /app/web/dist ./web/dist

# Dossier de données persistant
RUN mkdir -p data && chown -R bun:bun /app

# Port du serveur Web Dashboard
EXPOSE 3001

USER bun

CMD ["bun", "run", "src/index.ts"]
