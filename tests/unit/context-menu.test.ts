import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MENU_ID, registerContextMenu } from '../../src/context-menu';

describe('context menu', () => {
  let installed: () => Promise<void>;
  let shown: (info: Record<string, unknown>) => void;
  let clicked: (info: Record<string, unknown>) => void;
  let messaged: (message: unknown, sender: { id: string }) => Promise<{ word: string | null }> | undefined;
  let api: any;

  beforeEach(() => {
    api = {
      runtime: {
        id: 'extension-id',
        onInstalled: { addListener: (fn: typeof installed) => { installed = fn; } },
        onMessage: { addListener: (fn: typeof messaged) => { messaged = fn; } },
      },
      menus: {
        create: vi.fn(), removeAll: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined), refresh: vi.fn(),
        onShown: { addListener: (fn: typeof shown) => { shown = fn; } },
        onClicked: { addListener: (fn: typeof clicked) => { clicked = fn; } },
      },
      action: { openPopup: vi.fn().mockResolvedValue(undefined) },
    };
    vi.stubGlobal('browser', api);
    registerContextMenu();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers a page and selection menu on install', async () => {
    await installed();
    expect(api.menus.create).toHaveBeenCalledWith(expect.objectContaining({ id: MENU_ID, contexts: ['page', 'selection'] }));
  });

  it('opens the toolbar popup synchronously while the menu click is a user gesture', () => {
    clicked({ menuItemId: MENU_ID, selectionText: 'lucid' });
    expect(api.action.openPopup).toHaveBeenCalledOnce();
  });

  it('labels valid words and keeps arbitrary selections as manual search', () => {
    shown({ selectionText: 'LUCID' });
    expect(api.menus.update).toHaveBeenLastCalledWith(MENU_ID, { title: 'Define “%s” with Margin Dictionary' });
    shown({ selectionText: 'two words' });
    expect(api.menus.update).toHaveBeenLastCalledWith(MENU_ID, { title: 'Open Margin Dictionary' });
  });

  it('passes a selected word to the popup exactly once', async () => {
    clicked({ menuItemId: MENU_ID, selectionText: 'LUCID' });
    await expect(messaged({ type: 'consume-context-word' }, { id: 'extension-id' })).resolves.toEqual({ word: 'lucid' });
    await expect(messaged({ type: 'consume-context-word' }, { id: 'extension-id' })).resolves.toEqual({ word: null });
  });

  it.each([{}, { selectionText: 'two words' }, { selectionText: 'secret', editable: true }])('opens manual search without passing invalid or editable selections', async info => {
    clicked({ menuItemId: MENU_ID, ...info });
    expect(api.action.openPopup).toHaveBeenCalledOnce();
    await expect(messaged({ type: 'consume-context-word' }, { id: 'extension-id' })).resolves.toEqual({ word: null });
  });

  it('does not expose a pending word to webpage messages', async () => {
    clicked({ menuItemId: MENU_ID, selectionText: 'secret' });
    expect(messaged({ type: 'consume-context-word' }, { id: 'different-id' })).toBeUndefined();
    await expect(messaged({ type: 'consume-context-word' }, { id: 'extension-id' })).resolves.toEqual({ word: 'secret' });
  });

  it('clears a pending word if the popup cannot open', async () => {
    api.action.openPopup.mockRejectedValue(new Error('Window closed'));
    clicked({ menuItemId: MENU_ID, selectionText: 'lucid' });
    await vi.waitFor(() => expect(api.action.openPopup).toHaveBeenCalledOnce());
    await expect(messaged({ type: 'consume-context-word' }, { id: 'extension-id' })).resolves.toEqual({ word: null });
  });
});
