# Contributing

Open an issue to discuss a bug or a feature. Keep changes focused on a small,
fast English dictionary companion for Firefox and Zen.

Use Node.js 22+, run `npm ci`, and install Google Chrome for the browser tests.
Run `npm run check` before submitting a pull request. For provider changes, also
run `npm run test:zen` with an installed Zen or Firefox binary (`ZEN_BINARY`).
Live tests depend on Cambridge availability and are separate from CI.

Use short English commit subjects in the form `type(scope): message`, for example
`fix(dictionary): handle missing pronunciation`.

Do not include API keys, browser profiles, generated build artifacts, IDE files
or personal planning notes in commits. Add parser regressions using small
synthetic HTML fixtures; avoid bundling dictionary datasets.

Code contributions are made under the project's MIT license. Dictionary content
and Cambridge trademarks remain the property of their respective owners.
