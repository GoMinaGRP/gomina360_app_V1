import { defineConfig } from "drizzle-kit";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
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

  if (!host || !user || password === undefined || !database) {
    return DEFAULT_DATABASE_URL;
  }

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

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
});
