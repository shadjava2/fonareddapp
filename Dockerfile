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

RUN npx prisma generate
RUN npm run build

# Next standalone n’embarque pas toujours static/public au bon endroit
RUN mkdir -p .next/standalone/.next \
  && cp -r .next/static .next/standalone/.next/static \
  && cp -r public .next/standalone/public

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DOCKER_BUILD=true

CMD ["node", ".next/standalone/server.js"]
