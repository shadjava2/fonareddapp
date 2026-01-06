# 🚀 Guide de Déploiement - Fonaredd App

## 📦 Build pour Déploiement sur Windows

### Option 1: Build Complet (Recommandé)

Exécutez le script de build complet:

```batch
build-prod.bat
```

Ce script va:

1. Nettoyer les anciens builds
2. Installer les dépendances
3. Générer le client Prisma
4. Builder l'application Next.js
5. Préparer le dossier `dist` avec tous les fichiers nécessaires

### Option 2: Build Rapide

Pour un build rapide sans packaging:

```batch
npm run build:prod
```

Le résultat sera dans `.next/standalone/`

## 🔧 Déploiement sur une Nouvelle Machine Windows

### Prérequis Machine Cible

1. **Node.js 18+** - [Télécharger depuis nodejs.org](https://nodejs.org/)
2. **MySQL** - Installé et démarré (ou accès à une DB distante)
3. **Port 3000** - Disponible (ou modifier dans `.env.local`)

### Étapes de Déploiement

#### 1. Préparer les fichiers sur la machine de développement

```batch
# Option A: Build complet
build-prod.bat

# Option B: Build rapide
npm run build:prod
```

#### 2. Copier les fichiers sur la machine cible

**Si vous avez utilisé `build-prod.bat`**, copiez le dossier `dist` entier.

**Si vous avez utilisé `npm run build:prod`**, copiez:

- `.next/standalone/` (tout le contenu)
- `.next/static/`
- `public/`
- `prisma/`
- `package.json`
- `package-lock.json`
- `next.config.js`
- `.env.local` (avec vos configurations)

#### 3. Installation sur la machine cible

```batch
# Naviguer vers le dossier de l'application
cd C:\path\to\fonaredd-app

# Installer les dépendances de production uniquement
npm install --production --no-optional --legacy-peer-deps

# Générer le client Prisma
npx prisma generate
```

#### 4. Configuration des variables d'environnement

Créez/modifiez le fichier `.env.local`:

```env
# Base de données
DATABASE_URL="mysql://utilisateur:motdepasse@localhost:3306/fonaredd-app"

# JWT
JWT_SECRET="votre-secret-jwt-tres-long-et-securise"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-nextauth"

# Environnement
NODE_ENV="production"

# Hikvision (optionnel)
HIK_HOST="http://192.168.10.50"
HIK_USER="admin"
HIK_PASS="Fonaredd"
```

#### 5. Installation sur la machine cible

Utilisez le script d'installation automatique:

```batch
INSTALLER-MACHINE-CIBLE.bat
```

Ou manuellement:

```batch
# Installer les dépendances de production uniquement
npm install --production --no-optional --legacy-peer-deps

# Générer le client Prisma
npx prisma generate
```

#### 6. Démarrer l'application

```batch
# Méthode 1: Avec le serveur standalone (recommandé)
node .next/standalone/server.js

# Méthode 2: Avec npm start
npm start

# Méthode 3: Utiliser le script start.bat (s'il existe)
start.bat
```

#### 7. Créer un service Windows (Optionnel)

Créez un fichier `start-service.bat`:

```batch
@echo off
cd /d "C:\path\to\fonaredd-app"
node .next/standalone/server.js
```

Puis configurez-le comme service Windows avec NSSM (Non-Sucking Service Manager).

## 📋 Checklist de Déploiement

- [ ] Node.js 18+ installé sur la machine cible
- [ ] MySQL installé et démarré (ou accès DB configuré)
- [ ] Port 3000 disponible (ou modifié dans `.env.local`)
- [ ] Fichiers copiés sur la machine cible
- [ ] `npm install --production` exécuté
- [ ] `npx prisma generate` exécuté
- [ ] `.env.local` configuré avec les bonnes valeurs
- [ ] Base de données accessible
- [ ] Application démarrée et accessible sur http://localhost:3000

## 🐛 Dépannage

### Erreur: "Cannot find module"

```batch
# Réinstaller les dépendances
npm install --production --no-optional --legacy-peer-deps
npx prisma generate
```

### Erreur de connexion à la base de données

- Vérifiez que MySQL est démarré
- Vérifiez les identifiants dans `.env.local`
- Testez la connexion: `npx prisma db pull`

### Port déjà utilisé

Modifiez le port dans `.env.local`:

```env
PORT=3001
NEXTAUTH_URL="http://localhost:3001"
```

### Build échoue

```batch
# Nettoyer et rebuilder
rmdir /s /q .next
rmdir /s /q node_modules
npm install --no-optional --legacy-peer-deps
npm run build:prod
```

## 📞 Support

En cas de problème, vérifiez:

1. Les logs de l'application
2. Les logs MySQL
3. La console du navigateur
4. Les variables d'environnement
