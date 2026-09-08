export interface Pronunciation {
  region: 'UK' | 'US';
  ipa: string;
  audio?: string;
}

export interface Sense {
  definition: string;
  examples: string[];
  level: string;
  label: string;
}

export interface EntryGroup {
  word: string;
  partOfSpeech: string;
  grammar: string;
  usage: string;
  pronunciations: Pronunciation[];
  senses: Sense[];
}

export interface DictionaryEntry {
  word: string;
  query: string;
  url: string;
  groups: EntryGroup[];
}

export type LookupError = 'invalid' | 'not-found' | 'blocked' | 'rate-limited' | 'network' | 'timeout' | 'unavailable';
export type LookupResult = { ok: true; entry: DictionaryEntry } | { ok: false; error: LookupError };
