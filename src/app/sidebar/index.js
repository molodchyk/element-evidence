import { createEvidenceExpression } from "../../features/evidence/core/expression.js";
import {
  formatBundleForClipboard,
  formatBundlePreview
} from "../../features/evidence/core/format.js";
import { normalizeCaptureOptions } from "../../features/evidence/core/options.js";

const elements = {
  copyBundle: document.querySelector("#copyBundle"),
  refreshBundle: document.querySelector("#refreshBundle"),
  format: document.querySelector("#format"),
  styleMode: document.querySelector("#styleMode"),
  includeStyles: document.querySelector("#includeStyles"),
  selectionSummary: document.querySelector("#selectionSummary"),
  status: document.querySelector("#status"),
  preview: document.querySelector("#preview")
};

let lastResult = null;
let refreshTimer = 0;

init();

function init() {
  if (!globalThis.chrome?.devtools?.inspectedWindow) {
    setStatus("Open this page as a Chrome DevTools sidebar.", "error");
    setControlsDisabled(true);
    return;
  }

  elements.copyBundle.addEventListener("click", copyBundle);
  elements.refreshBundle.addEventListener("click", refreshBundle);
  elements.format.addEventListener("change", renderLastResult);
  elements.styleMode.addEventListener("change", refreshBundle);
  elements.includeStyles.addEventListener("change", refreshBundle);

  chrome.devtools.panels.elements.onSelectionChanged.addListener(scheduleRefresh);
  refreshBundle();
}

async function copyBundle() {
  const result = await refreshBundle();
  if (!result?.ok) {
    return;
  }

  const text = formatBundleForClipboard(result, elements.format.value);
  await writeClipboard(text);
  setStatus("Copied element evidence bundle.", "success");
}

async function refreshBundle() {
  setControlsDisabled(true);
  setStatus("Reading selected element...");

  try {
    const options = normalizeCaptureOptions({
      includeComputedStyles: elements.includeStyles.checked,
      styleMode: elements.styleMode.value
    });
    const expression = createEvidenceExpression(options);
    const result = await evalInInspectedWindow(expression);

    lastResult = result;
    renderResult(result);

    if (result?.ok) {
      setStatus("Bundle ready.");
    } else {
      setStatus(result?.error?.message || "No selected element found.", "error");
    }

    return result;
  } catch (error) {
    const result = {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error)
      }
    };
    lastResult = result;
    renderResult(result);
    setStatus(result.error.message, "error");
    return result;
  } finally {
    setControlsDisabled(false);
  }
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(refreshBundle, 120);
}

function renderLastResult() {
  if (lastResult) {
    renderResult(lastResult);
  }
}

function renderResult(result) {
  if (!result?.ok) {
    elements.selectionSummary.textContent = result?.error?.message || "Select an element in DevTools.";
    elements.preview.textContent = formatBundlePreview(result);
    return;
  }

  const selected = result.bundle.selectedElement;
  const locator = result.bundle.locators.cssSelector;
  const text = selected.text.value ? ` - ${selected.text.value}` : "";
  elements.selectionSummary.textContent = `<${selected.tagName.toLowerCase()}> ${locator}${text}`;
  elements.preview.textContent = formatBundlePreview(result);
}

function evalInInspectedWindow(expression) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
      if (exceptionInfo) {
        reject(new Error(formatDevToolsException(exceptionInfo)));
        return;
      }

      resolve(result);
    });
  });
}

function formatDevToolsException(exceptionInfo) {
  if (exceptionInfo.isError) {
    return `DevTools evaluation failed: ${exceptionInfo.code || "unknown error"}`;
  }

  if (exceptionInfo.value) {
    return `Page evaluation failed: ${exceptionInfo.value}`;
  }

  return "Page evaluation failed.";
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Clipboard write failed.");
  }
}

function setControlsDisabled(disabled) {
  elements.copyBundle.disabled = disabled;
  elements.refreshBundle.disabled = disabled;
  elements.format.disabled = disabled;
  elements.styleMode.disabled = disabled;
  elements.includeStyles.disabled = disabled;
}

function setStatus(message, tone = "") {
  elements.status.textContent = message;
  if (tone) {
    elements.status.dataset.tone = tone;
  } else {
    delete elements.status.dataset.tone;
  }
}
