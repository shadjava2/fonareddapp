import { UserProfile } from './auth';

/** Super-pouvoir uniquement si présent explicitement en base sur le rôle */
function isAllAccess(permissions: string[]): boolean {
  return permissions.includes('*') || permissions.includes('ALL_ACCESS');
}

export function hasPermission(
  user: UserProfile | null,
  permissionCode: string
): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  if (isAllAccess(p)) return true;
  return p.includes(permissionCode);
}

export function hasRole(user: UserProfile | null, roleId: number): boolean {
  if (!user) return false;
  if (user.fkRole == null) return false;
  return String(user.fkRole) === String(roleId);
}

export function hasServiceAccess(
  user: UserProfile | null,
  serviceId: number
): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  if (isAllAccess(p)) return true;
  const ids = user.services ?? [];
  return ids.includes(serviceId);
}

export function hasAnyPermission(
  user: UserProfile | null,
  permissions: string[]
): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  if (isAllAccess(p)) return true;
  return permissions.some((code) => p.includes(code));
}

export function hasAllPermissions(
  user: UserProfile | null,
  permissions: string[]
): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  if (isAllAccess(p)) return true;
  return permissions.every((code) => p.includes(code));
}

export function isAdmin(user: UserProfile | null): boolean {
  return hasRole(user, 1);
}

export function canManageUsers(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canManageRoles(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canManageServices(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.SERVICE_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canViewServices(user: UserProfile | null): boolean {
  return canManageServices(user);
}

export function canCreateServices(user: UserProfile | null): boolean {
  return canManageServices(user);
}

export function canEditServices(user: UserProfile | null): boolean {
  return canManageServices(user);
}

export function canManageSites(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.SITE_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
    PERMISSIONS.ITEM_SITES,
  ]);
}

export function canViewSites(user: UserProfile | null): boolean {
  return canManageSites(user);
}

export function canCreateSites(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.SITES_ENREGISTRER,
    PERMISSIONS.SITE_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canEditSites(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.SITES_MODIFIER,
    PERMISSIONS.SITE_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canManageConges(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.MODULE_CONGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canRequestConges(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.MODULE_CONGE,
    PERMISSIONS.CONGE_REQUEST,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canManageCalendar(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.MODULE_CONGE,
    PERMISSIONS.CALENDAR_MANAGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export function canManageCongeReturns(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.MODULE_CONGE,
    PERMISSIONS.CONGE_RETURN,
    PERMISSIONS.MODULE_ADMIN,
  ]);
}

export const PERMISSIONS = {
  MODULE_ADMIN: 'MODULE_ADMIN',
  MODULE_CONGE: 'MODULE_CONGE',
  MODULE_PERSONNEL: 'MODULE_PERSONNEL',

  USER_MANAGE: 'USER_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  SERVICE_MANAGE: 'SERVICE_MANAGE',
  SITE_MANAGE: 'SITE_MANAGE',

  ITEM_SITES: 'ITEM_SITES',
  SITES_ENREGISTRER: 'SITES_ENREGISTRER',
  SITES_MODIFIER: 'SITES_MODIFIER',

  CONGE_MANAGE: 'CONGE_MANAGE',
  CONGE_DASHBOARD: 'CONGE_DASHBOARD',
  CONGE_CONFIG: 'CONGE_CONFIG',
  CONGE_CONFIG_EDIT: 'CONGE_CONFIG_EDIT',
  CONGE_NON_JUSTIFIE: 'CONGE_NON_JUSTIFIE',
  CONGE_TRAITEMENT: 'CONGE_TRAITEMENT',
  CONGE_TRAITEMENT_ACT: 'CONGE_TRAITEMENT_ACT',
  CONGE_TRAITEMENT_VIEW_ALL: 'CONGE_TRAITEMENT_VIEW_ALL',
  CONGE_TYPES: 'CONGE_TYPES',
  CONGE_TYPES_CREATE: 'CONGE_TYPES_CREATE',
  CONGE_TYPES_EDIT: 'CONGE_TYPES_EDIT',
  CONGE_TYPES_DELETE: 'CONGE_TYPES_DELETE',
  CONGE_NOTIFICATIONS: 'CONGE_NOTIFICATIONS',
  CONGE_REQUEST: 'CONGE_REQUEST',
  CONGE_REQUEST_CREATE: 'CONGE_REQUEST_CREATE',
  CONGE_REQUEST_EDIT: 'CONGE_REQUEST_EDIT',
  CONGE_REQUEST_CANCEL: 'CONGE_REQUEST_CANCEL',
  CONGE_REQUEST_DELETE: 'CONGE_REQUEST_DELETE',
  CONGE_REQUEST_PRINT: 'CONGE_REQUEST_PRINT',
  CONGE_RETURN: 'CONGE_RETURN',
  CONGE_DEMANDES_ALL: 'CONGE_DEMANDES_ALL',
  CONGE_ATTACHMENT_UPLOAD: 'CONGE_ATTACHMENT_UPLOAD',
  CONGE_ATTACHMENT_VIEW: 'CONGE_ATTACHMENT_VIEW',
  CALENDAR_MANAGE: 'CALENDAR_MANAGE',
  CALENDAR_CREATE: 'CALENDAR_CREATE',
  CALENDAR_EDIT: 'CALENDAR_EDIT',
  CALENDAR_DELETE: 'CALENDAR_DELETE',

  PRESENCE_MANAGE: 'PRESENCE_MANAGE',
  PRESENCE_VIEW: 'PRESENCE_VIEW',
} as const;

export const MODULES = {
  ADMIN: {
    name: 'Administration',
    permission: PERMISSIONS.MODULE_ADMIN,
    icon: 'Cog6ToothIcon',
    description: 'Gestion des utilisateurs, rôles et permissions',
    color: 'bg-primary-500',
  },
  CONGE: {
    name: 'Gestion Congé',
    permission: PERMISSIONS.MODULE_CONGE,
    icon: 'CalendarDaysIcon',
    description: 'Demandes de congés et calendrier',
    color: 'bg-blue-500',
  },
  PRESENCE: {
    name: 'Gestion Personnel',
    permission: PERMISSIONS.MODULE_PERSONNEL,
    icon: 'ClockIcon',
    description: 'Gestion du personnel et présences',
    color: 'bg-green-500',
  },
} as const;

const CONGE_MODULE_CODES = [
  PERMISSIONS.MODULE_CONGE,
  PERMISSIONS.CONGE_DASHBOARD,
  PERMISSIONS.CONGE_CONFIG,
  PERMISSIONS.CONGE_NON_JUSTIFIE,
  PERMISSIONS.CONGE_TRAITEMENT,
  PERMISSIONS.CONGE_TYPES,
  PERMISSIONS.CONGE_NOTIFICATIONS,
  PERMISSIONS.CONGE_REQUEST,
  PERMISSIONS.CONGE_RETURN,
  PERMISSIONS.CALENDAR_MANAGE,
  PERMISSIONS.MODULE_ADMIN,
] as const;

/** Accès à l’espace administration (sidebar verte /admin) */
export const ADMIN_ZONE_PERMISSIONS: string[] = [
  PERMISSIONS.MODULE_ADMIN,
  PERMISSIONS.USER_MANAGE,
  PERMISSIONS.ROLE_MANAGE,
  PERMISSIONS.SERVICE_MANAGE,
  PERMISSIONS.SITE_MANAGE,
  PERMISSIONS.ITEM_SITES,
];

/** Accès au module Congé (routes /conge) */
export function canAccessCongeModule(user: UserProfile | null): boolean {
  return hasAnyPermission(user, [...CONGE_MODULE_CODES]);
}

export function getAccessibleModules(
  user: UserProfile | null
): Array<(typeof MODULES)[keyof typeof MODULES]> {
  const list: Array<(typeof MODULES)[keyof typeof MODULES]> = [];
  if (hasPermission(user, MODULES.ADMIN.permission)) {
    list.push(MODULES.ADMIN);
  }
  if (hasAnyPermission(user, [...CONGE_MODULE_CODES])) {
    list.push(MODULES.CONGE);
  }
  if (hasPermission(user, MODULES.PRESENCE.permission)) {
    list.push(MODULES.PRESENCE);
  }
  return list;
}

/** Permissions attendues par les handlers `/api/admin/*` */
export const API_ADMIN = {
  users: [PERMISSIONS.USER_MANAGE, PERMISSIONS.MODULE_ADMIN],
  roles: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
  rolesId: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
  rolesPermissions: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
  rolesPermissionsId: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
  services: [PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.MODULE_ADMIN],
  sites: [
    PERMISSIONS.SITE_MANAGE,
    PERMISSIONS.ITEM_SITES,
    PERMISSIONS.MODULE_ADMIN,
  ],
  fonctions: [PERMISSIONS.MODULE_ADMIN, PERMISSIONS.USER_MANAGE],
  droitsServices: [PERMISSIONS.USER_MANAGE, PERMISSIONS.MODULE_ADMIN],
  permissions: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
  dashboard: [...ADMIN_ZONE_PERMISSIONS],
  personnel: [
    PERMISSIONS.MODULE_ADMIN,
    PERMISSIONS.MODULE_CONGE,
    PERMISSIONS.MODULE_PERSONNEL,
    PERMISSIONS.CONGE_DASHBOARD,
    PERMISSIONS.CONGE_CONFIG,
    PERMISSIONS.CONGE_NON_JUSTIFIE,
    PERMISSIONS.CONGE_TRAITEMENT,
    PERMISSIONS.CONGE_TYPES,
    PERMISSIONS.CONGE_NOTIFICATIONS,
    PERMISSIONS.CONGE_REQUEST,
    PERMISSIONS.CONGE_RETURN,
    PERMISSIONS.CALENDAR_MANAGE,
  ],
} as const;
