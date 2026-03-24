# 🔧 Corriger les Fichiers Statiques - Ubuntu

## Problème

Avec `output: 'standalone'`, Next.js ne copie pas automatiquement les fichiers statiques (CSS, JS, images) dans le dossier standalone. Il faut les copier manuellement.

## Solution : Copier les Fichiers Statiques

### Étape 1 : Arrêter l'application

```bash
pm2 stop fonaredd-app
```

### Étape 2 : Copier les fichiers statiques

```bash
cd ~/fonaredd

# Copier les fichiers statiques Next.js
cp -r .next/static .next/standalone/.next/

# Copier le dossier public
cp -r public .next/standalone/

# Vérifier que les fichiers sont copiés
ls -la .next/standalone/.next/static
ls -la .next/standalone/public
```

### Étape 3 : Redémarrer l'application

```bash
pm2 restart fonaredd-app
pm2 logs fonaredd-app --lines 10
```

### Étape 4 : Tester

Ouvrez http://91.134.44.14:3001 dans votre navigateur. Les styles devraient maintenant être chargés.

## Script Automatique

Créez un script pour automatiser cette opération :

```bash
nano fix-static-files.sh
```

Collez :

```bash
#!/bin/bash

echo "Copie des fichiers statiques..."

# Copier les fichiers statiques
if [ -d ".next/static" ]; then
    echo "Copie de .next/static..."
    cp -r .next/static .next/standalone/.next/ 2>/dev/null || mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/
fi

# Copier le dossier public
if [ -d "public" ]; then
    echo "Copie de public..."
    cp -r public .next/standalone/
fi

echo "✓ Fichiers statiques copiés"
```

Rendez-le exécutable :

```bash
chmod +x fix-static-files.sh
```

Utilisez-le après chaque build :

```bash
npm run build
./fix-static-files.sh
pm2 restart fonaredd-app
```

## Solution Alternative : Utiliser Nginx

Si vous préférez, vous pouvez configurer Nginx pour servir les fichiers statiques :

```bash
# Installer Nginx
sudo apt install -y nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/fonaredd-app
```

Collez :

```nginx
server {
    listen 80;
    server_name 91.134.44.14;

    # Servir les fichiers statiques directement
    location /_next/static {
        alias /home/ubuntu/fonaredd/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /public {
        alias /home/ubuntu/fonaredd/public;
        expires 30d;
    }

    # Proxy pour l'application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Puis :

```bash
# Activer
sudo ln -s /etc/nginx/sites-available/fonaredd-app /etc/nginx/sites-enabled/

# Tester
sudo nginx -t

# Redémarrer
sudo systemctl restart nginx

# Autoriser le port 80
sudo ufw allow 80/tcp
```

## Vérification

Après avoir copié les fichiers, vérifiez :

```bash
# Vérifier que les fichiers sont présents
ls -la .next/standalone/.next/static/
ls -la .next/standalone/public/

# Tester dans le navigateur
# Ouvrez http://91.134.44.14:3001
# Les styles devraient maintenant être chargés
```

## Important

**Après chaque `npm run build`, vous devez recopier les fichiers statiques !**

C'est pourquoi il est recommandé d'utiliser le script `fix-static-files.sh` ou de configurer Nginx.
