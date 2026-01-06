# 🐳 Docker Configuration pour Fonaredd App

Cette configuration Docker permet de déployer l'application Fonaredd App dans différents environnements.

## 📋 Prérequis

- Docker Desktop
- Docker Compose
- OpenSSL (pour les certificats SSL en développement)

## 🚀 Démarrage rapide

1. **Configuration initiale**
```bash
# Exécuter le script de configuration
bash docker/scripts/setup.sh
```

2. **Mode développement**
```bash
# Démarrer l'application en mode développement
docker-compose up -d app-dev

# Voir les logs
docker-compose logs -f app-dev
```

3. **Mode production**
```bash
# Démarrer l'application en mode production
docker-compose up -d app-prod

# Voir les logs
docker-compose logs -f app-prod
```

## 🏗️ Architecture

### Services disponibles

- **app-dev** : Application Next.js en mode développement (port 3000)
- **app-prod** : Application Next.js en mode production (port 3001)
- **mysql** : Base de données MySQL 8.0 (port 3306)
- **redis** : Cache Redis (port 6379)
- **nginx** : Reverse proxy avec SSL (ports 80/443)

### Volumes persistants

- `mysql_data` : Données MySQL
- `redis_data` : Données Redis

## 🔧 Configuration

### Variables d'environnement

Copier `env.example` vers `.env` et configurer :

```env
DATABASE_URL="mysql://fonaredd_user:fonaredd_password@mysql:3306/fonaredd_db"
JWT_SECRET="your_jwt_secret_key_here_very_long_and_secure"
NEXTAUTH_SECRET="your_nextauth_secret_here"
```

### Base de données

La base de données est automatiquement initialisée avec :
- Permissions de base
- Rôles par défaut (Admin, Gestionnaire, Utilisateur)
- Services de base
- Sites de base
- Utilisateur admin (username: `admin`, password: `admin123`)

## 📦 Images Docker

### Dockerfile (Production)
- Build multi-étapes optimisé
- Image finale légère avec Node.js Alpine
- Utilisateur non-root pour la sécurité

### Dockerfile.dev (Développement)
- Toutes les dépendances installées
- Hot reload activé
- Debug Node.js disponible (port 9229)

### Dockerfile.electron (Build Electron)
- Build de l'exécutable Electron pour Linux
- Nécessite un serveur X11 pour l'affichage

## 🔐 Sécurité

### SSL/TLS
- Certificats auto-signés générés automatiquement pour le développement
- Configuration SSL moderne (TLS 1.2/1.3)
- Headers de sécurité configurés

### Utilisateur non-root
- Tous les conteneurs utilisent des utilisateurs non-root
- Permissions restreintes

## 🛠️ Commandes utiles

```bash
# Voir l'état des conteneurs
docker-compose ps

# Redémarrer un service
docker-compose restart app-dev

# Accéder au shell d'un conteneur
docker-compose exec app-dev sh

# Voir les logs en temps réel
docker-compose logs -f

# Nettoyer les volumes
docker-compose down -v

# Rebuild les images
docker-compose build --no-cache
```

## 🐛 Dépannage

### Problèmes courants

1. **Port déjà utilisé**
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :3000
```

2. **Erreur de connexion à la base**
```bash
# Vérifier les logs MySQL
docker-compose logs mysql

# Redémarrer MySQL
docker-compose restart mysql
```

3. **Problème de permissions**
```bash
# Réparer les permissions
docker-compose exec app-dev chown -R nextjs:nodejs /app
```

### Logs et debugging

```bash
# Logs de l'application
docker-compose logs -f app-dev

# Logs de la base de données
docker-compose logs -f mysql

# Logs de tous les services
docker-compose logs -f
```

## 🌐 URLs d'accès

- **Développement** : http://localhost:3000
- **Production** : http://localhost:3001
- **MySQL** : localhost:3306
- **Redis** : localhost:6379
- **Nginx (HTTPS)** : https://localhost

## 📝 Notes importantes

1. **Certificats SSL** : Les certificats auto-signés ne sont que pour le développement
2. **Mots de passe** : Changer les mots de passe par défaut en production
3. **Secrets** : Utiliser des secrets robustes pour JWT_SECRET et NEXTAUTH_SECRET
4. **Volumes** : Les données persistent dans les volumes Docker
5. **Réseau** : Tous les services communiquent via le réseau Docker interne

## 🔄 Mise à jour

```bash
# Arrêter les services
docker-compose down

# Rebuild les images
docker-compose build --no-cache

# Redémarrer
docker-compose up -d
```
