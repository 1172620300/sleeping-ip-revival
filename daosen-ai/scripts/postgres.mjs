import { spawn, execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { existsSync, mkdirSync } from "node:fs";
import { cp, writeFile, unlink } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Optional local development helper. No system service/account is installed.
// Runtime binary copies may use the OS temp cache on Windows (see README).
const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, ".local/postgres");
const requireRuntime = createRequire(import.meta.resolve("embedded-postgres"));
const { Client } = requireRuntime("pg");
const run = promisify(execFile);
const platform = process.platform === "win32" ? "windows" : process.platform;
const nativeModule = await import(pathToFileURL(requireRuntime.resolve(`@embedded-postgres/${platform}-${process.arch}`)).href);
let binaryDirectory = path.dirname(nativeModule.postgres);

if (process.platform === "win32" && /[^\x00-\x7f]/.test(binaryDirectory)) {
  // PostgreSQL's Windows bootstrap embeds its library path into UTF-8 SQL.
  // A non-ASCII installation path can fail even though Node supports Unicode.
  const fingerprint = createHash("sha256").update(root).digest("hex").slice(0, 12);
  const cache = path.join(tmpdir(), `daosen-phase1-pg16.14-${fingerprint}`);
  if (/[^\x00-\x7f]/.test(cache)) {
    throw new Error("PostgreSQL on Windows needs an ASCII binary path. Use Docker or an ASCII project path.");
  }
  if (!existsSync(path.join(cache, "bin/postgres.exe"))) {
    await cp(path.resolve(binaryDirectory, ".."), cache, { recursive: true, errorOnExist: true });
  }
  binaryDirectory = path.join(cache, "bin");
  console.log("Windows PostgreSQL binary cache:", cache);
}
const executable = (name) => path.join(binaryDirectory, name + (process.platform === "win32" ? ".exe" : ""));
const connection = { host: "127.0.0.1", port: 55432, user: "daosen", password: "daosen_local_change_me", database: "postgres" };
mkdirSync(path.dirname(directory), { recursive: true });
let server;
let stopped = false;

async function stop() {
  if (stopped || !server || server.exitCode !== null) return;
  stopped = true;
  try {
    await run(executable("pg_ctl"), ["-D", directory, "stop", "-m", "fast", "-w"], { windowsHide: true, timeout: 15000 });
    console.log("Local PostgreSQL stopped; project database files retained.");
  } catch (error) {
    console.error("Could not stop local PostgreSQL cleanly:", error.message);
    process.exitCode = 1;
  }
}
process.once("SIGINT", () => { void stop(); });
process.once("SIGTERM", () => { void stop(); });

try {
  if (!existsSync(path.join(directory, "PG_VERSION"))) {
    const passwordFile = path.join(root, ".local", `init-password-${randomBytes(6).toString("hex")}`);
    await writeFile(passwordFile, connection.password, { mode: 0o600 });
    try {
      await run(executable("initdb"), [
        "-D", directory, "--username=daosen", `--pwfile=${passwordFile}`,
        "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C", "--lc-messages=C",
      ], { windowsHide: true, timeout: 30000, env: { ...process.env, LC_MESSAGES: "C" } });
    } finally {
      await unlink(passwordFile);
    }
  }
  if (existsSync(path.join(directory, "postmaster.pid"))) {
    let inactive = false;
    try {
      await run(executable("pg_ctl"), ["-D", directory, "status"], { windowsHide: true, timeout: 5000 });
    } catch (error) {
      // Exit 3 means no server is running. Let PostgreSQL itself validate and
      // recover a stale PID file after an interrupted terminal; never unlink it.
      if (error.code === 3) inactive = true;
      else throw new Error("Unable to verify the existing PostgreSQL process. Inspect its terminal before retrying.");
    }
    if (!inactive) throw new Error("This project's PostgreSQL is already running. Reuse its existing terminal.");
  }
  server = spawn(executable("postgres"), [
    "-D", directory, "-p", "55432", "-h", "127.0.0.1", "-c", "max_connections=30",
  ], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, LC_MESSAGES: "C" } });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PostgreSQL startup timed out")), 15000);
    server.once("error", (error) => { clearTimeout(timer); reject(error); });
    server.once("exit", (code) => { clearTimeout(timer); reject(new Error(`PostgreSQL exited: ${code}`)); });
    server.stderr.on("data", (chunk) => {
      const message = chunk.toString();
      if (process.env.DB_VERBOSE === "true") process.stderr.write(message);
      if (message.includes("database system is ready to accept connections")) { clearTimeout(timer); resolve(); }
    });
  });
  const client = new Client(connection);
  try {
    await client.connect();
    for (const name of ["daosen", "daosen_test"]) {
      const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
      if (result.rowCount === 0) await client.query(`CREATE DATABASE ${client.escapeIdentifier(name)}`);
    }
    const version = await client.query("SELECT version()");
    console.log(version.rows[0].version);
  } finally {
    await client.end();
  }
  console.log("Local PostgreSQL ready: 127.0.0.1:55432. Databases: daosen, daosen_test.");
  console.log("DATABASE_URL=postgresql://daosen:daosen_local_change_me@127.0.0.1:55432/daosen?schema=public");
  console.log("Keep this terminal open. Ctrl+C stops the server; data remains in .local/postgres.");
} catch (error) {
  console.error("Local PostgreSQL failed:", error.stderr || error.message);
  await stop();
  process.exitCode = 1;
}
