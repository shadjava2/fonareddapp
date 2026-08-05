import { createHash } from 'node:crypto';
import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';

const AUTH = [
  PERMISSIONS.PRESENCE_MANAGE,
  PERMISSIONS.PRESENCE_VIEW,
  PERMISSIONS.MODULE_PERSONNEL,
  PERMISSIONS.MODULE_ADMIN,
  PERMISSIONS.USER_MANAGE,
];

function normalizeEmployeeNo(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^'+/, '')
    .replace(/'+$/, '')
    .trim();
}

function parseHm(hm: string): { h: number; m: number } | null {
  const s = String(hm || '')
    .trim()
    .replace(/h/gi, ':')
    .replace(/\./g, ':');
  const m = /^(\d{1,2}):(\d{2})$/.exec(s) || /^(\d{1,2}):(\d{2}):\d{2}$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return null;
  }
  return { h, m: min };
}

function eventIndexFor(
  employeeNo: string,
  iso: string,
  kind: string
): bigint {
  const hex = createHash('sha256')
    .update(`manual|${employeeNo}|${iso}|${kind}`)
    .digest('hex')
    .slice(0, 15);
  return BigInt(`0x${hex}`);
}

function isManualEvent(row: {
  source?: string | null;
  data_source?: string | null;
  device_ip?: string | null;
}): boolean {
  const src = String(row.source || row.data_source || '').toLowerCase();
  return src === 'manual' || String(row.device_ip || '') === 'manual';
}

function formatManualRow(row: {
  id: bigint;
  event_time: Date;
  custom_status: string | null;
  event_type: string;
  direction: string | null;
  employee_no: string | null;
  person_name: string | null;
}) {
  const hh = String(row.event_time.getUTCHours()).padStart(2, '0');
  const mm = String(row.event_time.getUTCMinutes()).padStart(2, '0');
  return {
    id: row.id.toString(),
    event_time: row.event_time.toISOString(),
    time: `${hh}:${mm}`,
    custom_status: row.custom_status || row.event_type,
    direction: row.direction,
    employee_no: row.employee_no,
    person_name: row.person_name,
  };
}

type UpsertResult = {
  id: string;
  custom_status: string;
  event_time: string;
  time: string;
};

/**
 * Pointage manuel (feuille papier) — optimisé (peu d’allers-retours DB).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authUser = await requireApiPermissions(req, res, AUTH);
  if (!authUser) return;

  try {
    if (req.method === 'GET') {
      const employeeNo = normalizeEmployeeNo(
        String(req.query.employeeNo || '')
      );
      const dateStr = String(req.query.date || '').trim().slice(0, 10);
      if (!employeeNo || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({
          success: false,
          message: 'employeeNo et date (AAAA-MM-JJ) sont requis',
        });
      }

      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      // Filtre simple indexé (device_ip + event_time)
      const rows = await prisma.acs_events.findMany({
        where: {
          device_ip: 'manual',
          employee_no: employeeNo,
          event_time: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { event_time: 'asc' },
        take: 50,
        select: {
          id: true,
          event_time: true,
          custom_status: true,
          event_type: true,
          direction: true,
          employee_no: true,
          person_name: true,
        },
      });

      return res.status(200).json({
        success: true,
        events: rows.map(formatManualRow),
      });
    }

    if (req.method === 'DELETE') {
      const idRaw = String(req.query.id || req.body?.id || '').trim();
      const employeeNo = normalizeEmployeeNo(
        String(req.query.employeeNo || req.body?.employeeNo || '')
      );
      const dateStr = String(req.query.date || req.body?.date || '')
        .trim()
        .slice(0, 10);

      if (idRaw) {
        const existing = await prisma.acs_events.findUnique({
          where: { id: BigInt(idRaw) },
          select: {
            id: true,
            source: true,
            data_source: true,
            device_ip: true,
          },
        });
        if (!existing) {
          return res.status(404).json({
            success: false,
            message: 'Événement introuvable',
          });
        }
        if (!isManualEvent(existing)) {
          return res.status(403).json({
            success: false,
            message:
              'Seuls les pointages manuels peuvent être supprimés ici.',
          });
        }
        await prisma.acs_events.delete({ where: { id: existing.id } });
        return res.status(200).json({
          success: true,
          message: 'Pointage manuel supprimé.',
          deleted: 1,
        });
      }

      if (employeeNo && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
        const result = await prisma.acs_events.deleteMany({
          where: {
            device_ip: 'manual',
            employee_no: employeeNo,
            event_time: { gte: dayStart, lte: dayEnd },
          },
        });
        return res.status(200).json({
          success: true,
          message: `${result.count} pointage(s) manuel(s) supprimé(s).`,
          deleted: result.count,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Indiquez id, ou employeeNo + date.',
      });
    }

    if (req.method !== 'POST') {
      return res
        .status(405)
        .json({ success: false, message: 'Méthode non autorisée' });
    }

    const {
      employeeNo: empRaw,
      date,
      heureArrivee,
      heureDepart,
      personName,
    } = req.body || {};

    const employeeNo = normalizeEmployeeNo(String(empRaw || ''));
    const dateStr = String(date || '').trim().slice(0, 10);
    if (!employeeNo) {
      return res.status(400).json({
        success: false,
        message: 'employeeNo est requis',
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        success: false,
        message: 'date (AAAA-MM-JJ) est requise',
      });
    }

    const arr = heureArrivee ? parseHm(String(heureArrivee)) : null;
    const dep = heureDepart ? parseHm(String(heureDepart)) : null;
    if (!arr && !dep) {
      return res.status(400).json({
        success: false,
        message: 'Indiquez au moins une heure d’arrivée ou de départ',
      });
    }

    // Évite un round-trip DB si le nom est déjà fourni par l’UI
    const nameFromUi =
      typeof personName === 'string' ? personName.trim() : '';
    const name = nameFromUi || employeeNo;

    const upsertOne = async (
      hm: { h: number; m: number },
      customStatus: string,
      direction: string
    ): Promise<UpsertResult> => {
      const time = `${String(hm.h).padStart(2, '0')}:${String(hm.m).padStart(2, '0')}`;
      const isoLocal = `${dateStr}T${time}:00`;
      const eventTime = new Date(`${isoLocal}.000Z`);
      const eventIndex = eventIndexFor(
        employeeNo,
        eventTime.toISOString(),
        customStatus
      );

      const row = await prisma.acs_events.upsert({
        where: {
          device_ip_event_index: {
            device_ip: 'manual',
            event_index: eventIndex,
          },
        },
        create: {
          device_ip: 'manual',
          event_index: eventIndex,
          event_time: eventTime,
          event_type: customStatus,
          direction,
          employee_no: employeeNo,
          person_name: name,
          custom_status: customStatus,
          data_source: 'manual',
          source: 'manual',
          raw: {
            source: 'manual',
            createdBy: authUser.id,
            employeeNo,
            date: dateStr,
            customStatus,
          },
        },
        // Déjà présent : touch léger (Prisma n’accepte pas update: {})
        update: {
          person_name: name,
        },
        select: {
          id: true,
          event_time: true,
          custom_status: true,
        },
      });

      return {
        id: row.id.toString(),
        custom_status: row.custom_status || customStatus,
        event_time: row.event_time.toISOString(),
        time,
      };
    };

    const jobs: Array<Promise<UpsertResult>> = [];
    if (arr) jobs.push(upsertOne(arr, 'Entrée Service', 'in'));
    if (dep) jobs.push(upsertOne(dep, 'Sortie Service', 'out'));

    const created = await Promise.all(jobs);

    return res.status(201).json({
      success: true,
      message: `Pointage manuel enregistré (${created.length} événement(s)).`,
      events: created,
    });
  } catch (e: unknown) {
    console.error('manual-attendance:', e);
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : 'Erreur serveur',
    });
  }
}
