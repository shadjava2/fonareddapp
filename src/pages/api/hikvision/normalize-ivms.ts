import { normalizeIvmsAttendance } from '@/lib/hikvision/ivms-normalize';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    responseLimit: false,
  },
};

/**
 * POST/GET /api/hikvision/normalize-ivms
 * Transfère ivms_attendance (push iVMS) → acs_events / acs_users.
 * ?stream=1 → NDJSON progression.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const limitRaw = req.method === 'GET' ? req.query.limit : req.body?.limit;
  const limit = Math.min(10_000, Math.max(1, Number(limitRaw) || 2000));
  const stream =
    req.query.stream === '1' ||
    req.query.stream === 'true' ||
    String(req.headers.accept || '').includes('ndjson');

  if (!stream) {
    try {
      const result = await normalizeIvmsAttendance({ limit });
      return res.status(200).json({ ok: true, ...result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[normalize-ivms]', message);
      return res.status(500).json({ ok: false, error: message });
    }
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const writeLine = (obj: Record<string, unknown>) => {
    res.write(`${JSON.stringify(obj)}\n`);
  };

  try {
    writeLine({ type: 'start', ok: true, mode: 'normalize' });
    const result = await normalizeIvmsAttendance({
      limit,
      onProgress: async (p) => {
        writeLine({ type: 'progress', ...p });
      },
    });
    writeLine({ type: 'done', ok: true, ...result, percent: 100 });
    res.end();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[normalize-ivms stream]', message);
    writeLine({ type: 'error', ok: false, error: message });
    res.end();
  }
}
