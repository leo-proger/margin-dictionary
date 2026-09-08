# Privacy policy

Effective date: September 8, 2026. Applies to Margin Dictionary 0.2.0.

Margin Dictionary has no analytics, accounts, persistent query history or
developer-operated servers. It does not sell or share data with advertisers.

## Requests to Cambridge

When you click Define, choose a lookup from the right-click menu, use the lookup
shortcut, submit a toolbar search or retry a request, the requested word is sent
directly to `https://dictionary.cambridge.org`. Selecting text or opening the
context menu alone makes no dictionary request. If a page does not allow the
inline card, an explicit context-menu lookup opens and searches the toolbar popup.

Only the English word is sent, never the surrounding text, current page URL,
title or browsing history. Requests omit cookies and the referrer. Cambridge
receives ordinary connection information, including your IP address. Clicking a
pronunciation button requests its audio from the same domain.

Opening a Cambridge source link visits its normal website. That visit is covered
by [Cambridge's privacy policy](https://www.cambridge.org/legal/privacy) and may
use the browser's normal cookies and website settings.

## Local behavior

The extension reads the current text selection on ordinary webpages to show its
lookup button. It ignores editable and password fields for automatic selection
lookup. The context-menu action does not submit words from editable fields.
Successful entries may be cached in memory for up to ten minutes (100 entries
maximum); the cache is lost when the background page is unloaded. No queries
are written to persistent extension storage.

The manifest declares `searchTerms` transmission to Firefox. Website access is
used for selection and popup placement; the `menus` permission adds the right-click
action. No data is sent to the extension developer.

Questions: [open an issue](https://github.com/leo-proger/margin-dictionary/issues).
Please do not include private browsing content in public issues.
