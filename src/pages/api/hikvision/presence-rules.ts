import {
  DEFAULT_PRESENCE_RULES,
  ensurePresenceRulesRow,
  getPresenceRules,
  sanitizePresenceRules,
  type PresenceRulesConfig,
} from '@/lib/presence/attendance-performance';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';

function isMissingTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021'
  );
}

function parseHm(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  // input type="time" peut renvoyer HH:MM ou HH:MM:SS
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  return fallback;
}

function parseIntField(value: unknown, fallback: number, min = 0, max = 1000): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const rules = await ensurePresenceRulesRow();
      return res.status(200).json({
        success: true,
        rules,
        message: 'Règles de présence (Timetable)',
      });
    } catch (error: unknown) {
      console.error('presence-rules GET:', error);
      return res.status(200).json({
        success: true,
        rules: DEFAULT_PRESENCE_RULES,
        message:
          'Règles par défaut (lecture base impossible — vérifiez presence_rules).',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (req.body || {}) as Partial<PresenceRulesConfig>;
      const current = await getPresenceRules();
      const data = sanitizePresenceRules({
        start_work_time: parseHm(body.start_work_time, current.start_work_time),
        end_work_time: parseHm(body.end_work_time, current.end_work_time),
        checkin_valid_from: parseHm(
          body.checkin_valid_from,
          current.checkin_valid_from
        ),
        checkin_valid_to: parseHm(
          body.checkin_valid_to,
          current.checkin_valid_to
        ),
        late_from: parseHm(body.late_from, current.late_from),
        late_until: parseHm(body.late_until, current.late_until),
        checkout_valid_from: parseHm(
          body.checkout_valid_from,
          current.checkout_valid_from
        ),
        checkout_valid_to: parseHm(
          body.checkout_valid_to,
          current.checkout_valid_to
        ),
        late_allowable_minutes: parseIntField(
          body.late_allowable_minutes,
          current.late_allowable_minutes,
          0,
          240
        ),
        early_leave_allowable_minutes: parseIntField(
          body.early_leave_allowable_minutes,
          current.early_leave_allowable_minutes,
          0,
          240
        ),
        absent_after_hours: parseIntField(
          body.absent_after_hours,
          current.absent_after_hours,
          1,
          12
        ),
        count_mission_as_presence:
          body.count_mission_as_presence !== undefined
            ? Boolean(body.count_mission_as_presence)
            : current.count_mission_as_presence,
        score_on_time: parseIntField(body.score_on_time, current.score_on_time, 0, 100),
        score_late: parseIntField(body.score_late, current.score_late, 0, 100),
        score_early_leave: parseIntField(
          body.score_early_leave,
          current.score_early_leave,
          0,
          100
        ),
        score_late_exit: parseIntField(
          body.score_late_exit,
          current.score_late_exit,
          0,
          100
        ),
        score_absent: parseIntField(body.score_absent, current.score_absent, 0, 100),
        score_mission_day: parseIntField(
          body.score_mission_day,
          current.score_mission_day,
          0,
          100
        ),
        excellent_min: parseIntField(body.excellent_min, current.excellent_min, 0, 100),
        bon_min: parseIntField(body.bon_min, current.bon_min, 0, 100),
        moyen_min: parseIntField(body.moyen_min, current.moyen_min, 0, 100),
      });

      // Raw SQL : évite l’échec Prisma si le client n’a pas encore late_from
      await prisma.$executeRawUnsafe(
        `INSERT INTO presence_rules (
          id, start_work_time, end_work_time, checkin_valid_from, checkin_valid_to,
          late_from, late_until, checkout_valid_from, checkout_valid_to,
          late_allowable_minutes, early_leave_allowable_minutes, absent_after_hours,
          count_mission_as_presence, score_on_time, score_late, score_early_leave,
          score_late_exit, score_absent, score_mission_day, excellent_min, bon_min, moyen_min,
          updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        )
        ON DUPLICATE KEY UPDATE
          start_work_time = VALUES(start_work_time),
          end_work_time = VALUES(end_work_time),
          checkin_valid_from = VALUES(checkin_valid_from),
          checkin_valid_to = VALUES(checkin_valid_to),
          late_from = VALUES(late_from),
          late_until = VALUES(late_until),
          checkout_valid_from = VALUES(checkout_valid_from),
          checkout_valid_to = VALUES(checkout_valid_to),
          late_allowable_minutes = VALUES(late_allowable_minutes),
          early_leave_allowable_minutes = VALUES(early_leave_allowable_minutes),
          absent_after_hours = VALUES(absent_after_hours),
          count_mission_as_presence = VALUES(count_mission_as_presence),
          score_on_time = VALUES(score_on_time),
          score_late = VALUES(score_late),
          score_early_leave = VALUES(score_early_leave),
          score_late_exit = VALUES(score_late_exit),
          score_absent = VALUES(score_absent),
          score_mission_day = VALUES(score_mission_day),
          excellent_min = VALUES(excellent_min),
          bon_min = VALUES(bon_min),
          moyen_min = VALUES(moyen_min),
          updated_at = NOW()`,
        data.start_work_time,
        data.end_work_time,
        data.checkin_valid_from,
        data.checkin_valid_to,
        data.late_from,
        data.late_until,
        data.checkout_valid_from,
        data.checkout_valid_to,
        data.late_allowable_minutes,
        data.early_leave_allowable_minutes,
        data.absent_after_hours,
        data.count_mission_as_presence ? 1 : 0,
        data.score_on_time,
        data.score_late,
        data.score_early_leave,
        data.score_late_exit,
        data.score_absent,
        data.score_mission_day,
        data.excellent_min,
        data.bon_min,
        data.moyen_min
      );

      const rules = await getPresenceRules();
      return res.status(200).json({
        success: true,
        rules,
        message: 'Règles de présence enregistrées',
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) {
        return res.status(503).json({
          success: false,
          code: 'TABLE_MISSING',
          message:
            'Table presence_rules absente. Exécutez docs/hikvision/sql-presence-rules.sql puis réessayez.',
        });
      }
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      return res.status(500).json({
        success: false,
        message: 'Impossible d’enregistrer les règles',
        error: msg,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}
