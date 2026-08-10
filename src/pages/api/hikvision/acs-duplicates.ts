import { requireApiPermissions } from '@/lib/api-auth';
import {
  listAcsDuplicateGroups,
  mergeAcsDuplicates,
} from '@/lib/hikvision/acs-user-duplicates';
import { PERMISSIONS } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';

const AUTH = [
  PERMISSIONS.PRESENCE_MANAGE,
  PERMISSIONS.PRESENCE_VIEW,
  PERMISSIONS.MODULE_PERSONNEL,
  PERMISSIONS.MODULE_ADMIN,
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authUser = await requireApiPermissions(req, res, AUTH);
  if (!authUser) return;

  try {
    if (req.method === 'GET') {
      const search = String(req.query.search || '').trim();
      const groups = await listAcsDuplicateGroups({ search });
      return res.status(200).json({
        success: true,
        count: groups.length,
        groups,
      });
    }

    if (req.method === 'POST') {
      const { keepEmployeeNo, mergeEmployeeNos } = req.body || {};
      if (!keepEmployeeNo || !Array.isArray(mergeEmployeeNos)) {
        return res.status(400).json({
          success: false,
          message: 'keepEmployeeNo et mergeEmployeeNos[] requis',
        });
      }
      const result = await mergeAcsDuplicates({
        keepEmployeeNo: String(keepEmployeeNo),
        mergeEmployeeNos: mergeEmployeeNos.map(String),
      });
      return res.status(200).json({
        success: true,
        message: `Fusion terminée vers « ${result.keepEmployeeNo} »`,
        result,
      });
    }

    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  } catch (e: any) {
    console.error('acs-duplicates:', e);
    return res.status(500).json({
      success: false,
      message: e?.message || 'Erreur serveur',
    });
  }
}
