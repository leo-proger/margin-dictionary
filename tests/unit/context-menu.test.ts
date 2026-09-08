import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MENU_ID, registerContextMenu } from '../../src/context-menu';

describe('context menu', () => {
  let installed: () => Promise<void>;
  let shown: (info: Record<string, unknown>) => void;
  let clicked: (info: Record<string, unknown>, tab?: { id: number }) => Promise<void>;
  let api: any;
  beforeEach(() => {
    api = {
      runtime: { onInstalled: { addListener: (fn: typeof installed) => { installed = fn; } } },
      menus: {
        create: vi.fn(), removeAll: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined), refresh: vi.fn(),
        onShown: { addListener: (fn: typeof shown) => { shown = fn; } },
        onClicked: { addListener: (fn: typeof clicked) => { clicked = fn; } },
      },
      tabs: { sendMessage: vi.fn().mockResolvedValue({ opened: true }), query: vi.fn().mockResolvedValue([{ id: 2 }]) },
      action: { setPopup: vi.fn().mockResolvedValue(undefined), openPopup: vi.fn().mockResolvedValue(undefined) },
    };
    vi.stubGlobal('browser', api);
    registerContextMenu();
  });
  afterEach(() => vi.unstubAllGlobals());
  it('registers a page and selection menu on install', async () => {
    await installed();
    expect(api.menus.create).toHaveBeenCalledWith(expect.objectContaining({ id: MENU_ID, contexts: ['page', 'selection'] }));
  });
  it('labels valid words and keeps arbitrary selections as manual search', () => {
    shown({ selectionText: 'LUCID' });
    expect(api.menus.update).toHaveBeenLastCalledWith(MENU_ID, { title: 'Define “%s” with Margin Dictionary' });
    shown({ selectionText: 'two words' });
    expect(api.menus.update).toHaveBeenLastCalledWith(MENU_ID, { title: 'Open Margin Dictionary' });
  });
  it('targets only the frame where the user opened the menu', async () => {
    await clicked({ menuItemId: MENU_ID, selectionText: 'LUCID', frameId: 7 }, { id: 2 });
    expect(api.tabs.sendMessage).toHaveBeenCalledWith(2, { type: 'lookup-context', word: 'lucid' }, { frameId: 7 });
    expect(api.action.openPopup).not.toHaveBeenCalled();
  });
  it('opens a prefilled toolbar popup on protected pages', async () => {
    api.tabs.sendMessage.mockRejectedValue(new Error('No content script'));
    await clicked({ menuItemId: MENU_ID, selectionText: 'lucid' }, { id: 2 });
    expect(api.action.setPopup).toHaveBeenNthCalledWith(1, { tabId: 2, popup: 'popup.html?word=lucid' });
    expect(api.action.openPopup).toHaveBeenCalledOnce();
    expect(api.action.setPopup).toHaveBeenLastCalledWith({ tabId: 2, popup: 'popup.html' });
  });
  it('resolves the active tab when Zen omits the menu event tab', async () => {
    await clicked({ menuItemId: MENU_ID, selectionText: 'lucid', frameId: 0 });
    expect(api.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(api.tabs.sendMessage).toHaveBeenCalledWith(2, { type: 'lookup-context', word: 'lucid' }, { frameId: 0 });
  });
  it('rejects a null tab ID from native menu events', async () => {
    await clicked({ menuItemId: MENU_ID, selectionText: 'lucid', frameId: 0 }, { id: null as unknown as number });
    expect(api.tabs.sendMessage).toHaveBeenCalledWith(2, { type: 'lookup-context', word: 'lucid' }, { frameId: 0 });
  });
  it('opens global toolbar search when Zen exposes no active tab', async () => {
    api.tabs.query.mockResolvedValue([]);
    await clicked({ menuItemId: MENU_ID, selectionText: 'lucid' });
    expect(api.action.setPopup).toHaveBeenNthCalledWith(1, { popup: 'popup.html?word=lucid' });
    expect(api.action.openPopup).toHaveBeenCalledOnce();
    expect(api.action.setPopup).toHaveBeenLastCalledWith({ popup: 'popup.html' });
  });
  it.each([{}, { selectionText: 'two words' }, { selectionText: 'secret', editable: true }])('opens manual search without transmitting invalid or editable selections', async info => {
    await clicked({ menuItemId: MENU_ID, ...info }, { id: 2 });
    expect(api.tabs.sendMessage).not.toHaveBeenCalled();
    expect(api.action.setPopup).toHaveBeenCalledWith({ tabId: 2, popup: 'popup.html' });
    expect(api.action.openPopup).toHaveBeenCalledOnce();
  });
  it('restores the normal popup if opening fails', async () => {
    api.action.openPopup.mockRejectedValue(new Error('Window closed'));
    await expect(clicked({ menuItemId: MENU_ID }, { id: 2 })).rejects.toThrow('Window closed');
    expect(api.action.setPopup).toHaveBeenLastCalledWith({ tabId: 2, popup: 'popup.html' });
  });
});
