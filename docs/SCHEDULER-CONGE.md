# Scheduler de recalibrage mensuel des soldes de congé

Recalibrage automatique des soldes (`congesolde`) au **début** de chaque mois (idéalement le 1er à 00:05).

## Règles

Avec `nbjourMois` (Config Congé) :

| Mois | Comportement |
|------|----------------|
| **Janvier** | Tout à **zéro** (`solde` + `soldeConsomme`) ; plafond NJ réinitialisé |
| **Février → Octobre** | Restant = `(mois − 1) × nbjourMois` − consommé |
| **Novembre** | Double anticipé : crédite aussi **décembre** → `12 × nbjourMois` − consommé |
| **Décembre** | Maintient `12 × nbjourMois` − consommé |

Exemple si `nbjourMois = 2` :

- Août → 7 × 2 = **14 j.** prévus (− consommé)
- Novembre → 12 × 2 = **24 j.** prévus (− consommé)
- Janvier → **0 / 0**
- Février → 1 × 2 = **2 j.** prévus (− consommé)

La correction manuelle (Répertoire du personnel) utilise **la même logique**.

## Configuration

### 1. Secret (recommandé)

Dans `.env` :

```bash
SCHEDULER_SECRET=votre-cle-secrete-super-securisee
```

### 2. `nbjourMois`

Module Congé → Config Congé, ou `PUT /api/admin/personnel/config-conge`.

## Utilisation

### Test manuel

```bash
npm run scheduler:monthly

# ou
curl -X POST http://localhost:3000/api/conge/scheduler/monthly-update \
  -H "Content-Type: application/json" \
  -d '{"secret": "default-secret-change-me"}'

# ou
node scripts/scheduler-monthly-update.js [secret]
```

### Cron (production) — **1er du mois**

#### Linux/macOS

```bash
crontab -e
```

```bash
# Recalibrage soldes congé — 1er de chaque mois à 00:05
5 0 1 * * /usr/bin/node /chemin/vers/votre/projet/scripts/scheduler-monthly-update.js > /var/log/conge-scheduler.log 2>&1
```

#### Windows (Planificateur de tâches)

- Déclencheur : Mensuel, jour **1**, heure **00:05**
- Programme : `node.exe`
- Arguments : `C:\chemin\vers\votre\projet\scripts\scheduler-monthly-update.js`
- Dossier de travail : le projet

#### Service web (cron-job.org, etc.)

- URL : `https://votre-domaine.com/api/conge/scheduler/monthly-update`
- Méthode : POST
- Corps : `{"secret": "votre-cle-secrete"}`
- Fréquence : **1er du mois**, 00:05

## API

### POST `/api/conge/scheduler/monthly-update`

```json
{ "secret": "votre-cle-secrete" }
```

Réponse typique :

```json
{
  "success": true,
  "message": "Recalibrage Août : 40 agent(s) — 7 mois × 2 j. (− consommé).",
  "details": {
    "month": 8,
    "monthName": "Août",
    "nbjourMois": 2,
    "monthsCounted": 7,
    "totalPrevuSansConso": 14,
    "utilisateursTraites": 40,
    "resetYear": false,
    "plafondNonJustifie": 0
  }
}
```

Janvier :

```json
{
  "success": true,
  "message": "Janvier : 40 solde(s) remis à zéro (NJ plafond 0).",
  "details": {
    "month": 1,
    "monthName": "Janvier",
    "monthsCounted": 0,
    "totalPrevuSansConso": 0,
    "utilisateursTraites": 40,
    "resetYear": true
  }
}
```

## Sécurité

- **Développement** : secret optionnel
- **Production** : `SCHEDULER_SECRET` obligatoire

## Dépannage

1. Serveur Next.js démarré (`PORT` / `HOST` alignés avec le script)
2. Logs cron : `tail -f /var/log/conge-scheduler.log`
3. Test : `npm run scheduler:monthly`
4. `congeconfig.nbjourMois > 0`
5. Utilisateurs actifs : `locked = false`
