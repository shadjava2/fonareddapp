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
      message: 'Identifiant de service requis',
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
    const serviceId = BigInt(id);
    const service = await prisma.services.findUnique({
      where: { id: serviceId },
      select: { id: true, designation: true },
    });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service introuvable',
      });
    }

    const raw = req.body?.userIds;
    if (!Array.isArray(raw)) {
      return res.status(400).json({
        success: false,
        message: 'Le corps doit contenir userIds (tableau)',
      });
    }

    const parsed = [...new Set(raw.map((x) => BigInt(String(x))))];
    let userIds: bigint[] = [];
    if (parsed.length > 0) {
      const existing = await prisma.utilisateurs.findMany({
        where: { id: { in: parsed } },
        select: { id: true },
      });
      const existingSet = new Set(existing.map((u) => u.id.toString()));
      userIds = parsed.filter((idValue) => existingSet.has(idValue.toString()));
    }

    await prisma.$transaction(async (tx) => {
      await tx.droits_services.deleteMany({ where: { fkService: serviceId } });
      if (userIds.length > 0) {
        await tx.droits_services.createMany({
          data: userIds.map((fkUtilisateur) => ({
            fkUtilisateur,
            fkService: serviceId,
            usercreateid: BigInt(authUser.id),
          })),
        });
      }
    });

    const serviceLabel =
      service.designation?.trim() || `Service #${service.id}`;

    return res.status(200).json({
      success: true,
      count: userIds.length,
      message: `Service "${serviceLabel}" : ${userIds.length} agent(s) autorise(s).`,
    });
  } catch (error: unknown) {
    console.error('users-sync:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
