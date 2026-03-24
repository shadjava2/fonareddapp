# 🔐 Authentification GitHub pour Ubuntu

## Problème
GitHub ne supporte plus l'authentification par mot de passe. Vous devez utiliser un **Personal Access Token (PAT)** ou **SSH**.

## Solution 1 : Personal Access Token (Recommandé - Plus Simple)

### Étape 1 : Créer un Personal Access Token sur GitHub

1. Allez sur GitHub : https://github.com/settings/tokens
2. Cliquez sur **"Generate new token"** → **"Generate new token (classic)"**
3. Donnez un nom au token (ex: "Ubuntu Server Deploy")
4. Sélectionnez les permissions :
   - ✅ **repo** (accès complet aux dépôts)
5. Cliquez sur **"Generate token"**
6. **⚠️ IMPORTANT :** Copiez le token immédiatement (vous ne pourrez plus le voir après)

### Étape 2 : Cloner le dépôt avec le token

Sur votre serveur Ubuntu :

```bash
# Utiliser le token comme mot de passe
git clone https://github.com/shadjava2/fonaredd.git

# Quand il demande :
# Username: mpakadev@gmail.com
# Password: [COLLEZ VOTRE TOKEN ICI]
```

**OU** directement dans la commande (plus pratique) :

```bash
# Remplacer YOUR_TOKEN par votre token
git clone https://YOUR_TOKEN@github.com/shadjava2/fonaredd.git

# Ou avec votre username
git clone https://mpakadev@gmail.com:YOUR_TOKEN@github.com/shadjava2/fonaredd.git
```

### Étape 3 : Configurer Git pour éviter de retaper le token

```bash
# Configurer Git pour utiliser le token
git config --global credential.helper store

# Ou créer un fichier .git-credentials
echo "https://YOUR_TOKEN@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
```

## Solution 2 : SSH (Alternative)

### Étape 1 : Générer une clé SSH sur le serveur

```bash
# Générer une clé SSH
ssh-keygen -t ed25519 -C "mpakadev@gmail.com"

# Appuyez sur Entrée pour accepter l'emplacement par défaut
# Entrez un mot de passe (ou laissez vide)

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub
```

### Étape 2 : Ajouter la clé sur GitHub

1. Copiez le contenu de `~/.ssh/id_ed25519.pub`
2. Allez sur GitHub : https://github.com/settings/keys
3. Cliquez sur **"New SSH key"**
4. Donnez un titre (ex: "Ubuntu Server")
5. Collez la clé publique
6. Cliquez sur **"Add SSH key"**

### Étape 3 : Cloner avec SSH

```bash
# Changer l'URL du remote en SSH
git clone git@github.com:shadjava2/fonaredd.git
```

## Solution 3 : Utiliser le token dans l'URL (Rapide)

```bash
# Remplacez YOUR_TOKEN par votre token GitHub
git clone https://YOUR_TOKEN@github.com/shadjava2/fonaredd.git fonaredd

cd fonaredd
```

## Commandes Complètes avec Token

```bash
# 1. Créer le token sur GitHub (voir étape 1 ci-dessus)
# 2. Sur Ubuntu, cloner avec le token :

# Option A : Demander interactivement
git clone https://github.com/shadjava2/fonaredd.git
# Username: mpakadev@gmail.com
# Password: [votre token]

# Option B : Directement dans l'URL (remplacez YOUR_TOKEN)
git clone https://YOUR_TOKEN@github.com/shadjava2/fonaredd.git

# 3. Aller dans le dossier
cd fonaredd

# 4. Vérifier que package.json existe
ls -la package.json

# 5. Continuer avec l'installation
npm install --production --no-optional
```

## ⚠️ Sécurité

- **Ne jamais** commiter le token dans le code
- **Ne jamais** partager le token publiquement
- Le token a les mêmes permissions que votre compte GitHub
- Vous pouvez révoquer le token à tout moment sur GitHub

## Dépannage

### Erreur : "fatal: Authentication failed"

- Vérifiez que le token est correct
- Vérifiez que le token a la permission "repo"
- Essayez de régénérer un nouveau token

### Erreur : "Permission denied (publickey)" avec SSH

- Vérifiez que la clé SSH est bien ajoutée sur GitHub
- Testez la connexion : `ssh -T git@github.com`
