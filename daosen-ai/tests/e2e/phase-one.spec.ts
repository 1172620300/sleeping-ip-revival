import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient, type AccountStatusCode, type RoleCode } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { assertTestDatabase, testBaseURL } from "../../scripts/test-setup.cjs";

const databaseURL = assertTestDatabase();
const db = new PrismaClient({ datasources: { db: { url: databaseURL } } });
const password = "E2e-only-password-2026!";
const demoPassword = "Daosen@2026!";
const ownedAccounts = new Map<string, string>();
const safeKeys = ["email", "id", "name", "reviewNote", "role", "status"];

function email() { return `phase1-${randomUUID()}@example.test`; }

function track(user: { id: string; email: string }) {
  if (!user.email.startsWith("phase1-") || !user.email.endsWith("@example.test")) {
    throw new Error("Refusing ownership of a non-test account.");
  }
  ownedAccounts.set(user.id, user.email);
}

async function register(request: APIRequestContext, role = "DESIGNER") {
  const address = email();
  const response = await request.post("/api/platform/register", {
    headers: { Origin: testBaseURL },
    data: { name: "自动测试账户", email: address, password, role },
  });
  expect(response.status()).toBe(201);
  const payload = await response.json();
  track(payload.user);
  return payload.user;
}

async function signIn(request: APIRequestContext, address: string, passphrase = demoPassword) {
  const csrf = await request.get("/api/auth/csrf");
  expect(csrf.ok()).toBe(true);
  const { csrfToken } = await csrf.json();
  return request.post("/api/auth/callback/credentials", {
    headers: { Origin: testBaseURL },
    form: { csrfToken, email: address, password: passphrase, callbackUrl: `${testBaseURL}/account`, json: "true" },
  });
}

async function signOut(request: APIRequestContext) {
  const { csrfToken } = await (await request.get("/api/auth/csrf")).json();
  const response = await request.post("/api/auth/signout", {
    headers: { Origin: testBaseURL }, form: { csrfToken, callbackUrl: testBaseURL, json: "true" },
  });
  expect(response.ok()).toBe(true);
  expect(await (await request.get("/api/platform/session")).json()).toEqual({ user: null });
}

async function createOwnedAccount(role: RoleCode, status: AccountStatusCode) {
  assertTestDatabase(databaseURL);
  const id = `e2e-${randomUUID()}`;
  const address = email();
  ownedAccounts.set(id, address);
  return db.user.create({
    data: { id, email: address, name: "临时权限测试", passwordHash: await hash(password, 12), role, status },
    select: { id: true, email: true },
  });
}

async function loginInBrowser(page: Page, address: string, passphrase = demoPassword) {
  await page.goto("/login");
  await page.getByLabel("邮箱", { exact: false }).fill(address);
  await page.getByLabel("密码", { exact: false }).fill(passphrase);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "我的账户", exact: true })).toBeVisible();
}

test.afterAll(async () => {
  try {
    assertTestDatabase(databaseURL);
    // Exact IDs + matching random test emails only; never delete seeded/demo users.
    for (const [id, address] of ownedAccounts) {
      await db.user.deleteMany({ where: { id, email: address } });
    }
  } finally { await db.$disconnect(); }
});

test("anonymous API and server pages enforce login", async ({ page }) => {
  const request = page.request;
  expect(await (await request.get("/api/platform/session")).json()).toEqual({ user: null });
  expect((await request.get("/api/platform/users")).status()).toBe(401);
  for (const path of ["/account", "/admin"]) {
    // App Router may stream a redirect with HTTP 200 after a loading boundary.
    // Verify actual navigation and absence of protected UI, not a 307 header.
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "登录", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^(我的账户|账号目录)$/ })).toHaveCount(0);
  }
});

for (const [prefix, role] of [["designer", "DESIGNER"], ["store", "STORE_OWNER"], ["staff", "STAFF"], ["admin", "ADMIN"]]) {
  test(`${role}: login, own data, directory permission and logout`, async ({ page }) => {
    const request = page.request; // API login and browser navigation share cookies.
    const address = `${prefix}@demo.daosen.ai`;
    expect((await signIn(request, address)).ok()).toBe(true);
    const response = await request.get("/api/platform/session?userId=another-user&id=admin");
    expect(response.status()).toBe(200);
    const { user } = await response.json();
    expect(Object.keys(user).sort()).toEqual(safeKeys);
    expect(user).toMatchObject({ email: address, role, status: "APPROVED" });
    expect((await request.get("/account")).status()).toBe(200);
    const directory = await request.get("/api/platform/users");
    if (role === "ADMIN") {
      expect(directory.status()).toBe(200);
      const { users } = await directory.json();
      expect(users.length).toBeGreaterThanOrEqual(7);
      for (const entry of users) expect(Object.keys(entry).sort()).toEqual(safeKeys);
      expect((await request.get("/admin")).status()).toBe(200);
      expect((await request.patch("/api/platform/users", { data: { role: "ADMIN" } })).status()).toBe(405);
    } else {
      expect(directory.status()).toBe(403);
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/account$/);
      await expect(page.getByRole("heading", { name: "我的账户", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "账号目录", exact: true })).toHaveCount(0);
      await expect(page.getByText(address, { exact: true })).toBeVisible();
    }
    await signOut(request);
    expect((await request.get("/api/platform/users")).status()).toBe(401);
  });
}

for (const role of ["DESIGNER", "STORE_OWNER"]) {
  test(`register ${role}: persisted hash, PENDING default and duplicate protection`, async ({ request }) => {
    const user = await register(request, role);
    expect(user).toMatchObject({ role, status: "PENDING" });
    expect(Object.keys(user).sort()).toEqual(safeKeys);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await compare(password, stored.passwordHash)).toBe(true);
    const duplicate = await request.post("/api/platform/register", {
      headers: { Origin: testBaseURL },
      data: { name: "重复演示账户", email: `  ${user.email.toUpperCase()}  `, password, role },
    });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: "EMAIL_EXISTS" });
    expect((await signIn(request, user.email, password)).ok()).toBe(true);
    expect((await request.get("/api/platform/users")).status()).toBe(403);
    expect((await (await request.get("/api/platform/session")).json()).user.status).toBe("PENDING");
  });
}

test("register rejects privilege injection, invalid password and malformed fields", async ({ request }) => {
  for (const override of [
    { role: "ADMIN" }, { role: "STAFF" }, { status: "APPROVED" }, { id: "admin" },
    { passwordHash: "injected" }, { password: "too-short" }, { password: "密".repeat(25) },
    { email: "not-an-email" },
  ]) {
    const response = await request.post("/api/platform/register", {
      headers: { Origin: testBaseURL },
      data: { name: "非法输入测试", email: email(), password, role: "DESIGNER", ...override },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  }
});

test("registration requires same origin, bounded JSON and valid content type", async ({ request }) => {
  const data = { name: "请求边界测试", email: email(), password, role: "DESIGNER" };
  expect((await request.post("/api/platform/register", { data })).status()).toBe(403);
  expect((await request.post("/api/platform/register", { data, headers: { Origin: "https://other.example.test" } })).status()).toBe(403);
  expect((await request.post("/api/platform/register", { data: "{}", headers: { Origin: testBaseURL, "Content-Type": "text/plain" } })).status()).toBe(415);
  expect((await request.post("/api/platform/register", { data: "{", headers: { Origin: testBaseURL, "Content-Type": "application/json" } })).status()).toBe(400);
  expect((await request.post("/api/platform/register", { data: JSON.stringify({ content: "x".repeat(17_000) }), headers: { Origin: testBaseURL, "Content-Type": "application/json" } })).status()).toBe(413);
});

test("invalid password, unknown account and disabled account cannot login", async ({ request }) => {
  for (const [address, passphrase] of [
    ["designer@demo.daosen.ai", "incorrect-demo-password"],
    [email(), demoPassword],
    ["disabled@demo.daosen.ai", demoPassword],
  ]) {
    expect((await signIn(request, address, passphrase)).ok()).toBe(false);
    expect(await (await request.get("/api/platform/session")).json()).toEqual({ user: null });
  }
});

for (const [prefix, status] of [["pending", "PENDING"], ["rejected", "REJECTED"]]) {
  test(`${status} may read own status but cannot access the directory`, async ({ request }) => {
    expect((await signIn(request, `${prefix}@demo.daosen.ai`)).ok()).toBe(true);
    const { user } = await (await request.get("/api/platform/session")).json();
    expect(user.status).toBe(status);
    expect((await request.get("/account")).status()).toBe(200);
    expect((await request.get("/api/platform/users")).status()).toBe(403);
  });
}

test("an existing session loses access immediately when its owned account is disabled", async ({ page }) => {
  const request = page.request;
  const user = await createOwnedAccount("ADMIN", "APPROVED");
  expect((await signIn(request, user.email, password)).ok()).toBe(true);
  expect((await request.get("/api/platform/users")).status()).toBe(200);
  assertTestDatabase(databaseURL);
  await db.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
  expect(await (await request.get("/api/platform/session")).json()).toEqual({ user: null });
  expect((await request.get("/api/platform/users")).status()).toBe(401);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "登录", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "我的账户", exact: true })).toHaveCount(0);
});

test("deleted owned accounts invalidate existing sessions", async ({ request }) => {
  const user = await createOwnedAccount("DESIGNER", "APPROVED");
  expect((await signIn(request, user.email, password)).ok()).toBe(true);
  assertTestDatabase(databaseURL);
  await db.user.delete({ where: { id: user.id } });
  expect(await (await request.get("/api/platform/session")).json()).toEqual({ user: null });
});

test("pending ADMIN and freshly demoted ADMIN cannot use stale JWT privileges", async ({ request }) => {
  const user = await createOwnedAccount("ADMIN", "PENDING");
  expect((await signIn(request, user.email, password)).ok()).toBe(true);
  expect((await request.get("/api/platform/users")).status()).toBe(403);
  assertTestDatabase(databaseURL);
  await db.user.update({ where: { id: user.id }, data: { status: "APPROVED" } });
  expect((await request.get("/api/platform/users")).status()).toBe(200);
  await db.user.update({ where: { id: user.id }, data: { role: "DESIGNER" } });
  expect((await request.get("/api/platform/users")).status()).toBe(403);
});

test("browser registration, login and logout form a complete usable flow", async ({ page }) => {
  const address = email();
  await page.goto("/register");
  await page.getByLabel("演示姓名").fill("浏览器测试");
  await page.getByLabel("演示邮箱").fill(address);
  await page.getByLabel("身份", { exact: false }).selectOption("STORE_OWNER");
  await page.getByLabel("演示密码").fill(password);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/platform/register") && response.request().method() === "POST");
  await page.getByRole("button", { name: "创建账户", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  track((await response.json()).user);
  await expect(page.getByRole("heading", { name: "账户已创建" })).toBeVisible();
  await loginInBrowser(page, address, password);
  await expect(page.getByText(address, { exact: true })).toBeVisible();
  await expect(page.locator(".account-details").getByText("PENDING", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await expect(page).toHaveURL(testBaseURL + "/");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("browser administrator directory is readable and non-editable", async ({ page }) => {
  await loginInBrowser(page, "admin@demo.daosen.ai");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "账号目录", exact: true })).toBeVisible();
  await expect(page.getByText("designer@demo.daosen.ai", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /审核|删除|修改角色/ })).toHaveCount(0);
});

test("mobile account and auth pages do not overflow the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/login", "/register"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await loginInBrowser(page, "designer@demo.daosen.ai");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "打开导航" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeHidden();
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "总览", exact: true }).click();
  await expect(page).toHaveURL(testBaseURL + "/");
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeHidden();
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("button", { name: "关闭导航" }).click();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeHidden();
});

test("mobile navigation is only enabled after hydration, including slow script loading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => { releaseScripts = resolve; });
  await page.route(/\/_next\/.*\.js(?:\?.*)?$/, async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    const menu = page.getByRole("button", { name: "打开导航" });
    await expect(menu).toBeVisible();
    await expect(menu).toBeDisabled();
    releaseScripts();
    await expect(menu).toBeEnabled();
    await menu.click();
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
    await expect(page.getByRole("button", { name: "关闭导航" })).toHaveAttribute("aria-expanded", "true");
  } finally {
    releaseScripts();
    await page.unrouteAll({ behavior: "wait" });
  }
});
