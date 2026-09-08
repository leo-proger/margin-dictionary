import type { DictionaryEntry, EntryGroup, Pronunciation } from './types';
import { dictionaryUrl, safeAudioUrl } from './word';

function text(root: ParentNode, selector: string): string {
  return root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function parseCambridge(html: string, query: string): DictionaryEntry {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (/just a moment|access denied|attention required/i.test(doc.title) || doc.querySelector('#challenge-platform, #cf-challenge-running, form[action*="challenge"]')) {
    throw new Error('blocked');
  }
  // The inert document is never mounted. Remove non-text content before extracting.
  doc.querySelectorAll('script, style, iframe, object, template').forEach(node => node.remove());
  const groups: EntryGroup[] = [];
  const seen = new Set<string>();
  for (const root of Array.from(doc.querySelectorAll('.entry-body__el')).slice(0, 16)) {
    const header = root.querySelector('.pos-header, .dpos-h') ?? root;
    const word = text(header, '.hw, .dhw') || query;
    const partOfSpeech = text(header, '.pos, .dpos');
    const pronunciations: Pronunciation[] = [];
    for (const region of ['UK', 'US'] as const) {
      const node = header.querySelector(`.${region.toLowerCase()}.dpron-i, .${region.toLowerCase()}`);
      if (!node) continue;
      const ipa = text(node, '.ipa, .dipa');
      const audio = safeAudioUrl(node.querySelector('source[type="audio/mpeg"], source')?.getAttribute('src'));
      if (ipa || audio) pronunciations.push({ region, ipa, ...(audio ? { audio } : {}) });
    }
    const group: EntryGroup = { word, partOfSpeech, pronunciations, grammar: text(header, '.gram, .dgram'), usage: text(header, '.usage, .dusage'), senses: [] };
    for (const block of Array.from(root.querySelectorAll('.def-block, .ddef_block')).slice(0, 40)) {
      const definition = text(block, '.def, .ddef_d').replace(/:\s*$/, '');
      if (!definition) continue;
      const phrase = block.closest('.phrase-block, .dphrase-block');
      const sense = block.closest('.dsense');
      const label = (phrase ? text(phrase, '.phrase-title, .dphrase-title') : sense ? text(sense, '.guideword') : '').replace(/^\(|\)$/g, '');
      const key = [word, partOfSpeech, definition].join('\0');
      if (seen.has(key)) continue;
      seen.add(key);
      group.senses.push({
        definition,
        label,
        level: text(block, '.epp-xref'),
        examples: Array.from(block.querySelectorAll('.examp, .dexamp')).slice(0, 2)
          .map(example => text(example, '.eg, .deg') || example.textContent?.trim() || '').filter(Boolean),
      });
    }
    if (group.senses.length) groups.push(group);
  }
  if (!groups.length) {
    if (doc.querySelector('.spellcheck, .spellcheck-list, .didyoumean, .hfl-s') || /no (?:results|exact match)|did you mean/i.test(text(doc, 'h1, .hfl-s'))) throw new Error('not-found');
    throw new Error('unavailable');
  }
  return { word: groups[0].word, query, url: dictionaryUrl(query), groups };
}
