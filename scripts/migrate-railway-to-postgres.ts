import { Pool } from "pg";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

import * as pgSchema from "../shared/schema";

dotenv.config();

function parseArg(name: string, fallback = ""): string {
  const flag = `--${name}=`;
  const fromArg = process.argv.find((a) => a.startsWith(flag));
  return fromArg ? fromArg.slice(flag.length) : fallback;
}

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const sourceUrl = (process.env.SOURCE_DATABASE_URL ?? parseArg("sourceDatabaseUrl", "") ?? "").trim();
  const destUrl = (process.env.DEST_DATABASE_URL ?? parseArg("destDatabaseUrl", "") ?? "").trim();

  if (!sourceUrl) throw new Error("Missing SOURCE_DATABASE_URL (Railway) ou --sourceDatabaseUrl=...");
  if (!destUrl) throw new Error("Missing DEST_DATABASE_URL (VPS) ou --destDatabaseUrl=...");

  const replace = hasArg("replace");
  const chunkSize = Number(process.env.CHUNK_SIZE ?? 500);

  const sourcePool = new Pool({ connectionString: sourceUrl });
  const destPool = new Pool({ connectionString: destUrl });

  const sourceDb = drizzle({ client: sourcePool, schema: pgSchema });
  const destDb = drizzle({ client: destPool, schema: pgSchema });

  const tableOrder: Array<{ key: keyof typeof pgSchema; sqlName: string; serialId?: boolean }> = [
    { key: "companies", sqlName: "companies", serialId: true },
    { key: "users", sqlName: "users", serialId: true },
    { key: "duerpDocuments", sqlName: "duerp_documents", serialId: true },
    { key: "uploadedDocuments", sqlName: "uploaded_documents", serialId: true },
    { key: "actions", sqlName: "actions", serialId: true },
    { key: "comments", sqlName: "comments", serialId: true },
    { key: "riskTemplates", sqlName: "risk_templates", serialId: true },
    { key: "riskLibrary", sqlName: "risk_library", serialId: true },
    { key: "sectors", sqlName: "sectors", serialId: true },
    { key: "riskFamilies", sqlName: "risk_families", serialId: true },
    { key: "customMeasures", sqlName: "custom_measures", serialId: true },
    // Tables de sync (dépendent principalement de `users`)
    { key: "outboxEvents", sqlName: "outbox_events", serialId: true },
    { key: "syncState", sqlName: "sync_state" },
  ];

  if (replace) {
    const truncateSql = `
      TRUNCATE TABLE
        outbox_events,
        sync_state,
        comments,
        actions,
        uploaded_documents,
        duerp_documents,
        users,
        companies,
        risk_templates,
        risk_library,
        sectors,
        risk_families,
        custom_measures
      RESTART IDENTITY CASCADE
    `;
    console.log("[migrate] replace=true => TRUNCATE dest (avec CASCADE)...");
    await destPool.query(truncateSql);
  } else {
    console.log("[migrate] replace=false => le script suppose que les tables dest sont vides.");
  }

  for (const { key, sqlName } of tableOrder) {
    const table: any = (pgSchema as any)[key];

    const rows: any[] = await sourceDb.select().from(table);
    console.log(`[migrate] ${sqlName} => ${rows.length} lignes`);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      if (!chunk.length) continue;
      await destDb.insert(table).values(chunk as any);
    }
  }

  // Met à jour les sequences SERIAL pour éviter des conflits futurs sur `id`.
  // (Ne s'applique qu'aux tables avec une colonne `id` serial.)
  for (const t of tableOrder) {
    if (!t.serialId) continue;
    const seqSql = `
      SELECT setval(
        pg_get_serial_sequence('${t.sqlName}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${t.sqlName}), 0),
        true
      );
    `;
    await destPool.query(seqSql);
  }

  await sourcePool.end();
  await destPool.end();
  console.log("[migrate] OK");
}

main().catch((e) => {
  console.error("[migrate] FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});

