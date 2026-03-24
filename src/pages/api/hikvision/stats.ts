import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

export interface DeviceCapacityStats {
  person: number;
  face: number;
  card: number;
  fingerprint: number;
  event: number;
}

/** Types FDLib considérés comme "visage" vs "empreinte" */
const FACE_LIB_TYPES = ['blackFD', 'whiteFD', 'faceFD'];
const FINGER_LIB_TYPES = ['infraredFD', 'fingerFD', 'fingerprintFD', 'FP'];

/**
 * Statistiques séparées : Person, Face, Card, FingerPrint, Event.
 * - Person, Card, Event : depuis la base (données importées/synchronisées).
 * - Face, Fingerprint : depuis le lecteur (FDLib totalMatches) si disponible.
 * - Card : base ; si 0, on peut tenter un comptage appareil (CardInfo) pour affichage.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  try {
    const [person, card, event] = await Promise.all([
      prisma.acs_users.count(),
      prisma.acs_cards.count(),
      prisma.acs_events.count(),
    ]);

    let face = 0;
    let fingerprint = 0;
    let deviceCardCount: number | null = null;

    try {
      const config = await getHikvisionConfig();
      const digestService = new HikvisionDigestService({
        ip: config.ip,
        username: config.username,
        password: config.password,
        port: config.port,
        useHttps: false,
        timezone_offset_minutes: config.timezone_offset_minutes ?? undefined,
      });

      // 1) Récupérer les bibliothèques FDLib depuis l'appareil
      let libs: { faceLibType?: string; FDID?: string }[] = [];
      try {
        const libRes = await digestService.hikGetJSON('/ISAPI/Intelligent/FDLib?format=json');
        if (libRes?.FDLibList?.FDLib) {
          const l = libRes.FDLibList.FDLib;
          libs = Array.isArray(l) ? l : [l];
        } else if (libRes?.FDLib) {
          libs = Array.isArray(libRes.FDLib) ? libRes.FDLib : [libRes.FDLib];
        } else if (libRes?.data?.FDLib) {
          const l = libRes.data.FDLib;
          libs = Array.isArray(l) ? l : [l];
        }
      } catch {
        // repli sur libs par défaut
      }
      if (libs.length === 0) {
        libs = [
          { faceLibType: 'blackFD', FDID: '1' },
          { faceLibType: 'infraredFD', FDID: '2' },
        ];
      }

      for (const lib of libs) {
        const faceLibType = String(lib?.faceLibType ?? lib?.FaceLibType ?? '').trim();
        const fdId = String(lib?.FDID ?? lib?.fdId ?? '1').trim();
        if (!faceLibType) continue;
        try {
          const data = await digestService.hikPostJSON(
            '/ISAPI/Intelligent/FDLib/FDSearch?format=json',
            {
              searchResultPosition: 0,
              maxResults: 1,
              faceLibType,
              FDID: fdId,
            }
          );
          const total =
            data?.totalMatches ?? data?.FDSearchResult?.totalMatches ?? 0;
          const n = Number(total) || 0;
          const lower = faceLibType.toLowerCase();
          if (FINGER_LIB_TYPES.some((t) => lower.includes(t.toLowerCase()))) {
            fingerprint += n;
          } else {
            face += n;
          }
        } catch {
          // ignorer si endpoint indisponible
        }
      }

      // 2) Optionnel : comptage cartes côté appareil (CardInfo)
      try {
        const cardRes = await digestService.hikGetJSON(
          '/ISAPI/AccessControl/CardInfo/Search?format=json'
        );
        const cardList = cardRes?.CardInfoSearchResult?.CardInfo ?? cardRes?.CardInfo;
        if (Array.isArray(cardList)) {
          deviceCardCount = cardList.length;
        } else if (cardList && typeof cardList === 'object') {
          deviceCardCount = 1;
        }
        const totalCard = cardRes?.totalMatches ?? cardRes?.totalCount;
        if (totalCard != null && typeof totalCard === 'number') {
          deviceCardCount = totalCard;
        }
      } catch {
        // appareil peut ne pas supporter CardInfo (ex. DS-K1T)
      }
    } catch {
      face = person;
      fingerprint = person;
    }

    const stats: DeviceCapacityStats = {
      person,
      face,
      card: card > 0 ? card : (deviceCardCount ?? 0),
      fingerprint,
      event,
    };

    return res.status(200).json({
      success: true,
      stats,
      message: 'Statistiques Person / Face / Card / FingerPrint / Event',
    });
  } catch (error: any) {
    console.error('❌ Erreur stats Hikvision:', error);
    return res.status(500).json({
      success: false,
      message: error?.message ?? 'Erreur lors du chargement des statistiques',
    });
  }
}
