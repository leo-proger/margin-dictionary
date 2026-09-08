import { parseCambridge } from './parser';
import { dictionaryUrl, normalizeWord } from './word';
import type { LookupError, LookupResult } from './types';

const MAX_BYTES = 2_000_000;
const CACHE_TTL = 10 * 60_000;

async function readHtml(response: Response): Promise<string> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('unavailable');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let html = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new Error('unavailable');
      }
      html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
  } finally { reader.releaseLock(); }
}

export function createProvider(fetcher: typeof fetch = fetch): (input: string) => Promise<LookupResult> {
  const cache = new Map<string, { result: LookupResult; expires: number }>();
  const pending = new Map<string, Promise<LookupResult>>();
  async function request(word: string): Promise<LookupResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetcher(dictionaryUrl(word), {
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) {
        const error: LookupError = response.status === 404 ? 'not-found' : [401, 403].includes(response.status) ? 'blocked' : response.status === 429 ? 'rate-limited' : 'network';
        return { ok: false, error };
      }
      // Cambridge redirects unknown words to search/spellcheck pages.
      if (response.url && new URL(response.url).pathname.startsWith('/spellcheck/')) return { ok: false, error: 'not-found' };
      const result: LookupResult = { ok: true, entry: parseCambridge(await readHtml(response), word) };
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(word, { result, expires: Date.now() + CACHE_TTL });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const known = ['blocked', 'not-found', 'unavailable'] as const;
      return { ok: false, error: controller.signal.aborted ? 'timeout' : known.includes(message as typeof known[number]) ? message as LookupError : 'network' };
    } finally { clearTimeout(timer); }
  }
  return async input => {
    const word = normalizeWord(input);
    if (!word) return { ok: false, error: 'invalid' };
    const cached = cache.get(word);
    if (cached && cached.expires > Date.now()) return cached.result;
    cache.delete(word);
    if (pending.has(word)) return pending.get(word)!;
    if (pending.size >= 4) return { ok: false, error: 'rate-limited' };
    const promise = request(word).finally(() => pending.delete(word));
    pending.set(word, promise);
    return promise;
  };
}
