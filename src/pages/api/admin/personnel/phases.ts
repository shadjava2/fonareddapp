import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

function formatRow(row: any) {
  const result: any = {};
  for (const key in row) {
    const val = row[key];
    if (typeof val === 'bigint') {
      result[key] = String(val);
    } else if (val instanceof Date) {
      result[key] = val.toISOString();
    } else {
      result[key] = val;
    }
  }
  return result;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!prisma) {
    return res.status(500).json({
      success: false,
      message: 'Prisma non initialisé',
    });
  }

  const model = (prisma as any).congephase;
  if (!model) {
    // Si le modèle n'existe pas, retourner des phases par défaut avec les vraies désignations
    return res.status(200).json([
      { id: '1', designation: 'REMPLACANT(E)' },
      { id: '2', designation: 'ADMINISTRATION' },
      { id: '3', designation: 'VISA SUPERVISEUR' },
      { id: '4', designation: 'APPROBATION COORDINA' },
      { id: '5', designation: 'APPROBATION COORDINA' },
    ]);
  }

  try {
    if (req.method === 'GET') {
      const phases = await model.findMany({
        orderBy: { id: 'asc' },
      });

      const data = phases.map(formatRow);

      return res.status(200).json(data);
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ API phases erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error:
        process.env.NODE_ENV === 'development'
          ? `${error?.message || 'Erreur inconnue'}`
          : undefined,
    });
  }
}
