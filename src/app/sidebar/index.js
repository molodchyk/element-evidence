import { createEvidenceExpression } from "../../features/evidence/core/expression.js";
import {
  formatBundleForClipboard,
  formatBundlePreview
} from "../../features/evidence/core/format.js";
import { normalizeCaptureOptions } from "../../features/evidence/core/options.js";
import {
  applyDocumentLocale,
  getMessage,
  localizeDocument
} from "../../platform/chrome/i18n.js";

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
  applyDocumentLocale();
  localizeDocument();

  if (!globalThis.chrome?.devtools?.inspectedWindow) {
    setStatus(t("statusOpenInDevTools", "Open this page as a Chrome DevTools sidebar."), "error");
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
  setStatus(t("statusCopied", "Copied element evidence bundle."), "success");
}

async function refreshBundle() {
  setControlsDisabled(true);
  setStatus(t("statusReading", "Reading selected element..."));

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
      setStatus(t("statusBundleReady", "Bundle ready."));
    } else {
      setStatus(getCaptureErrorMessage(result), "error");
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
    elements.selectionSummary.textContent = getCaptureErrorMessage(result);
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
    const code = exceptionInfo.code || t("statusUnknownError", "unknown error");
    return t("statusDevToolsEvaluationFailed", `DevTools evaluation failed: ${code}`, [code]);
  }

  if (exceptionInfo.value) {
    return t(
      "statusPageEvaluationFailedWithDetail",
      `Page evaluation failed: ${exceptionInfo.value}`,
      [String(exceptionInfo.value)]
    );
  }

  return t("statusPageEvaluationFailed", "Page evaluation failed.");
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
    throw new Error(t("statusClipboardWriteFailed", "Clipboard write failed."));
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

function getCaptureErrorMessage(result) {
  const message = result?.error?.message || "";

  if (message === "No DevTools element is selected.") {
    return t("captureErrorNoElementSelected", message);
  }

  if (message === "The selected DevTools value is not an element node.") {
    return t("captureErrorNotElement", message);
  }

  return message || t("statusNoSelectedElementFound", "No selected element found.");
}

function t(messageName, fallback, substitutions) {
  return getMessage(messageName, fallback, substitutions);
}
