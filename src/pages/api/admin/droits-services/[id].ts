import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'ID droit service requis',
    });
  }

  if (req.method === 'PUT') {
    try {
      console.log('🔍 API Droits Services PUT - ID:', id);
      console.log('🔍 Données reçues:', req.body);

      const { fkUtilisateur, fkService } = req.body;

      // Validation des données
      if (!fkUtilisateur || !fkService) {
        return res.status(400).json({
          success: false,
          message: "L'utilisateur et le service sont requis",
        });
      }

      // Vérifier si le droit service existe
      const existingDroit = await prisma.droits_services.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existingDroit) {
        return res.status(404).json({
          success: false,
          message: 'Droit service non trouvé',
        });
      }

      // Vérifier si une autre combinaison existe déjà
      const duplicateDroit = await prisma.droits_services.findFirst({
        where: {
          AND: [
            { id: { not: BigInt(id) } },
            { fkUtilisateur: BigInt(fkUtilisateur) },
            { fkService: BigInt(fkService) },
          ],
        },
      });

      if (duplicateDroit) {
        return res.status(400).json({
          success: false,
          message: 'Cette combinaison utilisateur-service existe déjà',
        });
      }

      const updatedDroit = await prisma.droits_services.update({
        where: { id: BigInt(id) },
        data: {
          fkUtilisateur: BigInt(fkUtilisateur),
          fkService: BigInt(fkService),
          userupdateid: BigInt(1), // Utilisateur fictif pour le développement
        },
        include: {
          utilisateur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              username: true,
            },
          },
          service: {
            select: {
              id: true,
              designation: true,
              site: {
                select: {
                  id: true,
                  designation: true,
                },
              },
            },
          },
        },
      });

      console.log('🔍 Droit service modifié:', updatedDroit);

      res.status(200).json({
        success: true,
        message: 'Droit service modifié avec succès',
        droitsService: {
          id: updatedDroit.id.toString(),
          fkUtilisateur: updatedDroit.fkUtilisateur?.toString(),
          fkService: updatedDroit.fkService?.toString(),
          utilisateur: updatedDroit.utilisateur
            ? {
                id: updatedDroit.utilisateur.id.toString(),
                nom: updatedDroit.utilisateur.nom,
                prenom: updatedDroit.utilisateur.prenom,
                username: updatedDroit.utilisateur.username,
              }
            : null,
          service: updatedDroit.service
            ? {
                id: updatedDroit.service.id.toString(),
                designation: updatedDroit.service.designation,
                site: updatedDroit.service.site
                  ? {
                      id: updatedDroit.service.site.id.toString(),
                      designation: updatedDroit.service.site.designation,
                    }
                  : null,
              }
            : null,
          datecreate: updatedDroit.datecreate.toISOString(),
        },
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la modification du droit service:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la modification du droit service',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log('🔍 API Droits Services DELETE - ID:', id);

      // Vérifier si le droit service existe
      const existingDroit = await prisma.droits_services.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existingDroit) {
        return res.status(404).json({
          success: false,
          message: 'Droit service non trouvé',
        });
      }

      await prisma.droits_services.delete({
        where: { id: BigInt(id) },
      });

      console.log('🔍 Droit service supprimé:', id);

      res.status(200).json({
        success: true,
        message: 'Droit service supprimé avec succès',
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la suppression du droit service:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du droit service',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  }
}
