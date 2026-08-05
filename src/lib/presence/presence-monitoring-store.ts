import { prisma } from '@/lib/prisma';

export type PresenceMonActionRow = {
  id: bigint;
  employee_no: string;
  year: number;
  month: number;
  rule_code: string;
  action: string;
  metric_value: number | null;
  detail: string | null;
  notes: string | null;
};

function db() {
  if (!prisma) {
    throw new Error('Prisma non initialisé');
  }
  return prisma;
}

/** Accès via SQL brut (évite un client Prisma stale après ajout du modèle). */
export async function findPresenceActionsByPeriod(
  year: number,
  month: number
): Promise<PresenceMonActionRow[]> {
  return findPresenceActionsByYearRange(year, month, month);
}

export async function findPresenceActionsByYearRange(
  year: number,
  monthFrom: number,
  monthTo: number
): Promise<PresenceMonActionRow[]> {
  return db().$queryRaw<PresenceMonActionRow[]>`
    SELECT id, employee_no, year, month, rule_code, action,
           metric_value, detail, notes
    FROM presence_monitoring_action
    WHERE year = ${year}
      AND month >= ${monthFrom}
      AND month <= ${monthTo}
  `;
}

export async function findPresenceActionUnique(params: {
  employeeNo: string;
  year: number;
  month: number;
  ruleCode: string;
}): Promise<PresenceMonActionRow | null> {
  const rows = await db().$queryRaw<PresenceMonActionRow[]>`
    SELECT id, employee_no, year, month, rule_code, action,
           metric_value, detail, notes
    FROM presence_monitoring_action
    WHERE employee_no = ${params.employeeNo}
      AND year = ${params.year}
      AND month = ${params.month}
      AND rule_code = ${params.ruleCode}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function upsertPresenceAction(params: {
  employeeNo: string;
  year: number;
  month: number;
  ruleCode: string;
  action: string;
  notes: string | null;
  metricValue: number | null;
  detail: string | null;
  actorId: bigint;
}): Promise<PresenceMonActionRow> {
  const existing = await findPresenceActionUnique({
    employeeNo: params.employeeNo,
    year: params.year,
    month: params.month,
    ruleCode: params.ruleCode,
  });

  if (existing) {
    await db().$executeRaw`
      UPDATE presence_monitoring_action
      SET action = ${params.action},
          notes = ${params.notes},
          metric_value = ${params.metricValue},
          detail = ${params.detail},
          userupdateid = ${params.actorId},
          dateupdate = NOW()
      WHERE id = ${existing.id}
    `;
    return {
      ...existing,
      action: params.action,
      notes: params.notes,
      metric_value: params.metricValue,
      detail: params.detail,
    };
  }

  await db().$executeRaw`
    INSERT INTO presence_monitoring_action
      (employee_no, year, month, rule_code, action, metric_value, detail, notes,
       usercreateid, userupdateid, datecreate, dateupdate)
    VALUES
      (${params.employeeNo}, ${params.year}, ${params.month}, ${params.ruleCode},
       ${params.action}, ${params.metricValue}, ${params.detail}, ${params.notes},
       ${params.actorId}, ${params.actorId}, NOW(), NOW())
  `;

  const created = await findPresenceActionUnique({
    employeeNo: params.employeeNo,
    year: params.year,
    month: params.month,
    ruleCode: params.ruleCode,
  });
  if (!created) {
    throw new Error('Échec création action monitoring');
  }
  return created;
}

/** Garantit que la table existe (idempotent). */
export async function ensurePresenceMonitoringTable(): Promise<void> {
  await db().$executeRaw`
    CREATE TABLE IF NOT EXISTS presence_monitoring_action (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_no VARCHAR(64) NOT NULL,
      year INT NOT NULL,
      month TINYINT NOT NULL,
      rule_code VARCHAR(32) NOT NULL,
      action VARCHAR(40) NOT NULL DEFAULT 'pending',
      metric_value FLOAT NULL,
      detail TEXT NULL,
      notes VARCHAR(500) NULL,
      datecreate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      dateupdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      usercreateid BIGINT UNSIGNED NULL,
      userupdateid BIGINT UNSIGNED NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_presence_mon_case (employee_no, year, month, rule_code),
      KEY idx_presence_mon_period (year, month),
      KEY idx_presence_mon_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
}
