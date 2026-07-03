import assert from "node:assert/strict";
import { test } from "node:test";

import { createEvidenceExpression } from "../src/features/evidence/core/expression.js";
import {
  formatBundleAsJson,
  formatBundleAsMarkdown,
  formatBundlePreview
} from "../src/features/evidence/core/format.js";
import { normalizeCaptureOptions } from "../src/features/evidence/core/options.js";

test("normalizes capture options conservatively", () => {
  assert.deepEqual(
    normalizeCaptureOptions({
      includeComputedStyles: false,
      styleMode: "practical",
      maxOuterHTMLLength: 12,
      maxTextLength: 20,
      maxAttributeValueLength: 30
    }),
    {
      includeComputedStyles: false,
      styleMode: "practical",
      maxOuterHTMLLength: 12,
      maxTextLength: 20,
      maxAttributeValueLength: 30
    }
  );

  assert.equal(normalizeCaptureOptions({ styleMode: "unexpected" }).styleMode, "all");
  assert.equal(normalizeCaptureOptions({ maxOuterHTMLLength: -1 }).maxOuterHTMLLength, 100000);
});

test("creates a self-contained inspected-window expression", () => {
  const expression = createEvidenceExpression({
    includeComputedStyles: false,
    styleMode: "practical"
  });

  assert.match(expression, /^\(function collectElementEvidence/);
  assert.match(expression, /"includeComputedStyles":false/);
  assert.match(expression, /globalThis\.\$0/);
});

test("formats successful bundles as json, markdown, and preview", () => {
  const result = {
    ok: true,
    bundle: {
      schema: "element-evidence/v1",
      capturedAt: "2026-07-03T12:00:00.000Z",
      source: {
        url: "https://example.com/page",
        title: "Example"
      },
      selectedElement: {
        tagName: "BUTTON",
        id: "submit",
        classes: ["primary"],
        text: {
          value: "Submit",
          length: 6,
          truncated: false
        },
        rect: {
          x: 1,
          y: 2,
          width: 3,
          height: 4
        },
        html: {
          value: "<button id=\"submit\">Submit</button>",
          length: 35,
          truncated: false
        }
      },
      locators: {
        cssSelector: "#submit",
        xpath: "//*[@id='submit']",
        fullXPath: "/html[1]/body[1]/button[1]",
        jsPath: "document.querySelector(\"#submit\")"
      },
      styles: {
        mode: "practical",
        computed: {
          display: "block"
        }
      }
    }
  };

  assert.match(formatBundleAsJson(result), /"cssSelector": "#submit"/);
  assert.match(formatBundleAsMarkdown(result), /# Element Evidence Bundle/);
  assert.match(formatBundleAsMarkdown(result), /CSS selector: `#submit`/);
  assert.match(formatBundlePreview(result), /"propertyCount": 1/);
});

test("formats failed bundles without throwing", () => {
  const result = {
    ok: false,
    error: {
      message: "No DevTools element is selected."
    }
  };

  assert.match(formatBundleAsMarkdown(result), /Capture failed/);
  assert.match(formatBundlePreview(result), /No DevTools element is selected/);
});
