import { normalizeWord } from './dictionary/word';

export const MENU_ID = 'margin-dictionary';

export function registerContextMenu() {
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

  browser.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID) return;
    // Zen can omit the tab argument for a native page-menu command.
    const targetTab = Number.isInteger(tab?.id) && tab!.id! >= 0 ? tab : (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    const tabId = Number.isInteger(targetTab?.id) && targetTab!.id! >= 0 ? targetTab!.id : undefined;
    const word = normalizeWord(info.selectionText);
    if (word && !info.editable && tabId !== undefined) {
      try {
        const response = await browser.tabs.sendMessage(tabId, { type: 'lookup-context', word }, { frameId: info.frameId ?? 0 });
        if (response?.opened) return;
      } catch { /* Protected pages do not allow a content script. Use toolbar search. */ }
    }
    const scope = tabId === undefined ? {} : { tabId };
    await browser.action.setPopup({ ...scope, popup: word && !info.editable ? `popup.html?word=${encodeURIComponent(word)}` : 'popup.html' });
    try { await browser.action.openPopup(); }
    finally { await browser.action.setPopup({ ...scope, popup: 'popup.html' }); }
  });
}
