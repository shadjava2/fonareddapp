# 🔧 Correction Finale PM2 - Serveur Standalone

## Problème Identifié

1. L'application utilise encore `npm start` au lieu du serveur standalone
2. Elle écoute sur le port 3000 au lieu de 3001
3. La connexion est refusée

## Solution : Redémarrer avec le serveur standalone

### Étape 1 : Arrêter l'application actuelle

```bash
pm2 stop fonaredd-app
pm2 delete fonaredd-app
```

### Étape 2 : Vérifier que le serveur standalone existe

```bash
ls -la .next/standalone/server.js
```

Si le fichier n'existe pas, rebuilder :

```bash
npm run build
```

### Étape 3 : Démarrer avec le serveur standalone

```bash
# Option A : Commande directe
pm2 start node --name "fonaredd-app" -- .next/standalone/server.js

# Option B : Avec variables d'environnement
pm2 start node --name "fonaredd-app" -- .next/standalone/server.js --env production
```

### Étape 4 : Vérifier que ça fonctionne

```bash
# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs fonaredd-app --lines 20

# Tester localement
curl http://localhost:3001
```

### Étape 5 : Si le port n'est pas 3001, créer ecosystem.config.js

```bash
nano ecosystem.config.js
```

Collez :

```javascript
module.exports = {
  apps: [
    {
      name: 'fonaredd-app',
      script: '.next/standalone/server.js',
      cwd: '/home/ubuntu/fonaredd',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXTAUTH_URL: 'http://91.134.44.14:3001',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
```

Puis :

```bash
mkdir -p logs
pm2 delete fonaredd-app
pm2 start ecosystem.config.js
pm2 save
```

### Étape 6 : Vérifier le port

```bash
# Vérifier sur quel port l'application écoute
sudo netstat -tulpn | grep node
# Ou
sudo ss -tulpn | grep node
```

### Étape 7 : Ouvrir le firewall

```bash
# Autoriser le port 3001
sudo ufw allow 3001/tcp

# Vérifier
sudo ufw status
```

### Étape 8 : Tester depuis l'extérieur

```bash
# Depuis votre machine Windows
curl http://91.134.44.14:3001
```

## Dépannage

### Si le serveur standalone n'existe pas

```bash
# Rebuilder l'application
npm run build

# Vérifier
ls -la .next/standalone/server.js
```

### Si l'application écoute toujours sur 3000

Vérifiez le fichier `.env.local` :

```bash
cat .env.local | grep PORT
```

Doit être : `PORT=3001`

### Si la connexion est toujours refusée

1. Vérifiez que l'application écoute sur 0.0.0.0 et non 127.0.0.1
2. Vérifiez le firewall : `sudo ufw status`
3. Vérifiez les règles iptables si ufw n'est pas utilisé
4. Vérifiez les règles du pare-feu du fournisseur (OVH, etc.)
