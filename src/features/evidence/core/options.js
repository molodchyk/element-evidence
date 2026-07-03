export const DEFAULT_CAPTURE_OPTIONS = Object.freeze({
  includeComputedStyles: true,
  styleMode: "practical",
  maxOuterHTMLLength: 100000,
  maxTextLength: 4000,
  maxAttributeValueLength: 4000
});

export function normalizeCaptureOptions(options = {}) {
  return {
    includeComputedStyles: options.includeComputedStyles !== false,
    styleMode: options.styleMode === "all" ? "all" : "practical",
    maxOuterHTMLLength: normalizePositiveInteger(
      options.maxOuterHTMLLength,
      DEFAULT_CAPTURE_OPTIONS.maxOuterHTMLLength
    ),
    maxTextLength: normalizePositiveInteger(options.maxTextLength, DEFAULT_CAPTURE_OPTIONS.maxTextLength),
    maxAttributeValueLength: normalizePositiveInteger(
      options.maxAttributeValueLength,
      DEFAULT_CAPTURE_OPTIONS.maxAttributeValueLength
    )
  };
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return fallback;
  }

  return number;
}
