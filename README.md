# Element Evidence: Copy DOM & Locators

Element Evidence adds a Chrome DevTools sidebar that copies the currently selected Elements node as one automation-ready JSON or Markdown bundle.

It is built for blocker reports, automation handoffs, and AI-assisted browser intervention work where a single selector is not enough context.

## How It Works

1. Open Chrome DevTools and select an element in the Elements panel.
2. Open the Element Evidence sidebar in the Elements panel.
3. Click **Copy bundle**.
4. Paste the payload into an automation task, blocker report, or assistant thread.

The extension uses Chrome DevTools APIs rather than a page content script. The sidebar evaluates a serializer in the inspected page with access to `$0`, which is the element currently selected in DevTools. The evaluated serializer returns JSON-safe data to the sidebar, and the sidebar writes the formatted bundle to the clipboard.

The first bundle version includes:

- page URL, title, viewport, device pixel ratio, and user agent
- selected element tag, id, classes, attributes, text, ARIA-ish hints, and bounding box
- `outerHTML` with truncation metadata
- CSS selector, XPath, full XPath, and JavaScript query path
- optional computed styles
- parent, previous sibling, and next sibling summaries

## Install Locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open DevTools on any page and use the **Element Evidence** sidebar in the Elements panel.

## Development

```bash
npm test
npm run verify
npm run package
```

The extension has no build step for local development. Chrome loads the source files directly.

`npm run package` writes the latest Chrome extension zip to `dist/` and removes older zip files from that folder.

See [docs/testing.md](docs/testing.md) for browser-check notes, including the current Chrome limitation around command-line extension loading.

## Permissions

The manifest requests `clipboardWrite` so the DevTools sidebar can copy the generated bundle after the user clicks the button.

There are no host permissions, no content scripts, no background service worker, no analytics, and no network requests.

## Privacy

Element Evidence only reads the page you are already inspecting in DevTools, and only after you click the copy button or refresh the sidebar. It does not store, transmit, or sell data.

See [PRIVACY.md](PRIVACY.md) for the full privacy posture.

## Open Source

Open source under the GPL-3.0 license:
https://github.com/molodchyk/element-evidence

## Support

If this extension saves you time and you want to support its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000)](https://buymeacoffee.com/molodchyk)
[![Patreon](https://img.shields.io/badge/Patreon-support-F96854?logo=patreon&logoColor=fff)](https://www.patreon.com/OMolodchyk)
