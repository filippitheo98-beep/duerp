/**
 * Resynchronise les séquences PostgreSQL (companies, etc.) après import CSV.
 * Usage: npm run db:fix-sequence
 * Nécessite DATABASE_URL (.env ou variable d'environnement).
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

try {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
} catch {
  // ignorer
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL doit être défini (.env ou variable d'environnement).");
    process.exit(1);
  }
  const { pool } = await import("../server/db");
  const tables = ["companies", "sectors", "risk_families", "risk_library", "users", "duerp_documents", "actions", "comments", "risk_templates", "custom_measures", "uploaded_documents"];
  for (const table of tables) {
    try {
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${table}), true)`,
      );
      console.log(`  [ok] ${table}`);
    } catch (e) {
      console.log(`  [skip] ${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("Séquences resynchronisées.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
