import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

// Stockage des clients SSE connectés par userId
const clients = new Map<number, Set<WritableStreamDefaultWriter>>();

interface SSEPayload {
  type: 'INIT' | 'NEW' | 'READ' | 'PING';
  count?: number;
  items?: any[];
  item?: any;
  id?: bigint | number | string;
  increment?: number;
  decrement?: number;
}

/**
 * Fonction pour broadcaster un message à un utilisateur spécifique
 */
export async function broadcastToUser(
  userId: number,
  payload: SSEPayload
): Promise<void> {
  const writers = clients.get(userId);
  if (!writers || writers.size === 0) return;

  const text = `data: ${JSON.stringify(payload)}\n\n`;
  const deadWriters: WritableStreamDefaultWriter[] = [];

  for (const writer of writers) {
    try {
      await writer.write(new TextEncoder().encode(text));
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'envoi SSE à l'utilisateur ${userId}:`,
        error
      );
      deadWriters.push(writer);
    }
  }

  // Nettoyer les writers morts
  deadWriters.forEach((writer) => {
    writers.delete(writer);
  });
}

/**
 * Fonction pour broadcaster un message à tous les utilisateurs connectés
 */
export async function broadcastAll(payload: SSEPayload): Promise<void> {
  const text = `data: ${JSON.stringify(payload)}\n\n`;

  for (const [userId, writers] of clients.entries()) {
    const deadWriters: WritableStreamDefaultWriter[] = [];

    for (const writer of writers) {
      try {
        await writer.write(new TextEncoder().encode(text));
      } catch (error) {
        console.error(
          `❌ Erreur lors de l'envoi SSE à l'utilisateur ${userId}:`,
          error
        );
        deadWriters.push(writer);
      }
    }

    // Nettoyer les writers morts
    deadWriters.forEach((writer) => {
      writers.delete(writer);
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const userIdParam = req.query.userId;
  const userId = userIdParam ? Number(userIdParam) : null;

  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  // Configurer les headers pour SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Désactiver la mise en buffer de Nginx

  // Créer un writer pour ce client
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Ajouter le client à la liste
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(writer);

  console.log(`🔔 Client SSE connecté pour l'utilisateur ${userId}`);

  // Envoyer les notifications non lues à la connexion
  // Compter les notifications avec contenu "Non Ouvert" (notifications non lues)
  try {
    if (prisma) {
      // IMPORTANT: Filtrer UNIQUEMENT les notifications "Non Ouvert" pour cet utilisateur spécifique
      // Le filtre fkUtilisateur = BigInt(userId) garantit que seules les notifications de cet utilisateur sont retournées
      const notifs = await (prisma as any).notifications.findMany({
        where: {
          fkUtilisateur: BigInt(userId), // Filtrer strictement par fkUtilisateur = userId connecté
          contenu: {
            contains: 'Non Ouvert', // Filtrer par contenu "Non Ouvert"
          },
        },
        orderBy: { datecreate: 'desc' },
      });

      console.log(
        `📊 Stream INIT: ${notifs.length} notification(s) "Non Ouvert" trouvée(s) pour l'utilisateur ${userId} (fkUtilisateur=${userId})`
      );

      const payload: SSEPayload = {
        type: 'INIT',
        count: notifs.length,
        items: notifs.map((n: any) => ({
          id: String(n.id),
          fkUtilisateur: Number(n.fkUtilisateur), // Inclure fkUtilisateur pour vérification côté client
          sujet: n.sujet,
          contenu: n.contenu,
          statut: n.statut,
          datecreate: n.datecreate?.toISOString(),
        })),
      };

      await writer.write(
        new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
      );
    }
  } catch (error) {
    console.error(
      '❌ Erreur lors de la récupération des notifications:',
      error
    );
  }

  // Keep-alive: envoyer un PING toutes les 25 secondes
  const keepAliveInterval = setInterval(async () => {
    try {
      await writer.write(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'PING' })}\n\n`
        )
      );
    } catch (error) {
      clearInterval(keepAliveInterval);
    }
  }, 25000);

  // Nettoyer lors de la déconnexion
  const cleanup = () => {
    clearInterval(keepAliveInterval);
    if (userId && clients.has(userId)) {
      clients.get(userId)!.delete(writer);
      if (clients.get(userId)!.size === 0) {
        clients.delete(userId);
      }
    }
    try {
      writer.close();
    } catch (error) {
      // Ignorer les erreurs de fermeture
    }
    console.log(`🔔 Client SSE déconnecté pour l'utilisateur ${userId}`);
  };

  // Gérer la déconnexion du client
  req.on('close', cleanup);
  req.on('aborted', cleanup);

  // Streamer la réponse
  res.status(200);

  // Lire depuis le stream et envoyer au client
  stream.readable
    .pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          cleanup();
          res.end();
        },
      })
    )
    .catch((error) => {
      console.error('❌ Erreur lors du streaming SSE:', error);
      cleanup();
      res.end();
    });
}
