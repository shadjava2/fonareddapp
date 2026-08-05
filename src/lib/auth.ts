import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import { prisma } from './prisma';
import { ROLE_ID_FULL_ACCESS } from './role-constants';

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
  /** Codes `permissions.nom` issus du rôle */
  permissions: string[];
  /** Identifiants `services.id` issus de `droits_services` */
  services: number[];
  /** `roles.nom` si un rôle est associé */
  roleNom: string | null;
}

/** Include Prisma pour charger droits rôle + services utilisateur */
export const prismaUserAccessInclude = {
  role: {
    include: {
      rolesPermissions: {
        include: {
          permission: { select: { nom: true } },
        },
      },
    },
  },
  droitsServices: {
    select: { fkService: true },
  },
} as const;

type UserWithAccess = {
  role: {
    nom: string;
    rolesPermissions: Array<{ permission: { nom: string } | null }>;
  } | null;
  droitsServices: Array<{ fkService: bigint | null }>;
};

export function collectAccessFromUser(user: UserWithAccess): {
  permissions: string[];
  services: number[];
} {
  const permissionSet = new Set<string>();
  for (const rp of user.role?.rolesPermissions ?? []) {
    const nom = rp.permission?.nom;
    if (nom) permissionSet.add(nom);
  }
  const services: number[] = [];
  for (const d of user.droitsServices ?? []) {
    if (d.fkService != null) services.push(Number(d.fkService));
  }
  return { permissions: [...permissionSet], services };
}

function profilePayload(
  user: UserWithAccess & {
    id: bigint;
    nom: string;
    prenom: string | null;
    username: string;
    mail: string | null;
    phone: string | null;
    fkRole: bigint | null;
    initPassword: boolean | null;
  }
): UserProfile {
  let { permissions, services } = collectAccessFromUser(user);
  if (
    user.fkRole != null &&
    user.fkRole === BigInt(ROLE_ID_FULL_ACCESS)
  ) {
    permissions = ['*'];
  }
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
    roleNom: user.role?.nom ?? null,
  };
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
  if (!prisma) {
    throw new Error(
      'Base de données non configurée (DATABASE_URL manquant dans le conteneur).'
    );
  }
  const user = await prisma.utilisateurs.findFirst({
    where: { username },
    include: prismaUserAccessInclude,
  });

  if (!user || user.locked) {
    return null;
  }

  const isValidPassword = await comparePassword(password, user.mot_de_passe);
  if (!isValidPassword) {
    return null;
  }

  return profilePayload(user);
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
    include: prismaUserAccessInclude,
  });

  if (!user || user.locked) {
    return null;
  }

  return profilePayload(user);
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
