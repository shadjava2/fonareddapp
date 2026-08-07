import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ROLE_ID_FULL_ACCESS } from '@/lib/role-constants';
import { API_ADMIN, PERMISSIONS } from '@/lib/rbac';
import { NextApiRequest, NextApiResponse } from 'next';

async function ensureCorePermissions(): Promise<void> {
  const required: Array<{ nom: string; description: string }> = [
    { nom: PERMISSIONS.MODULE_ADMIN, description: "Acces au module d'administration" },
    { nom: PERMISSIONS.MODULE_CONGE, description: 'Acces au module conge' },
    { nom: PERMISSIONS.MODULE_PERSONNEL, description: 'Acces au module personnel' },
    { nom: PERMISSIONS.USER_MANAGE, description: 'Gestion des utilisateurs' },
    { nom: PERMISSIONS.ROLE_MANAGE, description: 'Gestion des roles et permissions' },
    { nom: PERMISSIONS.SERVICE_MANAGE, description: 'Gestion des services' },
    { nom: PERMISSIONS.SITE_MANAGE, description: 'Gestion des sites' },
    { nom: PERMISSIONS.ITEM_SITES, description: 'Acces menu sites' },
    { nom: PERMISSIONS.SITES_ENREGISTRER, description: 'Creation des sites' },
    { nom: PERMISSIONS.SITES_MODIFIER, description: 'Modification des sites' },
    { nom: PERMISSIONS.CONGE_MANAGE, description: 'Permission legacy (ne donne plus un acces global au module conge)' },
    { nom: PERMISSIONS.CONGE_DASHBOARD, description: 'Acces au tableau de bord conge' },
    { nom: PERMISSIONS.CONGE_CONFIG, description: 'Acces a la configuration conge' },
    { nom: PERMISSIONS.CONGE_CONFIG_EDIT, description: 'Modifier la configuration conge' },
    { nom: PERMISSIONS.CONGE_NON_JUSTIFIE, description: 'Acces aux conges non justifies' },
    { nom: PERMISSIONS.CONGE_TRAITEMENT, description: 'Acces au traitement des demandes de conge' },
    { nom: PERMISSIONS.CONGE_TRAITEMENT_ACT, description: 'Agir sur un traitement de demande de conge' },
    { nom: PERMISSIONS.CONGE_TRAITEMENT_VIEW_ALL, description: 'Voir tous les traitements de conge' },
    { nom: PERMISSIONS.CONGE_TYPES, description: 'Acces a la gestion des types de conges' },
    { nom: PERMISSIONS.CONGE_TYPES_CREATE, description: 'Creer un type de conge' },
    { nom: PERMISSIONS.CONGE_TYPES_EDIT, description: 'Modifier un type de conge' },
    { nom: PERMISSIONS.CONGE_TYPES_DELETE, description: 'Supprimer un type de conge' },
    { nom: PERMISSIONS.CONGE_NOTIFICATIONS, description: "Acces a l'historique des notifications conge" },
    { nom: PERMISSIONS.CONGE_REQUEST, description: 'Saisie des demandes de conge' },
    { nom: PERMISSIONS.CONGE_REQUEST_CREATE, description: 'Creer une demande de conge' },
    { nom: PERMISSIONS.CONGE_REQUEST_EDIT, description: 'Modifier une demande de conge' },
    { nom: PERMISSIONS.CONGE_REQUEST_CANCEL, description: 'Annuler une demande de conge' },
    { nom: PERMISSIONS.CONGE_REQUEST_DELETE, description: 'Supprimer une demande de conge (brouillon)' },
    { nom: PERMISSIONS.CONGE_REQUEST_PRINT, description: 'Imprimer une demande de conge' },
    { nom: PERMISSIONS.CONGE_RETURN, description: 'Gestion des retours de conge' },
    { nom: PERMISSIONS.CONGE_DEMANDES_ALL, description: 'Voir toutes les demandes de conge' },
    { nom: PERMISSIONS.CONGE_ATTACHMENT_UPLOAD, description: 'Joindre des pieces a une demande de conge' },
    { nom: PERMISSIONS.CONGE_ATTACHMENT_VIEW, description: 'Consulter les pieces jointes de conge' },
    { nom: PERMISSIONS.CALENDAR_MANAGE, description: 'Gestion du calendrier conge' },
    { nom: PERMISSIONS.CALENDAR_CREATE, description: 'Creer une entree calendrier' },
    { nom: PERMISSIONS.CALENDAR_EDIT, description: 'Modifier une entree calendrier' },
    { nom: PERMISSIONS.CALENDAR_DELETE, description: 'Supprimer une entree calendrier' },
    { nom: PERMISSIONS.PRESENCE_MANAGE, description: 'Gestion des presences' },
    { nom: PERMISSIONS.PRESENCE_VIEW, description: 'Consultation des presences' },
  ];

  const names = required.map((p) => p.nom);
  const existing = await prisma.permissions.findMany({
    where: { nom: { in: names } },
    select: { id: true, nom: true, description: true },
  });

  const existingByName = new Map(existing.map((p) => [p.nom, p]));
  const toCreate = required.filter((p) => !existingByName.has(p.nom));
  if (toCreate.length > 0) {
    await prisma.permissions.createMany({
      data: toCreate.map((p) => ({
        nom: p.nom,
        description: p.description,
        usercreateid: BigInt(1),
      })),
    });
  }

  const toUpdate = required.filter((p) => {
    const ex = existingByName.get(p.nom);
    return ex && (ex.description || '') !== p.description;
  });
  if (toUpdate.length > 0) {
    await Promise.all(
      toUpdate.map((p) =>
        prisma.permissions.update({
          where: { nom: p.nom },
          data: {
            description: p.description,
            userupdateid: BigInt(1),
          },
        })
      )
    );
  }
}

async function ensureFullAccessRolePermissions(): Promise<void> {
  const roleId = BigInt(ROLE_ID_FULL_ACCESS);
  const role = await prisma.roles.findUnique({
    where: { id: roleId },
    select: { id: true },
  });
  if (!role) return;

  const allPermissions = await prisma.permissions.findMany({
    select: { id: true },
  });
  if (allPermissions.length === 0) return;

  const existing = await prisma.roles_permissions.findMany({
    where: { fkRole: roleId },
    select: { fkPermission: true },
  });
  const existingSet = new Set(existing.map((x) => x.fkPermission.toString()));
  const missing = allPermissions
    .map((p) => p.id)
    .filter((permissionId) => !existingSet.has(permissionId.toString()));

  if (missing.length === 0) return;

  await prisma.roles_permissions.createMany({
    data: missing.map((fkPermission) => ({
      fkRole: roleId,
      fkPermission,
      usercreateid: BigInt(1),
    })),
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const authUser = await requireApiPermissions(req, res as any, [
        ...API_ADMIN.permissions,
      ]);
      if (!authUser) return;

      console.log('🔍 API Permissions - Méthode: GET');
      console.log('🔍 Début de la récupération des permissions...');
      await ensureCorePermissions();
      await ensureFullAccessRolePermissions();

      const permissions = await prisma.permissions.findMany({
        orderBy: {
          datecreate: 'desc',
        },
      });

      console.log('🔍 Permissions trouvées:', permissions.length);

      const mappedPermissions = permissions.map((permission) => ({
        id: permission.id.toString(),
        nom: permission.nom,
        description: permission.description,
        datecreate: permission.datecreate.toISOString(),
        dateupdate: permission.dateupdate.toISOString(),
        usercreateid: permission.usercreateid?.toString(),
        userupdateid: permission.userupdateid?.toString(),
      }));

      console.log('🔍 Permissions mappées:', mappedPermissions.length);

      res.status(200).json({
        success: true,
        permissions: mappedPermissions,
        total: mappedPermissions.length,
        message: `${mappedPermissions.length} permissions trouvées`,
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des permissions:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des permissions',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  }
}



