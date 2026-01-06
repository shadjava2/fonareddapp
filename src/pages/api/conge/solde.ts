import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!prisma) {
    return res.status(500).json({
      success: false,
      message: 'Prisma non initialisé',
    });
  }

  try {
    if (req.method === 'GET') {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur requis',
        });
      }

      // Rechercher dans congesolde où fkUtilisateur = userId (ID du demandeur)
      const solde = await prisma.congesolde.findFirst({
        where: {
          fkUtilisateur: BigInt(userId),
        },
        orderBy: {
          datecreate: 'desc', // Récupérer le plus récent
        },
      });

      console.log('📊 API solde - Recherche pour fkUtilisateur:', userId);
      console.log('📊 API solde - Résultat:', solde);

      if (!solde) {
        console.log('⚠️ Aucun solde trouvé pour fkUtilisateur:', userId);
        return res.status(200).json({
          success: true,
          solde: {
            id: null,
            solde: 0,
            soldeConsomme: 0,
            soldeRestant: 0,
          },
        });
      }

      const soldeId = Number(solde.id);
      const soldeTotal = solde.solde || 0;
      const soldeConsomme = solde.soldeConsomme || 0;
      const soldeRestant = soldeTotal - soldeConsomme;

      console.log('✅ Solde trouvé:', {
        id: soldeId,
        fkUtilisateur: userId,
        solde: soldeTotal,
        soldeConsomme: soldeConsomme,
        soldeRestant: soldeRestant > 0 ? soldeRestant : 0,
      });

      return res.status(200).json({
        success: true,
        solde: {
          id: soldeId, // ID du congesolde pour fkSoldes
          solde: soldeTotal, // Solde total depuis congesolde.solde
          soldeConsomme: soldeConsomme, // Solde consommé depuis congesolde.soldeConsomme
          soldeRestant: soldeRestant > 0 ? soldeRestant : 0, // Calculé (solde - soldeConsomme)
        },
      });
    }

    if (req.method === 'PUT') {
      const { id, solde, soldeConsomme, fkUtilisateur } = req.body;

      if (!id || !fkUtilisateur) {
        return res.status(400).json({
          success: false,
          message: 'ID du solde et ID utilisateur sont requis',
        });
      }

      // Mettre à jour le solde
      const updatedSolde = await prisma.congesolde.update({
        where: { id: BigInt(id) },
        data: {
          solde: solde !== undefined ? parseFloat(solde) : undefined,
          soldeConsomme:
            soldeConsomme !== undefined ? parseFloat(soldeConsomme) : undefined,
          userupdateid: BigInt(1),
        },
      });

      return res.status(200).json({
        success: true,
        solde: {
          id: updatedSolde.id.toString(),
          fkUtilisateur: updatedSolde.fkUtilisateur?.toString(),
          solde: updatedSolde.solde || 0,
          soldeConsomme: updatedSolde.soldeConsomme || 0,
          soldeRestant:
            (updatedSolde.solde || 0) - (updatedSolde.soldeConsomme || 0),
        },
      });
    }

    if (req.method === 'POST') {
      // Créer un nouveau solde
      const { fkUtilisateur, solde, soldeConsomme } = req.body;

      if (!fkUtilisateur) {
        return res.status(400).json({
          success: false,
          message: "ID de l'utilisateur est requis",
        });
      }

      // Vérifier si un solde existe déjà pour cet utilisateur
      const existingSolde = await prisma.congesolde.findFirst({
        where: {
          fkUtilisateur: BigInt(fkUtilisateur),
        },
        orderBy: {
          datecreate: 'desc',
        },
      });

      if (existingSolde) {
        // Mettre à jour le solde existant
        const updatedSolde = await prisma.congesolde.update({
          where: { id: existingSolde.id },
          data: {
            solde:
              solde !== undefined ? parseFloat(solde) : existingSolde.solde,
            soldeConsomme:
              soldeConsomme !== undefined
                ? parseFloat(soldeConsomme)
                : existingSolde.soldeConsomme,
            userupdateid: BigInt(1),
          },
        });

        return res.status(200).json({
          success: true,
          solde: {
            id: updatedSolde.id.toString(),
            fkUtilisateur: updatedSolde.fkUtilisateur?.toString(),
            solde: updatedSolde.solde || 0,
            soldeConsomme: updatedSolde.soldeConsomme || 0,
            soldeRestant:
              (updatedSolde.solde || 0) - (updatedSolde.soldeConsomme || 0),
          },
        });
      }

      // Créer un nouveau solde
      const newSolde = await prisma.congesolde.create({
        data: {
          fkUtilisateur: BigInt(fkUtilisateur),
          solde: solde !== undefined ? parseFloat(solde) : 0,
          soldeConsomme:
            soldeConsomme !== undefined ? parseFloat(soldeConsomme) : 0,
          usercreateid: BigInt(1),
        },
      });

      return res.status(201).json({
        success: true,
        solde: {
          id: newSolde.id.toString(),
          fkUtilisateur: newSolde.fkUtilisateur?.toString(),
          solde: newSolde.solde || 0,
          soldeConsomme: newSolde.soldeConsomme || 0,
          soldeRestant: (newSolde.solde || 0) - (newSolde.soldeConsomme || 0),
        },
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ API solde congé erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error:
        process.env.NODE_ENV === 'development'
          ? `${error?.message || 'Erreur inconnue'}`
          : undefined,
    });
  }
}
