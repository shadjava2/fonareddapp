# Dockerfile pour l'application Fonaredd App
FROM node:18-alpine

WORKDIR /app

# Installer les outils système nécessaires
RUN apk add --no-cache git

# Copier les fichiers de configuration
COPY package*.json ./

# Installer toutes les dépendances avec retry
RUN npm ci --retry=3 --retry-delay=1000 || \
    (npm cache clean --force && npm ci --retry=3 --retry-delay=1000)

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build de l'application Next.js
RUN npm run build

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer les permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exposer le port
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000
ENV DOCKER_BUILD=true

# Script de démarrage
CMD ["npm", "start"]
