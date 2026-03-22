/**
 * Importe les CSV exportés de Replit vers la base PostgreSQL (Railway ou local).
 * Usage: npm run db:import-csv [dossier]
 * Par défaut: ./data (placez vos .csv dans ce dossier).
 *
 * Ordre d'import respectant les clés étrangères:
 * companies → sectors, risk_families, risk_library → users → duerp_documents → actions, comments, etc.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Charger .env en local (optionnel)
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

import { parse } from "csv-parse/sync";

const KNOWN_TABLES = ["companies", "sectors", "risk_families", "risk_library", "users", "duerp_documents", "actions", "comments", "risk_templates", "custom_measures", "uploaded_documents"];
const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const REPLACE = process.argv.includes("--replace");
const arg1 = argv[0];
const arg2 = argv[1];
const onlyTableArg = KNOWN_TABLES.includes((arg1 || "").toLowerCase().replace(/-/g, "_")) ? arg1 : arg2;
const DATA_DIR = onlyTableArg === arg1 ? join(process.cwd(), "data") : (arg1 || join(process.cwd(), "data"));
const ONLY_TABLE = onlyTableArg?.toLowerCase().replace(/-/g, "_");

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Retire les guillemets autour des valeurs (ex. """2025-12-19...""" ou "true") */
function normalizeValue(val: string): string {
  if (typeof val !== "string") return val;
  return val.replace(/^["']+|["']+$/g, "").trim();
}

function parseValue(val: string, key: string): unknown {
  const v = normalizeValue(val);
  if (v === "" || v === "\\N") return null;
  if (key === "id" || key.endsWith("Id") || key.endsWith("_id") || key === "employee_count" || key === "file_size") {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }
  if (key === "is_active" || key === "revision_notified") {
    return v === "t" || v === "true" || v === "1";
  }
  if (
    key.includes("at") ||
    key === "due_date" ||
    key === "approved_at" ||
    key === "next_review_date" ||
    key === "last_revision_date" ||
    key === "completed_at" ||
    key === "uploaded_at"
  ) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  // Colonnes JSON (pas "measures" de risk_library qui est du texte)
  const jsonKeys = ["work_units_data", "sites", "locations", "work_stations", "final_risks", "prevention_measures", "global_prevention_measures", "existing_prevention_measures"];
  if (jsonKeys.includes(key) || key.endsWith("_data")) {
    try {
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }
  return v;
}

/** Retire les guillemets autour des noms de colonnes (CSV exporté avec "id","family",...) */
function normalizeKey(key: string): string {
  return key.replace(/^["']|["']$/g, "").trim();
}

function csvRowToRecord(row: Record<string, string>, tableColumns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const rawKey = normalizeKey(k);
    const camel = snakeToCamel(rawKey);
    if (!tableColumns.includes(camel)) continue;
    out[camel] = parseValue(typeof v === "string" ? v : String(v), rawKey);
  }
  return out;
}

const RISK_LIBRARY_CSV_COLUMNS = ["id", "family", "sector", "hierarchy_level", "situation", "description", "default_gravity", "default_frequency", "default_control", "measures", "source", "inrs_code", "keywords", "is_active", "created_at"];

async function importTable(
  tableName: string,
  columns: string[],
  insert: (rows: Record<string, unknown>[]) => Promise<unknown>,
): Promise<number> {
  const path = join(DATA_DIR, `${tableName}.csv`);
  if (!existsSync(path)) {
    console.log(`  [skip] ${tableName}.csv absent`);
    return 0;
  }
  let raw = readFileSync(path, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // BOM UTF-8
  const parseOpts: Parameters<typeof parse>[1] = { skip_empty_lines: true, trim: true };
  if (tableName === "risk_library") {
    parseOpts.columns = RISK_LIBRARY_CSV_COLUMNS;
    parseOpts.from_line = 2;
  } else {
    parseOpts.columns = true;
  }
  const rows = parse(raw, parseOpts);
  if (rows.length === 0) {
    console.log(`  [skip] ${tableName}.csv vide`);
    return 0;
  }
  const records =
    tableName === "risk_library"
      ? (rows as Record<string, string>[]).map((row) => ({
          family: normalizeValue(row.family ?? ""),
          sector: normalizeValue(row.sector ?? ""),
          hierarchyLevel: normalizeValue(row.hierarchy_level ?? ""),
          situation: normalizeValue(row.situation ?? "") || "(sans intitulé)",
          description: normalizeValue(row.description ?? "") || "(sans description)",
          defaultGravity: normalizeValue(row.default_gravity ?? ""),
          defaultFrequency: normalizeValue(row.default_frequency ?? ""),
          defaultControl: normalizeValue(row.default_control ?? ""),
          measures: normalizeValue(row.measures ?? "") || "(à définir)",
          source: normalizeValue(row.source ?? "") || "INRS",
          inrsCode: row.inrs_code ? normalizeValue(row.inrs_code) : null,
          keywords: row.keywords ? normalizeValue(row.keywords) : null,
          isActive: row.is_active === "t" || row.is_active === "true" || row.is_active === "1",
        }))
      : rows.map((row: Record<string, string>) => csvRowToRecord(row, columns));
  await insert(records as Record<string, unknown>[]);
  console.log(`  [ok] ${tableName}: ${records.length} ligne(s)`);
  return records.length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL doit être défini (ex: .env ou variables Railway).");
    process.exit(1);
  }
  if (!existsSync(DATA_DIR)) {
    console.error(`Dossier introuvable: ${DATA_DIR}`);
    console.log("Usage: npm run db:import-csv [dossier] [table]");
    console.log("  Ex: npm run db:import-csv                    # tout depuis ./data");
    console.log("  Ex: npm run db:import-csv ./data risk_library # uniquement risk_library");
    process.exit(1);
  }

  const { db, pool } = await import("../server/db");
  const schema = await import("../shared/schema");
  const sqlRaw = (q: string) => pool.query(q);

  console.log("Import depuis:", DATA_DIR);
  if (ONLY_TABLE) console.log("Table uniquement:", ONLY_TABLE);
  if (REPLACE) {
    console.log("Option --replace : la table cible sera vidée avant import.");
    if (ONLY_TABLE === "risk_library") console.log("  Attention : tous les risques (y compris ceux ajoutés à la main) seront supprimés puis remplacés par le CSV.");
  }

  if (!ONLY_TABLE || ONLY_TABLE === "companies") {
    await importTable("companies", ["id", "name", "activity", "description", "sector", "address", "siret", "phone", "email", "employeeCount", "logo", "existingPreventionMeasures", "createdAt", "updatedAt"], (rows) =>
      db.insert(schema.companies).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "sectors") {
    await importTable("sectors", ["id", "code", "name", "description", "parentCode", "isActive"], (rows) =>
      db.insert(schema.sectors).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "risk_families") {
    await importTable("risk_families", ["id", "code", "name", "description", "icon", "color", "isActive"], (rows) =>
      db.insert(schema.riskFamilies).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "risk_library") {
    if (REPLACE) {
      await pool.query("TRUNCATE TABLE risk_library RESTART IDENTITY CASCADE");
      console.log("  [ok] risk_library vidée.");
    }
    try {
      await importTable(
        "risk_library",
        ["family", "sector", "hierarchyLevel", "situation", "description", "defaultGravity", "defaultFrequency", "defaultControl", "measures", "source", "inrsCode", "keywords", "isActive"],
        (rows) => db.insert(schema.riskLibrary).values(rows as never[]),
      );
    } catch (err) {
      console.error("Erreur import risk_library:", err);
      throw err;
    }
  }
  if (!ONLY_TABLE || ONLY_TABLE === "users") {
    await importTable("users", ["id", "email", "firstName", "lastName", "role", "companyId", "createdAt", "isActive"], (rows) =>
      db.insert(schema.users).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "duerp_documents") {
    await importTable("duerp_documents", ["id", "companyId", "title", "version", "status", "workUnitsData", "sites", "globalPreventionMeasures", "locations", "workStations", "finalRisks", "preventionMeasures", "approvedBy", "approvedAt", "nextReviewDate", "lastRevisionDate", "revisionNotified", "createdAt", "updatedAt"], (rows) =>
      db.insert(schema.duerpDocuments).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "actions") {
    await importTable("actions", ["id", "duerpId", "title", "description", "priority", "status", "assignedTo", "dueDate", "completedAt", "createdAt", "updatedAt"], (rows) =>
      db.insert(schema.actions).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "comments") {
    await importTable("comments", ["id", "duerpId", "userId", "content", "locationId", "workUnitId", "createdAt"], (rows) =>
      db.insert(schema.comments).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "risk_templates") {
    await importTable("risk_templates", ["id", "category", "sector", "type", "danger", "gravity", "frequency", "control", "finalRisk", "measures", "isActive"], (rows) =>
      db.insert(schema.riskTemplates).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "custom_measures") {
    await importTable("custom_measures", ["id", "family", "measure", "createdAt"], (rows) =>
      db.insert(schema.customMeasures).values(rows as never[]),
    );
  }
  if (!ONLY_TABLE || ONLY_TABLE === "uploaded_documents") {
    await importTable("uploaded_documents", ["id", "companyId", "fileName", "fileType", "fileSize", "extractedText", "description", "uploadedAt"], (rows) =>
      db.insert(schema.uploadedDocuments).values(rows as never[]),
    );
  }

  // Réinitialiser les séquences pour les tables importées
  const tablesToSync = ONLY_TABLE ? [ONLY_TABLE] : ["companies", "sectors", "risk_families", "risk_library", "users", "duerp_documents", "actions", "comments", "risk_templates", "custom_measures", "uploaded_documents"];
  for (const t of tablesToSync) {
    try {
      await sqlRaw(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`);
    } catch {
      // table sans séquence ou absente
    }
  }

  console.log("Import terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
