import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifest = readJson(path.join(root, "manifest.json"));
const slug = "element-evidence";
const distDirectory = path.join(root, "dist");
const packageName = `${slug}-${manifest.version}.zip`;
const packagePath = path.join(distDirectory, packageName);
const includePaths = ["manifest.json", "_locales", "assets", "src", "README.md", "PRIVACY.md", "LICENSE", "CHANGELOG.md"];

for (const includePath of includePaths) {
  if (!fs.existsSync(path.join(root, includePath))) {
    console.error(`Cannot package missing path: ${includePath}`);
    process.exit(1);
  }
}

fs.mkdirSync(distDirectory, { recursive: true });
for (const entry of fs.readdirSync(distDirectory)) {
  if (entry.endsWith(".zip")) {
    fs.rmSync(path.join(distDirectory, entry));
  }
}

const result = spawnSync("tar", ["-a", "-cf", packagePath, ...includePaths], {
  cwd: root,
  stdio: "inherit"
});

if (result.status !== 0) {
  console.error("Packaging failed. This script requires bsdtar or a compatible tar with zip output support.");
  process.exit(result.status || 1);
}

console.log(`Created ${path.relative(root, packagePath).replaceAll(path.sep, "/")}`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
