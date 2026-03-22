import { pool } from "./db";
import { log } from "./static";

/**
 * Ajoute les colonnes source_type et source_id à la table actions si elles n'existent pas.
 * À exécuter au démarrage pour les déploiements où drizzle-kit push n'est pas lancé.
 */
export async function ensureActionsSourceColumns(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool.query(`
      ALTER TABLE actions
      ADD COLUMN IF NOT EXISTS source_type varchar(20),
      ADD COLUMN IF NOT EXISTS source_id text;
    `);
    log("Actions table: source_type / source_id columns ensured.");
  } catch (e) {
    log("ensureActionsSourceColumns failed: " + (e instanceof Error ? e.message : String(e)));
  }
}
