export function formatBundleForClipboard(result, format = "json") {
  if (format === "markdown") {
    return formatBundleAsMarkdown(result);
  }

  return formatBundleAsJson(result);
}

export function formatBundlePreview(result) {
  if (!result?.ok) {
    return JSON.stringify(result || { ok: false }, null, 2);
  }

  const bundle = result.bundle;
  const preview = {
    schema: bundle.schema,
    capturedAt: bundle.capturedAt,
    source: {
      url: bundle.source.url,
      title: bundle.source.title
    },
    selectedElement: {
      tagName: bundle.selectedElement.tagName,
      id: bundle.selectedElement.id,
      classes: bundle.selectedElement.classes,
      text: bundle.selectedElement.text,
      rect: bundle.selectedElement.rect
    },
    locators: bundle.locators,
    html: bundle.selectedElement.html,
    styles: bundle.styles
      ? {
          mode: bundle.styles.mode,
          propertyCount: Object.keys(bundle.styles.computed).length
        }
      : null
  };

  return JSON.stringify(preview, null, 2);
}

export function formatBundleAsJson(result) {
  return JSON.stringify(result, null, 2);
}

export function formatBundleAsMarkdown(result) {
  if (!result?.ok) {
    return [
      "# Element Evidence Bundle",
      "",
      "Capture failed.",
      "",
      "```json",
      JSON.stringify(result || { ok: false }, null, 2),
      "```"
    ].join("\n");
  }

  const bundle = result.bundle;
  const selected = bundle.selectedElement;

  return [
    "# Element Evidence Bundle",
    "",
    `Captured: ${bundle.capturedAt}`,
    `URL: ${bundle.source.url}`,
    `Title: ${bundle.source.title || "(untitled)"}`,
    "",
    "## Selected Element",
    "",
    `Tag: ${selected.tagName.toLowerCase()}`,
    `CSS selector: \`${bundle.locators.cssSelector}\``,
    `XPath: \`${bundle.locators.xpath}\``,
    `JS path: \`${bundle.locators.jsPath}\``,
    "",
    "## Full Payload",
    "",
    "```json",
    JSON.stringify(result, null, 2),
    "```"
  ].join("\n");
}
