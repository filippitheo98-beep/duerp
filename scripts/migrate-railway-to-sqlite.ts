import { execSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { Pool } from "pg";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";

import * as pgSchema from "../shared/schema";
import * as sqliteSchema from "../shared/schema.sqlite";

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === null) return fallback ?? "";
  return v;
}

function parseArg(name: string, fallback: string): string {
  const flag = `--${name}=`;
  const fromArg = process.argv.find((a) => a.startsWith(flag));
  return fromArg ? fromArg.slice(flag.length) : fallback;
}

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const replace = hasArg("replace");

  const userDataDir =
    (process.env.DUER_USERDATA_DIR ?? process.env.DUERP_USERDATA_DIR)?.trim() ||
    parseArg("userDataDir", "");

  if (!userDataDir) {
    throw new Error(
      "Missing DUERP_USERDATA_DIR (ou --userDataDir=...). Exemple: --userDataDir=\"C:/Users/Filip/AppData/Roaming/rest-express\"",
    );
  }

  const sqlitePath =
    (process.env.DUERPP_SQLITE_PATH ?? process.env.DUERP_SQLITE_PATH ?? "").trim() ||
    parseArg("sqlitePath", join(userDataDir, "duerp.sqlite"));

  // Railway / Postgres
  const postgresUrl = (process.env.DATABASE_URL ?? "").trim();
  if (!postgresUrl) {
    throw new Error("Missing DATABASE_URL (Railway). Vérifie ton fichier .env à la racine.");
  }

  const duerpEnvPath = join(userDataDir, "duerp.env");
  // On force explicitement DATABASE_URL vide dans `duerp.env` pour que Drizzle-Kit SQLite soit choisi.
  function ensureDuerpEnvForceSqlite(): void {
    const raw = existsSync(duerpEnvPath) ? readFileSync(duerpEnvPath, "utf8") : "";
    const lines = raw.split(/\r?\n/);
    const filtered = lines.filter((l) => !l.trim().startsWith("DATABASE_URL=")).filter(Boolean);
    filtered.push("DATABASE_URL=");
    const next = filtered.join("\n") + "\n";

    mkdirSync(userDataDir, { recursive: true });
    writeFileSync(duerpEnvPath, next, "utf8");
  }

  ensureDuerpEnvForceSqlite();
  mkdirSync(userDataDir, { recursive: true });

  // 1) Créer / pousser la structure SQLite locale
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "", // forcer sqlite dans drizzle.config.ts
      DUERP_USERDATA_DIR: userDataDir,
      DUERP_SQLITE_PATH: sqlitePath,
    },
  });

  // 2) Option backup + vidage tables SQLite
  if (existsSync(sqlitePath)) {
    if (!replace) {
      const sqlite = new Database(sqlitePath);
      const count = sqlite.prepare("SELECT COUNT(*) as c FROM users").get()?.c ?? 0;
      sqlite.close();
      if (count > 0) {
        throw new Error(
          `SQLite semble déjà contenir des données (users>0) dans ${sqlitePath}. Relance avec --replace si tu veux écraser.`,
        );
      }
    }
    if (replace) {
      const bak = `${sqlitePath}.bak.${Date.now()}`;
      copyFileSync(sqlitePath, bak);
    }
  }

  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");

  const sqliteTableNames = [
    "users",
    "companies",
    "duerp_documents",
    "actions",
    "comments",
    "uploaded_documents",
    "risk_templates",
    "risk_library",
    "sectors",
    "risk_families",
    "custom_measures",
  ];

  for (const tableName of sqliteTableNames) {
    sqlite.exec(`DELETE FROM ${tableName}`);
  }

  // 3) Import Railway -> SQLite
  const pgPool = new Pool({ connectionString: postgresUrl });
  const pgDb = drizzle({ client: pgPool, schema: pgSchema });
  const sqliteDb = drizzleSqlite({ client: sqlite, schema: sqliteSchema });

  const pairs: Array<{ pgKey: keyof typeof pgSchema; sqliteKey: keyof typeof sqliteSchema }> = [
    { pgKey: "users", sqliteKey: "users" },
    { pgKey: "companies", sqliteKey: "companies" },
    { pgKey: "duerpDocuments", sqliteKey: "duerpDocuments" },
    { pgKey: "actions", sqliteKey: "actions" },
    { pgKey: "comments", sqliteKey: "comments" },
    { pgKey: "uploadedDocuments", sqliteKey: "uploadedDocuments" },
    { pgKey: "riskTemplates", sqliteKey: "riskTemplates" },
    { pgKey: "riskLibrary", sqliteKey: "riskLibrary" },
    { pgKey: "sectors", sqliteKey: "sectors" },
    { pgKey: "riskFamilies", sqliteKey: "riskFamilies" },
    { pgKey: "customMeasures", sqliteKey: "customMeasures" },
  ];

  const chunkSize = 200;
  for (const { pgKey, sqliteKey } of pairs) {
    const pgTable: any = (pgSchema as any)[pgKey];
    const sqliteTable: any = (sqliteSchema as any)[sqliteKey];

    const rows: any[] = await pgDb.select().from(pgTable);
    console.log(`[migrate] ${String(sqliteKey)} -> ${rows.length} lignes`);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await sqliteDb.insert(sqliteTable).values(chunk as any);
    }
  }

  // 4) Mettre à jour sqlite_sequence (next ids)
  for (const t of sqliteTableNames) {
    try {
      const maxId = sqlite.prepare(`SELECT MAX(id) as m FROM ${t}`).get()?.m;
      if (maxId === null || maxId === undefined) continue;
      sqlite.exec(`UPDATE sqlite_sequence SET seq = ${Number(maxId)} WHERE name = '${t}'`);
    } catch {
      // ignore
    }
  }

  // 5) Check rapide
  const checkUsers = sqlite.prepare("SELECT COUNT(*) as c FROM users").get()?.c ?? 0;
  console.log(`[migrate] OK: users=${checkUsers}`);

  sqlite.close();
  await pgPool.end();
}

main().catch((e) => {
  console.error("[migrate] FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});

