import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Database connection — hardened against two production failure modes:
 *
 * 1. BOOT FAILURE: the module used to THROW at import time when
 *    DATABASE_URL was unset. Next.js loads this module for EVERY API route,
 *    so a missing env var (e.g. the prod server restarted without the env,
 *    or a sandbox reset wiped the untracked .env file) took down the entire
 *    API surface — sign-in and the public menu included. The workspace-local
 *    default below is the same connection string already committed in
 *    drizzle.config.json; DATABASE_URL still overrides it in real
 *    deployments.
 *
 * 2. PROCESS CRASH ON DB OUTAGE: pg.Pool emits "error" from IDLE clients
 *    when the PostgreSQL server restarts or the network drops. Without a
 *    listener that event is UNHANDLED and kills the whole Next.js process —
 *    the app then serves 500s ("database connection") until someone manually
 *    restarts it. The listener below logs and discards the dead client so
 *    the server survives the outage; the pool reconnects automatically on
 *    the next query once PostgreSQL is back.
 */
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set — falling back to the workspace-local " +
      "PostgreSQL default (see drizzle.config.json)."
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // Keep the pool resilient: fail a hung connection attempt in 10s instead
    // of hanging past the request timeout, and recycle idle clients so stale
    // sockets left by a DB restart are never reused.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });

// Attach once per pool instance (the pool is reused across HMR reloads in
// dev via globalThis — re-attaching would duplicate listeners).
if (!(pool as unknown as { __gominaErrorGuard?: boolean }).__gominaErrorGuard) {
  pool.on("error", (err) => {
    // Idle-client error (DB restarted / socket dropped). Logging instead of
    // crashing keeps the Node process alive; the pool opens a fresh client
    // on the next query.
    console.error("[db] idle client error (connection lost):", err.message);
  });
  (pool as unknown as { __gominaErrorGuard?: boolean }).__gominaErrorGuard = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
