import { normalizeCaptureOptions } from "./options.js";
import { collectElementEvidence } from "./pageCollector.js";

export function createEvidenceExpression(options = {}) {
  const normalizedOptions = normalizeCaptureOptions(options);
  return `(${collectElementEvidence.toString()})(${JSON.stringify(normalizedOptions)})`;
}
