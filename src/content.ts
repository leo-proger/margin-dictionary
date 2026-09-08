import { normalizeWord } from './dictionary/word';
import { DictionaryCard, el } from './ui/card';
import { icon } from './ui/icons';
import styles from './ui/styles.css';

const host = document.createElement('margin-dictionary');
host.setAttribute('popover', 'manual');
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = styles;
const launcher = el('button', 'launcher');
launcher.type = 'button';
launcher.hidden = true;
launcher.append(icon('book'), el('span', '', 'Define'));
launcher.setAttribute('aria-label', 'Define selected word');
launcher.title = 'Look up in Cambridge · Alt+Shift+D';
let selected: { word: string; range: Range } | undefined;
let isOpen = false;
let priorFocus: HTMLElement | undefined;
let selectionTimer: ReturnType<typeof setTimeout>;
let frame = 0;

const stop = () => { void browser.runtime.sendMessage({ type: 'stop-audio' }).catch(() => {}); };
const card = new DictionaryCard({
  lookup: word => browser.runtime.sendMessage({ type: 'lookup', word }),
  play: url => browser.runtime.sendMessage({ type: 'play-audio', url }),
  stop,
  onClose: () => dismiss(true),
  onResize: () => schedulePosition(),
});
card.element.hidden = true;
shadow.append(style, launcher, card.element);

function mount() {
  if (!host.isConnected) document.documentElement.append(host);
  if (!host.matches(':popover-open')) host.showPopover();
}

function editable(node: Node | null): boolean {
  let element = node instanceof Element ? node : node?.parentElement;
  while (element) {
    if (element.matches('input, textarea, select, [role="textbox"], [role="searchbox"]') || (element instanceof HTMLElement && element.isContentEditable)) return true;
    element = element.parentElement ?? (element.getRootNode() as ShadowRoot).host;
  }
  return false;
}

function readSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return;
  if (editable(document.activeElement) || editable(selection.anchorNode) || editable(selection.focusNode)) return;
  if (selection.anchorNode?.getRootNode() === shadow || selection.focusNode?.getRootNode() === shadow) return;
  const word = normalizeWord(selection.toString());
  if (!word) return;
  const range = selection.getRangeAt(0).cloneRange();
  const rect = range.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  return { word, range };
}

function updateSelection() {
  if (shadow.activeElement || window.getSelection()?.anchorNode?.getRootNode() === shadow) return;
  const next = readSelection();
  if (!next) { if (!isOpen) dismiss(); return; }
  if (isOpen && selected?.word === next.word && selected.range.startContainer === next.range.startContainer && selected.range.startOffset === next.range.startOffset) return;
  if (isOpen) { card.cancel(); isOpen = false; card.element.hidden = true; }
  selected = next;
  launcher.hidden = false;
  mount();
  schedulePosition();
}

function scheduleSelection() {
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(updateSelection, 70);
}

function dismiss(restoreFocus = false) {
  clearTimeout(selectionTimer);
  if (!selected && !isOpen && launcher.hidden) return;
  card.cancel();
  launcher.hidden = true;
  card.element.hidden = true;
  isOpen = false;
  selected = undefined;
  if (host.matches(':popover-open')) host.hidePopover();
  if (restoreFocus && priorFocus?.isConnected) priorFocus.focus({ preventScroll: true });
}

function position() {
  frame = 0;
  if (!selected) return;
  if (!selected.range.startContainer.isConnected) { dismiss(); return; }
  const rects = selected.range.getClientRects();
  const anchor = rects[rects.length - 1];
  const viewport = window.visualViewport;
  const offsetX = viewport?.offsetLeft ?? 0;
  const offsetY = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  if (!anchor || anchor.bottom < offsetY || anchor.top > height + offsetY || anchor.right < offsetX || anchor.left > width + offsetX) { dismiss(); return; }
  const element = isOpen ? card.element : launcher;
  element.style.maxWidth = `${Math.max(0, width - 24)}px`;
  element.style.maxHeight = `${Math.max(0, Math.min(580, height - 24))}px`;
  const boxWidth = element.offsetWidth;
  const boxHeight = element.offsetHeight;
  const x = Math.max(offsetX + 12, Math.min(anchor.left, offsetX + width - boxWidth - 12));
  const below = anchor.bottom + 9;
  const y = below + boxHeight <= offsetY + height - 12 ? below : anchor.top - boxHeight - 9;
  element.style.left = `${x}px`;
  element.style.top = `${Math.max(offsetY + 12, Math.min(y, offsetY + height - boxHeight - 12))}px`;
}

function schedulePosition() { if (!frame) frame = requestAnimationFrame(position); }

function openCard() {
  if (!selected) return;
  clearTimeout(selectionTimer);
  priorFocus = document.activeElement instanceof HTMLElement && document.activeElement !== host ? document.activeElement : undefined;
  isOpen = true;
  launcher.hidden = true;
  card.element.hidden = false;
  mount();
  void card.show(selected.word);
  position();
  card.focus();
}

launcher.addEventListener('pointerdown', event => event.preventDefault());
launcher.addEventListener('click', openCard);
document.addEventListener('pointerup', event => { if (!event.composedPath().includes(host) && event.button === 0) scheduleSelection(); });
document.addEventListener('selectionchange', scheduleSelection);
document.addEventListener('pointerdown', event => {
  if (!event.composedPath().includes(host)) dismiss();
}, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (isOpen || !launcher.hidden)) {
    const wasInside = event.composedPath().includes(host);
    dismiss(wasInside);
    if (wasInside) { event.preventDefault(); event.stopPropagation(); }
  }
}, true);
document.addEventListener('scroll', event => {
  if (!event.composedPath().includes(host)) schedulePosition();
}, true);
window.addEventListener('resize', schedulePosition);
window.visualViewport?.addEventListener('resize', schedulePosition);
window.visualViewport?.addEventListener('scroll', schedulePosition);
window.addEventListener('pagehide', () => dismiss());
document.addEventListener('fullscreenchange', () => dismiss());
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!message || typeof message !== 'object' || (message as { type?: string }).type !== 'lookup-selection') return;
  const next = readSelection();
  if (next) { selected = next; openCard(); }
});
