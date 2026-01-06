import { UserProfile } from './auth';

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export function hasPermission(
  user: UserProfile | null,
  permissionCode: string
): boolean {
  // Mode développement : accès libre à tous les modules
  return true;
}

/**
 * Vérifie si un utilisateur a un rôle spécifique (par ID)
 */
export function hasRole(user: UserProfile | null, roleId: number): boolean {
  if (!user) return false;
  const userRole = (user as any).fkRole;
  if (userRole === null || userRole === undefined) return false;
  return String(userRole) === String(roleId);
}

/**
 * Vérifie si un utilisateur a accès à un service spécifique
 */
export function hasServiceAccess(
  user: UserProfile | null,
  serviceId: number
): boolean {
  // Mode développement : accès libre à tous les services
  return true;
}

/**
 * Vérifie si un utilisateur a au moins une des permissions spécifiées
 */
export function hasAnyPermission(
  user: UserProfile | null,
  permissions: string[]
): boolean {
  // Mode développement : accès libre à tous les modules
  return true;
}

/**
 * Vérifie si un utilisateur a toutes les permissions spécifiées
 */
export function hasAllPermissions(
  user: UserProfile | null,
  permissions: string[]
): boolean {
  // Mode développement : accès libre à tous les modules
  return true;
}

/**
 * Vérifie si un utilisateur est administrateur (rôle ID 1 par convention)
 */
export function isAdmin(user: UserProfile | null): boolean {
  return hasRole(user, 1);
}

/**
 * Vérifie si un utilisateur peut gérer les utilisateurs
 */
export function canManageUsers(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut gérer les rôles
 */
export function canManageRoles(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut gérer les services
 */
export function canManageServices(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut voir les services
 */
export function canViewServices(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut créer des services
 */
export function canCreateServices(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut modifier des services
 */
export function canEditServices(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut gérer les sites
 */
export function canManageSites(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut voir les sites
 */
export function canViewSites(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut enregistrer des sites
 */
export function canCreateSites(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut modifier des sites
 */
export function canEditSites(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut gérer les congés
 */
export function canManageConges(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut demander des congés
 */
export function canRequestConges(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Vérifie si un utilisateur peut gérer le calendrier
 */
export function canManageCalendar(user: UserProfile | null): boolean {
  // Mode développement : accès libre
  return true;
}

/**
 * Permissions communes pour les modules
 */
export const PERMISSIONS = {
  // Administration
  USER_MANAGE: 'USER_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  SERVICE_MANAGE: 'SERVICE_MANAGE',
  SITE_MANAGE: 'SITE_MANAGE',

  // Sites - Permissions spécifiques
  ITEM_SITES: 'ITEM_SITES',
  SITES_ENREGISTRER: 'SITES_ENREGISTRER',
  SITES_MODIFIER: 'SITES_MODIFIER',

  // Congés
  CONGE_MANAGE: 'CONGE_MANAGE',
  CONGE_REQUEST: 'CONGE_REQUEST',
  CALENDAR_MANAGE: 'CALENDAR_MANAGE',

  // Présence (pour future extension)
  PRESENCE_MANAGE: 'PRESENCE_MANAGE',
  PRESENCE_VIEW: 'PRESENCE_VIEW',
} as const;

/**
 * Modules disponibles avec leurs permissions requises
 */
export const MODULES = {
  ADMIN: {
    name: 'Administration',
    // Permission d'accès au module Administration
    // Aligné sur la table permissions.nom = 'MODULE_ADMIN'
    permission: 'MODULE_ADMIN',
    icon: 'Cog6ToothIcon',
    description: 'Gestion des utilisateurs, rôles et permissions',
    color: 'bg-primary-500',
  },
  CONGE: {
    name: 'Gestion Congé',
    // Permission générique lecture/accès congé (ajuste si tu as un code dédié)
    permission: PERMISSIONS.CONGE_REQUEST,
    icon: 'CalendarDaysIcon',
    description: 'Demandes de congés et calendrier',
    color: 'bg-blue-500',
  },
  PRESENCE: {
    name: 'Gestion Personnel',
    // Permission d'accès au module Personnel
    // Aligné sur la table permissions.nom = 'MODULE_PERSONNEL'
    permission: 'MODULE_PERSONNEL',
    icon: 'ClockIcon',
    description: 'Gestion du personnel et présences',
    color: 'bg-green-500',
  },
} as const;

/**
 * Filtre les modules accessibles pour un utilisateur
 */
export function getAccessibleModules(
  user: UserProfile | null
): Array<(typeof MODULES)[keyof typeof MODULES]> {
  // Mode développement : accès libre à tous les modules
  return Object.values(MODULES);
}
