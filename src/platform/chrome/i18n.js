const RTL_BASE_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

export function getMessage(messageName, fallback = "", substitutions) {
  const chromeMessage = globalThis.chrome?.i18n?.getMessage?.(messageName, substitutions);
  return chromeMessage || fallback || messageName;
}

export function getUiLanguage() {
  return globalThis.chrome?.i18n?.getUILanguage?.() || globalThis.document?.documentElement?.lang || "en";
}

export function getTextDirection(locale = getUiLanguage()) {
  const baseLanguage = normalizeLocale(locale).split("-")[0];
  return RTL_BASE_LANGUAGES.has(baseLanguage) ? "rtl" : "ltr";
}

export function applyDocumentLocale(doc = globalThis.document) {
  if (!doc?.documentElement) {
    return;
  }

  const locale = normalizeLocale(getUiLanguage());
  doc.documentElement.lang = locale;
  doc.documentElement.dir = getTextDirection(locale);
}

export function localizeDocument(root = globalThis.document) {
  if (!root?.querySelectorAll) {
    return;
  }

  for (const element of root.querySelectorAll("[data-i18n-text]")) {
    const messageName = element.dataset.i18nText;
    element.textContent = getMessage(messageName, element.textContent);
  }

  localizeAttribute(root, "data-i18n-aria-label", "aria-label");
  localizeAttribute(root, "data-i18n-title", "title");
}

function localizeAttribute(root, dataAttribute, attributeName) {
  for (const element of root.querySelectorAll(`[${dataAttribute}]`)) {
    const messageName = element.getAttribute(dataAttribute);
    element.setAttribute(attributeName, getMessage(messageName, element.getAttribute(attributeName) || ""));
  }
}

function normalizeLocale(locale) {
  return String(locale || "en").replaceAll("_", "-");
}
