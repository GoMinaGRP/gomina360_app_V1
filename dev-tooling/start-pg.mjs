// Starts the workspace-local PostgreSQL (embedded-postgres) on 127.0.0.1:5432
// with data dir $PGDATA (default /home/user/pgtooling/pgdata).
// Deps resolve from /home/user/pgtooling/node_modules (see recover.sh).
//
// Restart-safe: initialise() previously ran UNCONDITIONALLY, and newer
// embedded-postgres versions abort initdb when the data dir already exists
// ("directory exists but is not empty") — so after a Postgres crash/restart
// (data intact, postmaster dead), this script died in a boot loop and the
// database stayed down while pgdata sat healthy on disk. Now:
//   • existing cluster (PG_VERSION present) → SKIP initdb, just start
//     (never reinitialise over live data — preserves all existing DB data)
//   • stale postmaster.pid from a hard kill → removed only when the PID it
//     names is no longer running
import { createRequire } from "node:module";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const req = createRequire("/home/user/pgtooling/package.json");
const EmbeddedPostgres = req("embedded-postgres").default ?? req("embedded-postgres");

const dataDir = process.env.PGDATA || "/home/user/pgtooling/pgdata";
const clusterExists = existsSync(join(dataDir, "PG_VERSION"));

// Clear a stale lock ONLY if the postmaster it names is genuinely gone.
const pidFile = join(dataDir, "postmaster.pid");
if (clusterExists && existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, "utf8").split("\n")[0]);
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch { /* ESRCH → dead */ }
  if (alive) {
    console.error(`postmaster.pid says PID ${pid} is alive — refusing to start a second postmaster`);
    process.exit(1);
  }
  console.log(`stale postmaster.pid (PID ${pid} not running) — removing`);
  rmSync(pidFile, { force: true });
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

if (clusterExists) {
  console.log(`existing PostgreSQL cluster found in ${dataDir} — skipping initdb (data preserved)`);
} else {
  await pg.initialise();
  console.log("fresh cluster initialised");
}

await pg.start();
console.log("PG started on 5432");
try {
  await pg.createDatabase("app_db");
  console.log("app_db created");
} catch (e) {
  console.log("createDatabase: " + e.message);
}
setInterval(() => {}, 1 << 30);
