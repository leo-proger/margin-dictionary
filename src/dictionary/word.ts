export const CAMBRIDGE_ORIGIN = 'https://dictionary.cambridge.org';

export function normalizeWord(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 100) return null;
  const word = input.normalize('NFC').trim().replace(/[’‘]/g, "'")
    .replace(/^[\s"'“”([{]+|[\s"'“”)\]},.!?;:]+$/g, '').toLowerCase();
  return word.length <= 64 && /^[a-zà-öø-ÿ]+(?:['-][a-zà-öø-ÿ]+)*$/i.test(word) ? word : null;
}

export function dictionaryUrl(word: string): string {
  return `${CAMBRIDGE_ORIGIN}/dictionary/english/${encodeURIComponent(word)}`;
}

export function safeAudioUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value, CAMBRIDGE_ORIGIN);
    if (url.origin === CAMBRIDGE_ORIGIN && url.pathname.startsWith('/media/english/') && /\.(mp3|ogg)$/.test(url.pathname) && !url.username && !url.password) return url.href;
  } catch { /* Missing or invalid audio is optional. */ }
}
