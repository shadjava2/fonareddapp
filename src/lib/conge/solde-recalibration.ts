/**
 * Recalibrage des soldes de congé selon le mois en cours (début de mois).
 *
 * - Février → Octobre : mois déjà clos × nbjourMois
 *   (ex. août → 7 × nbjourMois)
 * - Novembre : double anticipé — on compte aussi décembre
 *   → 12 × nbjourMois (jan–oct + nov&déc)
 * - Décembre : reste à 12 × nbjourMois
 * - Janvier : tout à zéro (solde + consommé)
 *
 * Hors janvier : restant = total prévu − consommé (conservé).
 */

export type SoldeRecalibration = {
  currentMonth: number;
  monthName: string;
  monthsCounted: number;
  nbjourMois: number;
  totalPrevu: number;
  consomme: number;
  restant: number;
  /** Janvier : reset total (consommé aussi à 0) */
  resetYear: boolean;
};

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/**
 * Nombre de mois crédités et total de points prévus pour le mois calendaire (1–12).
 */
export function computeExpectedLeaveAccrual(
  currentMonth: number,
  nbjourMois: number
): { monthsCounted: number; totalPrevu: number; resetYear: boolean } {
  const m = Math.min(12, Math.max(1, Math.floor(currentMonth)));
  const rate = Number(nbjourMois) || 0;

  // Janvier : compteur à zéro
  if (m === 1) {
    return { monthsCounted: 0, totalPrevu: 0, resetYear: true };
  }

  // Novembre & décembre : nov+déc crédités ensemble dès le 1er novembre
  if (m === 11 || m === 12) {
    const monthsCounted = 12;
    return {
      monthsCounted,
      totalPrevu: Math.round(monthsCounted * rate * 1000) / 1000,
      resetYear: false,
    };
  }

  // Février–octobre : mois clos = m - 1
  const monthsCounted = m - 1;
  return {
    monthsCounted,
    totalPrevu: Math.round(monthsCounted * rate * 1000) / 1000,
    resetYear: false,
  };
}

export function recalibrateSoldeForMonth(params: {
  currentMonth: number;
  nbjourMois: number;
  soldeConsomme: number;
}): SoldeRecalibration {
  const { currentMonth, nbjourMois, soldeConsomme } = params;
  const m = Math.min(12, Math.max(1, Math.floor(currentMonth)));
  const { monthsCounted, totalPrevu, resetYear } = computeExpectedLeaveAccrual(
    m,
    nbjourMois
  );

  const consomme = resetYear
    ? 0
    : Math.max(0, Number(soldeConsomme) || 0);
  const restant = Math.round(Math.max(0, totalPrevu - consomme) * 1000) / 1000;

  return {
    currentMonth: m,
    monthName: MONTH_NAMES[m - 1],
    monthsCounted,
    nbjourMois: Number(nbjourMois) || 0,
    totalPrevu,
    consomme,
    restant,
    resetYear,
  };
}
