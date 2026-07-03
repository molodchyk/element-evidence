# Architecture

Element Evidence is a small Chrome DevTools extension with one runtime surface.

## Runtime Surfaces

- `src/app/devtools/`: the manifest `devtools_page`; registers the Elements sidebar.
- `src/app/sidebar/`: sidebar HTML, styles, and controller logic.
- `src/features/evidence/core/`: pure formatting and expression construction plus the self-contained page serializer.

## Data Flow

1. The user selects an element in the DevTools Elements panel.
2. The sidebar builds an inspected-window expression from `collectElementEvidence`.
3. `chrome.devtools.inspectedWindow.eval` runs the expression in the inspected page.
4. The expression reads `$0`, serializes JSON-safe evidence, and returns it.
5. The sidebar formats the result as JSON or Markdown.
6. The sidebar writes the payload to the clipboard after a user click.

## Browser API Boundary

Only `src/app/devtools/index.js` and `src/app/sidebar/index.js` call Chrome extension APIs.

The evidence serializer is self-contained because it executes inside the inspected page and cannot import extension modules there.

## Constraints

- The extension cannot add an item to Chrome's built-in Elements `Copy` submenu.
- The selected node comes from DevTools `$0`, so the workflow depends on DevTools being open.
- Cross-frame and closed shadow-root behavior is browser-controlled and may differ from ordinary top-frame DOM selection.
