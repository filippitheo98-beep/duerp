import { defineConfig } from "drizzle-kit";
import "./server/env";

import { join } from "path";

const usingPostgres = !!process.env.DATABASE_URL;
const userDataDir = process.env.DUERP_USERDATA_DIR;
const sqliteDbPath =
  process.env.DUERP_SQLITE_PATH ??
  (userDataDir ? join(userDataDir, "duerp.sqlite") : join(process.cwd(), "duerp.sqlite"));

export default defineConfig({
  out: "./migrations",
  schema: usingPostgres ? "./shared/schema.ts" : "./shared/schema.sqlite.ts",
  dialect: usingPostgres ? "postgresql" : "sqlite",
  dbCredentials: usingPostgres
    ? { url: process.env.DATABASE_URL as string }
    : { url: `file:${sqliteDbPath}` },
});
