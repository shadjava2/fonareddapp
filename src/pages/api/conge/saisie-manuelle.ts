import { requireApiPermissions } from '@/lib/api-auth';
import { countFonareddWorkingDays } from '@/lib/calendrier';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/rbac';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Saisie manuelle d'un congé déjà pris : demande APPROUVEE + retrait solde,
 * sans workflow de traitements.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const authUser = await requireApiPermissions(req, res, [
      PERMISSIONS.CONGE_REQUEST,
      PERMISSIONS.CONGE_TRAITEMENT,
      PERMISSIONS.MODULE_CONGE,
      PERMISSIONS.MODULE_ADMIN,
    ]);
    if (!authUser) return;

    try {
      const [types, users] = await Promise.all([
        prisma.congetypes.findMany({
          select: { id: true, nom: true },
          orderBy: { nom: 'asc' },
          take: 200,
        }),
        prisma.utilisateurs.findMany({
          where: { locked: false },
          select: {
            id: true,
            nom: true,
            prenom: true,
            postnom: true,
            username: true,
          },
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
          take: 500,
        }),
      ]);

      return res.status(200).json({
        success: true,
        types: types.map((t) => ({
          id: t.id.toString(),
          designation: t.nom || `Type #${t.id}`,
        })),
        users: users.map((u) => ({
          id: u.id.toString(),
          label:
            `${formatPersonDisplayName(u) || u.username} (${u.username})`.trim(),
        })),
      });
    } catch (e: unknown) {
      console.error('saisie-manuelle GET:', e);
      return res.status(500).json({
        success: false,
        message: e instanceof Error ? e.message : 'Erreur serveur',
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  const authUser = await requireApiPermissions(req, res, [
    PERMISSIONS.CONGE_REQUEST,
    PERMISSIONS.CONGE_TRAITEMENT,
    PERMISSIONS.MODULE_CONGE,
    PERMISSIONS.MODULE_ADMIN,
  ]);
  if (!authUser) return;

  try {
    const {
      utilisateurId,
      fkTypeConge,
      du,
      au,
      nbrjour,
      commentaire,
    } = req.body || {};

    const uidRaw = String(utilisateurId || '').trim();
    const typeRaw = String(fkTypeConge || '').trim();
    const duStr = String(du || '').trim().slice(0, 10);
    const auStr = String(au || '').trim().slice(0, 10);

    if (!uidRaw) {
      return res.status(400).json({
        success: false,
        message: 'utilisateurId est requis',
      });
    }
    if (!typeRaw) {
      return res.status(400).json({
        success: false,
        message: 'fkTypeConge est requis',
      });
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(duStr) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(auStr)
    ) {
      return res.status(400).json({
        success: false,
        message: 'du et au (AAAA-MM-JJ) sont requis',
      });
    }
    if (duStr > auStr) {
      return res.status(400).json({
        success: false,
        message: 'La date de début ne peut pas être après la fin',
      });
    }

    const holidays = await prisma.calendrier.findMany({
      select: { d: true },
      take: 5000,
    });
    const workingDays = countFonareddWorkingDays(duStr, auStr, holidays);
    if (workingDays <= 0) {
      return res.status(400).json({
        success: false,
        message:
          'Aucun jour ouvré dans cette période (week-ends / fériés Fonaredd exclus).',
      });
    }

    // Jours débités = jours ouvrés de la période (lun–ven + calendrier Fonaredd)
    const jours = workingDays;

    const uid = BigInt(uidRaw);
    const typeId = BigInt(typeRaw);

    const [user, typeConge] = await Promise.all([
      prisma.utilisateurs.findUnique({
        where: { id: uid },
        select: {
          id: true,
          nom: true,
          prenom: true,
          postnom: true,
          username: true,
        },
      }),
      prisma.congetypes.findUnique({
        where: { id: typeId },
        select: { id: true, nom: true },
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }
    if (!typeConge) {
      return res.status(404).json({
        success: false,
        message: 'Type de congé introuvable',
      });
    }

    const displayName =
      formatPersonDisplayName(user) || user.username;
    const note =
      typeof commentaire === 'string' && commentaire.trim()
        ? commentaire.trim().slice(0, 2000)
        : null;

    const created = await prisma.$transaction(async (tx) => {
      let solde = await tx.congesolde.findFirst({
        where: { fkUtilisateur: uid },
        orderBy: { datecreate: 'desc' },
      });

      if (!solde) {
        throw Object.assign(new Error('SOLDE_MANQUANT'), {
          code: 'SOLDE_MANQUANT',
        });
      }

      const disponible = Number(solde.solde) || 0;
      if (jours > disponible + 1e-9) {
        throw Object.assign(new Error('SOLDE_INSUFFISANT'), {
          code: 'SOLDE_INSUFFISANT',
          restant: disponible,
        });
      }

      const nouveauSolde = Math.round((disponible - jours) * 1000) / 1000;
      const consomme = Math.round(
        ((Number(solde.soldeConsomme) || 0) + jours) * 1000
      ) / 1000;

      await tx.congesolde.update({
        where: { id: solde.id },
        data: {
          solde: nouveauSolde,
          soldeConsomme: consomme,
          userupdateid: BigInt(authUser.id),
        },
      });

      const remise = note
        ? `Saisie manuelle (congés déjà pris). ${note}`
        : 'Saisie manuelle (congés déjà pris, hors workflow).';

      // section = 'Saisie manuelle' → le trigger DB sp_conge_after_insert
      // ne crée PAS de phases (congés déjà consommés / validés).
      const demande = await tx.congedemande.create({
        data: {
          du: new Date(`${duStr}T00:00:00.000Z`),
          au: new Date(`${auStr}T00:00:00.000Z`),
          statut: 'APPROUVEE',
          niveau: 0,
          fkTypeConge: typeId,
          nbrjour: jours,
          soldeconge: nouveauSolde,
          section: 'Saisie manuelle',
          demandeur: displayName,
          remiseetreprise: remise,
          fkSoldes: String(solde.id),
          usercreateid: uid,
          userupdateid: BigInt(authUser.id),
        },
      });

      // Filet de sécurité si un ancien trigger a quand même créé des phases
      await tx.congetraitements.deleteMany({
        where: { fkDemande: demande.id },
      });

      return { demande, nouveauSolde };
    });

    return res.status(201).json({
      success: true,
      message: `Congé enregistré pour ${displayName} (${jours} j.). Solde restant : ${created.nouveauSolde}.`,
      demandeId: created.demande.id.toString(),
      soldeRestant: created.nouveauSolde,
    });
  } catch (e: unknown) {
    const err = e as { code?: string; restant?: number; message?: string };
    if (err?.code === 'SOLDE_MANQUANT') {
      return res.status(400).json({
        success: false,
        message: 'Aucun solde de congé pour cet agent. Créez d’abord un solde.',
      });
    }
    if (err?.code === 'SOLDE_INSUFFISANT') {
      return res.status(400).json({
        success: false,
        message: `Solde insuffisant (disponible : ${err.restant} j.).`,
        restant: err.restant,
      });
    }
    console.error('saisie-manuelle POST:', e);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Erreur serveur',
    });
  }
}
