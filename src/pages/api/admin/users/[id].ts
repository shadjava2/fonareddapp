import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  user?: any;
  message?: string;
  tempPassword?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: "ID de l'utilisateur requis",
    });
  }

  try {
    console.log('🔍 API User - Méthode:', req.method, 'ID:', id);

    switch (req.method) {
      case 'PUT':
        return await updateUser(req, res, id);
      case 'DELETE':
        return await deleteUser(req, res, id);
      case 'POST':
        // Si action=reset-password dans le body, réinitialiser le mot de passe
        if (req.body.action === 'reset-password') {
          return await resetPassword(req, res, id);
        }
        return res.status(400).json({
          success: false,
          message: 'Action non reconnue',
        });
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API user:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function updateUser(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log("🔍 Début de la modification de l'utilisateur...");

    const { nom, postnom, prenom, username, mail, phone, fkFonction, fkRole } =
      req.body;

    if (!nom || !username) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le nom d'utilisateur sont requis",
      });
    }

    const user = await prisma.utilisateurs.update({
      where: { id: BigInt(id) },
      data: {
        nom,
        postnom: postnom || null,
        prenom: prenom || null,
        username,
        mail: mail || null,
        phone: phone || null,
        fkFonction: fkFonction ? BigInt(fkFonction) : null,
        fkRole: fkRole ? BigInt(fkRole) : null,
        userupdateid: BigInt(1),
      },
    });

    console.log('🔍 Utilisateur modifié:', user);

    return res.status(200).json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      user: {
        id: user.id.toString(),
        nom: user.nom,
        postnom: user.postnom,
        prenom: user.prenom,
        username: user.username,
        mail: user.mail,
        phone: user.phone,
        fkRole: user.fkRole?.toString(),
        fkFonction: user.fkFonction?.toString(),
        datecreate: user.datecreate,
        dateupdate: user.dateupdate,
        usercreateid: user.usercreateid?.toString(),
        userupdateid: user.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de la modification de l'utilisateur:", error);
    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification de l'utilisateur: " + error.message,
    });
  }
}

async function resetPassword(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la réinitialisation du mot de passe...');

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.utilisateurs.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, username: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Mot de passe par défaut pour la réinitialisation
    const tempPassword = '12345678';
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.utilisateurs.update({
      where: { id: BigInt(id) },
      data: {
        mot_de_passe: hashedPassword,
        initPassword: false, // Mettre à false (0) pour forcer l'utilisateur à changer
        userupdateid: BigInt(1),
      },
    });

    console.log(
      '🔍 Mot de passe réinitialisé pour utilisateur:',
      user.username
    );

    return res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      tempPassword: tempPassword, // Retourner le mot de passe temporaire
      user: {
        id: user.id.toString(),
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la réinitialisation du mot de passe:',
      error
    );
    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la réinitialisation du mot de passe: ' + error.message,
    });
  }
}

async function deleteUser(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log("🔍 Début de la suppression de l'utilisateur...");

    await prisma.utilisateurs.delete({
      where: { id: BigInt(id) },
    });

    console.log('🔍 Utilisateur supprimé:', id);

    return res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de la suppression de l'utilisateur:", error);
    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression de l'utilisateur: " + error.message,
    });
  }
}
