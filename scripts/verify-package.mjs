import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
const requiredFiles = [
  "README.md",
  "PRIVACY.md",
  "LICENSE",
  "CHANGELOG.md",
  "manifest.json",
  "docs/architecture.md",
  "docs/reviewer-notes.md",
  "docs/testing.md",
  "docs/chrome-web-store-additional-fields.md",
  "docs/chrome-web-store-category.md",
  "docs/chrome-web-store-privacy-form.md",
  "store-listing/chrome-web-store/listing/en.txt",
  "store-listing/chrome-web-store/media/icon-128.png",
  "store-listing/chrome-web-store/media/screenshots/01-sidebar.png"
];
const manifest = readJson(path.join(root, "manifest.json"));

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing required project file: ${relativePath}`);
  }
}

verifyDistDirectory();

const forbiddenPatterns = [
  /https?:\/\/(?!github\.com\/molodchyk\/element-evidence|img\.shields\.io|buymeacoffee\.com|www\.patreon\.com)/i,
  /eval\(\s*[^)]/i
];

for (const filePath of walk(root)) {
  const relativePath = relative(filePath);
  if (
    relativePath.startsWith(".git/") ||
    relativePath.startsWith("dist/") ||
    relativePath.startsWith("test/")
  ) {
    continue;
  }

  if (!isTextFile(filePath)) {
    continue;
  }

  const text = fs.readFileSync(filePath, "utf8");
  if (relativePath !== "src/app/sidebar/index.js") {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        failures.push(`Review remote-code-sensitive pattern in ${relativePath}: ${pattern}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Package policy verified.");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyDistDirectory() {
  const distDirectory = path.join(root, "dist");
  if (!fs.existsSync(distDirectory)) {
    return;
  }

  const zipFiles = fs.readdirSync(distDirectory).filter((entry) => entry.endsWith(".zip"));
  const expectedZip = `element-evidence-${manifest.version}.zip`;

  for (const zipFile of zipFiles) {
    if (zipFile !== expectedZip) {
      failures.push(`Stale release zip in dist/: ${zipFile}`);
    }
  }

  if (zipFiles.length > 1) {
    failures.push("dist/ should contain at most one release zip.");
  }
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else {
      yield entryPath;
    }
  }
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function isTextFile(filePath) {
  return /\.(css|html|js|json|md|mjs|txt)$/i.test(filePath) || path.basename(filePath).startsWith(".");
}
