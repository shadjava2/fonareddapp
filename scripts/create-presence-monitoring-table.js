require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const mysql = require('mysql2/promise');

function parseMysqlUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database: decodeURIComponent(
      u.pathname.replace(/^\//, '').split('/')[0] || ''
    ),
  };
}

(async () => {
  const cfg = parseMysqlUrl(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    ...cfg,
    ssl: false,
    multipleStatements: true,
  });
  const sql = fs.readFileSync(
    'docs/sql/presence-monitoring-action.sql',
    'utf8'
  );
  await conn.query(sql);
  const [rows] = await conn.query(
    "SHOW TABLES LIKE 'presence_monitoring_action'"
  );
  console.log('OK', rows);
  await conn.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
