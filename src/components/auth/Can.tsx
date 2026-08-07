import { usePermissions } from '@/hooks/useAuth';
import React from 'react';

type CanProps = {
  permission?: string;
  permissions?: string[];
  /** Si true, exige toutes les permissions listées */
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Affiche les enfants uniquement si l'utilisateur a la/les permission(s).
 */
export function Can({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  let ok = true;
  if (permission) {
    ok = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    ok = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!ok) return <>{fallback}</>;
  return <>{children}</>;
}

export default Can;
