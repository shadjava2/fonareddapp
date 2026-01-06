# 🐳 Guide Docker pour Fonaredd App

Ce guide explique comment utiliser Docker pour déployer et exécuter l'application Fonaredd App.

## 🚀 Démarrage Rapide

### Windows (PowerShell)

```powershell
# 1. Build et lancement complet (première fois)
.\docker\build.ps1

# 2. Lancement rapide (développement)
.\docker\run.ps1

# 3. Arrêter l'application
docker-compose down
```

### Linux/macOS (Bash)

```bash
# 1. Configuration initiale
bash docker/scripts/setup.sh

# 2. Build et lancement complet (première fois)
bash docker/build.sh

# 3. Lancement rapide (développement)
bash docker/run.sh

# 4. Arrêter l'application
docker-compose down
```

## 📋 Prérequis

- **Docker Desktop** (Windows/macOS) ou **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git** (pour cloner le repository)

## 🏗️ Architecture Docker

### Services

| Service | Port | Description |
|---------|------|-------------|
| `app-dev` | 3000 | Application Next.js (développement) |
| `app-prod` | 3001 | Application Next.js (production) |
| `mysql` | 3306 | Base de données MySQL 8.0 |
| `redis` | 6379 | Cache Redis |
| `nginx` | 80/443 | Reverse proxy avec SSL |

### Images Docker

- **`fonaredd-app`** : Application Next.js optimisée
- **`mysql:8.0`** : Base de données MySQL
- **`redis:7-alpine`** : Cache Redis
- **`nginx:alpine`** : Serveur web et proxy

## 🔧 Configuration

### Variables d'environnement

Les variables sont configurées dans `docker-compose.yml` :

```yaml
environment:
  - NODE_ENV=development
  - DATABASE_URL=mysql://fonaredd_user:fonaredd_password@mysql:3306/fonaredd_db
  - JWT_SECRET=your_jwt_secret_key_here_very_long_and_secure
  - NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Base de données

La base de données est automatiquement initialisée avec :

- **Utilisateur admin** : `admin` / `admin123`
- **Permissions de base** : USER_MANAGE, ROLE_MANAGE, etc.
- **Rôles par défaut** : Administrateur, Gestionnaire, Utilisateur
- **Services de base** : Administration, RH, Congés, Présences
- **Sites par défaut** : Siège Social, Agence Principale

## 🚀 Modes de Lancement

### 1. Développement (Recommandé)

```bash
# Windows
.\docker\run.ps1

# Linux/macOS
bash docker/run.sh
```

**Caractéristiques :**
- Hot reload activé
- Debug Node.js (port 9229)
- Logs détaillés
- Base de données avec données de test

### 2. Production

```bash
# Via le script de build
.\docker\build.ps1  # Choisir option 2

# Ou manuellement
docker-compose up -d app-prod mysql redis nginx
```

**Caractéristiques :**
- Application optimisée
- SSL/HTTPS activé
- Cache Redis
- Reverse proxy Nginx

### 3. Base de données uniquement

```bash
# Via le script de build
.\docker\build.ps1  # Choisir option 3

# Ou manuellement
docker-compose up -d mysql redis
```

## 📊 Commandes Utiles

### Gestion des conteneurs

```bash
# Voir l'état des conteneurs
docker-compose ps

# Voir les logs en temps réel
docker-compose logs -f app-dev

# Redémarrer un service
docker-compose restart app-dev

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v
```

### Accès aux conteneurs

```bash
# Shell de l'application
docker-compose exec app-dev sh

# Accès à MySQL
docker-compose exec mysql mysql -u root -p fonaredd_db

# Accès à Redis
docker-compose exec redis redis-cli
```

### Build et maintenance

```bash
# Rebuild les images
docker-compose build --no-cache

# Nettoyer Docker
docker system prune -f

# Voir l'utilisation des ressources
docker stats
```

## 🔍 Debugging

### Logs

```bash
# Logs de l'application
docker-compose logs -f app-dev

# Logs de la base de données
docker-compose logs -f mysql

# Logs de tous les services
docker-compose logs -f

# Logs avec timestamps
docker-compose logs -f -t app-dev
```

### Accès aux fichiers

```bash
# Copier des fichiers depuis le conteneur
docker cp fonaredd-app-dev:/app/src/components ./local-backup

# Copier des fichiers vers le conteneur
docker cp ./local-file fonaredd-app-dev:/app/
```

### Debug Node.js

```bash
# Activer le debug (port 9229)
docker-compose exec app-dev node --inspect=0.0.0.0:9229

# Se connecter avec VS Code
# Attach to Node Process sur localhost:9229
```

## 🛠️ Développement

### Hot Reload

Le mode développement active automatiquement le hot reload :

```bash
# Démarrage avec hot reload
docker-compose up -d app-dev

# Les modifications de code sont automatiquement rechargées
```

### Base de données en développement

```bash
# Accéder à la base de données
docker-compose exec mysql mysql -u fonaredd_user -p fonaredd_db

# Voir les tables
SHOW TABLES;

# Voir les utilisateurs
SELECT * FROM utilisateurs;
```

### Prisma en Docker

```bash
# Générer le client Prisma
docker-compose exec app-dev npx prisma generate

# Synchroniser le schéma
docker-compose exec app-dev npx prisma db pull

# Interface graphique Prisma
docker-compose exec app-dev npx prisma studio
```

## 🔐 Sécurité

### Certificats SSL

Les certificats auto-signés sont générés automatiquement pour le développement :

```bash
# Générer de nouveaux certificats
bash docker/scripts/generate-ssl.sh
```

**⚠️ Important :** Utilisez des certificats émis par une autorité de certification en production.

### Variables sensibles

```bash
# Créer un fichier .env pour la production
cp env.example .env.production

# Modifier les secrets
DATABASE_URL="mysql://user:password@host:3306/database"
JWT_SECRET="very_long_and_secure_secret_key"
NEXTAUTH_SECRET="another_secure_secret"
```

## 📈 Performance

### Optimisations

```bash
# Build multi-étapes optimisé
docker-compose build --no-cache

# Utiliser les volumes pour le cache
docker-compose up -d --build

# Monitoring des ressources
docker stats
```

### Cache

- **Node modules** : Monté en volume pour éviter la réinstallation
- **Next.js cache** : Persiste entre les redémarrages
- **Prisma client** : Généré automatiquement

## 🐛 Dépannage

### Problèmes courants

1. **Port déjà utilisé**
```bash
# Vérifier les ports
netstat -tulpn | grep :3000

# Changer le port dans docker-compose.yml
ports:
  - "3001:3000"  # Utiliser le port 3001 au lieu de 3000
```

2. **Erreur de connexion à la base**
```bash
# Vérifier que MySQL est démarré
docker-compose ps mysql

# Redémarrer MySQL
docker-compose restart mysql

# Vérifier les logs
docker-compose logs mysql
```

3. **Problème de permissions**
```bash
# Réparer les permissions
docker-compose exec app-dev chown -R nextjs:nodejs /app

# Redémarrer le conteneur
docker-compose restart app-dev
```

4. **Cache Docker corrompu**
```bash
# Nettoyer le cache
docker system prune -f

# Rebuild complet
docker-compose build --no-cache
```

### Support

- **Logs détaillés** : `docker-compose logs -f`
- **État des conteneurs** : `docker-compose ps`
- **Utilisation des ressources** : `docker stats`
- **Documentation Docker** : https://docs.docker.com/

## 🎯 URLs d'Accès

| Service | URL | Description |
|---------|-----|-------------|
| **App Dev** | http://localhost:3000 | Application développement |
| **App Prod** | http://localhost:3001 | Application production |
| **MySQL** | localhost:3306 | Base de données |
| **Redis** | localhost:6379 | Cache |
| **Nginx** | https://localhost | Proxy HTTPS |

## 👤 Connexion par Défaut

- **Username** : `admin`
- **Password** : `admin123`

**⚠️ Important :** Changez ces identifiants en production !
