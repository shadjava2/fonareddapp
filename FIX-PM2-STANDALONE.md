# 🔧 Corriger PM2 pour Next.js Standalone

## Problème

L'application utilise la configuration `output: standalone` de Next.js, donc il faut utiliser `node .next/standalone/server.js` au lieu de `npm start`.

## Solution : Modifier la commande PM2

### Option 1 : Arrêter et redémarrer avec la bonne commande

```bash
# Arrêter l'application actuelle
pm2 stop fonaredd-app
pm2 delete fonaredd-app

# Démarrer avec la bonne commande
pm2 start node --name "fonaredd-app" -- .next/standalone/server.js

# Sauvegarder
pm2 save
```

### Option 2 : Utiliser un fichier ecosystem.config.js

Créez un fichier `ecosystem.config.js` :

```bash
nano ecosystem.config.js
```

Ajoutez :

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
# Créer le dossier de logs
mkdir -p logs

# Démarrer avec ecosystem.config.js
pm2 start ecosystem.config.js

# Sauvegarder
pm2 save
```

## Vérification

```bash
# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs fonaredd-app

# Tester localement
curl http://localhost:3001
```

## Important pour Standalone

Avec `output: standalone`, Next.js crée un serveur autonome dans `.next/standalone/`. Assurez-vous que :

1. Le dossier `.next/standalone/` existe après le build
2. Les fichiers statiques sont copiés si nécessaire

Vérifiez :

```bash
ls -la .next/standalone/
```
