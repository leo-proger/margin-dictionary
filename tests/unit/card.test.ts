import { describe, expect, it, vi } from 'vitest';
import { DictionaryCard } from '../../src/ui/card';
import type { LookupResult } from '../../src/dictionary/types';

const result = (word: string): LookupResult => ({ ok: true, entry: {
  word, query: word, url: 'https://dictionary.cambridge.org/dictionary/english/lucid',
  groups: [{ word, partOfSpeech: 'adjective', usage: '', grammar: '', pronunciations: [],
    senses: [{ definition: '<img src=x onerror=alert(1)>', examples: ['<script>unsafe()</script>'], label: '', level: '' }],
  }],
} });

describe('dictionary card', () => {
  it('renders external strings as text, never HTML', async () => {
    const card = new DictionaryCard({ lookup: async () => result('lucid'), play: async () => ({ ok: true }), stop: vi.fn() });
    await card.show('lucid');
    expect(card.element.querySelector('img, script')).toBeNull();
    expect(card.element.querySelector('.definition')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('ignores an older lookup that completes after the new one', async () => {
    let finishFirst!: (value: LookupResult) => void;
    const lookup = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; })).mockResolvedValue(result('new'));
    const card = new DictionaryCard({ lookup, play: async () => ({ ok: true }), stop: vi.fn() });
    const old = card.show('old');
    await card.show('new');
    finishFirst(result('old'));
    await old;
    expect(card.element.querySelector('h1')?.textContent).toBe('new');
  });
});
