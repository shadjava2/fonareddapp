# ✅ Déploiement Réussi - Checklist Finale

## 🎉 Félicitations !

Votre application Fonaredd est maintenant accessible sur **http://91.134.44.14:3001**

## 📋 Checklist Finale

### 1. Nettoyer les anciens processus PM2

Les logs montrent encore des traces de l'ancienne commande. Vérifions que tout est propre :

```bash
# Vérifier le statut
pm2 status

# Voir les logs actuels (devrait montrer le serveur standalone)
pm2 logs fonaredd-app --lines 10
```

### 2. Sauvegarder la configuration PM2

```bash
# Sauvegarder la configuration actuelle
pm2 save
```

### 3. Configurer le démarrage automatique

```bash
# Configurer PM2 pour démarrer au boot
pm2 startup

# Copiez-collez la commande suggérée et exécutez-la
# Elle ressemblera à :
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### 4. Vérifier le firewall

```bash
# Vérifier que le port 3001 est ouvert
sudo ufw status

# Si ce n'est pas le cas :
sudo ufw allow 3001/tcp
```

### 5. Tester l'application

- ✅ Page de connexion accessible : http://91.134.44.14:3001
- ✅ Tester la connexion à la base de données
- ✅ Tester l'authentification

## 🔧 Commandes PM2 Utiles

```bash
pm2 status              # Voir le statut
pm2 logs fonaredd-app   # Voir les logs en temps réel
pm2 restart fonaredd-app # Redémarrer
pm2 stop fonaredd-app   # Arrêter
pm2 monit               # Monitorer (CPU, mémoire)
```

## 🔄 Mise à Jour Future

Pour mettre à jour l'application :

```bash
cd ~/fonaredd

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
npm install --production --no-optional

# Régénérer Prisma si nécessaire
npx prisma generate

# Rebuilder
npm run build

# Redémarrer avec PM2
pm2 restart fonaredd-app
```

## 📝 Notes Importantes

1. **Serveur Standalone** : L'application utilise maintenant `.next/standalone/server.js`
2. **Port** : L'application écoute sur le port 3001
3. **Firewall** : Le port 3001 doit être ouvert dans ufw
4. **Démarrage automatique** : PM2 est configuré pour démarrer au boot

## 🐛 Dépannage

### Si l'application ne démarre pas après un redémarrage

```bash
# Vérifier PM2
pm2 status

# Si l'application n'est pas démarrée
pm2 start node --name "fonaredd-app" -- .next/standalone/server.js
pm2 save
```

### Si les logs montrent encore des erreurs

Les anciens logs peuvent persister. Pour les nettoyer :

```bash
# Vider les logs
pm2 flush

# Redémarrer pour voir les nouveaux logs
pm2 restart fonaredd-app
pm2 logs fonaredd-app
```

## 🎯 Prochaines Étapes (Optionnel)

1. **Configurer Nginx** comme reverse proxy pour utiliser le port 80
2. **Configurer SSL/HTTPS** avec Let's Encrypt
3. **Configurer un domaine** au lieu de l'IP
4. **Mettre en place des sauvegardes** de la base de données

## ✅ Déploiement Terminé !

Votre application est maintenant en production et accessible depuis Internet.
