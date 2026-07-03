import assert from "node:assert/strict";
import { test } from "node:test";

import { createEvidenceExpression } from "../src/features/evidence/core/expression.js";
import {
  formatBundleAsJson,
  formatBundleAsMarkdown,
  formatBundlePreview
} from "../src/features/evidence/core/format.js";
import { normalizeCaptureOptions } from "../src/features/evidence/core/options.js";
import { collectElementEvidence } from "../src/features/evidence/core/pageCollector.js";

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
      automation: {
        preferredLocator: {
          type: "playwright",
          value: "page.getByRole(\"button\", { name: \"Submit\" })",
          note: "Semantic locator candidate from role plus accessible name."
        },
        caveats: []
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
  assert.match(formatBundleAsMarkdown(result), /Preferred locator: `page.getByRole/);
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

test("collects evidence from the selected element", () => {
  const previousGlobals = captureGlobals(["$0", "Node", "document", "window", "location", "navigator", "CSS"]);

  try {
    const html = createElementStub({ tagName: "HTML", localName: "html" });
    const body = createElementStub({ tagName: "BODY", localName: "body", parentElement: html });
    const button = createElementStub({
      tagName: "BUTTON",
      localName: "button",
      id: "submit",
      classNames: ["primary"],
      attributes: [
        { name: "id", value: "submit" },
        { name: "class", value: "primary" },
        { name: "aria-label", value: "Submit" }
      ],
      innerText: "Submit",
      outerHTML: "<button id=\"submit\" class=\"primary\" aria-label=\"Submit\">Submit</button>",
      parentElement: body
    });

    html.children = [body];
    body.children = [button];

    const documentStub = {
      title: "Example Page",
      documentElement: html,
      querySelectorAll(selector) {
        return selector === "#submit" ? [button] : [];
      }
    };

    html.ownerDocument = documentStub;
    body.ownerDocument = documentStub;
    button.ownerDocument = documentStub;
    html.getRootNode = () => documentStub;
    body.getRootNode = () => documentStub;
    button.getRootNode = () => documentStub;

    defineGlobal("$0", button);
    defineGlobal("Node", { ELEMENT_NODE: 1 });
    defineGlobal("document", documentStub);
    defineGlobal("window", {
      innerWidth: 1280,
      innerHeight: 800,
      devicePixelRatio: 1,
      getComputedStyle() {
        const declaration = ["display"];
        declaration.getPropertyValue = (propertyName) => (propertyName === "display" ? "inline-block" : "");
        return declaration;
      }
    });
    defineGlobal("location", {
      href: "https://example.test/page",
      origin: "https://example.test"
    });
    defineGlobal("navigator", {
      userAgent: "Node test"
    });
    defineGlobal("CSS", {
      escape(value) {
        return String(value);
      }
    });

    const result = collectElementEvidence({ styleMode: "practical" });

    assert.equal(result.ok, true);
    assert.equal(result.bundle.locators.cssSelector, "#submit");
    assert.equal(result.bundle.locators.jsPath, "document.querySelector(\"#submit\")");
    assert.equal(result.bundle.automation.preferredLocator.value, "page.getByRole(\"button\", { name: \"Submit\" })");
    assert.equal(result.bundle.styles.computed.display, "inline-block");
  } finally {
    restoreGlobals(previousGlobals);
  }
});

test("keeps selected-node selector separate from shadow host selector", () => {
  const previousGlobals = captureGlobals(["$0", "Node", "document", "window", "location", "navigator", "CSS"]);

  try {
    const html = createElementStub({ tagName: "HTML", localName: "html" });
    const body = createElementStub({ tagName: "BODY", localName: "body", parentElement: html });
    const host = createElementStub({
      tagName: "DIV",
      localName: "div",
      id: "host",
      attributes: [{ name: "id", value: "host" }],
      parentElement: body
    });
    const target = createElementStub({
      tagName: "BUTTON",
      localName: "button",
      id: "inside",
      attributes: [
        { name: "id", value: "inside" },
        { name: "aria-label", value: "Inside" }
      ],
      innerText: "Inside"
    });
    const shadowRoot = {
      host,
      querySelectorAll(selector) {
        return selector === "#inside" ? [target] : [];
      }
    };
    const documentStub = {
      title: "Shadow Page",
      documentElement: html,
      querySelectorAll(selector) {
        return selector === "#host" ? [host] : [];
      }
    };

    html.children = [body];
    body.children = [host];
    host.shadowRoot = shadowRoot;
    target.parentNode = shadowRoot;
    html.getRootNode = () => documentStub;
    body.getRootNode = () => documentStub;
    host.getRootNode = () => documentStub;
    target.getRootNode = () => shadowRoot;

    defineBrowserGlobals({ selected: target, documentStub });

    const result = collectElementEvidence({ includeComputedStyles: false });

    assert.equal(result.ok, true);
    assert.equal(result.bundle.locators.cssSelector, "#inside");
    assert.equal(
      result.bundle.locators.jsPath,
      "document.querySelector(\"#host\").shadowRoot.querySelector(\"#inside\")"
    );
    assert.equal(result.bundle.locators.xpath, "");
    assert.equal(result.bundle.locators.fullXPath, "");
    assert.equal(result.bundle.locators.selectorPath.shadowDepth, 1);
    assert.match(result.bundle.automation.caveats.join(" "), /shadow root/);
  } finally {
    restoreGlobals(previousGlobals);
  }
});

function captureGlobals(names) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      {
        exists: Object.hasOwn(globalThis, name),
        descriptor: Object.getOwnPropertyDescriptor(globalThis, name)
      }
    ])
  );
}

function restoreGlobals(previousGlobals) {
  for (const [name, previous] of Object.entries(previousGlobals)) {
    if (previous.exists) {
      Object.defineProperty(globalThis, name, previous.descriptor);
    } else {
      delete globalThis[name];
    }
  }
}

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value
  });
}

function defineBrowserGlobals({ selected, documentStub }) {
  defineGlobal("$0", selected);
  defineGlobal("Node", { ELEMENT_NODE: 1 });
  defineGlobal("document", documentStub);
  defineGlobal("window", {
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    getComputedStyle() {
      const declaration = ["display"];
      declaration.getPropertyValue = (propertyName) => (propertyName === "display" ? "inline-block" : "");
      return declaration;
    }
  });
  defineGlobal("location", {
    href: "https://example.test/page",
    origin: "https://example.test"
  });
  defineGlobal("navigator", {
    userAgent: "Node test"
  });
  defineGlobal("CSS", {
    escape(value) {
      return String(value);
    }
  });
}

function createElementStub({
  tagName,
  localName,
  id = "",
  classNames = [],
  attributes = [],
  innerText = "",
  outerHTML = "",
  parentElement = null
}) {
  return {
    nodeType: 1,
    tagName,
    nodeName: tagName,
    localName,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    id,
    classList: classNames,
    attributes,
    innerText,
    textContent: innerText,
    outerHTML,
    parentElement,
    previousElementSibling: null,
    nextElementSibling: null,
    children: [],
    parentNode: parentElement,
    isConnected: true,
    hasAttribute(name) {
      return attributes.some((attribute) => attribute.name === name);
    },
    getAttribute(name) {
      return attributes.find((attribute) => attribute.name === name)?.value || "";
    },
    getBoundingClientRect() {
      return {
        x: 10,
        y: 20,
        width: 100,
        height: 40,
        top: 20,
        right: 110,
        bottom: 60,
        left: 10
      };
    },
    matches(selector) {
      if (selector === `#${id}`) {
        return true;
      }
      return selector === localName;
    }
  };
}
