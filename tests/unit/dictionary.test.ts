import { describe, expect, it, vi } from 'vitest';
import { normalizeWord } from '../../src/dictionary/word';
import { parseCambridge } from '../../src/dictionary/parser';
import { createProvider } from '../../src/dictionary/provider';
import { article } from '../fixtures/cambridge';

describe('word selection', () => {
  it.each([[' “Hello!” ', 'hello'], ['DON’T', "don't"], ['well-being', 'well-being'], ['I', 'i'], ['café', 'café']])('normalizes %s', (raw, expected) => {
    expect(normalizeWord(raw)).toBe(expected);
  });
  it.each(['', 'two words', 'https://test.com', 'hello123', 'слово', 'a\nb', 'a'.repeat(65), '<script>', '---', null, 42])('ignores invalid selection %s', raw => {
    expect(normalizeWord(raw)).toBeNull();
  });
});

describe('Cambridge parser', () => {
  it('keeps meanings, examples, IPA and part of speech without mixing related words', () => {
    const entry = parseCambridge(article, 'lucid');
    expect(entry.word).toBe('lucid');
    expect(entry.groups).toHaveLength(2);
    expect(entry.groups[0].senses).toHaveLength(3);
    expect(entry.groups[0].senses[0]).toMatchObject({ definition: 'expressed with clarity', level: 'C2', label: 'CLEAR', examples: ['Her explanation made the idea easy to follow.'] });
    expect(entry.groups[0].senses[2].label).toBe('lucid dream');
    expect(entry.groups[1].word).toBe('lucidity');
    expect(entry.groups[0].pronunciations[0].audio).toBe('https://dictionary.cambridge.org/media/english/uk_pron/l/luc/lucid.mp3');
  });
  it('rejects absent entries instead of reading sidebar definitions', () => {
    expect(() => parseCambridge('<title>Dictionary</title><div class="def ddef_d">sidebar</div>', 'x')).toThrow();
  });
  it('identifies challenge pages', () => {
    expect(() => parseCambridge('<title>Just a moment...</title><div id="challenge-platform"></div>', 'x')).toThrow('blocked');
  });
  it('discards untrusted audio URLs and never retains markup', () => {
    const result = parseCambridge(article.replace('/media/english/uk_pron/l/luc/lucid.mp3', 'https://evil.test/audio.mp3').replace('clarity</a>', 'clarity</a><script>alert(1)</script>'), 'lucid');
    expect(result.groups[0].pronunciations[0].audio).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('alert');
    expect(JSON.stringify(result)).not.toContain('<script>');
  });
});

describe('dictionary provider', () => {
  it('deduplicates concurrent lookups and caches successful results', async () => {
    const fetcher = vi.fn(async () => new Response(article));
    const lookup = createProvider(fetcher);
    const results = await Promise.all([lookup('lucid'), lookup('LUCID')]);
    expect(results[0].ok).toBe(true);
    expect(results[1]).toEqual(results[0]);
    await lookup('lucid');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toEqual([expect.stringContaining('/english/lucid'), expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' })]);
  });
  it.each([[404, 'not-found'], [403, 'blocked'], [429, 'rate-limited'], [503, 'network']])('handles HTTP %s', async (status, error) => {
    expect(await createProvider(async () => new Response('', { status }))('lucid')).toMatchObject({ ok: false, error });
  });
  it('does not cache failures; retry can succeed', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(new Response(article));
    const lookup = createProvider(fetcher);
    expect(await lookup('lucid')).toMatchObject({ ok: false, error: 'network' });
    expect(await lookup('lucid')).toMatchObject({ ok: true });
  });
  it('rejects invalid requests before accessing the network', async () => {
    const fetcher = vi.fn();
    expect(await createProvider(fetcher)('../bad')).toMatchObject({ ok: false, error: 'invalid' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reports changed markup distinctly', async () => {
    expect(await createProvider(async () => new Response('<title>Cambridge Dictionary</title>'))('lucid')).toMatchObject({ ok: false, error: 'unavailable' });
  });
});
