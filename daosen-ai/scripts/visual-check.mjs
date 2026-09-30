import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Read-only UI captures with seeded Demo accounts; never persist cookies or secrets.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".local/playwright");
const { chromium } = await import("@playwright/test");
const origin = "http://localhost:3000";
const output = path.resolve(".impeccable/review");
const results = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [size, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    async function capture(name, route) {
      const response = await page.goto(origin + route, { waitUntil: "networkidle" });
      await page.getByRole("heading", { level: 1 }).waitFor();
      if (route === "/admin") await page.getByText("designer@demo.daosen.ai", { exact: true }).waitFor();
      const result = {
        size, route, status: response?.status(),
        overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        errors: [...errors],
      };
      await page.screenshot({ path: path.join(output, `${size}-${name}.png`), fullPage: true });
      results.push(result);
      console.log(JSON.stringify(result));
      assert.equal(result.status, 200, `${size} ${route}: failed response`);
      assert.equal(result.overflow, false, `${size} ${route}: horizontal overflow`);
      assert.deepEqual(result.errors, [], `${size} ${route}: browser errors`);
    }
    for (const [name, route] of [["overview", "/"], ["login", "/login"], ["register", "/register"]]) {
      await capture(name, route);
    }
    await page.goto(origin + "/login");
    await page.getByLabel("邮箱", { exact: false }).fill("admin@demo.daosen.ai");
    await page.getByLabel("密码", { exact: false }).fill("Daosen@2026!");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await page.waitForURL(origin + "/account");
    await capture("account", "/account");
    await capture("admin", "/admin");
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, "visual-results.json"), JSON.stringify(results, null, 2) + "\n");
}
