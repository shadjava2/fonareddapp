# Scheduler de Mise à Jour Mensuelle des Soldes de Congé

Ce document explique comment configurer et utiliser le scheduler automatique pour mettre à jour les soldes de congé mensuellement.

## Fonctionnement

Le scheduler met à jour les soldes de congé (`congesolde`) à la fin de chaque mois selon les règles suivantes :

### Règles Mensuelles

1. **Janvier à Octobre** : Ajoute `nbjourMois` (depuis `congeconfig`) au solde de chaque utilisateur actif
2. **Novembre** : Ajoute `nbjourMois * 2` jours (pour compenser le mois de janvier où rien n'est ajouté)
3. **Décembre** : Remet tous les soldes (`solde` et `soldeConsomme`) à 0

### Exemple

Si `nbjourMois = 2.5` :

- Février à Octobre : +2.5 jours par mois pour chaque utilisateur
- Novembre : +5 jours (2.5 \* 2) pour compenser janvier
- Décembre : Remise à zéro de tous les soldes

## Configuration

### 1. Variable d'environnement (optionnel mais recommandé)

Pour sécuriser l'endpoint, définissez une clé secrète dans `.env` :

```bash
SCHEDULER_SECRET=votre-cle-secrete-super-securisee
```

### 2. Configuration du nombre de jours par mois

Assurez-vous que la configuration `congeconfig` est définie avec `nbjourMois` :

- Via l'interface : Module Congé > Config Congé
- Via l'API : `PUT /api/admin/personnel/config-conge` avec `{ "nbjourMois": 2.5 }`

## Utilisation

### Test Manuel

Pour tester le scheduler manuellement (en développement) :

```bash
# Méthode 1 : Via npm script
npm run scheduler:monthly

# Méthode 2 : Via curl
curl -X POST http://localhost:3000/api/conge/scheduler/monthly-update \
  -H "Content-Type: application/json" \
  -d '{"secret": "default-secret-change-me"}'

# Méthode 3 : Via le script Node.js directement
node scripts/scheduler-monthly-update.js [secret]
```

### Configuration Cron (Production)

Pour exécuter automatiquement le scheduler à la fin de chaque mois, configurez un cron job.

#### Linux/macOS

1. Ouvrez le crontab :

```bash
crontab -e
```

2. Ajoutez cette ligne pour exécuter le dernier jour de chaque mois à 23h59 :

```bash
# Scheduler mensuel des soldes de congé
# Exécute le dernier jour de chaque mois à 23h59
59 23 28-31 * * /usr/bin/node /chemin/vers/votre/projet/scripts/scheduler-monthly-update.js > /var/log/conge-scheduler.log 2>&1
```

3. Pour une exécution plus précise (dernier jour réel du mois), utilisez :

```bash
# Script wrapper qui vérifie si on est le dernier jour du mois
59 23 28-31 * * /chemin/vers/votre/projet/scripts/check-last-day.sh
```

#### Windows (Task Scheduler)

1. Ouvrez le Planificateur de tâches Windows
2. Créez une nouvelle tâche
3. Définissez le déclencheur :
   - Type : Mensuel
   - Mois : Tous
   - Jour : Dernier jour du mois
   - Heure : 23:59
4. Action :
   - Programme : `node.exe`
   - Arguments : `C:\chemin\vers\votre\projet\scripts\scheduler-monthly-update.js`
   - Dossier de travail : `C:\chemin\vers\votre\projet`

#### Via un Service Web (Exemple : cron-job.org, EasyCron)

1. Créez un compte sur un service de cron en ligne
2. Configurez :
   - URL : `https://votre-domaine.com/api/conge/scheduler/monthly-update`
   - Méthode : POST
   - Corps : `{"secret": "votre-cle-secrete"}`
   - Fréquence : Mensuel, dernier jour à 23h59
   - Headers : `Content-Type: application/json`

## Script Wrapper pour Vérifier le Dernier Jour du Mois

Créez `scripts/check-last-day.sh` :

```bash
#!/bin/bash

# Vérifier si aujourd'hui est le dernier jour du mois
TODAY=$(date +%d)
LAST_DAY=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%d)

if [ "$TODAY" = "$LAST_DAY" ]; then
    echo "$(date): Exécution du scheduler mensuel..."
    /usr/bin/node /chemin/vers/votre/projet/scripts/scheduler-monthly-update.js
else
    echo "$(date): Pas le dernier jour du mois, skip."
fi
```

Rendez-le exécutable :

```bash
chmod +x scripts/check-last-day.sh
```

## API Endpoint

### POST `/api/conge/scheduler/monthly-update`

**Corps de la requête :**

```json
{
  "secret": "votre-cle-secrete"
}
```

**Réponse (succès) :**

```json
{
  "success": true,
  "message": "2.5 jour(s) ajouté(s) à 10 utilisateur(s) pour Février",
  "details": {
    "month": 2,
    "monthName": "Février",
    "nbjourMois": 2.5,
    "joursAjoutes": 25,
    "utilisateursTraites": 10
  }
}
```

**Réponse (décembre - remise à zéro) :**

```json
{
  "success": true,
  "message": "Tous les soldes ont été remis à zéro pour décembre",
  "details": {
    "month": 12,
    "monthName": "Décembre",
    "nbjourMois": 2.5,
    "joursAjoutes": 0,
    "utilisateursTraites": 10,
    "totalSoldesResets": 10
  }
}
```

## Logs

Les logs sont disponibles :

- Console du serveur Next.js (si exécuté manuellement)
- Fichier de log défini dans le cron job
- Logs de l'application (via console.log)

## Sécurité

- En **développement** : Le secret est optionnel
- En **production** : Le secret est **obligatoire** (définissez `SCHEDULER_SECRET` dans `.env`)

## Dépannage

### Le scheduler ne s'exécute pas

1. Vérifiez que le serveur Next.js est en cours d'exécution
2. Vérifiez les logs du cron job : `tail -f /var/log/conge-scheduler.log`
3. Testez manuellement : `npm run scheduler:monthly`
4. Vérifiez la configuration `congeconfig` : `nbjourMois` doit être défini

### Erreur "Clé secrète invalide"

1. Vérifiez que `SCHEDULER_SECRET` est défini dans `.env`
2. Assurez-vous que le secret dans la requête correspond à celui dans `.env`
3. En développement, vous pouvez tester sans secret (non recommandé en production)

### Les soldes ne sont pas mis à jour

1. Vérifiez que les utilisateurs ont `locked = false` (utilisateurs actifs)
2. Vérifiez les logs pour voir combien d'utilisateurs ont été traités
3. Vérifiez que la configuration `congeconfig` existe avec `nbjourMois > 0`
