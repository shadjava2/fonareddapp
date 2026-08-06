import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { effectiveAcsEventClassificationInput } from '@/lib/hikvision/acs-event-ingest-fields';
import {
  type AttendanceFlowKind,
  classifyAttendance,
  presenceDirectionWhere,
} from '@/lib/hikvision/attendance-classification';
import { resolveAcsSystemIdentities } from '@/lib/hikvision/acs-system-user-resolve';
import { normalizeEmployeeNo } from '@/lib/presence/attendance-performance';

export type AttendanceReportRow = {
  id: string;
  personId: string;
  name: string;
  department: string;
  time: string;
  attendanceStatus: string;
  attendanceCheckPoint: string;
  custom: string;
  eventType?: string;
  /** Valeur brute Hikvision / lecteur (`entryDirection` ou `doorAction` à l’import) */
  direction?: string | null;
  /** Pointage saisi manuellement (hors lecteur) */
  isManual?: boolean;
};

export type AttendanceSortField =
  | 'event_time'
  | 'employee_no'
  | 'event_type'
  | 'direction'
  | 'device_ip'
  | 'door_no';

export type AttendanceReportQuery = {
  startTime?: string;
  endTime?: string;
  department?: string;
  name?: string;
  employee_no?: string;
  /** Filtre entrée / sortie : `direction` in/out et libellés T&A (Entrée Service, Sortie Service, …). */
  pointageDirection?: 'in' | 'out';
  /** Sous-chaîne sur l’IP du lecteur (`device_ip`) */
  deviceIpContains?: string;
  /** Sous-chaîne sur le point de contrôle iVMS (`checkpoint`) */
  checkpointContains?: string;
  sortBy?: AttendanceSortField;
  sortOrder?: 'asc' | 'desc';
};

const SORT_FIELDS: AttendanceSortField[] = [
  'event_time',
  'employee_no',
  'event_type',
  'direction',
  'device_ip',
  'door_no',
];

export function parseAttendanceSortField(
  value: string | undefined
): AttendanceSortField {
  const v = String(value || '').toLowerCase() as AttendanceSortField;
  return SORT_FIELDS.includes(v) ? v : 'event_time';
}

export function parseAttendanceSortOrder(
  value: string | undefined
): 'asc' | 'desc' {
  return String(value || '').toLowerCase() === 'asc' ? 'asc' : 'desc';
}

function buildOrderBy(
  sortBy: AttendanceSortField,
  sortOrder: 'asc' | 'desc'
): Prisma.acs_eventsOrderByWithRelationInput[] {
  const primary: Prisma.acs_eventsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };
  return [primary, { id: sortOrder }];
}

/**
 * Construit la clause where + liste les pointages (même logique que l’API JSON).
 *
 * **Checkpoint / entrée–sortie** : l’import (`ingest.ts`) enregistre dans `acs_events`
 * `device_ip`, `door_no`, `direction` (depuis `entryDirection` ou `doorAction` Hikvision),
 * `event_type`, etc. Le libellé « point de contrôle » affiché est `device_ip` + porte ;
 * **T&A Hikvision** : si `direction` est vide, les libellés du terminal (ex. « Entrée Service »,
 * « Sortie Service », missions, heures sup.) sont lus dans `event_type` (voir `attendance-classification.ts`).
 */
export async function fetchAttendanceReportRows(params: {
  query: AttendanceReportQuery;
  skip: number;
  take: number;
}): Promise<{
  rows: AttendanceReportRow[];
  total: number;
  noMatchingEmployees: boolean;
}> {
  const { query, skip, take } = params;
  const {
    startTime,
    endTime,
    department,
    name,
    employee_no,
    pointageDirection,
    deviceIpContains,
    checkpointContains,
    sortBy = 'event_time',
    sortOrder = 'desc',
  } = query;

  const andParts: Prisma.acs_eventsWhereInput[] = [];

  if (startTime || endTime) {
    const et: Prisma.DateTimeFilter = {};
    if (startTime) et.gte = new Date(startTime);
    if (endTime) et.lte = new Date(endTime);
    andParts.push({ event_time: et });
  }

  const deviceTrim = deviceIpContains?.trim();
  if (deviceTrim) {
    andParts.push({ device_ip: { contains: deviceTrim } });
  }

  const checkpointTrim = checkpointContains?.trim();
  if (checkpointTrim) {
    andParts.push({ checkpoint: { contains: checkpointTrim } });
  }

  if (pointageDirection === 'in' || pointageDirection === 'out') {
    andParts.push(presenceDirectionWhere(pointageDirection));
  }

  if (department || name) {
    const userWhere: Prisma.acs_usersWhereInput = {};
    if (department) userWhere.department = department;
    if (name) userWhere.name = { contains: name };

    const matchingUsers = await prisma.acs_users.findMany({
      where: userWhere,
      select: { employee_no: true },
    });
    const validEmployeeNos = matchingUsers
      .map((u) => u.employee_no)
      .filter((no): no is string => Boolean(no && String(no).trim()));
    if (validEmployeeNos.length === 0) {
      return { rows: [], total: 0, noMatchingEmployees: true };
    }
    andParts.push({ employee_no: { in: validEmployeeNos } });
  } else if (employee_no && String(employee_no).trim()) {
    andParts.push({ employee_no: String(employee_no).trim() });
  }

  const whereClause: Prisma.acs_eventsWhereInput =
    andParts.length > 0 ? { AND: andParts } : {};

  const orderBy = buildOrderBy(sortBy, sortOrder);

  const [events, total] = await Promise.all([
    prisma.acs_events.findMany({
      where: whereClause,
      orderBy,
      skip,
      take,
    }),
    prisma.acs_events.count({ where: whereClause }),
  ]);

  const employeeNos = [
    ...new Set(events.map((e) => e.employee_no).filter(Boolean)),
  ] as string[];
  const identities = await resolveAcsSystemIdentities(employeeNos);

  const rows: AttendanceReportRow[] = events.map((event) => {
    const empKey = normalizeEmployeeNo(String(event.employee_no || ''));
    const idn = empKey ? identities.get(empKey) : undefined;
    const eff = effectiveAcsEventClassificationInput({
      direction: event.direction,
      event_type: event.event_type,
      raw: event.raw,
    });
    const c = classifyAttendance(eff.direction, eff.event_type);
    let attendanceStatus: string;
    if (
      c.flow === 'unknown' &&
      (!eff.event_type || eff.event_type === 'Unknown')
    ) {
      attendanceStatus = '—';
    } else if (c.dayBoundaryInOut === 'in') {
      attendanceStatus = 'Check-in';
    } else if (c.dayBoundaryInOut === 'out') {
      attendanceStatus = 'Check-out';
    } else {
      attendanceStatus = c.categoryLabel;
    }
    const customLabels: Record<AttendanceFlowKind, string> = {
      work_in: 'Entrée travail',
      work_out: 'Sortie travail',
      break_out: 'Mission (sortie)',
      break_in: 'Mission (retour)',
      overtime_in: 'Heures sup. (début)',
      overtime_out: 'Heures sup. (fin)',
      unknown: 'Autre',
    };
    const customLabel =
      event.custom_status?.trim() || customLabels[c.flow];

    const source = String(event.source || event.data_source || '').toLowerCase();
    const isManual = source === 'manual' || event.device_ip === 'manual';

    return {
      id: event.id.toString(),
      personId: event.employee_no || 'N/A',
      name:
        idn?.displayName ||
        event.person_name ||
        event.employee_no ||
        'N/A',
      department: idn?.department || 'fonaredd',
      time: event.event_time.toISOString(),
      attendanceStatus,
      attendanceCheckPoint: isManual
        ? 'Saisie manuelle'
        : event.checkpoint?.trim() ||
          `${event.device_ip}${event.door_no ? `_Door${event.door_no}` : ''}`,
      custom: customLabel,
      eventType: eff.event_type,
      direction: eff.direction ?? event.direction,
      isManual,
    };
  });

  return { rows, total, noMatchingEmployees: false };
}
