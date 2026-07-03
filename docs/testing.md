# Testing

## Automated Checks

Run:

```bash
npm run verify
npm run package
```

`npm run verify` checks:

- manifest shape and referenced files
- ES module import paths
- release policy files and stale `dist/` zips
- Node unit tests for formatter, options, inspected-window expression generation, and the selected-element collector

`npm run package` creates `dist/element-evidence-0.1.0.zip` from only the installable extension files.

## Browser UI Smoke Check

The sidebar UI was smoke-tested in Chromium by serving `src/app/sidebar/sidebar.html` through a local static server, mocking `chrome.devtools.inspectedWindow.eval`, clicking **Copy bundle**, and verifying that the copied text contained an `element-evidence/v1` payload and a Playwright locator candidate.

That same run generated:

```text
store-listing/chrome-web-store/media/screenshots/01-sidebar.png
```

## Manual DevTools Check

Before publishing a release:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project folder.
5. Open DevTools on a normal web page.
6. Select an element in the Elements panel.
7. Open the **Element Evidence** sidebar.
8. Click **Copy bundle**.
9. Paste the clipboard contents into a text editor and confirm it contains the selected element details.

## Command-Line Browser Limitation

Installed Google Chrome 149 on this machine ignored `--load-extension` and `--disable-extensions-except` during automated verification. This matches Chrome's current policy for branded builds: extension-loading command-line switches are restricted or removed in recent Chrome versions.

Use manual **Load unpacked** for installed Chrome, or use a compatible Chrome for Testing/Chromium build for fully automated extension-load checks.
