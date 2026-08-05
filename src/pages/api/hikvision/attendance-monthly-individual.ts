import { fetchMonthlyIndividualPresence } from '@/lib/hikvision/attendance-monthly-individual';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  const employeeNo = String(req.query.employee_no || '').trim();
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!employeeNo) {
    return res.status(400).json({
      success: false,
      message: 'Paramètre employee_no (ID personne) requis pour le tableau mensuel.',
    });
  }

  const data = await fetchMonthlyIndividualPresence({
    employeeNo,
    year,
    month,
  });

  if (!data) {
    return res.status(400).json({
      success: false,
      message: 'Année ou mois invalide (mois entre 1 et 12, année réaliste).',
    });
  }

  return res.status(200).json({
    success: true,
    ...data,
    message: `Présence ${String(data.month).padStart(2, '0')}/${data.year} — ${data.employeeName}`,
  });
}
