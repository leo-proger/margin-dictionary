import { createProvider } from './dictionary/provider';
import { safeAudioUrl } from './dictionary/word';

const lookup = createProvider();
let audio: HTMLAudioElement | undefined;
let audioObjectUrl: string | undefined;
let playbackId = 0;

function stopAudio() {
  playbackId++;
  audio?.pause();
  audio = undefined;
  if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
  audioObjectUrl = undefined;
}

browser.runtime.onMessage.addListener((message: unknown, sender) => {
  if (sender.id !== browser.runtime.id || !message || typeof message !== 'object') return;
  const data = message as Record<string, unknown>;
  if (data.type === 'lookup' && typeof data.word === 'string') return lookup(data.word);
  if (data.type === 'stop-audio') { stopAudio(); return Promise.resolve({ ok: true }); }
  if (data.type === 'play-audio') {
    const url = safeAudioUrl(data.url);
    if (!url) return Promise.resolve({ ok: false });
    stopAudio();
    const id = playbackId;
    return (async () => {
      try {
        const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('audio');
        const blob = await response.blob();
        if (id !== playbackId || blob.size > 1_000_000) return { ok: false };
        audioObjectUrl = URL.createObjectURL(blob);
        audio = new Audio(audioObjectUrl);
        audio.onended = stopAudio;
        await audio.play();
        return { ok: true };
      } catch { if (id === playbackId) stopAudio(); return { ok: false }; }
    })();
  }
});

browser.commands.onCommand.addListener(async command => {
  if (command !== 'lookup-selection') return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  try { await browser.tabs.sendMessage(tab.id, { type: 'lookup-selection' }); }
  catch { await browser.action.openPopup(); }
});
