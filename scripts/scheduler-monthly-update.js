#!/usr/bin/env node

/**
 * Script scheduler pour mettre à jour les soldes de congé mensuellement
 *
 * Utilisation:
 *   node scripts/scheduler-monthly-update.js [secret]
 *
 * Pour cron job (exécuter le dernier jour de chaque mois à 23h59):
 *   59 23 28-31 * * /usr/bin/node /path/to/scripts/scheduler-monthly-update.js
 */

const http = require('http');
const https = require('https');

// Configuration
const DEFAULT_PORT = process.env.PORT || 3001;
const DEFAULT_HOST = process.env.HOST || 'localhost';
const DEFAULT_PROTOCOL = process.env.PROTOCOL || 'http';
const SCHEDULER_SECRET =
  process.env.SCHEDULER_SECRET || 'default-secret-change-me';

// Récupérer le secret depuis les arguments de ligne de commande ou variable d'environnement
const secret = process.argv[2] || SCHEDULER_SECRET;

const url = `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${DEFAULT_PORT}/api/conge/scheduler/monthly-update`;

console.log('📅 Scheduler de mise à jour mensuelle des soldes de congé');
console.log(`🔗 URL: ${url}`);
console.log('⏰ Date:', new Date().toISOString());

// Faire la requête POST
const requestOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const protocol = DEFAULT_PROTOCOL === 'https' ? https : http;

const req = protocol.request(url, requestOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (response.success) {
        console.log('✅ Succès:', response.message);
        if (response.details) {
          console.log('📊 Détails:', {
            Mois: `${response.details.month} - ${response.details.monthName}`,
            'Jours/mois configurés': response.details.nbjourMois,
            'Jours ajoutés': response.details.joursAjoutes,
            'Utilisateurs traités': response.details.utilisateursTraites,
            'Soldes remis à zéro': response.details.totalSoldesResets || 0,
          });
        }
        process.exit(0);
      } else {
        console.error('❌ Erreur:', response.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Erreur lors du parsing de la réponse:', error);
      console.error('Réponse brute:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur de connexion:', error.message);
  console.error(
    `💡 Assurez-vous que le serveur est en cours d'exécution sur ${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${DEFAULT_PORT}`
  );
  process.exit(1);
});

// Envoyer les données
const body = JSON.stringify({ secret });
req.write(body);
req.end();
