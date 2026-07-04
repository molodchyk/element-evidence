import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "manifest.json");
const failures = [];

const manifest = readJson(manifestPath);

if (manifest.manifest_version !== 3) {
  failures.push("manifest_version must be 3.");
}

for (const key of ["name", "description", "version", "devtools_page"]) {
  if (!manifest[key]) {
    failures.push(`manifest.json is missing ${key}.`);
  }
}

if (manifest.name?.startsWith("__MSG_") || manifest.description?.startsWith("__MSG_")) {
  if (manifest.default_locale !== "en") {
    failures.push('manifest.json must declare default_locale "en" when using localized metadata.');
  }
}

if (!Array.isArray(manifest.permissions)) {
  failures.push("manifest permissions must be an array.");
}

if (manifest.host_permissions) {
  failures.push("This project should not declare host_permissions.");
}

if (manifest.background) {
  failures.push("This project should not declare a background worker.");
}

if (manifest.content_scripts) {
  failures.push("This project should not declare content scripts.");
}

if (manifest.devtools_page) {
  verifyFile(manifest.devtools_page);
  verifyHtmlReferences(manifest.devtools_page);
}

if (!manifest.icons || typeof manifest.icons !== "object") {
  failures.push("manifest.json must declare icons.");
} else {
  for (const size of ["16", "32", "48", "128"]) {
    if (!manifest.icons[size]) {
      failures.push(`manifest.json is missing ${size}px icon.`);
      continue;
    }

    verifyFile(manifest.icons[size]);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Manifest verified.");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing manifest file: ${relativePath}`);
  }
}

function verifyHtmlReferences(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const html = fs.readFileSync(absolutePath, "utf8");
  const referencePattern = /(?:src|href)="([^"]+)"/g;
  const baseDirectory = path.dirname(absolutePath);

  for (const match of html.matchAll(referencePattern)) {
    const reference = match[1];
    if (reference.startsWith("http:") || reference.startsWith("https:") || reference.startsWith("#")) {
      continue;
    }

    const referencedPath = path.resolve(baseDirectory, reference);
    if (!fs.existsSync(referencedPath)) {
      failures.push(`${relativePath} references missing ${reference}`);
    }
  }
}
