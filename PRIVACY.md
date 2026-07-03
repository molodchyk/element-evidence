# Privacy Policy

Element Evidence: Copy DOM & Locators is a local DevTools utility for copying information about the element selected in Chrome DevTools.

## Data The Extension Reads

When you use the Element Evidence sidebar, the extension can read data from the page currently attached to DevTools:

- page URL and title
- selected element attributes, text, `outerHTML`, and layout rectangle
- generated CSS selector, XPath, full XPath, and JavaScript query path
- optional computed styles
- small parent, sibling, ancestry, frame, and shadow-root summaries

This data is only collected for the DevTools-selected element.

Chrome Web Store privacy forms classify this as handling website content because the extension locally reads DOM content from the page you inspect. Element Evidence does not store that website content or send it anywhere.

## Storage

The extension does not use browser storage.

It does not save copied bundles, settings, browsing history, page content, selectors, or diagnostics.

## Network

The extension does not make network requests.

It does not send page content, selectors, styles, or clipboard contents to any server.

## Permissions

The extension requests one browser permission:

- `clipboardWrite`: lets the DevTools sidebar copy the generated bundle to your clipboard after you click **Copy bundle**.

The extension does not request host permissions.

## Analytics, Ads, And Tracking

The extension does not include analytics, ads, tracking pixels, telemetry, remote code, or third-party scripts.

## Data Sale And Sharing

The extension does not sell, share, or transfer user data.

## Source

Open source under the GPL-3.0 license:
https://github.com/molodchyk/element-evidence
