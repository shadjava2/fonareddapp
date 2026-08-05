# Debian slim : OpenSSL compatible avec Prisma (évite les erreurs Alpine/musl).
# Standalone Next.js : démarrage via node server.js (pas npm start).
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --retry=3 --retry-delay=1000 || \
    (npm cache clean --force && npm ci --retry=3 --retry-delay=1000)

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

# Next standalone : static + public à côté de server.js
# (si standalone/public existe déjà, `cp -r public dest` crée dest/public — d’où le test JPG en échec)
RUN mkdir -p .next/standalone/.next \
  && rm -rf .next/standalone/public \
  && cp -a public/. .next/standalone/public/ \
  && cp -a .next/static/. .next/standalone/.next/static/ \
  && ls -la .next/standalone/public/ \
  && test -f .next/standalone/public/forest-bg.jpg \
  && test -f .next/standalone/public/logo.png

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DOCKER_BUILD=true

# cwd = dossier de server.js → /public est bien servi
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]
