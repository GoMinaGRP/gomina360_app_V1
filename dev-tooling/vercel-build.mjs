import { spawnSync } from "node:child_process";

const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  // Prefer a non-pooled URL for schema changes when DATABASE_URL is absent.
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_DATABASE_URL",
  "NEON_DATABASE_URL",
  "POSTGRES_URL_NO_SSL",
];

function resolveDatabaseUrl() {
  for (const key of DATABASE_URL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  const host = (
    process.env.PGHOST_UNPOOLED ??
    process.env.POSTGRES_HOST_UNPOOLED ??
    process.env.PGHOST ??
    process.env.POSTGRES_HOST
  )?.trim();
  const user = (process.env.PGUSER ?? process.env.POSTGRES_USER)?.trim();
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD;
  const database = (process.env.PGDATABASE ?? process.env.POSTGRES_DATABASE)?.trim();

  if (!host || !user || password === undefined || !database) return undefined;

  const port = (
    process.env.PGPORT_UNPOOLED ??
    process.env.POSTGRES_PORT_UNPOOLED ??
    process.env.PGPORT ??
    process.env.POSTGRES_PORT ??
    "5432"
  ).trim();
  const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  const sslMode = process.env.PGSSLMODE?.trim() || "require";
  const query = sslMode ? `?sslmode=${encodeURIComponent(sslMode)}` : "";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${normalizedHost}:${port}/${encodeURIComponent(database)}${query}`;
}

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error(
    "[vercel-build] A hosted PostgreSQL connection is required. Set DATABASE_URL or a supported Vercel/Neon POSTGRES_* variable before deploying."
  );
  process.exit(1);
}

const childEnv = {
  ...process.env,
  // Normalize aliases for the Drizzle CLI and the TypeScript seed runner.
  DATABASE_URL: databaseUrl,
};
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: childEnv,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[vercel-build] Could not run ${command}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Drizzle push is intentionally not forced: additive changes are applied, but
// a destructive drift is rejected instead of risking production data.
run(npx, ["drizzle-kit", "push", "--config", "./drizzle.config.ts"]);

// The seed is idempotent and only inserts missing demo/catalog records. It
// never truncates or reinitializes an existing database.
run(npx, ["tsx", "dev-tooling/seed-production.ts"]);
run(npx, ["next", "build"]);
