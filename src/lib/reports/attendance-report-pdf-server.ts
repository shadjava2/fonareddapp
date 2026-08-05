import type { ReactElement } from 'react';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function renderAttendancePdfBuffer(
  element: ReactElement
): Promise<Buffer> {
  const { pdf } = await import('@react-pdf/renderer');
  const instance = pdf(element);
  const fileStream = await instance.toBuffer();
  return streamToBuffer(fileStream);
}

export async function renderMonthlyPresencePdfBuffer(
  element: ReactElement
): Promise<Buffer> {
  const { pdf } = await import('@react-pdf/renderer');
  const instance = pdf(element);
  const fileStream = await instance.toBuffer();
  return streamToBuffer(fileStream);
}
