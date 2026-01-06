import { addDays, formatISO, parseISO } from 'date-fns';

/**
 * Calcule si une date est un jour ouvré selon le calendrier
 */
export function isBusinessDay(date: Date, calendarData: {
  is_holiday: number;
  is_chome: number;
  saturday_working: number;
  sunday_working: number;
  working_override: number;
}): boolean {
  const { is_holiday, is_chome, saturday_working, sunday_working, working_override } = calendarData;

  // Si override défini, utiliser cette valeur
  if (working_override !== 0) {
    return working_override === 1;
  }

  // Si jour férié ou chômé
  if (is_holiday === 1 || is_chome === 1) {
    return false;
  }

  // Vérifier les weekends
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 6) { // Samedi
    return saturday_working === 1;
  }

  if (dayOfWeek === 0) { // Dimanche
    return sunday_working === 1;
  }

  // Jours de semaine (lundi-vendredi)
  return true;
}

/**
 * Calcule la période de congé en excluant les jours non ouvrés
 */
export function computeLeavePeriod(
  startDate: Date,
  days: number,
  calendarData: Array<{
    d: Date;
    is_holiday: number;
    is_chome: number;
    saturday_working: number;
    sunday_working: number;
    working_override: number;
  }>
): { du: string; au: string; workingDays: number } {
  if (days <= 0) {
    return {
      du: formatISO(startDate, { representation: 'date' }),
      au: formatISO(startDate, { representation: 'date' }),
      workingDays: 0,
    };
  }

  // Créer un map pour un accès rapide aux données du calendrier
  const calendarMap = new Map();
  calendarData.forEach(item => {
    const dateKey = formatISO(item.d, { representation: 'date' });
    calendarMap.set(dateKey, item);
  });

  let currentDate = new Date(startDate);
  let workingDaysFound = 0;
  let endDate = new Date(startDate);

  // Parcourir les dates jusqu'à trouver le nombre requis de jours ouvrés
  while (workingDaysFound < days) {
    const dateKey = formatISO(currentDate, { representation: 'date' });
    const dayData = calendarMap.get(dateKey);

    if (dayData) {
      if (isBusinessDay(currentDate, dayData)) {
        workingDaysFound++;
        endDate = new Date(currentDate);
      }
    } else {
      // Si pas de données calendrier, utiliser la logique par défaut
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lundi à vendredi
        workingDaysFound++;
        endDate = new Date(currentDate);
      }
    }

    currentDate = addDays(currentDate, 1);

    // Sécurité: éviter les boucles infinies
    if (workingDaysFound === 0 && currentDate.getTime() - startDate.getTime() > 365 * 24 * 60 * 60 * 1000) {
      break;
    }
  }

  return {
    du: formatISO(startDate, { representation: 'date' }),
    au: formatISO(endDate, { representation: 'date' }),
    workingDays: workingDaysFound,
  };
}

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 */
export function countWorkingDays(
  startDate: Date,
  endDate: Date,
  calendarData: Array<{
    d: Date;
    is_holiday: number;
    is_chome: number;
    saturday_working: number;
    sunday_working: number;
    working_override: number;
  }>
): number {
  let count = 0;
  let currentDate = new Date(startDate);

  // Créer un map pour un accès rapide aux données du calendrier
  const calendarMap = new Map();
  calendarData.forEach(item => {
    const dateKey = formatISO(item.d, { representation: 'date' });
    calendarMap.set(dateKey, item);
  });

  while (currentDate <= endDate) {
    const dateKey = formatISO(currentDate, { representation: 'date' });
    const dayData = calendarMap.get(dateKey);

    if (dayData) {
      if (isBusinessDay(currentDate, dayData)) {
        count++;
      }
    } else {
      // Si pas de données calendrier, utiliser la logique par défaut
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lundi à vendredi
        count++;
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return count;
}

/**
 * Formate une date pour l'affichage français
 */
export function formatDateFrench(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formate une date courte pour l'affichage
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toLocaleDateString('fr-FR');
}
