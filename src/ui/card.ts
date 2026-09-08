import type { EntryGroup, LookupError, LookupResult } from '../dictionary/types';
import { dictionaryUrl } from '../dictionary/word';
import { icon } from './icons';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

const errors: Record<LookupError, [string, string]> = {
  invalid: ['One word at a time', 'Select an English word, including words with a hyphen or apostrophe.'],
  'not-found': ['A word still to discover', 'Cambridge has no exact match. Check the spelling or explore the dictionary.'],
  blocked: ['Cambridge needs a moment', 'The dictionary is limiting access. Try again later or open the article on Cambridge.'],
  'rate-limited': ['A little breathing room', 'There have been too many requests. Wait a moment, then try again.'],
  network: ['Couldn’t reach the dictionary', 'Check your connection and try again. Your place on the page is safe.'],
  timeout: ['Taking longer than usual', 'Cambridge didn’t respond in time. Try looking up this word again.'],
  unavailable: ['This entry can’t be displayed', 'Cambridge returned an unfamiliar page. You can read the original article below.'],
};

interface CardOptions {
  lookup: (word: string) => Promise<LookupResult>;
  play: (url: string) => Promise<{ ok: boolean }>;
  stop: () => void;
  onClose?: () => void;
  onResize?: () => void;
}

export class DictionaryCard {
  readonly element = el('section', 'card');
  private readonly body = el('div', 'card-body');
  private readonly source = el('a', 'source-link');
  private readonly status = el('span', 'sr-only');
  private readonly closeButton: HTMLButtonElement | undefined;
  private version = 0;
  private word = '';

  constructor(private readonly options: CardOptions) {
    this.element.setAttribute('lang', 'en');
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-label', 'English dictionary');
    const header = el('header', 'card-top');
    const brand = el('span', 'brand');
    brand.append(icon('book'), el('span', '', 'margin'));
    header.append(brand, el('span', 'eyebrow', 'ENGLISH DICTIONARY'));
    if (options.onClose) {
      this.closeButton = el('button', 'icon-button');
      this.closeButton.type = 'button';
      this.closeButton.setAttribute('aria-label', 'Close dictionary');
      this.closeButton.title = 'Close · Esc';
      this.closeButton.append(icon('close'));
      this.closeButton.addEventListener('click', options.onClose);
      header.append(this.closeButton);
    }
    this.body.tabIndex = 0;
    this.body.setAttribute('aria-label', 'Dictionary entry');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    const footer = el('footer', 'card-footer');
    this.source.target = '_blank';
    this.source.rel = 'noopener noreferrer';
    this.source.append(el('span', '', 'Cambridge Dictionary'), icon('arrow'));
    footer.append(this.source, el('span', 'footer-note', 'A little more clarity.'));
    this.element.append(header, this.body, footer, this.status);
    this.empty();
  }

  empty() {
    this.source.href = 'https://dictionary.cambridge.org/';
    const state = el('div', 'empty-state');
    const mark = el('div', 'empty-mark');
    mark.append(icon('leaf'));
    state.append(mark, el('h1', '', 'Stay curious.'), el('p', '', 'A new word. A little more understanding.\nLook it up without losing your place.'));
    this.body.replaceChildren(state);
  }

  focus() { (this.closeButton ?? this.body).focus({ preventScroll: true }); }

  cancel() {
    this.version++;
    this.options.stop();
  }

  async show(word: string) {
    this.options.stop();
    this.word = word;
    const current = ++this.version;
    this.source.href = dictionaryUrl(word);
    this.body.setAttribute('aria-busy', 'true');
    this.status.textContent = `Looking up ${word}`;
    const loading = el('div', 'loading-state');
    loading.append(el('h1', 'headword', word), el('p', 'loading-label', 'Opening the dictionary…'));
    for (const width of ['45%', '100%', '90%', '65%']) {
      const line = el('div', 'skeleton');
      line.style.width = width;
      loading.append(line);
    }
    this.body.replaceChildren(loading);
    this.body.scrollTop = 0;
    this.options.onResize?.();
    let result: LookupResult;
    try { result = await this.options.lookup(word); }
    catch { result = { ok: false, error: 'network' }; }
    if (current !== this.version) return;
    this.body.removeAttribute('aria-busy');
    if (!result.ok) {
      this.showError(result.error);
    } else {
      this.body.replaceChildren();
      this.body.append(el('h1', 'headword', result.entry.word));
      if (result.entry.word.toLowerCase() !== word) this.body.append(el('p', 'query-note', `Entry for “${word}”`));
      for (const [index, group] of result.entry.groups.entries()) this.body.append(this.renderGroup(group, index));
      this.status.textContent = `Definitions for ${result.entry.word} are ready`;
    }
    this.options.onResize?.();
  }

  private showError(error: LookupError) {
    const [title, description] = errors[error];
    const state = el('div', 'error-state');
    const mark = el('div', 'empty-mark');
    mark.append(icon('book'));
    state.append(el('div', 'error-query', this.word), mark, el('h2', '', title), el('p', '', description));
    if (error !== 'invalid' && error !== 'not-found') {
      const retry = el('button', 'retry-button');
      retry.type = 'button';
      retry.append(icon('retry'), el('span', '', 'Try again'));
      retry.addEventListener('click', () => void this.show(this.word));
      state.append(retry);
    }
    this.body.replaceChildren(state);
    this.status.textContent = title;
  }

  private renderGroup(group: EntryGroup, index: number) {
    const section = el('section', 'entry-group');
    if (index && group.word !== this.body.querySelector('h1')?.textContent) section.append(el('h2', 'related-headword', group.word));
    const meta = el('div', 'entry-meta');
    if (group.partOfSpeech) meta.append(el('span', 'part-of-speech', group.partOfSpeech));
    if (group.grammar) meta.append(el('span', 'grammar', group.grammar));
    if (group.usage) meta.append(el('span', 'usage', group.usage));
    section.append(meta);
    const pronunciations = el('div', 'pronunciations');
    for (const pronunciation of group.pronunciations) {
      const item = el('div', 'pronunciation');
      item.append(el('span', 'region', pronunciation.region), el('span', 'ipa', pronunciation.ipa ? `/${pronunciation.ipa}/` : ''));
      if (pronunciation.audio) {
        const sound = el('button', 'sound-button');
        sound.type = 'button';
        sound.setAttribute('aria-label', `Play ${pronunciation.region} pronunciation`);
        sound.title = `Listen · ${pronunciation.region}`;
        sound.append(icon('sound'));
        sound.addEventListener('click', async () => {
          sound.disabled = true;
          let success = false;
          try { success = (await this.options.play(pronunciation.audio!)).ok; } catch { /* Inline feedback below. */ }
          sound.disabled = false;
          if (!success && sound.isConnected) {
            this.status.textContent = 'Audio unavailable. Try the pronunciation on Cambridge.';
            sound.title = 'Audio unavailable — listen on Cambridge';
            let note = section.querySelector('.audio-error');
            if (!note) { note = el('p', 'audio-error', 'Audio unavailable. Listen on Cambridge below.'); pronunciations.after(note); }
          }
        });
        item.append(sound);
      }
      pronunciations.append(item);
    }
    if (pronunciations.childNodes.length) section.append(pronunciations);
    const list = el('ol', 'senses');
    for (const [i, sense] of group.senses.entries()) {
      const row = el('li', 'sense');
      row.append(el('span', 'sense-number', String(i + 1).padStart(2, '0')));
      const content = el('div', 'sense-content');
      if (sense.level || sense.label) {
        const labels = el('div', 'sense-labels');
        if (sense.level) labels.append(el('span', 'level', sense.level));
        if (sense.label) labels.append(el('span', 'sense-label', sense.label.toLowerCase()));
        content.append(labels);
      }
      content.append(el('p', 'definition', sense.definition));
      for (const example of sense.examples) content.append(el('blockquote', 'example', example));
      row.append(content);
      list.append(row);
    }
    section.append(list);
    return section;
  }
}
