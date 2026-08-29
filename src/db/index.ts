import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database connection — hardened against production connection and outage
 * failures while keeping the workspace-local default useful for development.
 */
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

/**
 * Vercel integrations have used a few different names for the same hosted
 * PostgreSQL connection over time. Prefer an explicitly configured URL, then
 * fall back to the component variables exposed by Neon/Vercel Postgres.
 */
const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_DATABASE_URL",
  "NEON_DATABASE_URL",
  "POSTGRES_URL_NO_SSL",
] as const;

function readConfiguredDatabaseUrl() {
  for (const key of DATABASE_URL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  const host = (
    process.env.PGHOST ??
    process.env.POSTGRES_HOST
  )?.trim();
  const user = (process.env.PGUSER ?? process.env.POSTGRES_USER)?.trim();
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD;
  const database = (process.env.PGDATABASE ?? process.env.POSTGRES_DATABASE)?.trim();

  if (!host || !user || password === undefined || !database) return undefined;

  const port = (process.env.PGPORT ?? process.env.POSTGRES_PORT ?? "5432").trim();
  const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  const sslMode =
    process.env.PGSSLMODE?.trim() ||
    (process.env.VERCEL === "1" || process.env.VERCEL_ENV ? "require" : "");
  const query = sslMode ? `?sslmode=${encodeURIComponent(sslMode)}` : "";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${normalizedHost}:${port}/${encodeURIComponent(database)}${query}`;
}

const configuredDatabaseUrl = readConfiguredDatabaseUrl();
const runningOnVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

if (!configuredDatabaseUrl && runningOnVercel) {
  throw new Error(
    "[db] No hosted PostgreSQL connection is configured. Set DATABASE_URL or a supported Vercel/Neon POSTGRES_* connection variable."
  );
}

if (!configuredDatabaseUrl) {
  console.warn(
    "[db] DATABASE_URL is not set — falling back to the workspace-local " +
      "PostgreSQL default (see drizzle.config.ts)."
  );
}

const databaseUrl = configuredDatabaseUrl ?? DEFAULT_DATABASE_URL;

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
    max: Number(process.env.PGPOOL_MAX ?? 5),
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

export const db = drizzle(pool, {
  schema,
});
