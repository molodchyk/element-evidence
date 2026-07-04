import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyDocumentLocale,
  getMessage,
  getTextDirection
} from "../src/platform/chrome/i18n.js";

test("uses fallback messages when Chrome i18n is unavailable", () => {
  const previousChrome = globalThis.chrome;
  delete globalThis.chrome;

  try {
    assert.equal(getMessage("copyBundleButton", "Copy bundle"), "Copy bundle");
  } finally {
    restoreGlobal("chrome", previousChrome);
  }
});

test("detects right-to-left UI languages", () => {
  assert.equal(getTextDirection("en"), "ltr");
  assert.equal(getTextDirection("de-DE"), "ltr");
  assert.equal(getTextDirection("fa"), "rtl");
  assert.equal(getTextDirection("he_IL"), "rtl");
});

test("applies normalized document locale and direction", () => {
  const previousChrome = globalThis.chrome;
  const doc = {
    documentElement: {
      lang: "en",
      dir: "ltr"
    }
  };

  globalThis.chrome = {
    i18n: {
      getUILanguage() {
        return "ur_PK";
      }
    }
  };

  try {
    applyDocumentLocale(doc);
    assert.equal(doc.documentElement.lang, "ur-PK");
    assert.equal(doc.documentElement.dir, "rtl");
  } finally {
    restoreGlobal("chrome", previousChrome);
  }
});

function restoreGlobal(name, previousValue) {
  if (previousValue === undefined) {
    delete globalThis[name];
  } else {
    globalThis[name] = previousValue;
  }
}
