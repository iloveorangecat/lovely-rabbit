// Render the original SVG mark to the three installable PWA icon sizes.
// Uses the project's Playwright Chromium; no network or image API is involved.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const svg = await readFile(
  new URL("../public/icon.svg", import.meta.url),
  "utf8",
);
const browser = await chromium.launch();
try {
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["maskable-512.png", 512],
  ]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%;display:block}</style>${svg}`,
    );
    await page.screenshot({
      path: new URL(`../public/${name}`, import.meta.url).pathname.replace(
        /^\/(.:\/)/,
        "$1",
      ),
    });
    await page.close();
  }
} finally {
  await browser.close();
}
