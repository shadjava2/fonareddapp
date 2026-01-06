import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

function formatRow(row: any) {
  const result: any = {};
  for (const key in row) {
    const val = row[key];
    if (typeof val === 'bigint') {
      result[key] = String(val);
    } else if (val instanceof Date) {
      result[key] = val.toISOString().split('T')[0];
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

  const model = (prisma as any).calendrier;
  if (!model) {
    console.error('❌ Modèle calendrier introuvable dans Prisma');
    return res.status(500).json({
      success: false,
      message: 'Modèle calendrier introuvable. Exécutez: npx prisma generate',
    });
  }

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.max(1, parseInt(String(req.query.limit || '25'), 10));
      const skip = (page - 1) * limit;
      const search = String(req.query.search || '').trim();

      const where: any = search
        ? { OR: [{ label: { contains: search } }] }
        : {};

      const [rows, total] = await Promise.all([
        model.findMany({
          where,
          skip,
          take: limit,
          orderBy: { d: 'desc' },
        }),
        model.count({ where }),
      ]);

      const data = rows.map(formatRow);
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        success: true,
        calendrier: data,
        data: data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    if (req.method === 'POST') {
      const { d, label } = req.body || {};
      if (!d) {
        return res.status(400).json({
          success: false,
          message: 'Date requise',
        });
      }

      const date = new Date(d);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Date invalide',
        });
      }

      date.setHours(0, 0, 0, 0);

      const created = await model.create({
        data: {
          d: date,
          label: label || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Date ajoutée',
        calendrier: formatRow(created),
        data: formatRow(created),
      });
    }

    if (req.method === 'PUT') {
      const id = String(req.query.id || '');
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID requis',
        });
      }

      const { d, label } = req.body || {};
      const updateData: any = {};

      if (d) {
        const date = new Date(d);
        if (isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Date invalide',
          });
        }
        date.setHours(0, 0, 0, 0);
        updateData.d = date;
      }

      if (typeof label !== 'undefined') {
        updateData.label = label || null;
      }

      const updated = await model.update({
        where: { id: BigInt(id) },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: 'Date mise à jour',
        calendrier: formatRow(updated),
        data: formatRow(updated),
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID requis',
        });
      }

      await model.delete({
        where: { id: BigInt(id) },
      });

      return res.status(200).json({
        success: true,
        message: 'Date supprimée',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ API calendrier erreur:', error);
    console.error('❌ Message:', error?.message);
    console.error('❌ Code:', error?.code);

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
