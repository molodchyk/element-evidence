# Reviewer Notes

Element Evidence is a DevTools-only utility. It adds an Elements panel sidebar named **Element Evidence**.

## How To Test

1. Load the unpacked extension.
2. Open any web page.
3. Open DevTools.
4. Select an element in the Elements panel.
5. Open the **Element Evidence** sidebar.
6. Click **Copy bundle**.
7. Paste the clipboard content into a text editor.

## Permission Explanation

The extension requests `clipboardWrite` only so the user-clicked **Copy bundle** action can write the generated bundle to the clipboard.

## Data Handling

The extension does not use a background service worker, host permissions, content scripts, remote code, analytics, storage, or network requests.

All copied data is generated locally from the currently inspected page and remains on the user's clipboard.
