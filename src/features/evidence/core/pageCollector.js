export function collectElementEvidence(options = {}) {
  const normalizedOptions = {
    includeComputedStyles: options.includeComputedStyles !== false,
    styleMode: options.styleMode === "practical" ? "practical" : "all",
    maxOuterHTMLLength: positiveInteger(options.maxOuterHTMLLength, 100000),
    maxTextLength: positiveInteger(options.maxTextLength, 4000),
    maxAttributeValueLength: positiveInteger(options.maxAttributeValueLength, 4000)
  };

  const capturedAt = new Date().toISOString();
  const selected = globalThis.$0;

  if (!selected) {
    return failure("No DevTools element is selected.", capturedAt);
  }

  if (!globalThis.Node || selected.nodeType !== Node.ELEMENT_NODE) {
    return failure("The selected DevTools value is not an element node.", capturedAt);
  }

  const element = selected;
  const cssSelector = buildCssSelector(element);
  const fullXPath = buildFullXPath(element);
  const xpath = buildXPath(element);
  const jsPath = buildJsPath(element, cssSelector);
  const text = getElementText(element, normalizedOptions.maxTextLength);
  const html = truncateText(element.outerHTML || "", normalizedOptions.maxOuterHTMLLength);
  const computedStyles = normalizedOptions.includeComputedStyles
    ? getComputedStyles(element, normalizedOptions.styleMode)
    : null;

  return {
    ok: true,
    bundle: {
      schema: "element-evidence/v1",
      capturedAt,
      source: {
        url: location.href,
        origin: location.origin,
        title: document.title,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      },
      selectedElement: {
        tagName: element.tagName,
        nodeName: element.nodeName,
        namespaceURI: element.namespaceURI,
        id: element.id || "",
        classes: Array.from(element.classList || []),
        attributes: getAttributes(element, normalizedOptions.maxAttributeValueLength),
        text,
        aria: getAriaHints(element),
        rect: serializeRect(element.getBoundingClientRect()),
        html
      },
      locators: {
        cssSelector,
        xpath,
        fullXPath,
        jsPath
      },
      styles: computedStyles,
      context: {
        parent: summarizeElement(element.parentElement, normalizedOptions.maxTextLength),
        previousElementSibling: summarizeElement(element.previousElementSibling, normalizedOptions.maxTextLength),
        nextElementSibling: summarizeElement(element.nextElementSibling, normalizedOptions.maxTextLength),
        root: summarizeRoot(element)
      }
    }
  };

  function failure(message, failedAt) {
    return {
      ok: false,
      error: {
        message
      },
      capturedAt: failedAt
    };
  }

  function positiveInteger(value, fallback) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
      return fallback;
    }

    return number;
  }

  function truncateText(value, maxLength) {
    const stringValue = String(value ?? "");
    if (stringValue.length <= maxLength) {
      return {
        value: stringValue,
        length: stringValue.length,
        truncated: false
      };
    }

    return {
      value: stringValue.slice(0, maxLength),
      length: stringValue.length,
      truncated: true
    };
  }

  function getElementText(target, maxLength) {
    const rawText = target.innerText || target.textContent || "";
    return truncateText(rawText.replace(/\s+/g, " ").trim(), maxLength);
  }

  function getAttributes(target, maxAttributeValueLength) {
    return Array.from(target.attributes || []).map((attribute) => ({
      name: attribute.name,
      value: truncateText(attribute.value, maxAttributeValueLength)
    }));
  }

  function getAriaHints(target) {
    return {
      role: target.getAttribute("role") || "",
      ariaLabel: target.getAttribute("aria-label") || "",
      ariaLabelledBy: target.getAttribute("aria-labelledby") || "",
      ariaDescribedBy: target.getAttribute("aria-describedby") || "",
      title: target.getAttribute("title") || "",
      alt: target.getAttribute("alt") || "",
      name: target.getAttribute("name") || "",
      value: getSafeValue(target)
    };
  }

  function getSafeValue(target) {
    if ("value" in target && typeof target.value !== "undefined") {
      return String(target.value);
    }

    return "";
  }

  function serializeRect(rect) {
    return {
      x: round(rect.x),
      y: round(rect.y),
      width: round(rect.width),
      height: round(rect.height),
      top: round(rect.top),
      right: round(rect.right),
      bottom: round(rect.bottom),
      left: round(rect.left)
    };
  }

  function round(value) {
    return Math.round(Number(value) * 100) / 100;
  }

  function getComputedStyles(target, mode) {
    const declaration = window.getComputedStyle(target);
    const propertyNames = mode === "practical" ? practicalStyleNames() : Array.from(declaration);
    const computed = {};

    for (const propertyName of propertyNames) {
      computed[propertyName] = declaration.getPropertyValue(propertyName);
    }

    return {
      mode,
      computed
    };
  }

  function practicalStyleNames() {
    return [
      "display",
      "position",
      "visibility",
      "opacity",
      "pointer-events",
      "z-index",
      "box-sizing",
      "width",
      "height",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "border-style",
      "border-color",
      "border-radius",
      "background-color",
      "color",
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "overflow",
      "overflow-x",
      "overflow-y",
      "transform",
      "cursor"
    ];
  }

  function buildCssSelector(target) {
    if (target.id) {
      const idSelector = `#${escapeCssIdentifier(target.id)}`;
      if (isUniqueInDocument(idSelector)) {
        return idSelector;
      }
    }

    const parts = [];
    let current = target;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      parts.unshift(buildSelectorPart(current));
      const selector = parts.join(" > ");
      if (isUniqueInDocument(selector)) {
        return selector;
      }

      if (current === document.documentElement) {
        break;
      }

      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  function buildSelectorPart(target) {
    const tagName = target.localName || target.tagName.toLowerCase();

    if (target.id) {
      return `${tagName}#${escapeCssIdentifier(target.id)}`;
    }

    const classNames = Array.from(target.classList || [])
      .filter(Boolean)
      .slice(0, 4)
      .map((className) => `.${escapeCssIdentifier(className)}`)
      .join("");
    const candidate = `${tagName}${classNames}`;

    if (isUniqueAmongSiblings(target, candidate)) {
      return candidate;
    }

    return `${candidate}:nth-of-type(${getElementIndex(target)})`;
  }

  function isUniqueInDocument(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function isUniqueAmongSiblings(target, selectorPart) {
    const parent = target.parentElement;
    if (!parent) {
      return true;
    }

    try {
      return Array.from(parent.children).filter((child) => child.matches(selectorPart)).length === 1;
    } catch {
      return false;
    }
  }

  function escapeCssIdentifier(value) {
    if (globalThis.CSS?.escape) {
      return CSS.escape(value);
    }

    return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => {
      const codePoint = character.codePointAt(0).toString(16).toUpperCase();
      return `\\${codePoint} `;
    });
  }

  function buildXPath(target) {
    if (target.id) {
      return `//*[@id=${quoteXPathString(target.id)}]`;
    }

    return buildFullXPath(target);
  }

  function buildFullXPath(target) {
    const segments = [];
    let current = target;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tagName = current.localName || current.tagName.toLowerCase();
      segments.unshift(`${tagName}[${getElementIndex(current)}]`);
      current = current.parentElement;
    }

    return `/${segments.join("/")}`;
  }

  function getElementIndex(target) {
    let index = 1;
    let sibling = target.previousElementSibling;

    while (sibling) {
      if (sibling.localName === target.localName) {
        index += 1;
      }

      sibling = sibling.previousElementSibling;
    }

    return index;
  }

  function quoteXPathString(value) {
    const stringValue = String(value);
    if (!stringValue.includes("'")) {
      return `'${stringValue}'`;
    }

    if (!stringValue.includes('"')) {
      return `"${stringValue}"`;
    }

    return `concat('${stringValue.replaceAll("'", "', \"'\", '")}')`;
  }

  function buildJsPath(target, cssSelector) {
    const root = target.getRootNode?.();
    if (root && root !== document) {
      return `document.querySelector(${JSON.stringify(cssSelector)})`;
    }

    return `document.querySelector(${JSON.stringify(cssSelector)})`;
  }

  function summarizeElement(target, maxTextLength) {
    if (!target) {
      return null;
    }

    return {
      tagName: target.tagName,
      id: target.id || "",
      classes: Array.from(target.classList || []),
      text: getElementText(target, Math.min(maxTextLength, 500)),
      selector: buildCssSelector(target)
    };
  }

  function summarizeRoot(target) {
    const root = target.getRootNode?.();
    return {
      type: root === document ? "document" : "shadow-root",
      isConnected: target.isConnected
    };
  }
}
