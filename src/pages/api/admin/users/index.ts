import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  users?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    console.log('🔍 API Users - Méthode:', req.method);

    switch (req.method) {
      case 'GET':
        return await getUsers(req, res);
      case 'POST':
        return await createUser(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API users:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getUsers(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des utilisateurs...');

    const users = await prisma.utilisateurs.findMany({
      include: {
        role: {
          select: {
            id: true,
            nom: true,
          },
        },
        fonction: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    console.log('🔍 Utilisateurs trouvés:', users.length);

    const usersWithFormattedIds = users.map((user) => ({
      id: user.id.toString(),
      nom: user.nom,
      postnom: user.postnom,
      prenom: user.prenom,
      username: user.username,
      mail: user.mail,
      phone: user.phone,
      fkRole: user.fkRole?.toString(),
      fkFonction: user.fkFonction?.toString(),
      role: user.role
        ? {
            id: user.role.id.toString(),
            nom: user.role.nom,
          }
        : null,
      fonction: user.fonction
        ? {
            id: user.fonction.id.toString(),
            nom: user.fonction.nom,
          }
        : null,
      datecreate: user.datecreate,
      dateupdate: user.dateupdate,
      usercreateid: user.usercreateid?.toString(),
      userupdateid: user.userupdateid?.toString(),
    }));

    console.log('🔍 Utilisateurs mappés:', usersWithFormattedIds.length);

    return res.status(200).json({
      success: true,
      users: usersWithFormattedIds,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la récupération des utilisateurs: ' + error.message,
    });
  }
}

async function createUser(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log("🔍 Début de la création de l'utilisateur...");

    const { nom, postnom, prenom, username, mail, phone, fkFonction, fkRole } =
      req.body;

    if (!nom || !username) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le nom d'utilisateur sont requis",
      });
    }

    const user = await prisma.utilisateurs.create({
      data: {
        nom,
        postnom: postnom || null,
        prenom: prenom || null,
        username,
        mail: mail || null,
        phone: phone || null,
        fkFonction: fkFonction ? BigInt(fkFonction) : null,
        fkRole: fkRole ? BigInt(fkRole) : null,
        mot_de_passe: 'changeme', // Mot de passe par défaut
        locked: false,
        initPassword: true,
        usercreateid: BigInt(1),
      },
    });

    console.log('🔍 Utilisateur créé:', user);

    return res.status(201).json({
      success: true,
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
    console.error("❌ Erreur lors de la création de l'utilisateur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la création de l'utilisateur: " + error.message,
    });
  }
}
