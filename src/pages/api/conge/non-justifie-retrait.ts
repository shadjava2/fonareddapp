import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

type RetraitRow = {
  id: string;
  fkUtilisateur: string;
  nbrjours: number;
  commentaire: string | null;
  resteApres: number | null;
  datecreate: string;
  usercreateid: string | null;
  utilisateur?: {
    nom: string;
    prenom: string | null;
    username: string;
  };
};

function mapRetrait(r: {
  id: bigint;
  fkUtilisateur: bigint;
  nbrjours: number;
  commentaire: string | null;
  resteApres: number | null;
  datecreate: Date;
  usercreateid: bigint | null;
  utilisateur?: {
    nom: string;
    prenom: string | null;
    username: string;
  };
}): RetraitRow {
  return {
    id: r.id.toString(),
    fkUtilisateur: r.fkUtilisateur.toString(),
    nbrjours: r.nbrjours,
    commentaire: r.commentaire,
    resteApres: r.resteApres,
    datecreate: r.datecreate.toISOString(),
    usercreateid: r.usercreateid?.toString() ?? null,
    utilisateur: r.utilisateur,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!prisma) {
    return res.status(500).json({ success: false, message: 'Prisma non initialisé' });
  }

  try {
    if (req.method === 'GET') {
      if (req.query.listUsers === '1') {
        const users = await prisma.utilisateurs.findMany({
          where: { locked: false },
          select: {
            id: true,
            nom: true,
            prenom: true,
            username: true,
          },
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        });
        return res.status(200).json({
          success: true,
          users: users.map((u) => ({
            id: u.id.toString(),
            nom: u.nom,
            prenom: u.prenom,
            username: u.username,
          })),
        });
      }

      /** Recherche paginée pour combo (agents actifs uniquement) */
      if (req.query.searchUsers === '1') {
        const rawQ = (req.query.q as string) || '';
        const q = rawQ.trim();
        const limit = Math.min(
          80,
          Math.max(1, Number.parseInt(String(req.query.limit || '45'), 10) || 45)
        );

        const where: {
          locked: boolean;
          OR?: Array<Record<string, { contains: string }>>;
        } = { locked: false };

        if (q.length > 0) {
          where.OR = [
            { nom: { contains: q } },
            { prenom: { contains: q } },
            { username: { contains: q } },
          ];
        }

        const rows = await prisma.utilisateurs.findMany({
          where,
          select: {
            id: true,
            nom: true,
            prenom: true,
            username: true,
          },
          take: limit,
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        });

        const users = rows.map((u) => {
          const parts = [u.prenom, u.nom].filter((p) => p && String(p).trim());
          const display = parts.join(' ').trim() || u.username;
          return {
            id: u.id.toString(),
            label: `${display} (${u.username})`,
          };
        });

        return res.status(200).json({ success: true, users });
      }

      /** E-mail de l’agent (préremplissage formulaire envoi rapport) */
      if (req.query.agentMeta === '1') {
        const rawId = String(req.query.fkUtilisateur || '').trim();
        if (!rawId) {
          return res.status(200).json({ success: true, mail: null });
        }
        try {
          const u = await prisma.utilisateurs.findUnique({
            where: { id: BigInt(rawId) },
            select: { mail: true },
          });
          return res.status(200).json({
            success: true,
            mail: u?.mail?.trim() || null,
          });
        } catch {
          return res.status(200).json({ success: true, mail: null });
        }
      }

      const fkRaw = String(req.query.fkUtilisateur || '').trim();
      if (!fkRaw) {
        return res.status(200).json({
          success: true,
          retraits: [],
          requiresAgent: true,
        });
      }

      let fkUid: bigint;
      try {
        fkUid = BigInt(fkRaw);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'fkUtilisateur invalide',
        });
      }

      const take = Math.min(
        500,
        Math.max(1, Number.parseInt(String(req.query.take || '200'), 10) || 200)
      );
      const rows = await prisma.congeNonJustifieRetrait.findMany({
        where: { fkUtilisateur: fkUid },
        take,
        orderBy: { datecreate: 'desc' },
        include: {
          utilisateur: {
            select: { nom: true, prenom: true, username: true },
          },
        },
      });

      return res.status(200).json({
        success: true,
        retraits: rows.map(mapRetrait),
      });
    }

    if (req.method === 'POST') {
      const { fkUtilisateur, nbrjours, commentaire, usercreateid } = req.body || {};

      if (!fkUtilisateur) {
        return res.status(400).json({
          success: false,
          message: 'fkUtilisateur est requis',
        });
      }

      const jours = Number(nbrjours);
      if (!Number.isFinite(jours) || jours <= 0) {
        return res.status(400).json({
          success: false,
          message: 'nbrjours doit être un nombre strictement positif',
        });
      }

      const uid = BigInt(String(fkUtilisateur));
      const creator =
        usercreateid != null && usercreateid !== ''
          ? BigInt(String(usercreateid))
          : null;

      const config = await prisma.congeconfig.findFirst({
        orderBy: { dateupdate: 'desc' },
      });
      const raw = config?.congenonjustifie;
      const plafondNJ =
        raw != null && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0;

      const result = await prisma.$transaction(async (tx) => {
        let solde = await tx.congesolde.findFirst({
          where: { fkUtilisateur: uid },
          orderBy: { datecreate: 'desc' },
        });

        let restant: number;
        if (!solde) {
          restant = plafondNJ;
          solde = await tx.congesolde.create({
            data: {
              fkUtilisateur: uid,
              solde: 0,
              soldeConsomme: 0,
              congenonjustifie: plafondNJ,
              usercreateid: creator ?? uid,
              userupdateid: creator ?? uid,
            },
          });
        } else {
          const cur = solde.congenonjustifie;
          if (cur == null || Number.isNaN(Number(cur))) {
            restant = plafondNJ;
            await tx.congesolde.update({
              where: { id: solde.id },
              data: {
                congenonjustifie: plafondNJ,
                userupdateid: creator ?? uid,
              },
            });
          } else {
            restant = Number(cur);
          }
        }

        if (jours > restant + 1e-9) {
          throw Object.assign(new Error('SOLDE_INSUFFISANT'), {
            code: 'SOLDE_INSUFFISANT',
            restant,
          });
        }

        const resteApres = Math.round((restant - jours) * 1000) / 1000;

        await tx.congesolde.update({
          where: { id: solde.id },
          data: {
            congenonjustifie: resteApres,
            userupdateid: creator ?? uid,
          },
        });

        const created = await tx.congeNonJustifieRetrait.create({
          data: {
            fkUtilisateur: uid,
            nbrjours: jours,
            commentaire:
              typeof commentaire === 'string' && commentaire.trim().length > 0
                ? commentaire.trim().slice(0, 500)
                : null,
            resteApres,
            usercreateid: creator,
          },
          include: {
            utilisateur: {
              select: { nom: true, prenom: true, username: true },
            },
          },
        });

        return created;
      });

      return res.status(201).json({
        success: true,
        retrait: mapRetrait(result),
      });
    }

    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  } catch (e: any) {
    if (e?.code === 'SOLDE_INSUFFISANT') {
      return res.status(400).json({
        success: false,
        message: `Solde de jours non justifiés insuffisant (restant : ${e.restant})`,
        restant: e.restant,
      });
    }
    console.error('non-justifie-retrait:', e);
    return res.status(500).json({
      success: false,
      message: e?.message || 'Erreur serveur',
    });
  }
}
