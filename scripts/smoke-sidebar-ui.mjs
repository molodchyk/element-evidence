import { createServer } from "node:http";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const root = process.cwd();
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".png", "image/png"]
]);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is required for this optional smoke check. Install it or run with a runtime that provides it.");
  process.exit(1);
}

const server = await startServer(root);
const screenshotPath = path.join(root, "store-listing", "chrome-web-store", "media", "screenshots", "01-sidebar.png");
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

const launchOptions = {
  headless: true
};

if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
}

const browser = await chromium.launch(launchOptions);

try {
  const { port } = server.address();
  const page = await browser.newPage({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 1
  });
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      pageErrors.push(message.text());
    }
  });

  await page.addInitScript(createMockDevToolsRuntime);
  await page.goto(`http://127.0.0.1:${port}/src/app/sidebar/sidebar.html`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => document.querySelector("#status")?.textContent === "Bundle ready.");
  await page.click("#copyBundle");
  await page.waitForFunction(() => document.querySelector("#status")?.textContent === "Copied element evidence bundle.");

  const copiedText = await page.evaluate(() => window.__copiedText);
  for (const expectedText of ["element-evidence/v1", "chromeCopyMenu", "copyFullXPath", "page.getByRole"]) {
    if (!copiedText.includes(expectedText)) {
      throw new Error(`Copied bundle did not contain expected text: ${expectedText}`);
    }
  }

  if (pageErrors.length > 0) {
    throw new Error(`Sidebar emitted browser errors: ${pageErrors.join("; ")}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(
    JSON.stringify(
      {
        status: "ok",
        screenshotPath: path.relative(root, screenshotPath).replaceAll(path.sep, "/"),
        copiedBytes: copiedText.length
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function startServer(staticRoot) {
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }

    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "src/app/sidebar/sidebar.html";
    const filePath = path.resolve(staticRoot, relativePath);

    if (!filePath.startsWith(staticRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function createMockDevToolsRuntime() {
  const html = {
    value:
      '<a class="ytp-modern-videowall-still ytp-suggestion-set" href="https://www.youtube.com/watch?v=example">Midnight Focus Lofi</a>',
    length: 130,
    truncated: false
  };
  const result = {
    ok: true,
    bundle: {
      schema: "element-evidence/v1",
      capturedAt: "2026-07-03T17:10:00.000Z",
      source: {
        url: "https://www.youtube.com/watch?v=example",
        title: "YouTube",
        viewport: { width: 1280, height: 800, devicePixelRatio: 1 }
      },
      selectedElement: {
        tagName: "A",
        id: "",
        classes: ["ytp-modern-videowall-still", "ytp-suggestion-set"],
        text: {
          value: "Midnight Focus Lofi - beats to study/code to",
          length: 45,
          truncated: false
        },
        rect: { x: 864, y: 341, width: 392, height: 204, top: 341, right: 1256, bottom: 545, left: 864 },
        html
      },
      locators: {
        cssSelector: "a.ytp-modern-videowall-still.ytp-suggestion-set:nth-of-type(3)",
        xpath: "/html[1]/body[1]/ytd-app[1]/a[3]",
        fullXPath: "/html[1]/body[1]/ytd-app[1]/a[3]",
        jsPath: 'document.querySelector("a.ytp-modern-videowall-still.ytp-suggestion-set:nth-of-type(3)")'
      },
      chromeCopyMenu: {
        copyElement: html,
        copyOuterHTML: html,
        copySelector: "a.ytp-modern-videowall-still.ytp-suggestion-set:nth-of-type(3)",
        copyJsPath: 'document.querySelector("a.ytp-modern-videowall-still.ytp-suggestion-set:nth-of-type(3)")',
        copyStyles: {
          mode: "practical",
          cssText: "display: block;",
          computed: { display: "block" }
        },
        copyXPath: "/html[1]/body[1]/ytd-app[1]/a[3]",
        copyFullXPath: "/html[1]/body[1]/ytd-app[1]/a[3]"
      },
      automation: {
        preferredLocator: {
          type: "playwright",
          value: 'page.getByRole("link", { name: "Midnight Focus Lofi - beats to study/code to" })',
          note: "Semantic locator candidate from role plus accessible name."
        },
        caveats: []
      },
      styles: { mode: "practical", computed: { display: "block" }, cssText: "display: block;" }
    }
  };

  window.__copiedText = "";
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      async writeText(text) {
        window.__copiedText = text;
      }
    }
  });
  window.chrome = {
    devtools: {
      inspectedWindow: {
        eval(_expression, callback) {
          callback(result, undefined);
        }
      },
      panels: {
        elements: {
          onSelectionChanged: {
            addListener() {}
          }
        }
      }
    }
  };
}
