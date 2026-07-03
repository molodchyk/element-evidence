import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoots = ["src", "test", "scripts"];
const importPattern =
  /(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const failures = [];

for (const sourceRoot of sourceRoots) {
  const absoluteRoot = path.join(root, sourceRoot);
  if (!fs.existsSync(absoluteRoot)) {
    continue;
  }

  for (const filePath of walk(absoluteRoot)) {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".mjs")) {
      continue;
    }

    const text = fs.readFileSync(filePath, "utf8");
    for (const match of text.matchAll(importPattern)) {
      const specifier = match[1] || match[2];
      if (!specifier || !specifier.startsWith(".")) {
        continue;
      }

      const resolved = path.resolve(path.dirname(filePath), specifier);
      if (!fs.existsSync(resolved)) {
        failures.push(`${relative(filePath)} imports missing ${specifier}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Import references verified.");

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
