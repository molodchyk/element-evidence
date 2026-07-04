import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const localesDirectory = path.join(root, "_locales");
const defaultLocale = "en";
const failures = [];
const referencedMessages = new Map();

if (!fs.existsSync(localesDirectory)) {
  failures.push("_locales/ directory is required for localized extension metadata.");
}

const manifest = readJson(path.join(root, "manifest.json"));
if (manifest.default_locale !== defaultLocale) {
  failures.push(`manifest.json default_locale must be "${defaultLocale}".`);
}

const defaultMessagesPath = path.join(localesDirectory, defaultLocale, "messages.json");
const defaultMessages = fs.existsSync(defaultMessagesPath) ? readJson(defaultMessagesPath) : {};

if (!fs.existsSync(defaultMessagesPath)) {
  failures.push(`Missing default locale messages: _locales/${defaultLocale}/messages.json`);
}

for (const [key, value] of Object.entries(defaultMessages)) {
  if (!value || typeof value.message !== "string" || value.message.length === 0) {
    failures.push(`Default locale message "${key}" must contain a non-empty message string.`);
  }
}

collectReferencesFromManifest(manifest);
collectReferencesFromSource();
verifyReferencesExist(defaultMessages);
verifyLocaleFolders(defaultMessages);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Locales verified.");

function collectReferencesFromManifest(value) {
  if (typeof value === "string") {
    for (const messageName of extractManifestMessageReferences(value)) {
      addReference(messageName, "manifest.json");
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectReferencesFromManifest(entry);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      collectReferencesFromManifest(entry);
    }
  }
}

function collectReferencesFromSource() {
  const sourceRoots = ["src"];

  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.join(root, sourceRoot);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }

    for (const filePath of walk(absoluteRoot)) {
      if (!/\.(html|js)$/i.test(filePath)) {
        continue;
      }

      const text = fs.readFileSync(filePath, "utf8");
      const relativePath = relative(filePath);

      for (const messageName of extractHtmlI18nReferences(text)) {
        addReference(messageName, relativePath);
      }

      for (const messageName of extractGetMessageReferences(text)) {
        addReference(messageName, relativePath);
      }
    }
  }
}

function verifyReferencesExist(defaultMessages) {
  for (const [messageName, locations] of referencedMessages) {
    if (!Object.hasOwn(defaultMessages, messageName)) {
      failures.push(`Missing _locales/${defaultLocale}/messages.json key "${messageName}" referenced by ${locations.join(", ")}`);
    }
  }
}

function verifyLocaleFolders(defaultMessages) {
  if (!fs.existsSync(localesDirectory)) {
    return;
  }

  const defaultKeys = Object.keys(defaultMessages).sort();
  const defaultPlaceholderShapes = new Map(
    Object.entries(defaultMessages).map(([key, value]) => [key, placeholderNames(value)])
  );

  for (const entry of fs.readdirSync(localesDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const locale = entry.name;
    const messagesPath = path.join(localesDirectory, locale, "messages.json");
    if (!fs.existsSync(messagesPath)) {
      failures.push(`Locale ${locale} is missing messages.json.`);
      continue;
    }

    const messages = readJson(messagesPath);
    const localeKeys = Object.keys(messages).sort();
    const missingKeys = defaultKeys.filter((key) => !localeKeys.includes(key));
    const extraKeys = localeKeys.filter((key) => !defaultKeys.includes(key));

    for (const key of missingKeys) {
      failures.push(`Locale ${locale} is missing message key "${key}".`);
    }

    for (const key of extraKeys) {
      failures.push(`Locale ${locale} has extra message key "${key}".`);
    }

    for (const key of defaultKeys) {
      if (!Object.hasOwn(messages, key)) {
        continue;
      }

      if (!messages[key] || typeof messages[key].message !== "string" || messages[key].message.length === 0) {
        failures.push(`Locale ${locale} message "${key}" must contain a non-empty message string.`);
      }

      const expectedPlaceholders = defaultPlaceholderShapes.get(key);
      const actualPlaceholders = placeholderNames(messages[key]);
      if (expectedPlaceholders.join("\0") !== actualPlaceholders.join("\0")) {
        failures.push(
          `Locale ${locale} message "${key}" placeholders must match default locale: expected [${expectedPlaceholders.join(", ")}], got [${actualPlaceholders.join(", ")}]`
        );
      }
    }
  }
}

function extractManifestMessageReferences(value) {
  return [...value.matchAll(/__MSG_([A-Za-z0-9_@]+?)__/g)].map((match) => match[1]);
}

function extractHtmlI18nReferences(text) {
  return [...text.matchAll(/\bdata-i18n-[a-z-]+="([A-Za-z0-9_@]+)"/g)].map((match) => match[1]);
}

function extractGetMessageReferences(text) {
  return [...text.matchAll(/\b(?:getMessage|t)\(\s*["']([A-Za-z0-9_@]+)["']/g)].map((match) => match[1]);
}

function addReference(messageName, location) {
  if (!referencedMessages.has(messageName)) {
    referencedMessages.set(messageName, []);
  }

  const locations = referencedMessages.get(messageName);
  if (!locations.includes(location)) {
    locations.push(location);
  }
}

function placeholderNames(messageRecord) {
  return Object.keys(messageRecord?.placeholders || {}).sort();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
