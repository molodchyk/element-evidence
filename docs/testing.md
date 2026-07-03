# Testing

## Automated Checks

Run:

```bash
npm run verify
npm run package
npm run smoke:sidebar
```

`npm run verify` checks:

- manifest shape and referenced files
- ES module import paths
- release policy files and stale `dist/` zips
- Node unit tests for formatter, options, inspected-window expression generation, and the selected-element collector

`npm run package` creates `dist/element-evidence-0.1.0.zip` from only the installable extension files.

`npm run smoke:sidebar` is an optional browser smoke check. It needs Playwright available to Node. If your browser runtime is not on Playwright's default path, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a local Chromium or Chrome for Testing executable before running it.

## Browser UI Smoke Check

The sidebar UI smoke check serves `src/app/sidebar/sidebar.html` through a local static server, mocks `chrome.devtools.inspectedWindow.eval`, clicks **Copy bundle**, and verifies that the copied text contains an `element-evidence/v1` payload, a `chromeCopyMenu` section, and a Playwright locator candidate.

The smoke payload includes the `chromeCopyMenu` section that mirrors Chrome DevTools' Copy submenu fields.

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

The `chrome://extensions` UI was also probed from a temporary profile. The page exposes Chrome's internal `developerPrivate.loadDirectory` API, but that API requires a browser `DirectoryEntry` from the native directory picker. Playwright could not fill that picker as a directory chooser, and a hidden `webkitdirectory` input did not produce a usable directory entry on the internal page.

Use manual **Load unpacked** for installed Chrome, or use a compatible Chrome for Testing/Chromium build for fully automated extension-load checks.
