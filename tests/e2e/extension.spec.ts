import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Deterministic UI tests use the production content bundle and a runtime adapter.
// The actual Firefox extension + Cambridge integration is checked separately.
const content = readFileSync('dist/content.js', 'utf8');
const entry = {
  word: 'serendipity', query: 'serendipity', url: 'https://dictionary.cambridge.org/dictionary/english/serendipity',
  groups: [{ word: 'serendipity', partOfSpeech: 'noun', grammar: '[ U ]', usage: 'formal',
    pronunciations: [{ region: 'UK', ipa: 'ˌser.ənˈdɪp.ə.ti', audio: 'https://dictionary.cambridge.org/media/english/test.mp3' }, { region: 'US', ipa: 'ˌser.ənˈdɪp.ə.t̬i' }],
    senses: [{ definition: 'the fact of finding interesting or valuable things by chance', examples: [], label: '', level: '' }],
  }],
};

async function setup(page: Page, options = { delay: 30, fail: false }) {
  await page.goto('/');
  await page.evaluate(({ entry, options }) => {
    const state = window as any;
    state.lookupCalls = [];
    state.listener = () => {};
    state.browser = { runtime: {
      onMessage: { addListener: (fn: unknown) => { state.listener = fn; } },
      sendMessage: async (message: any) => {
        if (message.type !== 'lookup') return { ok: true };
        state.lookupCalls.push(message.word);
        await new Promise(resolve => setTimeout(resolve, options.delay));
        if (options.fail && state.lookupCalls.length === 1) return { ok: false, error: 'network' };
        return { ok: true, entry: { ...entry, word: message.word } };
      },
    } };
  }, { entry, options });
  await page.addScriptTag({ content });
}

async function select(page: Page, selector = '#target') {
  await page.locator(selector).evaluate(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

test('selection is private until click; card renders and closes with Escape', async ({ page }) => {
  await setup(page);
  await select(page);
  const launcher = page.getByRole('button', { name: 'Define selected word' });
  await expect(launcher).toBeVisible();
  expect(await page.evaluate(() => (window as any).lookupCalls)).toEqual([]);
  await launcher.click();
  await expect(page.getByRole('heading', { name: 'serendipity', exact: true })).toBeVisible();
  await expect(page.getByText('the fact of finding interesting or valuable things by chance', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cambridge Dictionary' })).toHaveAttribute('rel', 'noopener noreferrer');
  await page.screenshot({ path: 'artifacts/screenshots/desktop.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('ignores phrases and editable fields', async ({ page }) => {
  await setup(page);
  await select(page, '#multiple');
  await page.waitForTimeout(120);
  await expect(page.getByRole('button', { name: 'Define selected word' })).toBeHidden();
  for (const selector of ['input', 'textarea', '[contenteditable]']) {
    await page.locator(selector).focus();
    if (selector === '[contenteditable]') await select(page, selector);
    else await page.locator(selector).evaluate((node: HTMLInputElement) => node.select());
    await page.waitForTimeout(120);
    await expect(page.getByRole('button', { name: 'Define selected word' })).toBeHidden();
  }
});

test('handles a network failure and retries', async ({ page }) => {
  await setup(page, { delay: 80, fail: true });
  await select(page);
  await page.getByRole('button', { name: 'Define selected word' }).click();
  await expect(page.getByRole('heading', { name: 'Couldn’t reach the dictionary' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/error.png' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('the fact of finding interesting or valuable things by chance', { exact: true })).toBeVisible();
});

test('fits narrow viewports and bottom-right selections', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await select(page, '#edge');
  await page.getByRole('button', { name: 'Define selected word' }).click();
  await expect(page.getByText('the fact of finding interesting or valuable things by chance', { exact: true })).toBeVisible();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(11);
  expect(box!.x + box!.width).toBeLessThanOrEqual(349);
  expect(box!.y).toBeGreaterThanOrEqual(11);
  expect(box!.y + box!.height).toBeLessThanOrEqual(629);
  await page.screenshot({ path: 'artifacts/screenshots/narrow.png' });
});

test('keyboard command opens and outside click dismisses', async ({ page }) => {
  await setup(page);
  await select(page);
  await page.evaluate(() => (window as any).listener({ type: 'lookup-selection' }));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close dictionary' })).toBeFocused();
  await page.locator('header').first().click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('late responses cannot reopen a dismissed card', async ({ page }) => {
  await setup(page, { delay: 450, fail: false });
  await select(page);
  await page.getByRole('button', { name: 'Define selected word' }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(550);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('scrolling offscreen dismisses the anchored card', async ({ page }) => {
  await setup(page);
  await page.addStyleTag({ content: 'body { padding-bottom: 1000px; }' });
  await select(page);
  await page.getByRole('button', { name: 'Define selected word' }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('site styles cannot alter the card typography', async ({ page }) => {
  await setup(page);
  await page.addStyleTag({ content: 'button { font-size: 60px !important; } section { background: red !important; } h1 { color: red !important; }' });
  await select(page);
  await page.getByRole('button', { name: 'Define selected word' }).click();
  const heading = page.getByRole('heading', { name: 'serendipity', exact: true });
  await expect(heading).toHaveCSS('font-size', '34px');
  await expect(heading).not.toHaveCSS('color', 'rgb(255, 0, 0)');
});

test('toolbar supports manual lookup and rejects multiword queries', async ({ page }) => {
  await page.addInitScript(entry => {
    (window as any).browser = { runtime: { sendMessage: async (message: any) => message.type === 'lookup' ? { ok: true, entry } : { word: null } } };
  }, entry);
  await page.setViewportSize({ width: 400, height: 650 });
  await page.goto('/dist/popup.html');
  await expect(page.getByRole('heading', { name: 'Stay curious.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/toolbar.png' });
  await page.getByRole('searchbox', { name: 'English word' }).fill('two words');
  await page.getByRole('button', { name: 'Look up word' }).click();
  await expect(page.getByText('Enter one English word.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'English word' }).fill('serendipity');
  await page.keyboard.press('Enter');
  await expect(page.getByText('the fact of finding interesting or valuable things by chance', { exact: true })).toBeVisible();
});
