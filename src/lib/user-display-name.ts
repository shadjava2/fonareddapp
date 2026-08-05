/**
 * Affichage standard des noms utilisateurs : Prénom NOM POST-NOM
 * (NOM et POST-NOM en majuscules).
 */
export function formatPersonDisplayName(u: {
  nom?: string | null;
  postnom?: string | null;
  prenom?: string | null;
}): string {
  const prenom = String(u.prenom || '').trim();
  const nom = String(u.nom || '').trim().toUpperCase();
  const postnom = String(u.postnom || '').trim().toUpperCase();
  return [prenom, nom, postnom].filter(Boolean).join(' ');
}
