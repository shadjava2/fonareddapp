#!/usr/bin/env node

/**
 * Recalibrage automatique des soldes de congé (début de mois).
 *
 * Utilisation:
 *   node scripts/scheduler-monthly-update.js [secret]
 *
 * Cron recommandé (1er du mois à 00:05):
 *   5 0 1 * * /usr/bin/node /path/to/scripts/scheduler-monthly-update.js
 */

const http = require('http');
const https = require('https');

const DEFAULT_PORT = process.env.PORT || 3001;
const DEFAULT_HOST = process.env.HOST || 'localhost';
const DEFAULT_PROTOCOL = process.env.PROTOCOL || 'http';
const SCHEDULER_SECRET =
  process.env.SCHEDULER_SECRET || 'default-secret-change-me';

const secret = process.argv[2] || SCHEDULER_SECRET;

const url = `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${DEFAULT_PORT}/api/conge/scheduler/monthly-update`;

console.log('📅 Scheduler recalibrage soldes de congé (début de mois)');
console.log(`🔗 URL: ${url}`);
console.log('⏰ Date:', new Date().toISOString());

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
            'Jours/mois': response.details.nbjourMois,
            'Mois crédités': response.details.monthsCounted,
            'Total prévu (sans conso)': response.details.totalPrevuSansConso,
            'Utilisateurs traités': response.details.utilisateursTraites,
            'Reset année (janvier)': response.details.resetYear || false,
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
    `💡 Assurez-vous que le serveur tourne sur ${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${DEFAULT_PORT}`
  );
  process.exit(1);
});

req.setTimeout(180_000, () => {
  console.error('❌ Timeout (180s) — le serveur met trop longtemps à répondre');
  req.destroy();
  process.exit(1);
});

const body = JSON.stringify({ secret });
req.write(body);
req.end();
