/**
 * Format d'affichage français : dd/MM/yyyy (et variantes date+heure).
 */

const optsDate: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const optsDateTime: Intl.DateTimeFormatOptions = {
  ...optsDate,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const optsDateTimeShort: Intl.DateTimeFormatOptions = {
  ...optsDate,
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Date seule au format français : dd/MM/yyyy
 */
export function formatDateFR(value: Date | string | null | undefined): string {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', optsDate);
}

/**
 * Date et heure au format français : dd/MM/yyyy HH:mm:ss
 */
export function formatDateTimeFR(value: Date | string | null | undefined): string {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', optsDateTime);
}

/**
 * Date et heure (sans secondes) : dd/MM/yyyy HH:mm
 */
export function formatDateTimeShortFR(value: Date | string | null | undefined): string {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', optsDateTimeShort);
}

/**
 * Heure seule : HH:mm ou HH:mm:ss
 */
export function formatTimeFR(value: Date | string | null | undefined, withSeconds = false): string {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds && { second: '2-digit' }),
  });
}
