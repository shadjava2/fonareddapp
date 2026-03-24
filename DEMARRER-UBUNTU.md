# 🚀 Démarrer l'Application sur Ubuntu

## Étape 1 : Créer le fichier .env.local

```bash
# Créer le fichier .env.local
nano .env.local
```

Ajoutez ce contenu (remplacez les clés secrètes par des valeurs générées) :

```env
# Base de données MySQL
DATABASE_URL="mysql://giformapp:SDconceptsrdc243_243@91.134.44.14:3306/fonaredd-app?allowPublicKeyRetrieval=true&ssl=false&connectTimeout=10000"

# Clés secrètes (générez-les avec les commandes ci-dessous)
JWT_SECRET="votre-cle-jwt-tres-longue-et-securisee"
NEXTAUTH_SECRET="votre-cle-nextauth-securisee"

# Configuration Next.js
NEXTAUTH_URL="http://91.134.44.14:3001"
NODE_ENV="production"
PORT=3001
```

**Générer des clés secrètes sécurisées :**

```bash
# Générer JWT_SECRET
openssl rand -base64 32

# Générer NEXTAUTH_SECRET
openssl rand -base64 32
```

Copiez les valeurs générées dans votre fichier `.env.local`.

## Étape 2 : Installer PM2

```bash
sudo npm install -g pm2
```

## Étape 3 : Démarrer l'application avec PM2

```bash
# Démarrer l'application
pm2 start npm --name "fonaredd-app" -- start

# Ou utiliser le fichier ecosystem.config.js si disponible
pm2 start ecosystem.config.js
```

## Étape 4 : Sauvegarder la configuration PM2

```bash
# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique au boot
pm2 startup
# Suivez les instructions affichées (copiez-collez la commande suggérée)
```

## Étape 5 : Vérifier que l'application fonctionne

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs fonaredd-app

# Tester l'application
curl http://localhost:3001
```

## Étape 6 : Accéder à l'application

L'application devrait être accessible sur :

- **http://91.134.44.14:3001**

## Commandes PM2 utiles

```bash
pm2 status              # Voir le statut
pm2 logs fonaredd-app   # Voir les logs en temps réel
pm2 restart fonaredd-app # Redémarrer
pm2 stop fonaredd-app   # Arrêter
pm2 delete fonaredd-app # Supprimer
pm2 monit               # Monitorer (CPU, mémoire)
```

## Configuration du Firewall (si nécessaire)

```bash
# Autoriser le port 3001
sudo ufw allow 3001/tcp
sudo ufw status
```

## Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
pm2 logs fonaredd-app --lines 50

# Vérifier la connexion à la base de données
npx prisma db pull
```

### Erreur de connexion à la base de données

- Vérifiez que MySQL est accessible depuis le serveur
- Vérifiez les identifiants dans `.env.local`
- Testez : `mysql -h 91.134.44.14 -u giformapp -p`

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 3001
sudo lsof -i :3001
# Ou
sudo netstat -tulpn | grep 3001
```
