# Публикация Margin Dictionary в Firefox Add-ons

Инструкция проверена 8 сентября 2026 года по документации Mozilla:
[подача расширения](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/),
[предоставление исходников](https://extensionworkshop.com/documentation/publish/source-code-submission/),
[подпись и распространение](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## 1. Подготовить файлы

Нужны Node.js 22+, npm и Google Chrome для браузерных тестов:

```sh
npm ci
npm run check
npm run package
npm run package:source
```

`package:source` собирает последний коммит; перед запуском закоммить изменения.
Получатся:

- `artifacts/margin-dictionary-0.2.0.xpi` — само расширение.
- `artifacts/margin-dictionary-0.2.0-source.zip` — исходники и инструкции сборки.

Оба файла также приложены к GitHub Release v0.2.0. XPI из GitHub не подписан
Mozilla: обычная постоянная установка до подписания не сработает.

Идентификатор расширения: `margin-dictionary@leo-proger.github.io`.
После первой подачи не меняй его: следующие версии должны обновлять то же
расширение. Минимальная версия Firefox — 142; Zen должен быть на соответствующей
или более новой базе Firefox.

## 2. Создать заявку

1. Открой [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/distribution)
   и войди в Mozilla Account.
2. Прочитай условия разработчика и прими их от своего имени.
3. Выбери размещение **On this site**, чтобы расширение появилось в магазине.
   Вариант **On your own** нужен для самостоятельного распространения подписанного XPI.
4. Загрузи `margin-dictionary-0.2.0.xpi` и дождись автоматической проверки.
5. Предоставь `margin-dictionary-0.2.0-source.zip`: TypeScript собирается через
   esbuild, поэтому ревьюеру нужны исходники. В инструкциях сборки укажи
   `npm ci` и `npm run build` с Node.js 22+. Готовые файлы находятся в `dist/`.

## 3. Заполнить карточку

Название: **Margin Dictionary**.

Короткое описание на английском:

> Select an English word and read its Cambridge Dictionary definition without leaving the page.

Полное описание:

```text
Stay curious without losing your place.

Margin Dictionary brings Cambridge English definitions to your reading flow.
Select a word and click Define, use the right-click menu, or press Alt+Shift+D.
The toolbar also lets you look up words manually.

• English definitions and examples
• Parts of speech and British/American pronunciation
• A calm, readable light popup designed for Firefox and Zen
• No account or API key required

Your requested word is sent directly to dictionary.cambridge.org only when you
perform a lookup. Pronunciation audio is requested when you press Play.
No surrounding text, page URL, analytics or persistent query history is sent
to the developer.

Margin Dictionary is an independent project, not affiliated with or endorsed
by Cambridge University Press & Assessment. Cambridge may limit requests or
change its website. Protected browser pages use toolbar search instead.
```

Дополнительные поля:

- Лицензия: **MIT License** — для кода расширения.
- Сайт и поддержка: `https://github.com/leo-proger/margin-dictionary` и раздел Issues.
- Категории: выбери наиболее подходящие доступные категории для словарей,
  изучения языков или инструментов поиска.
- Иконка: исходник `public/icons/book.svg`; если форма требует PNG, экспортируй
  квадратную иконку в требуемом ею размере.
- Скриншот: `docs/preview.png`.
- Отметь наличие политики конфиденциальности и вставь содержимое `PRIVACY.md`;
  ссылка: `https://github.com/leo-proger/margin-dictionary/blob/main/PRIVACY.md`.
- В раскрытии передачи данных укажи поисковые слова; в манифесте уже есть
  `data_collection_permissions.required: ["searchTerms"]`.

## 4. Notes for Reviewers

```text
Build: Node.js 22+, npm ci, npm run build. Output: dist/.
The source ZIP contains the original TypeScript, lockfile and build script.
No account, API key or paid service is required to test the extension.

Test on an ordinary HTTPS page: select "serendipity" or "lucid", then click
Define. Also test the right-click menu and toolbar search. The extension
fetches the public English article from dictionary.cambridge.org and parses
it with DOMParser in the Firefox background page. No remote HTML or scripts
are injected into the webpage. Network requests omit cookies and referrer.

The menus permission provides the context-menu action. Content-script matches
allow detecting selected words; host permission allows Cambridge requests.
Requested words are declared as searchTerms. There is no persistent storage
or analytics. Dictionary failures display an error and a link to Cambridge.
```

Код распространяется по MIT, но словарный контент и товарные знаки Cambridge
не становятся MIT-контентом. Не заявляй официальное партнёрство и убедись, что
планируемое использование контента соответствует условиям правообладателя.

## 5. Отправить и выпустить

Нажми **Submit Version**, следи за статусом в Developer Hub и письмами Mozilla.
Если появятся замечания проверки, исправь их и отправь новую версию. Публикация
GitHub Release сама по себе не означает прохождение проверки магазина.

После подписания скачай подписанный XPI и добавь его к GitHub Release с явным
суффиксом `-signed.xpi`; замени инструкцию временной установки ссылкой на AMO.
Обновления загружай в существующую карточку расширения, увеличив версии в
`package.json`, lockfile и `public/manifest.json`. Обнови имя архива, changelog
и Git-тег. Для размещённых на AMO расширений обновления распространяет Firefox.
