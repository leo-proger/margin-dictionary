import { normalizeWord } from './dictionary/word';
import { DictionaryCard, el } from './ui/card';
import { icon } from './ui/icons';
import styles from './ui/styles.css';

const style = el('style');
style.textContent = styles;
document.head.append(style);
const card = new DictionaryCard({
  lookup: word => browser.runtime.sendMessage({ type: 'lookup', word }),
  play: url => browser.runtime.sendMessage({ type: 'play-audio', url }),
  stop: () => { void browser.runtime.sendMessage({ type: 'stop-audio' }).catch(() => {}); },
});
card.element.setAttribute('role', 'region');
const form = el('form', 'search-form');
const field = el('div', 'search-field');
const input = el('input');
input.type = 'search';
input.placeholder = 'A word you’re curious about…';
input.setAttribute('aria-label', 'English word');
input.autocomplete = 'off';
input.spellcheck = false;
input.maxLength = 70;
const submit = el('button', 'search-submit', '↵');
submit.type = 'submit';
submit.setAttribute('aria-label', 'Look up word');
field.append(icon('search'), input, submit);
const error = el('p', 'search-error');
error.setAttribute('role', 'status');
error.hidden = true;
form.append(field, el('p', 'search-hint', 'Your word is sent to Cambridge when you look it up.'), error);
form.addEventListener('submit', event => {
  event.preventDefault();
  const word = normalizeWord(input.value);
  error.hidden = Boolean(word);
  if (!word) { error.textContent = 'Enter one English word.'; input.focus(); return; }
  void card.show(word);
});
card.element.querySelector('.card-top')!.after(form);
const tips = el('div', 'toolbar-tips');
const shortcut = el('span');
shortcut.append(el('kbd', '', 'Alt'), document.createTextNode(' + '), el('kbd', '', 'Shift'), document.createTextNode(' + '), el('kbd', '', 'D'));
tips.append(el('span', '', 'Or select a word on any webpage'), shortcut);
document.body.append(card.element, tips);
input.focus();
const initialWord = normalizeWord(new URLSearchParams(location.search).get('word'));
void browser.runtime.sendMessage({ type: 'consume-context-word' })
  .then(response => {
    const word = normalizeWord(response?.word) ?? initialWord;
    if (word) { input.value = word; void card.show(word); }
  })
  .catch(() => {
    if (initialWord) { input.value = initialWord; void card.show(initialWord); }
  });
window.addEventListener('pagehide', () => card.cancel());
