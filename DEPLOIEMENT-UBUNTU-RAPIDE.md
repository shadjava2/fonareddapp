# Déploiement production Ubuntu — Fonaredd (source de vérité)

> **Obligatoire pour tous les agents / opérateurs.**  
> Ne pas proposer PM2, `/opt/fonaredd-app`, `~/fonaredd`, ni `git pull` seul.  
> L’application tourne en **Docker** (`app-prod` + Caddy) sous `/opt/fonaredd`.

## Mise à jour standard (commande unique)

```bash
cd /opt/fonaredd
git fetch origin && git reset --hard origin/main
sudo env RUN_MIGRATE=0 bash scripts/deploy-with-rollback.sh
```

- `git reset --hard origin/main` : aligne le code serveur sur GitHub (écrase les modifs locales du dépôt).
- `RUN_MIGRATE=0` : **ne pas** lancer Prisma migrate (évite les faux rollbacks) ; le schéma prod se met à jour via scripts SQL additifs dans `docs/sql/`.
- Le script build l’image, redémarre `app-prod`/`caddy`, health-check, rollback image Docker si le health échoue.

### Si Git refuse (ownership / permissions)

```bash
sudo chown -R fonaredd:fonaredd /opt/fonaredd
git config --global --add safe.directory /opt/fonaredd
chmod +x scripts/deploy-with-rollback.sh
```

Puis relancer la commande standard.  
Si `RUN_MIGRATE=0` n’est pas pris avec `sudo`, utiliser :

```bash
sudo env RUN_MIGRATE=0 bash scripts/deploy-with-rollback.sh
```

## Variables d’environnement (`.env` à la racine `/opt/fonaredd`)

MySQL est sur l’**hôte**, pas dans Docker. Depuis le conteneur :

```env
DATABASE_URL="mysql://USER:PASS@host.docker.internal:3306/NOM_BASE?allowPublicKeyRetrieval=true&ssl=false"
DB_CONNECT_TIMEOUT_MS=15000
DB_ACQUIRE_TIMEOUT_MS=60000
DB_CONNECTION_LIMIT=5
JWT_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://votre-domaine"
```

- **Interdit** dans Docker : `@127.0.0.1` / `@localhost` (le conteneur ne voit pas le MySQL hôte).
- Après changement de `.env` :  
  `sudo docker compose -p fonaredd --env-file .env up -d --force-recreate app-prod`

Si MySQL a bloqué l’IP Docker :

```bash
sudo mysqladmin flush-hosts
```

## Scripts SQL additifs (prod)

Appliquer manuellement si un déploiement introduit un fichier sous `docs/sql/` (ex. superviseur principal, pièces jointes) :

```bash
cd /opt/fonaredd
# Nom de base = segment après le dernier / dans DATABASE_URL (ex. fonaredd-app).
# Utiliser des GUILLEMETS SIMPLES — pas de backticks (sinon bash exécute le nom comme commande).
sudo mysql 'fonaredd-app' < docs/sql/conge-superviseur-principal.sql
sudo mysql 'fonaredd-app' < docs/sql/conge-demande-fichiers.sql
sudo mysql 'fonaredd-app' < docs/sql/conge-rbac-align-admin.sql
```

Règle : **additive only** (`CREATE TABLE IF NOT EXISTS`, `ALTER ... ADD COLUMN` nullable). Jamais de `DROP` / truncate métier.

## Checklist MVP Congé (recette post-deploy)

1. Login OK (compte Mo / rôle 16 = toutes permissions catalogue).
2. Config congé : définir un **superviseur principal** ; sauvegarder.
3. Créer une demande avec **pièces jointes** (PDF/JPG/PNG) ; visibles dans traitement.
4. Si principal ≠ superviseur demande : email copie + observation optionnelle non bloquante.
5. Si principal = superviseur : une seule notif / un seul acteur phase 3.
6. Alarme : **1 son** par nouvelle notif ; clignotement menu jusqu’à ouverture Traitement.
7. Liste traitements **groupée par agent** ; détail au clic.
8. Boutons Imprimer / Modifier / Annuler / Traiter absents sans permission.
9. Smoke : `curl -I http://127.0.0.1:13001/` + pages `/conge/demandes-conge` et `/conge/traitement-demandes`.

## Vérifications post-déploiement

```bash
git log -1 --oneline
sudo docker compose -p fonaredd ps
curl -I http://127.0.0.1:13001/
curl -I http://127.0.0.1:18080/
sudo docker logs fonaredd-app-prod --tail 80
```

## Interdictions

- Ne pas utiliser PM2 pour la prod actuelle.
- Ne pas documenter `/opt/fonaredd-app` comme chemin actif.
- Ne pas lancer `prisma migrate deploy` en prod sans décision explicite (`RUN_MIGRATE=1` + `MIGRATE_STRICT` si besoin).
- Ne pas committer `.env`, dumps Hikvision, photos ACS.

## Première installation (rappel)

Cloner dans `/opt/fonaredd`, créer `.env`, puis :

```bash
sudo env RUN_MIGRATE=0 bash scripts/deploy-with-rollback.sh
```

Détails Docker : `docker-compose.yml`, `scripts/deploy-with-rollback.sh`, `Dockerfile`.
