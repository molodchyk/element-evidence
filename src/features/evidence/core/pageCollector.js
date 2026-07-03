export function collectElementEvidence(options = {}) {
  const normalizedOptions = {
    includeComputedStyles: options.includeComputedStyles !== false,
    styleMode: options.styleMode === "all" ? "all" : "practical",
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
  const selectorPath = buildSelectorPath(element);
  const cssSelector = selectorPath.cssSelector;
  const fullXPath = buildFullXPath(element);
  const xpath = buildXPath(element);
  const jsPath = buildJsPath(selectorPath);
  const text = getElementText(element, normalizedOptions.maxTextLength);
  const html = truncateText(element.outerHTML || "", normalizedOptions.maxOuterHTMLLength);
  const computedStyles = normalizedOptions.includeComputedStyles
    ? getComputedStyles(element, normalizedOptions.styleMode)
    : null;
  const aria = getAriaHints(element);
  const automation = buildAutomationSummary(element, {
    cssSelector,
    xpath,
    fullXPath,
    jsPath,
    selectorPath,
    text,
    aria
  });

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
        },
        frame: {
          isTopFrame: window.top === window,
          url: location.href,
          referrer: document.referrer || "",
          frameElement: summarizeElement(window.frameElement, normalizedOptions.maxTextLength)
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
        aria,
        rect: serializeRect(element.getBoundingClientRect()),
        position: getDomPosition(element),
        html
      },
      locators: {
        cssSelector,
        xpath,
        fullXPath,
        jsPath,
        selectorPath
      },
      chromeCopyMenu: {
        copyElement: html,
        copyOuterHTML: html,
        copySelector: cssSelector,
        copyJsPath: jsPath,
        copyStyles: computedStyles
          ? {
              mode: computedStyles.mode,
              cssText: computedStyles.cssText,
              computed: computedStyles.computed
            }
          : null,
        copyXPath: xpath,
        copyFullXPath: fullXPath
      },
      automation,
      styles: computedStyles,
      context: {
        parent: summarizeElement(element.parentElement, normalizedOptions.maxTextLength),
        previousElementSibling: summarizeElement(element.previousElementSibling, normalizedOptions.maxTextLength),
        nextElementSibling: summarizeElement(element.nextElementSibling, normalizedOptions.maxTextLength),
        ancestry: getAncestry(element, normalizedOptions.maxTextLength),
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
      computed,
      cssText: Object.entries(computed)
        .filter(([, value]) => value !== "")
        .map(([propertyName, value]) => `${propertyName}: ${value};`)
        .join("\n")
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

  function buildSelectorPath(target) {
    const segments = [];
    let current = target;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const root = current.getRootNode?.() || document;
      segments.push({
        rootType: root === document ? "document" : "shadow-root",
        selector: buildCssSelector(current, root),
        hostTagName: root.host?.tagName || "",
        hostId: root.host?.id || ""
      });

      if (root === document || !root.host) {
        break;
      }

      current = root.host;
    }

    const selectedRootSelector = segments[0]?.selector || "";
    const orderedSegments = segments.slice().reverse();

    return {
      cssSelector: selectedRootSelector,
      rootType: target.getRootNode?.() === document ? "document" : "shadow-root",
      shadowDepth: Math.max(0, orderedSegments.length - 1),
      segments: orderedSegments,
      reachesSelectedNode:
        orderedSegments.length === 1
          ? "document.querySelector"
          : "document.querySelector + open shadowRoot traversal"
    };
  }

  function buildCssSelector(target, root = target.getRootNode?.() || document) {
    if (target.id) {
      const idSelector = `#${escapeCssIdentifier(target.id)}`;
      if (isUniqueInRoot(idSelector, root)) {
        return idSelector;
      }
    }

    const parts = [];
    let current = target;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      parts.unshift(buildSelectorPart(current, root));
      const selector = parts.join(" > ");
      if (isUniqueInRoot(selector, root)) {
        return selector;
      }

      if (current === document.documentElement || current.parentNode === root) {
        break;
      }

      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  function buildSelectorPart(target, root) {
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

    if (isUniqueAmongSiblings(target, candidate, root)) {
      return candidate;
    }

    return `${candidate}:nth-of-type(${getElementIndex(target)})`;
  }

  function isUniqueInRoot(selector, root) {
    try {
      return root.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function isUniqueAmongSiblings(target, selectorPart, root) {
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
    const root = target.getRootNode?.();
    if (root && root !== document) {
      return "";
    }

    if (target.id) {
      return `//*[@id=${quoteXPathString(target.id)}]`;
    }

    return buildFullXPath(target);
  }

  function buildFullXPath(target) {
    const root = target.getRootNode?.();
    if (root && root !== document) {
      return "";
    }

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

  function getElementSiblingIndex(target) {
    const parent = target.parentElement;
    if (!parent) {
      return 1;
    }

    return Array.from(parent.children).indexOf(target) + 1;
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

  function buildJsPath(selectorPath) {
    if (!selectorPath.segments.length) {
      return "";
    }

    const [firstSegment, ...rest] = selectorPath.segments;
    let path = `document.querySelector(${JSON.stringify(firstSegment.selector)})`;

    for (const segment of rest) {
      path += `.shadowRoot.querySelector(${JSON.stringify(segment.selector)})`;
    }

    return path;
  }

  function buildAutomationSummary(target, locatorContext) {
    const preferred = choosePreferredLocator(target, locatorContext);
    const candidates = [
      preferred,
      {
        type: "jsPath",
        value: locatorContext.jsPath,
        note: "Best for reconstructing the exact selected node, including open shadow roots."
      },
      {
        type: "cssSelector",
        value: locatorContext.cssSelector,
        note: "Unique within the selected node root."
      },
      {
        type: "xpath",
        value: locatorContext.xpath,
        note: locatorContext.xpath ? "Browser XPath for document-rooted elements." : "Unavailable for shadow-rooted elements."
      },
      {
        type: "fullXPath",
        value: locatorContext.fullXPath,
        note: locatorContext.fullXPath ? "Absolute browser XPath." : "Unavailable for shadow-rooted elements."
      }
    ].filter((candidate) => candidate.value);

    return {
      preferredLocator: preferred,
      candidates,
      humanSummary: summarizeForHuman(target, locatorContext),
      caveats: getAutomationCaveats(locatorContext)
    };
  }

  function choosePreferredLocator(target, locatorContext) {
    const role = inferRole(target);
    const accessibleName = getAccessibleName(target, locatorContext);

    if (role && accessibleName) {
      return {
        type: "playwright",
        value: `page.getByRole(${JSON.stringify(role)}, { name: ${JSON.stringify(accessibleName)} })`,
        note: "Semantic locator candidate from role plus accessible name."
      };
    }

    if (locatorContext.aria.ariaLabel) {
      return {
        type: "playwright",
        value: `page.getByLabel(${JSON.stringify(locatorContext.aria.ariaLabel)})`,
        note: "Semantic locator candidate from aria-label."
      };
    }

    if (target.getAttribute("placeholder")) {
      return {
        type: "playwright",
        value: `page.getByPlaceholder(${JSON.stringify(target.getAttribute("placeholder"))})`,
        note: "Semantic locator candidate from placeholder."
      };
    }

    if (locatorContext.text.value && locatorContext.text.value.length <= 120) {
      return {
        type: "playwright",
        value: `page.getByText(${JSON.stringify(locatorContext.text.value)})`,
        note: "Text locator candidate."
      };
    }

    return {
      type: "playwright",
      value: `page.locator(${JSON.stringify(locatorContext.cssSelector)})`,
      note: "CSS locator fallback."
    };
  }

  function inferRole(target) {
    const explicitRole = target.getAttribute("role");
    if (explicitRole) {
      return explicitRole.trim().split(/\s+/)[0];
    }

    const tagName = target.localName;
    if (tagName === "a" && target.hasAttribute("href")) {
      return "link";
    }

    if (tagName === "button") {
      return "button";
    }

    if (tagName === "select") {
      return "combobox";
    }

    if (tagName === "textarea") {
      return "textbox";
    }

    if (tagName === "img") {
      return "img";
    }

    if (tagName === "input") {
      const type = (target.getAttribute("type") || "text").toLowerCase();
      if (type === "button" || type === "submit" || type === "reset") {
        return "button";
      }
      if (type === "checkbox") {
        return "checkbox";
      }
      if (type === "radio") {
        return "radio";
      }
      if (type === "range") {
        return "slider";
      }
      return "textbox";
    }

    return "";
  }

  function getAccessibleName(target, locatorContext) {
    return (
      locatorContext.aria.ariaLabel ||
      target.getAttribute("alt") ||
      target.getAttribute("title") ||
      target.getAttribute("name") ||
      locatorContext.text.value ||
      ""
    ).slice(0, 240);
  }

  function summarizeForHuman(target, locatorContext) {
    const pieces = [`<${target.localName || target.tagName.toLowerCase()}>`];
    if (target.id) {
      pieces.push(`#${target.id}`);
    }
    if (target.classList?.length) {
      pieces.push(`.${Array.from(target.classList).slice(0, 3).join(".")}`);
    }
    if (locatorContext.text.value) {
      pieces.push(`text="${locatorContext.text.value.slice(0, 160)}"`);
    }
    return pieces.join(" ");
  }

  function getAutomationCaveats(locatorContext) {
    const caveats = [];
    if (locatorContext.selectorPath.rootType === "shadow-root") {
      caveats.push("Selected node is inside an open shadow root; plain document CSS and XPath may not locate it.");
    }
    if (!locatorContext.fullXPath) {
      caveats.push("Full XPath is unavailable outside the document tree.");
    }
    return caveats;
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
      selector: buildSelectorPath(target).cssSelector,
      position: getDomPosition(target)
    };
  }

  function getDomPosition(target) {
    return {
      childElementIndex: getElementSiblingIndex(target),
      nthOfType: getElementIndex(target)
    };
  }

  function getAncestry(target, maxTextLength) {
    const ancestors = [];
    let current = target.parentElement;

    while (current && ancestors.length < 8) {
      ancestors.push(summarizeElement(current, Math.min(maxTextLength, 300)));
      current = current.parentElement;
    }

    return ancestors;
  }

  function summarizeRoot(target) {
    const root = target.getRootNode?.();
    return {
      type: root === document ? "document" : "shadow-root",
      shadowDepth: buildSelectorPath(target).shadowDepth,
      isConnected: target.isConnected
    };
  }
}
