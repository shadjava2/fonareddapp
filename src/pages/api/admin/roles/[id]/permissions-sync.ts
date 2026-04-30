import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ROLE_ID_FULL_ACCESS } from '@/lib/role-constants';
import { API_ADMIN } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  message?: string;
  count?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const authUser = await requireApiPermissions(req, res, [
    ...API_ADMIN.rolesPermissions,
  ]);
  if (!authUser) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Identifiant de rôle requis',
    });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    const roleId = BigInt(id);
    const role = await prisma.roles.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle introuvable',
      });
    }

    let permissionIds: bigint[];

    if (roleId === BigInt(ROLE_ID_FULL_ACCESS)) {
      const all = await prisma.permissions.findMany({ select: { id: true } });
      permissionIds = all.map((p) => p.id);
    } else {
      const raw = req.body?.permissionIds;
      if (!Array.isArray(raw)) {
        return res.status(400).json({
          success: false,
          message: 'Le corps doit contenir permissionIds (tableau)',
        });
      }

      const parsed = [...new Set(raw.map((x) => BigInt(String(x))))];
      if (parsed.length === 0) {
        permissionIds = [];
      } else {
        const existing = await prisma.permissions.findMany({
          where: { id: { in: parsed } },
          select: { id: true },
        });
        const existingSet = new Set(existing.map((p) => p.id.toString()));
        permissionIds = parsed.filter((id) => existingSet.has(id.toString()));
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.roles_permissions.deleteMany({ where: { fkRole: roleId } });
      if (permissionIds.length > 0) {
        await tx.roles_permissions.createMany({
          data: permissionIds.map((fkPermission) => ({
            fkRole: roleId,
            fkPermission,
            usercreateid: BigInt(1),
          })),
        });
      }
    });

    return res.status(200).json({
      success: true,
      count: permissionIds.length,
      message: `Droits du rôle « ${role.nom} » mis à jour (${permissionIds.length} permission(s)).`,
    });
  } catch (error: any) {
    console.error('permissions-sync:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
