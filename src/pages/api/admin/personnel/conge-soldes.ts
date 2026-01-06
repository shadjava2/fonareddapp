import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  soldes?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    console.log('🔍 Récupération de tous les soldes de congé...');

    const soldes = await prisma.congesolde.findMany({
      include: {
        // Note: Le schéma Prisma doit avoir une relation vers utilisateurs
        // Si pas de relation, on récupère l'utilisateur séparément
      },
      orderBy: {
        datecreate: 'desc',
      },
    });

    console.log(`🔍 ${soldes.length} soldes trouvés`);

    // Récupérer les utilisateurs pour chaque solde
    const soldesWithUsers = await Promise.all(
      soldes.map(async (solde) => {
        let utilisateur = null;
        if (solde.fkUtilisateur) {
          try {
            utilisateur = await prisma.utilisateurs.findUnique({
              where: { id: solde.fkUtilisateur },
              select: {
                id: true,
                nom: true,
                prenom: true,
                username: true,
              },
            });
          } catch (error) {
            console.error(
              "Erreur lors de la récupération de l'utilisateur:",
              error
            );
          }
        }

        const soldeTotal = solde.solde || 0;
        const soldeConsomme = solde.soldeConsomme || 0;
        const soldeRestant = soldeTotal - soldeConsomme;

        return {
          id: solde.id.toString(),
          fkUtilisateur: solde.fkUtilisateur?.toString(),
          solde: soldeTotal,
          soldeConsomme: soldeConsomme,
          soldeRestant: soldeRestant,
          utilisateur: utilisateur
            ? {
                id: utilisateur.id.toString(),
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                username: utilisateur.username,
              }
            : null,
          datecreate: solde.datecreate.toISOString(),
          dateupdate: solde.dateupdate?.toISOString(),
        };
      })
    );

    return res.status(200).json({
      success: true,
      soldes: soldesWithUsers,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des soldes:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des soldes',
      error: error.message,
    });
  }
}

