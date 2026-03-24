# 🔍 Vérifier et Résoudre les Problèmes de Connexion

## Étape 1 : Vérifier le statut PM2

```bash
pm2 status
```

L'application doit être "online".

## Étape 2 : Vérifier les logs

```bash
# Voir les logs en temps réel
pm2 logs fonaredd-app

# Voir les dernières lignes
pm2 logs fonaredd-app --lines 50
```

**Recherchez :**

- ✅ "Ready on http://localhost:3001" ou similaire
- ❌ Des erreurs de connexion à la base de données
- ❌ Des erreurs de port déjà utilisé

## Étape 3 : Vérifier que l'application écoute sur le port 3001

```bash
# Vérifier les ports ouverts
sudo netstat -tulpn | grep 3001

# Ou avec ss
sudo ss -tulpn | grep 3001
```

Vous devriez voir quelque chose comme :

```
tcp  0  0  0.0.0.0:3001  0.0.0.0:*  LISTEN  [PID]/node
```

## Étape 4 : Tester localement sur le serveur

```bash
# Tester depuis le serveur lui-même
curl http://localhost:3001

# Ou
curl http://127.0.0.1:3001
```

Si ça fonctionne localement mais pas depuis l'extérieur, c'est un problème de firewall.

## Étape 5 : Configurer le Firewall

```bash
# Vérifier le statut du firewall
sudo ufw status

# Autoriser le port 3001
sudo ufw allow 3001/tcp

# Vérifier à nouveau
sudo ufw status
```

## Étape 6 : Vérifier la configuration .env.local

```bash
# Vérifier que le fichier existe et contient les bonnes valeurs
cat .env.local

# Vérifier que NEXTAUTH_URL pointe vers la bonne URL
# Doit être : NEXTAUTH_URL="http://91.134.44.14:3001"
```

## Étape 7 : Redémarrer l'application si nécessaire

```bash
# Redémarrer
pm2 restart fonaredd-app

# Voir les logs après redémarrage
pm2 logs fonaredd-app --lines 20
```

## Étape 8 : Configurer le démarrage automatique

```bash
# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage au boot
pm2 startup

# Copiez-collez la commande suggérée et exécutez-la
# Elle ressemblera à :
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## Problèmes Courants

### L'application ne démarre pas

```bash
# Voir les erreurs détaillées
pm2 logs fonaredd-app --err

# Vérifier la connexion à la base de données
npx prisma db pull
```

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 3001
sudo lsof -i :3001

# Tuer le processus si nécessaire
sudo kill -9 [PID]
```

### Erreur de connexion à la base de données

- Vérifiez que MySQL est accessible depuis le serveur
- Testez : `mysql -h 91.134.44.14 -u giformapp -p`
- Vérifiez les identifiants dans `.env.local`

### L'application fonctionne localement mais pas depuis l'extérieur

1. Vérifiez le firewall : `sudo ufw allow 3001/tcp`
2. Vérifiez les règles iptables si ufw n'est pas utilisé
3. Vérifiez les règles du pare-feu du fournisseur (OVH, AWS, etc.)

## Configuration Nginx (Optionnel - Recommandé)

Si vous voulez utiliser le port 80 au lieu de 3001 :

```bash
# Installer Nginx
sudo apt install -y nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/fonaredd-app
```

Ajoutez :

```nginx
server {
    listen 80;
    server_name 91.134.44.14;

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
