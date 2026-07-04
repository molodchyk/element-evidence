# Localization

Element Evidence is localization-ready, with English as the default Chrome extension locale.

## Current State

- Extension metadata uses Chrome i18n placeholders in `manifest.json`.
- Runtime UI strings live in `_locales/en/messages.json`.
- Sidebar HTML marks visible text and accessible labels with `data-i18n-*` attributes.
- Runtime status messages use `src/platform/chrome/i18n.js`.
- The English Chrome Web Store detailed description remains in `store-listing/chrome-web-store/listing/en.txt` for StorePilot.

The project has only English copy today. Add translated locales when there is a real translation pass.

## Adding A Locale

1. Create `_locales/<locale>/messages.json`.
2. Copy the same message keys and placeholder names from `_locales/en/messages.json`.
3. Translate the `message` values.
4. Add `store-listing/chrome-web-store/listing/<locale>.txt` when preparing a localized Chrome Web Store listing for StorePilot.
5. For localized screenshots, add them under `store-listing/chrome-web-store/media/screenshots/<locale>/`.
6. Run `npm run verify:locales`.

Chrome locale folders use underscores for regional locale codes, for example `pt_BR`, `en_GB`, and `zh_TW`.

## RTL

`src/platform/chrome/i18n.js` sets `dir="rtl"` for Arabic, Persian, Hebrew, and Urdu based on `chrome.i18n.getUILanguage()`.

Before publishing an RTL locale, manually load the extension and check the DevTools sidebar with that Chrome UI language.

## Release Check

Before release after any UI string change:

```bash
npm run verify:locales
npm run verify
```
