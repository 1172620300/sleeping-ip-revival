import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
if (!existsSync(path.join(projectRoot, ".env"))) {
  copyFileSync(path.join(projectRoot, ".env.example"), path.join(projectRoot, ".env"));
  console.log("Created .env from demo placeholders. Set a random NEXTAUTH_SECRET before starting the app.");
}
// Invoke JS entry points directly: portable on Windows without shell interpolation.
const run = (entry, args) => execFileSync(process.execPath, [path.join(projectRoot, entry), ...args], {
  cwd: projectRoot,
  stdio: "inherit",
});
try {
  run("node_modules/prisma/build/index.js", ["generate"]);
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
  run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
  console.log("Phase 1 database initialized. Start the app with pnpm dev.");
} catch {
  console.error("Setup stopped. Start PostgreSQL (docker compose up -d postgres OR pnpm db:local), check DATABASE_URL, then retry pnpm setup.");
  process.exitCode = 1;
}
