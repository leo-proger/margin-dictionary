# Margin Dictionary

A Firefox / Zen WebExtension: select an English word, press a small book button,
read Cambridge definitions without leaving the page. No backend, account, analytics,
remote code, or network requests on selection alone.

## Design

Warm white frosted glass, forest green accents, system sans-serif typography
(SF Pro on macOS, Segoe UI on Windows), generous spacing, 400px maximum card width.
Use CSS backdrop-filter with an opaque warm white fallback. The card lives in a
Shadow DOM and the browser's popover top layer to isolate website styles and stacking.
Visual verification in Zen 1.22b showed no effective backdrop blur despite CSS
support; Firefox uses the opaque ivory/sage fallback to prevent background text bleed.
Display the headword, part of speech, UK/US IPA and pronunciation, CEFR levels,
definitions and up to two examples per meaning. Preserve separate parts of speech.
Always link to Cambridge. Include loading, missing word, network, blocked and
changed-markup states; do not replace dictionary content with invented definitions.

## Architecture

- TypeScript bundled with esbuild; no production framework or dependencies.
- Manifest V3 with Firefox background scripts (DOMParser is available).
- A background provider fetches only dictionary.cambridge.org, anonymously, on
  an explicit lookup. Parse inert HTML and send typed plain data to the content script.
- Official API exists, requires an accessKey issued by Cambridge. The default
  integration parses public English articles because no key is available.
- Bound response size, request timeout, in-flight deduplication, short in-memory
  cache, limited concurrency. Error results are never cached.
- UI uses DOM construction and textContent; never inject remote HTML or execute it.
- Toolbar provides manual lookup on browser pages where content scripts cannot run.
- A page context-menu action opens manual search; on an English-word selection it
  opens the anchored card in the selected frame, with a toolbar fallback on protected pages.
- Selected/search words go to Cambridge only on request; no page URL, context,
  cookies, browsing history or durable query history is sent/stored by the extension.

## Edge cases and verification

Single English tokens, apostrophes, hyphens, surrounding punctuation, uppercase,
multiple/empty/oversized selections, editable/password fields, iframe selections,
small viewports, scrolling, resize, stale responses, keyboard access, reduced motion,
missing audio, unavailable network, HTTP 403/429/404 and changed markup.

Unit tests cover normalization, parser boundaries and provider error/cache behavior.
Browser tests cover real content selection and interactions, deterministic provider
responses, geometry and hostile page styles. A separate live smoke test loads the
actual extension in an isolated Zen profile and exercises the real Cambridge request.
Capture screenshots and inspect the result. Build, typecheck, tests and web-ext lint
must pass. Package unsigned XPI; document temporary installation and signing.

Sources checked on 2026-09-08:
- https://dictionary-api.cambridge.org/api/
- https://dictionary-api.cambridge.org/api/specification
- https://dictionary.cambridge.org/dictionary/english/serendipity
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
