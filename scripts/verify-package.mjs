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
  "scripts/smoke-sidebar-ui.mjs",
  "store-listing/chrome-web-store/listing/en.txt",
  "store-listing/chrome-web-store/media/icon-128.png",
  "store-listing/chrome-web-store/media/screenshots/01-sidebar.png",
  "store-listing/chrome-web-store/media/promo/small-promo.png",
  "store-listing/chrome-web-store/media/promo/marquee-promo.png"
];
const requiredPngDimensions = new Map([
  ["store-listing/chrome-web-store/media/icon-128.png", [[128, 128]]],
  [
    "store-listing/chrome-web-store/media/screenshots/01-sidebar.png",
    [
      [640, 400],
      [1280, 800]
    ]
  ],
  ["store-listing/chrome-web-store/media/promo/small-promo.png", [[440, 280]]],
  ["store-listing/chrome-web-store/media/promo/marquee-promo.png", [[1400, 560]]]
]);
const manifest = readJson(path.join(root, "manifest.json"));

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing required project file: ${relativePath}`);
  }
}

for (const [relativePath, allowedSizes] of requiredPngDimensions) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const dimensions = readPngDimensions(filePath);
  if (
    !allowedSizes.some(
      ([expectedWidth, expectedHeight]) =>
        dimensions.width === expectedWidth && dimensions.height === expectedHeight
    )
  ) {
    const expected = allowedSizes.map(([width, height]) => `${width}x${height}`).join(" or ");
    failures.push(
      `Unexpected PNG size for ${relativePath}: ${dimensions.width}x${dimensions.height}; expected ${expected}`
    );
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
    relativePath.startsWith("scripts/") ||
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

function readPngDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    failures.push(`Expected PNG signature for ${relative(filePath)}`);
    return { width: 0, height: 0 };
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
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
