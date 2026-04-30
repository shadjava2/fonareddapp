import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
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
    ...API_ADMIN.droitsServices,
  ]);
  if (!authUser) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Identifiant d'utilisateur requis",
    });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({
      success: false,
      message: 'Methode non autorisee',
    });
  }

  try {
    const userId = BigInt(id);
    const user = await prisma.utilisateurs.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true, username: true },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    const raw = req.body?.serviceIds;
    if (!Array.isArray(raw)) {
      return res.status(400).json({
        success: false,
        message: 'Le corps doit contenir serviceIds (tableau)',
      });
    }

    const parsed = [...new Set(raw.map((x) => BigInt(String(x))))];
    let serviceIds: bigint[] = [];
    if (parsed.length > 0) {
      const existing = await prisma.services.findMany({
        where: { id: { in: parsed } },
        select: { id: true },
      });
      const existingSet = new Set(existing.map((s) => s.id.toString()));
      serviceIds = parsed.filter((idValue) => existingSet.has(idValue.toString()));
    }

    await prisma.$transaction(async (tx) => {
      await tx.droits_services.deleteMany({ where: { fkUtilisateur: userId } });
      if (serviceIds.length > 0) {
        await tx.droits_services.createMany({
          data: serviceIds.map((serviceId) => ({
            fkUtilisateur: userId,
            fkService: serviceId,
            usercreateid: BigInt(1),
          })),
        });
      }
    });

    const displayName =
      [user.nom, user.prenom].filter(Boolean).join(' ').trim() || user.username;

    return res.status(200).json({
      success: true,
      count: serviceIds.length,
      message: `Services autorises de "${displayName}" mis a jour (${serviceIds.length} service(s)).`,
    });
  } catch (error: any) {
    console.error('services-sync:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
