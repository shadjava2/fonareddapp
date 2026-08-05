export type NdjsonHandler = (event: Record<string, unknown>) => void | Promise<void>;

/**
 * Consomme une réponse fetch en NDJSON (une ligne JSON par événement).
 * Retourne le dernier événement `type: 'done'` ou lève une erreur.
 */
export async function consumeNdjsonStream(
  response: Response,
  onEvent: NdjsonHandler
): Promise<Record<string, unknown>> {
  if (!response.body) {
    throw new Error('Réponse streaming sans corps');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (evt.type === 'error') {
        throw new Error(String(evt.error || 'Erreur serveur'));
      }
      await onEvent(evt);
      if (evt.type === 'done') {
        finalResult = evt;
      }
    }
  }

  if (!finalResult?.ok) {
    throw new Error('Opération interrompue ou sans résultat final');
  }
  return finalResult;
}
