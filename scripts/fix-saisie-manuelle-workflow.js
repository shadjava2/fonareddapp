/**
 * Met à jour sp_conge_after_insert pour ignorer la saisie manuelle,
 * et nettoie les traitements/notifs déjà créés à tort.
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
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

const PROCEDURE_SQL = `
CREATE PROCEDURE sp_conge_after_insert(IN p_congedemande_id BIGINT)
BEGIN
    DECLARE v_id_remplacant  BIGINT;
    DECLARE v_id_superviseur BIGINT;
    DECLARE v_id_admin       BIGINT;
    DECLARE v_id_val1        BIGINT;
    DECLARE v_id_val2        BIGINT;
    DECLARE v_section        VARCHAR(255);

    DECLARE v_mail_remplacant  VARCHAR(255);
    DECLARE v_mail_superviseur VARCHAR(255);
    DECLARE v_mail_admin       VARCHAR(255);
    DECLARE v_mail_val1        VARCHAR(255);
    DECLARE v_mail_val2        VARCHAR(255);

    SELECT cd.idremplacant, cd.userupdateid, cd.section
    INTO v_id_remplacant, v_id_superviseur, v_section
    FROM congedemande cd
    WHERE cd.id = p_congedemande_id;

    IF v_section IS NULL OR (
         v_section <> 'Saisie manuelle'
         AND v_section NOT LIKE 'Saisie manuelle%'
       ) THEN

        IF v_id_remplacant IS NOT NULL THEN
            SELECT mail INTO v_mail_remplacant
            FROM utilisateurs WHERE id = v_id_remplacant LIMIT 1;
        END IF;

        IF v_id_superviseur IS NOT NULL THEN
            SELECT mail INTO v_mail_superviseur
            FROM utilisateurs WHERE id = v_id_superviseur LIMIT 1;
        END IF;

        SELECT id, mail INTO v_id_admin, v_mail_admin
        FROM utilisateurs WHERE fkRole = 5 ORDER BY id LIMIT 1;

        SELECT id, mail INTO v_id_val1, v_mail_val1
        FROM utilisateurs WHERE fkRole = 11 ORDER BY id LIMIT 1;

        SELECT id, mail INTO v_id_val2, v_mail_val2
        FROM utilisateurs WHERE fkRole = 12 ORDER BY id LIMIT 1;

        INSERT INTO congetraitements (
            fkDemande, fkPhase, observations, conformite, approbation,
            datecreate, dateupdate, usercreateid, userupdateid
        )
        SELECT p_congedemande_id, 1, NULL, 0, 0, NOW(), NOW(), v_id_remplacant, v_id_remplacant
        WHERE v_id_remplacant IS NOT NULL
        UNION ALL
        SELECT p_congedemande_id, 2, NULL, 0, 0, NOW(), NOW(), v_id_admin, v_id_admin
        WHERE v_id_admin IS NOT NULL
        UNION ALL
        SELECT p_congedemande_id, 3, NULL, 0, 0, NOW(), NOW(), v_id_superviseur, v_id_superviseur
        WHERE v_id_superviseur IS NOT NULL
        UNION ALL
        SELECT p_congedemande_id, 4, NULL, 0, 0, NOW(), NOW(), v_id_val1, v_id_val1
        WHERE v_id_val1 IS NOT NULL
        UNION ALL
        SELECT p_congedemande_id, 5, NULL, 0, 0, NOW(), NOW(), v_id_val2, v_id_val2
        WHERE v_id_val2 IS NOT NULL;

        INSERT INTO notifications (
            fkUtilisateur,
            type_notification,
            statut,
            sujet,
            contenu,
            adresse_destinataire,
            date_programmee,
            date_envoi,
            datecreate,
            dateupdate,
            usercreateid,
            userupdateid
        )
        SELECT
            ct.usercreateid AS fkUtilisateur,
            'email',
            'en attente',
            CONCAT('Nouvelle demande de congé à traiter (phase ', ct.fkPhase, ')') AS sujet,
            'Non Ouvert',
            COALESCE(
                CASE ct.fkPhase
                    WHEN 1 THEN v_mail_remplacant
                    WHEN 2 THEN v_mail_admin
                    WHEN 3 THEN v_mail_superviseur
                    WHEN 4 THEN v_mail_val1
                    WHEN 5 THEN v_mail_val2
                END,
                'no-mail@system.local'
            ) AS adresse_destinataire,
            NOW(),
            NOW(),
            NOW(),
            NOW(),
            ct.usercreateid,
            ct.usercreateid
        FROM congetraitements ct
        LEFT JOIN notifications n
            ON n.fkUtilisateur = ct.usercreateid
           AND n.sujet = CONCAT('Nouvelle demande de congé à traiter (phase ', ct.fkPhase, ')')
           AND n.contenu = 'Non Ouvert'
        WHERE ct.fkDemande = p_congedemande_id
          AND n.id IS NULL;

    END IF;
END
`;

(async () => {
  const cfg = parseMysqlUrl(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({ ...cfg, ssl: false, multipleStatements: true });

  console.log('Drop + recreate sp_conge_after_insert…');
  await conn.query('DROP PROCEDURE IF EXISTS sp_conge_after_insert');
  await conn.query(PROCEDURE_SQL);
  console.log('OK procedure updated');

  // Nettoyage des saisies manuelles déjà polluées
  const [saisies] = await conn.query(
    `SELECT id FROM congedemande
     WHERE section = 'Saisie manuelle' OR section LIKE 'Saisie manuelle%'`
  );
  const ids = saisies.map((r) => r.id);
  console.log('Saisies manuelles:', ids);

  if (ids.length > 0) {
    const [delT] = await conn.query(
      `DELETE FROM congetraitements WHERE fkDemande IN (?)`,
      [ids]
    );
    console.log('Traitements supprimés:', delT.affectedRows);

    const [delN] = await conn.query(
      `DELETE FROM notifications
       WHERE contenu = 'Non Ouvert'
         AND sujet LIKE 'Nouvelle demande de congé à traiter (phase %)'
         AND datecreate >= (
           SELECT MIN(datecreate) FROM (
             SELECT datecreate FROM congedemande WHERE id IN (?)
           ) x
         )
         AND fkUtilisateur IN (
           SELECT DISTINCT usercreateid FROM (
             SELECT usercreateid FROM congetraitements WHERE fkDemande IN (?)
             UNION
             SELECT userupdateid FROM congedemande WHERE id IN (?)
             UNION
             SELECT id FROM utilisateurs WHERE fkRole IN (5, 11, 12)
           ) u
         )`,
      [ids, ids, ids]
    );
    // The above might not find traitements already deleted. Simpler cleanup:
    console.log('(notif cleanup attempt)', delN?.affectedRows);
  }

  // Cleanup notifications for demande 177314 specifically around its create time
  const [delN2] = await conn.query(
    `DELETE n FROM notifications n
     INNER JOIN congedemande d ON d.id IN (?)
     WHERE n.contenu = 'Non Ouvert'
       AND n.sujet LIKE 'Nouvelle demande de congé à traiter (phase %)'
       AND n.datecreate BETWEEN DATE_SUB(d.datecreate, INTERVAL 2 SECOND)
                           AND DATE_ADD(d.datecreate, INTERVAL 5 SECOND)`,
    [ids.length ? ids : [0]]
  );
  console.log('Notifications nettoyées:', delN2.affectedRows);

  const [check] = await conn.query(
    `SELECT COUNT(*) AS c FROM congetraitements WHERE fkDemande IN (?)`,
    [ids.length ? ids : [0]]
  );
  console.log('Traitements restants pour saisies:', check[0].c);

  await conn.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
