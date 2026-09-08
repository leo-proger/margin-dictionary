import { normalizeWord } from './dictionary/word';

export const MENU_ID = 'margin-dictionary';

export function registerContextMenu() {
  let pendingWord: string | null = null;

  browser.runtime.onInstalled.addListener(async () => {
    await browser.menus.removeAll();
    browser.menus.create({ id: MENU_ID, title: 'Open Margin Dictionary', contexts: ['page', 'selection'] });
  });

  browser.menus.onShown.addListener(info => {
    const word = info.editable ? null : normalizeWord(info.selectionText);
    void browser.menus.update(MENU_ID, {
      title: word ? 'Define “%s” with Margin Dictionary' : 'Open Margin Dictionary',
    }).then(() => browser.menus.refresh());
  });

  browser.menus.onClicked.addListener(info => {
    if (info.menuItemId !== MENU_ID) return;
    pendingWord = info.editable ? null : normalizeWord(info.selectionText);
    // Firefox 142–148 require this call to happen synchronously inside the
    // user-action handler. The popup consumes pendingWord once it has opened.
    void browser.action.openPopup().catch(() => { pendingWord = null; });
  });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (sender.id !== browser.runtime.id || !message || typeof message !== 'object') return;
    if ((message as { type?: string }).type !== 'consume-context-word') return;
    const word = pendingWord;
    pendingWord = null;
    return Promise.resolve({ word });
  });
}
