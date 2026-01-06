import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import { prisma } from './prisma';

export interface JWTPayload {
  uid: string;
  roleId: string;
}

export interface UserProfile {
  id: any;
  nom: string | null;
  prenom: string | null;
  username: string;
  mail: string | null;
  phone: string | null;
  fkRole: any;
  initPassword: any;
  permissions: string[];
  services: any[];
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

/**
 * Hash un mot de passe avec bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare un mot de passe avec son hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Génère un token JWT pour un utilisateur
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

/**
 * Vérifie et décode un token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extrait le token JWT depuis les cookies de la requête
 */
export function getTokenFromRequest(req: NextApiRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const authCookie = cookies
    .split(';')
    .find((c) => c.trim().startsWith('authToken='));

  if (!authCookie) return null;

  return authCookie.split('=')[1];
}

/**
 * Authentifie un utilisateur avec username/password
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<UserProfile | null> {
  const user = await prisma.utilisateurs.findFirst({
    where: { username },
    include: {
      role: {
        include: {
          rolesPermissions: true,
        },
      },
      droitsServices: true,
    },
  });

  if (!user || user.locked) {
    return null;
  }

  const isValidPassword = await comparePassword(password, user.mot_de_passe);
  if (!isValidPassword) {
    return null;
  }

  // TEMPORAIRE: Accès libre à tous les services et permissions
  let permissions: string[] = ['*']; // Toutes les permissions
  const services: string[] = ['*']; // Tous les services

  return {
    id: user.id.toString(),
    nom: user.nom,
    prenom: user.prenom,
    username: user.username,
    mail: user.mail,
    phone: user.phone,
    fkRole: user.fkRole?.toString() || null,
    initPassword: user.initPassword,
    permissions,
    services,
  };
}

/**
 * Récupère le profil utilisateur complet depuis le token JWT
 */
export async function getUserFromToken(
  token: string
): Promise<UserProfile | null> {
  console.log('🔍 Vérification du token:', token.substring(0, 20) + '...');
  const payload = verifyToken(token);
  console.log('🔑 Payload JWT:', payload ? 'VALIDE' : 'INVALIDE');
  if (!payload) return null;

  const user = await prisma.utilisateurs.findUnique({
    where: { id: BigInt(payload.uid) },
    include: {
      role: {
        include: {
          rolesPermissions: true,
        },
      },
      droitsServices: true,
    },
  });

  if (!user || user.locked) {
    return null;
  }

  // TEMPORAIRE: Accès libre à tous les services et permissions
  let permissions: string[] = ['*']; // Toutes les permissions
  const services: string[] = ['*']; // Tous les services

  return {
    id: user.id.toString(),
    nom: user.nom,
    prenom: user.prenom,
    username: user.username,
    mail: user.mail,
    phone: user.phone,
    fkRole: user.fkRole?.toString() || null,
    initPassword: user.initPassword,
    permissions,
    services,
  };
}

/**
 * Met à jour le mot de passe d'un utilisateur
 */
export async function updateUserPassword(
  username: string,
  newPassword: string
): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(newPassword);

    // Vérifier que l'utilisateur existe
    const user = await prisma.utilisateurs.findFirst({
      where: { username },
      select: { id: true, username: true, initPassword: true },
    });

    if (!user) {
      console.error('Utilisateur non trouvé:', username);
      return false;
    }

    await prisma.utilisateurs.update({
      where: { id: user.id },
      data: {
        mot_de_passe: hashedPassword,
        initPassword: true,
      },
    });

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    return false;
  }
}
