const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

// Run the documented pnpm command from the project root. Avoid import.meta:
// Playwright transforms this helper for config loading on Windows.
const projectRoot = path.resolve(__dirname, "..");
const testBaseURL = "http://localhost:3100";
const defaultTestDatabaseURL = "postgresql://daosen:daosen_local_change_me@127.0.0.1:55432/daosen_test?schema=public";

/** Fail closed before any migration, seed, test mutation or cleanup. */
function assertTestDatabase(databaseURL = process.env.E2E_DATABASE_URL || defaultTestDatabaseURL) {
  if (process.env.E2E_ALLOW_DB_WRITE !== "true") {
    throw new Error("E2E stopped: set E2E_ALLOW_DB_WRITE=true to authorize writes to an isolated local *_test database.");
  }
  let target;
  try { target = new URL(databaseURL); }
  catch { throw new Error("E2E stopped: invalid test database URL."); }
  const database = decodeURIComponent(target.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(target.protocol)
    || !["localhost", "127.0.0.1"].includes(target.hostname)
    || !/^[a-z][a-z0-9_]*_test$/.test(database)
    || database.length > 63
    || target.hash
    || [...target.searchParams].some(([key, value]) => key !== "schema" || value !== "public")) {
    throw new Error("E2E stopped: only PostgreSQL on localhost/127.0.0.1 with a *_test database and public schema is permitted.");
  }
  return databaseURL;
}

function testEnvironment() {
  const databaseURL = assertTestDatabase();
  return {
    DATABASE_URL: databaseURL,
    E2E_DATABASE_URL: databaseURL,
    E2E_ALLOW_DB_WRITE: "true",
    NEXTAUTH_URL: testBaseURL,
    NEXTAUTH_SECRET: process.env.E2E_NEXTAUTH_SECRET || randomBytes(32).toString("hex"),
    ALLOW_DEMO_SEED: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_DIST_DIR: ".next-e2e",
  };
}

async function prepareTestDatabase() {
  const environment = { ...process.env, ...testEnvironment() };
  // This assertion happens before either child can modify the database.
  assertTestDatabase(environment.DATABASE_URL);
  const run = (entry, args) => execFileSync(process.execPath, [path.join(projectRoot, entry), ...args], {
    cwd: projectRoot, stdio: "inherit", env: environment, windowsHide: true,
  });
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
  run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
  console.log("Isolated E2E test database prepared; no reset or truncation was used.");
}

module.exports = prepareTestDatabase;
module.exports.projectRoot = projectRoot;
module.exports.testBaseURL = testBaseURL;
module.exports.defaultTestDatabaseURL = defaultTestDatabaseURL;
module.exports.assertTestDatabase = assertTestDatabase;
module.exports.testEnvironment = testEnvironment;

if (require.main === module) {
  void prepareTestDatabase().catch(() => {
    console.error("E2E database preparation failed; inspect the setup output above.");
    process.exitCode = 1;
  });
}
