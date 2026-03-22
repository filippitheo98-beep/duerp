import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema.sqlite";

// Base SQLite locale (par PC) stockée dans `DUERP_USERDATA_DIR` quand disponible.
const userDataDir = process.env.DUERP_USERDATA_DIR;
const dbPath =
  process.env.DUERPP_SQLITE_PATH ??
  process.env.DUERP_SQLITE_PATH ??
  (userDataDir
    ? join(userDataDir, "duerp.sqlite")
    : join(process.cwd(), "duerp.sqlite"));

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

export const sqlite = new Database(dbPath);

// Active les contraintes FK (les schémas Drizzle s’appuient dessus).
sqlite.pragma("foreign_keys = ON");

export const db = drizzle({ client: sqlite, schema });

// Compatibilité : sur Postgres, le code utilise `db.execute(sql\`...\`)` (retourne { rows }).
// Sur SQLite (better-sqlite3), Drizzle expose `db.all(...) / db.get(...) / db.run(...)`.
// On injecte donc un alias minimal pour éviter de réécrire toute l’auth/storage.
(db as any).execute = async (query: any) => {
  const sqlText: string =
    typeof query === "string"
      ? query
      : typeof query?.sql === "string"
        ? query.sql
        : String(query);

  const normalized = sqlText.trim().toLowerCase();
  const isSelectish = normalized.startsWith("select") || normalized.startsWith("with") || normalized.startsWith("pragma");
  const hasReturning = /\breturning\b/i.test(sqlText);

  // SQLite ne renvoie pas toujours de lignes sur INSERT/UPDATE sans RETURNING.
  if (isSelectish || hasReturning) {
    const rows = (db as any).all ? await (db as any).all(query) : [];
    return { rows };
  }

  if (typeof (db as any).run === "function") {
    (db as any).run(query);
  }
  return { rows: [] };
};

// Certaines parties du code utilisent `pool.query` (Postgres uniquement).
// En mode SQLite, elles sont généralement skip via `if (!process.env.DATABASE_URL) return`.
export const pool = {
  async query() {
    throw new Error("pool PostgreSQL non disponible en mode SQLite");
  },
};

