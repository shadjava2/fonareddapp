import { importIvmsOriginalRecordsCsv } from '@/lib/hikvision/ivms-csv-import';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '32mb',
    },
    responseLimit: false,
  },
};

/**
 * POST /api/hikvision/import-ivms-csv
 * Body JSON : { csv | csvBase64, stream?: boolean }
 * - stream=true → NDJSON (progression ligne à ligne)
 * - sinon → JSON final
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  try {
    const body = req.body || {};
    let buf: Buffer | null = null;

    if (typeof body.csvBase64 === 'string' && body.csvBase64.trim()) {
      buf = Buffer.from(
        body.csvBase64.replace(/^data:[^;]+;base64,/, ''),
        'base64'
      );
    } else if (typeof body.csv === 'string' && body.csv.trim()) {
      buf = Buffer.from(body.csv, 'utf8');
    }

    if (!buf || buf.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Envoyez { csv: "..." } ou { csvBase64: "..." }',
      });
    }

    const wantStream =
      body.stream === true ||
      body.stream === 1 ||
      body.stream === '1' ||
      String(req.headers.accept || '').includes('ndjson');

    if (!wantStream) {
      const result = await importIvmsOriginalRecordsCsv(buf);
      return res.status(200).json({ ok: true, ...result });
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

    writeLine({ type: 'start', ok: true, message: 'Import démarré' });

    const result = await importIvmsOriginalRecordsCsv(buf, {
      progressEvery: 1,
      onProgress: async (p) => {
        writeLine({ type: 'progress', ...p });
      },
    });

    writeLine({ type: 'done', ok: true, ...result });
    res.end();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[import-ivms-csv]', message);
    if (res.headersSent) {
      res.write(`${JSON.stringify({ type: 'error', ok: false, error: message })}\n`);
      res.end();
      return;
    }
    return res.status(500).json({ ok: false, error: message });
  }
}
