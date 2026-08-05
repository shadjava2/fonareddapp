/**
 * Normalisation des champs Hikvision AcsEvent (JSON `InfoList`) vers `acs_events`.
 * Les firmwares varient : `eventType`, `attendanceStatus` (checkIn/checkOut), `entryDirection`, etc.
 * Ne pas utiliser le champ `name` du JSON comme type d’événement : c’est souvent le nom de la personne.
 */

function trimStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return '';
  return String(v).trim();
}

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    const s = trimStr(v);
    if (s) return s;
  }
  return '';
}

/** Réduit à in / out si le lecteur renvoie des synonymes. */
export function coerceDirectionToken(
  raw: string | null | undefined
): 'in' | 'out' | null {
  const s = trimStr(raw).toLowerCase();
  if (!s) return null;
  if (
    s === 'in' ||
    s === 'enter' ||
    s === 'entry' ||
    s === 'entrée' ||
    s === 'entree' ||
    s === 'checkin' ||
    s === 'check-in' ||
    s === 'check in' ||
    s === 'onduty' ||
    s === 'on duty' ||
    s === '1' ||
    s === 'true'
  ) {
    return 'in';
  }
  if (
    s === 'out' ||
    s === 'exit' ||
    s === 'leave' ||
    s === 'sortie' ||
    s === 'checkout' ||
    s === 'check-out' ||
    s === 'check out' ||
    s === 'offduty' ||
    s === 'off duty' ||
    s === '0' ||
    s === 'false'
  ) {
    return 'out';
  }
  return null;
}

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Libellés checkIn / checkOut Hikvision → stockage stable pour classifyAttendance. */
function canonicalizeAttendanceStatusLabel(s: string): string {
  const t = normKey(s);
  if (t === 'checkin' || t === 'check in') return 'Check-in';
  if (t === 'checkout' || t === 'check out') return 'Check-out';
  return s.trim();
}

/**
 * Lit un objet événement brut Hikvision (souvent `acs_events.raw` ou élément `InfoList`).
 */
export function normalizeHikvisionAcsEventFields(event: unknown): {
  event_type: string;
  direction: string | null;
} {
  if (event == null || typeof event !== 'object') {
    return { event_type: 'Unknown', direction: null };
  }
  const e = event as Record<string, unknown>;

  const attendanceRaw = firstNonEmpty(
    e.attendanceStatus,
    e.AttendanceStatus,
    e.attendancestatus
  );
  const attendanceCanon = attendanceRaw
    ? canonicalizeAttendanceStatusLabel(attendanceRaw)
    : '';

  let direction =
    coerceDirectionToken(
      firstNonEmpty(
        e.entryDirection,
        e.EntryDirection,
        e.doorAction,
        e.DoorAction,
        e.direction,
        e.Direction,
        e.enterOrExit,
        e.EnterOrExit,
        e.inAndOutType,
        e.InAndOutType,
        e.accessDirection,
        e.AccessDirection
      ) || undefined
    ) ?? null;

  if (!direction && attendanceRaw) {
    const a = normKey(attendanceRaw);
    if (a.includes('checkin') || a === 'in') direction = 'in';
    else if (a.includes('checkout') || a === 'out') direction = 'out';
  }

  const typeFromFields = firstNonEmpty(
    e.eventType,
    e.EventType,
    e.event_type,
    e.subEventType,
    e.SubEventType,
    e.label,
    e.Label,
    e.eventDescription,
    e.EventDescription,
    e.currentEventName,
    e.CurrentEventName
  );

  let event_type = typeFromFields;
  if (attendanceCanon && (!event_type || event_type === 'Unknown')) {
    event_type = attendanceCanon;
  }
  if (attendanceCanon && normKey(typeFromFields) === normKey(attendanceRaw)) {
    event_type = attendanceCanon;
  }

  // Ne jamais prendre `name` / `userName` comme type d’événement (confusion garden-gate / ISAPI).
  if (!event_type || event_type === 'Unknown') {
    if (direction === 'in') event_type = 'Check-in';
    else if (direction === 'out') event_type = 'Check-out';
    else event_type = 'Unknown';
  }

  return {
    event_type: event_type.slice(0, 64),
    direction,
  };
}

const JUNK_EVENT_TYPES = new Set(['unknown', 'test', '']);

/**
 * Fusionne les colonnes base avec `raw` pour classification / affichage (lignes déjà importées).
 */
export function effectiveAcsEventClassificationInput(db: {
  direction: string | null | undefined;
  event_type: string | null | undefined;
  raw: unknown;
}): { direction: string | null; event_type: string } {
  const derived = normalizeHikvisionAcsEventFields(db.raw);
  const dbType = trimStr(db.event_type);
  const dbDir = coerceDirectionToken(db.direction ?? undefined);

  const direction = dbDir ?? derived.direction;

  const dbOk =
    Boolean(dbType) && !JUNK_EVENT_TYPES.has(dbType.toLowerCase());
  let event_type = dbOk ? dbType : derived.event_type;
  if (JUNK_EVENT_TYPES.has(event_type.toLowerCase())) {
    event_type = derived.event_type;
  }

  if (JUNK_EVENT_TYPES.has(event_type.toLowerCase())) {
    if (direction === 'in') event_type = 'Check-in';
    else if (direction === 'out') event_type = 'Check-out';
    else event_type = 'Unknown';
  }

  return {
    direction,
    event_type: event_type.slice(0, 64),
  };
}
