import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { API_ADMIN } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  configConge?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const authUser = await requireApiPermissions(req, res, [
      ...API_ADMIN.personnel,
    ]);
    if (!authUser) return;

    switch (req.method) {
      case 'GET':
        return await getConfigConge(req, res);
      case 'POST':
        return await createConfigConge(req, res, null);
      case 'PUT':
        return await updateConfigConge(req, res, null);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API config congé:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getConfigConge(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération de la configuration congé...');

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE congeconfig ADD COLUMN fkSuperviseurPrincipal BIGINT UNSIGNED NULL`
      );
    } catch {
      /* déjà présent */
    }

    // Récupérer la première configuration (il ne devrait y en avoir qu'une)
    const configConge = await prisma.congeconfig.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!configConge) {
      return res.status(200).json({
        success: true,
        configConge: null,
      });
    }

    const configCongeMapped = {
      id: configConge.id.toString(),
      nbjourMois: configConge.nbjourMois,
      congenonjustifie: configConge.congenonjustifie,
      fkSuperviseurPrincipal:
        (configConge as any).fkSuperviseurPrincipal != null
          ? String((configConge as any).fkSuperviseurPrincipal)
          : null,
      datecreate: configConge.datecreate,
      dateupdate: configConge.dateupdate,
      usercreateid: configConge.usercreateid?.toString(),
      userupdateid: configConge.userupdateid?.toString(),
    };

    console.log('🔍 Configuration congé trouvée:', configCongeMapped);

    return res.status(200).json({
      success: true,
      configConge: configCongeMapped,
    });
  } catch (error: any) {
    console.error(
      'Erreur lors de la récupération de la configuration congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration congé',
    });
  }
}

async function createConfigConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user: any = null
) {
  try {
    const { nbjourMois, congenonjustifie, fkSuperviseurPrincipal } = req.body;

    if (!nbjourMois || isNaN(parseFloat(nbjourMois))) {
      return res.status(400).json({
        success: false,
        message:
          'Le nombre de jours par mois est requis et doit être un nombre valide',
      });
    }

    const nbjourMoisFloat = parseFloat(nbjourMois);

    if (nbjourMoisFloat <= 0 || nbjourMoisFloat > 31) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre de jours par mois doit être entre 1 et 31',
      });
    }

    let nj: number | null = null;
    if (
      congenonjustifie !== undefined &&
      congenonjustifie !== null &&
      congenonjustifie !== ''
    ) {
      const parsed = parseFloat(String(congenonjustifie));
      if (isNaN(parsed) || parsed < 0 || parsed > 366) {
        return res.status(400).json({
          success: false,
          message:
            'Le plafond jours non justifiés doit être un nombre entre 0 et 366',
        });
      }
      nj = parsed;
    }

    let principal: bigint | null | undefined = undefined;
    if (fkSuperviseurPrincipal !== undefined) {
      if (
        fkSuperviseurPrincipal === null ||
        fkSuperviseurPrincipal === '' ||
        fkSuperviseurPrincipal === 0
      ) {
        principal = null;
      } else {
        const p = Number(fkSuperviseurPrincipal);
        if (isNaN(p) || p <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Superviseur principal invalide',
          });
        }
        principal = BigInt(p);
      }
    }

    // Vérifier s'il existe déjà une configuration
    const existingConfig = await prisma.congeconfig.findFirst();

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message:
          'Une configuration de congé existe déjà. Utilisez la modification pour la mettre à jour.',
      });
    }

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE congeconfig ADD COLUMN fkSuperviseurPrincipal BIGINT UNSIGNED NULL`
      );
    } catch {
      /* déjà présent */
    }

    const configConge = await prisma.congeconfig.create({
      data: {
        nbjourMois: nbjourMoisFloat,
        ...(nj !== null ? { congenonjustifie: nj } : {}),
        ...(principal !== undefined
          ? ({ fkSuperviseurPrincipal: principal } as any)
          : {}),
        usercreateid: user ? parseInt(user.id) : 1,
      },
    });

    return res.status(201).json({
      success: true,
      configConge: {
        id: configConge.id.toString(),
        nbjourMois: configConge.nbjourMois,
        congenonjustifie: configConge.congenonjustifie,
        fkSuperviseurPrincipal:
          (configConge as any).fkSuperviseurPrincipal != null
            ? String((configConge as any).fkSuperviseurPrincipal)
            : null,
        datecreate: configConge.datecreate,
        dateupdate: configConge.dateupdate,
        usercreateid: configConge.usercreateid?.toString(),
        userupdateid: configConge.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error(
      'Erreur lors de la création de la configuration congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la configuration congé',
    });
  }
}

async function updateConfigConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user: any = null
) {
  try {
    const { nbjourMois, congenonjustifie, fkSuperviseurPrincipal } = req.body;

    if (!nbjourMois || isNaN(parseFloat(nbjourMois))) {
      return res.status(400).json({
        success: false,
        message:
          'Le nombre de jours par mois est requis et doit être un nombre valide',
      });
    }

    const nbjourMoisFloat = parseFloat(nbjourMois);

    if (nbjourMoisFloat <= 0 || nbjourMoisFloat > 31) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre de jours par mois doit être entre 1 et 31',
      });
    }

    let nj: number | null = null;
    if (
      congenonjustifie !== undefined &&
      congenonjustifie !== null &&
      congenonjustifie !== ''
    ) {
      const parsed = parseFloat(String(congenonjustifie));
      if (isNaN(parsed) || parsed < 0 || parsed > 366) {
        return res.status(400).json({
          success: false,
          message:
            'Le plafond jours non justifiés doit être un nombre entre 0 et 366',
        });
      }
      nj = parsed;
    }

    let principal: bigint | null | undefined = undefined;
    if (fkSuperviseurPrincipal !== undefined) {
      if (
        fkSuperviseurPrincipal === null ||
        fkSuperviseurPrincipal === '' ||
        fkSuperviseurPrincipal === 0
      ) {
        principal = null;
      } else {
        const p = Number(fkSuperviseurPrincipal);
        if (isNaN(p) || p <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Superviseur principal invalide',
          });
        }
        principal = BigInt(p);
      }
    }

    // Récupérer la configuration existante
    const existingConfig = await prisma.congeconfig.findFirst();

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message:
          "Aucune configuration de congé trouvée. Créez d'abord une configuration.",
      });
    }

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE congeconfig ADD COLUMN fkSuperviseurPrincipal BIGINT UNSIGNED NULL`
      );
    } catch {
      /* déjà présent */
    }

    const configConge = await prisma.congeconfig.update({
      where: { id: existingConfig.id },
      data: {
        nbjourMois: nbjourMoisFloat,
        ...(nj !== null ? { congenonjustifie: nj } : {}),
        ...(principal !== undefined
          ? ({ fkSuperviseurPrincipal: principal } as any)
          : {}),
        userupdateid: user ? parseInt(user.id) : 1,
      },
    });

    return res.status(200).json({
      success: true,
      configConge: {
        id: configConge.id.toString(),
        nbjourMois: configConge.nbjourMois,
        congenonjustifie: configConge.congenonjustifie,
        fkSuperviseurPrincipal:
          (configConge as any).fkSuperviseurPrincipal != null
            ? String((configConge as any).fkSuperviseurPrincipal)
            : null,
        datecreate: configConge.datecreate,
        dateupdate: configConge.dateupdate,
        usercreateid: configConge.usercreateid?.toString(),
        userupdateid: configConge.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error(
      'Erreur lors de la modification de la configuration congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la configuration congé',
    });
  }
}
