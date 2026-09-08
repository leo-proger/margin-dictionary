import { start } from 'geckodriver';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Uses a new, disposable WebDriver profile. Never touches your personal profile.
const driver = await start({ host: '127.0.0.1', port: 4447, log: 'error', cacheDir: resolve('artifacts/drivers') });
let session;
let server;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`http://127.0.0.1:4447${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const { value } = await response.json();
  if (!response.ok) throw new Error(`${value?.error}: ${value?.message}`);
  return value;
}
async function until(fn, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  do { const result = await fn(); if (result) return result; await pause(100); } while (Date.now() < deadline);
  throw new Error('Timed out waiting for browser state');
}
const execute = script => request(`/session/${session}/execute/sync`, { script, args: [] });
const shadow = 'document.querySelector("margin-dictionary")?.shadowRoot';

try {
  await until(async () => { try { return await request('/status'); } catch { return false; } });
  try { await fetch('http://127.0.0.1:4173'); }
  catch { server = spawn(process.execPath, ['scripts/dev.mjs'], { stdio: 'ignore' }); await until(async () => { try { return (await fetch('http://127.0.0.1:4173')).ok; } catch { return false; } }); }
  const created = await request('/session', { capabilities: { alwaysMatch: {
    browserName: 'firefox',
    'moz:firefoxOptions': {
      binary: process.env.ZEN_BINARY || '/Applications/Zen.app/Contents/MacOS/zen',
      args: process.env.ZEN_HEADED ? [] : ['-headless'],
      prefs: { 'browser.shell.checkDefaultBrowser': false, 'browser.startup.homepage_override.mstone': 'ignore', 'zen.welcome-screen.seen': true },
    },
  } } });
  session = created.sessionId;
  console.log(`Browser: ${created.capabilities.browserName} ${created.capabilities.browserVersion}`);
  const addon = await request(`/session/${session}/moz/addon/install`, { path: resolve('dist'), temporary: true });
  assert.equal(addon, 'margin-dictionary@leo-proger.github.io');
  await request(`/session/${session}/window/rect`, { width: 1280, height: 960 });
  await request(`/session/${session}/url`, { url: 'http://127.0.0.1:4173/' });
  await execute('const range = document.createRange(); range.selectNodeContents(document.querySelector("#target")); window.getSelection().removeAllRanges(); window.getSelection().addRange(range);');
  await until(() => execute(`document.dispatchEvent(new Event('selectionchange')); return ${shadow}?.querySelector('.launcher')?.hidden === false`));
  const button = await execute(`return ${shadow}.querySelector('.launcher')`);
  await request(`/session/${session}/element/${button['element-6066-11e4-a52e-4f735466cecf']}/click`, {});
  await until(() => execute(`return ${shadow}?.querySelector('.definition, .error-state') !== null && !${shadow}?.querySelector('[aria-busy]')`), 20_000);
  const state = await execute(`return {word:${shadow}.querySelector('.headword')?.textContent, definitions:${shadow}.querySelectorAll('.definition').length, error:${shadow}.querySelector('.error-state')?.textContent, blur:getComputedStyle(${shadow}.querySelector('.card')).backdropFilter}`);
  await mkdir('artifacts/screenshots', { recursive: true });
  const screenshot = await request(`/session/${session}/screenshot`);
  await writeFile('artifacts/screenshots/zen-live.png', Buffer.from(screenshot, 'base64'));
  console.log(JSON.stringify(state));
  assert.ok(state.definitions > 0, `Live Cambridge lookup failed: ${state.error}`);
  assert.equal(state.word, 'serendipity');
  await execute(`${shadow}.querySelector('[aria-label="Close dictionary"]').click()`);
  assert.equal(await execute(`return ${shadow}.querySelector('.card').hidden`), true);
  for (const word of ['lucid', 'run', 'qzxvblorg']) {
    await execute(`document.querySelector('#target').textContent = '${word}'; const range = document.createRange(); range.selectNodeContents(document.querySelector('#target')); window.getSelection().removeAllRanges(); window.getSelection().addRange(range);`);
    await until(() => execute(`return ${shadow}?.querySelector('.launcher')?.hidden === false`));
    const nextButton = await execute(`return ${shadow}.querySelector('.launcher')`);
    await request(`/session/${session}/element/${nextButton['element-6066-11e4-a52e-4f735466cecf']}/click`, {});
    await until(() => execute(`return ${shadow}?.querySelector('.definition, .error-state') !== null && !${shadow}?.querySelector('[aria-busy]')`), 20_000);
    const detail = await execute(`return {word:${shadow}.querySelector('.headword')?.textContent, definitions:${shadow}.querySelectorAll('.definition').length, groups:${shadow}.querySelectorAll('.entry-group').length, examples:${shadow}.querySelectorAll('.example').length, error:${shadow}.querySelector('.error-state h2')?.textContent, scrollable:${shadow}.querySelector('.card-body').scrollHeight > ${shadow}.querySelector('.card-body').clientHeight}`);
    console.log(JSON.stringify({ query: word, ...detail }));
    if (word === 'qzxvblorg') assert.equal(detail.error, 'A word still to discover');
    else {
      assert.ok(detail.definitions > 0, `Live lookup failed for ${word}`);
      assert.ok(detail.examples > 0, `Examples missing for ${word}`);
      if (word === 'run') assert.ok(detail.scrollable, 'Long entries must scroll');
    }
    await until(() => execute(`const r = ${shadow}.querySelector('.card').getBoundingClientRect(); return r.top >= 11 && r.bottom <= innerHeight - 11;`));
    await writeFile(`artifacts/screenshots/zen-${word}.png`, Buffer.from(await request(`/session/${session}/screenshot`), 'base64'));
    await execute(`${shadow}.querySelector('[aria-label="Close dictionary"]').click()`);
  }
  console.log('PASS: real extension installed, selection button clicked, Cambridge definitions rendered, card closed.');
} finally {
  if (session) await request(`/session/${session}`, undefined, 'DELETE').catch(() => {});
  driver.kill();
  server?.kill();
}
