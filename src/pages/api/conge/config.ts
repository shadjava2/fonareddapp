import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { ensureCongeSchemaAdditive } from '@/lib/conge/superviseur-principal';
import { hasAnyPermission, PERMISSIONS } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ConfigResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfigResponse>
) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  if (
    !hasAnyPermission(user as any, [
      PERMISSIONS.CONGE_CONFIG,
      PERMISSIONS.CONGE_CONFIG_EDIT,
      PERMISSIONS.MODULE_ADMIN,
    ])
  ) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    await ensureCongeSchemaAdditive();

    if (req.method === 'GET') {
      const config = await prisma.congeconfig.findFirst({
        orderBy: { id: 'desc' },
      });

      if (!config) {
        const defaultConfig = await prisma.congeconfig.create({
          data: {
            nbjourMois: 2.5,
          },
        });

        return res.status(200).json({
          success: true,
          data: defaultConfig,
        });
      }

      return res.status(200).json({
        success: true,
        data: config,
      });
    }

    if (req.method === 'PUT') {
      if (
        !hasAnyPermission(user as any, [
          PERMISSIONS.CONGE_CONFIG_EDIT,
          PERMISSIONS.CONGE_CONFIG,
          PERMISSIONS.MODULE_ADMIN,
        ])
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Permissions insuffisantes' });
      }

      const { nbjourMois, fkSuperviseurPrincipal, congenonjustifie } = req.body;

      if (nbjourMois === undefined || nbjourMois < 0) {
        return res.status(400).json({
          success: false,
          message: 'Le nombre de jours par mois doit être un nombre positif',
        });
      }

      const existingConfig = await prisma.congeconfig.findFirst({
        orderBy: { id: 'desc' },
      });

      const data: any = { nbjourMois };
      if (congenonjustifie !== undefined) {
        data.congenonjustifie =
          congenonjustifie === null || congenonjustifie === ''
            ? null
            : Number(congenonjustifie);
      }
      if (fkSuperviseurPrincipal !== undefined) {
        data.fkSuperviseurPrincipal =
          fkSuperviseurPrincipal === null ||
          fkSuperviseurPrincipal === '' ||
          fkSuperviseurPrincipal === 0
            ? null
            : BigInt(fkSuperviseurPrincipal);
      }

      let updatedConfig;
      if (existingConfig) {
        updatedConfig = await prisma.congeconfig.update({
          where: { id: existingConfig.id },
          data,
        });
      } else {
        updatedConfig = await prisma.congeconfig.create({
          data,
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedConfig,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API config congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
