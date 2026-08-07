import { sendCongeNotification } from '@/lib/email';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import { prisma } from '@/lib/prisma';

export async function getSuperviseurPrincipalId(): Promise<bigint | null> {
  if (!prisma) return null;
  try {
    const config = await prisma.congeconfig.findFirst({
      orderBy: { id: 'desc' },
      select: { fkSuperviseurPrincipal: true } as any,
    });
    const id = (config as { fkSuperviseurPrincipal?: bigint | null } | null)
      ?.fkSuperviseurPrincipal;
    return id != null ? BigInt(id) : null;
  } catch (e) {
    console.warn('getSuperviseurPrincipalId:', e);
    return null;
  }
}

/**
 * Notifie le superviseur principal s'il est distinct du superviseur de traitement.
 * Non bloquant pour le parcours.
 */
export async function notifySuperviseurPrincipalCopy(params: {
  demandeId: number | bigint;
  idSuperviseurTraitement: number | bigint | null | undefined;
  demandeur: string;
  nbrjour: number;
  du: string;
  au: string;
  section?: string;
  typeConge?: string;
}): Promise<{ sent: boolean; sameAsTraitement: boolean }> {
  const principalId = await getSuperviseurPrincipalId();
  if (!principalId || !prisma) {
    return { sent: false, sameAsTraitement: false };
  }

  const traitementId =
    params.idSuperviseurTraitement != null
      ? BigInt(params.idSuperviseurTraitement)
      : null;

  if (traitementId != null && traitementId === principalId) {
    return { sent: false, sameAsTraitement: true };
  }

  try {
    const user = await prisma.utilisateurs.findUnique({
      where: { id: principalId },
      select: { id: true, nom: true, prenom: true, mail: true },
    });
    if (!user?.mail) {
      return { sent: false, sameAsTraitement: false };
    }

    await sendCongeNotification(
      [
        {
          email: user.mail,
          nom: formatPersonDisplayName(user) || 'Superviseur principal',
        },
      ],
      {
        demandeur: params.demandeur,
        nbrjour: params.nbrjour,
        du: params.du,
        au: params.au,
        section: params.section,
        typeConge: params.typeConge,
      },
      'COPIE — SUPERVISEUR PRINCIPAL (observation optionnelle)'
    );

    // Notification in-app (best-effort)
    try {
      await (prisma as any).notifications.create({
        data: {
          fkUtilisateur: principalId,
          type_notification: 'email',
          statut: 'en_attente',
          sujet: `Copie demande congé #${params.demandeId}`,
          contenu: `Non Ouvert — Copie superviseur principal (observation optionnelle) — demande #${params.demandeId} — ${params.demandeur}`,
          adresse_destinataire: user.mail,
          date_programmee: new Date(),
          date_envoi: new Date(),
          usercreateid: principalId,
          userupdateid: principalId,
        },
      });
    } catch (notifErr) {
      console.warn('notifySuperviseurPrincipalCopy notif:', notifErr);
    }

    return { sent: true, sameAsTraitement: false };
  } catch (e) {
    console.error('notifySuperviseurPrincipalCopy:', e);
    return { sent: false, sameAsTraitement: false };
  }
}

export async function ensureCongeSchemaAdditive(): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE congeconfig
        ADD COLUMN fkSuperviseurPrincipal BIGINT UNSIGNED NULL
    `);
  } catch {
    /* column may already exist */
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS conge_observation_principal (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        fkDemande BIGINT NOT NULL,
        fkUtilisateur BIGINT UNSIGNED NOT NULL,
        observations TEXT NULL,
        datecreate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        dateupdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        usercreateid BIGINT UNSIGNED NULL,
        userupdateid BIGINT UNSIGNED NULL,
        PRIMARY KEY (id),
        KEY idx_obs_demande (fkDemande),
        KEY idx_obs_user (fkUtilisateur)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.warn('ensureCongeSchemaAdditive observation:', e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS congedemande_fichier (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        fkDemande BIGINT NOT NULL,
        nom_original VARCHAR(255) NOT NULL,
        chemin VARCHAR(500) NOT NULL,
        mime VARCHAR(120) NULL,
        taille INT UNSIGNED NULL,
        datecreate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        usercreateid BIGINT UNSIGNED NULL,
        PRIMARY KEY (id),
        KEY idx_cdf_demande (fkDemande)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.warn('ensureCongeSchemaAdditive fichier:', e);
  }
}
