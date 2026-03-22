import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import express, { type Request, Response, NextFunction } from "express";

// Charger .env en local (Railway / production injecte les variables d'environnement)
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

import { pool } from "./db";
import { registerRoutes } from "./routes";
import { ensureAdminUser } from "./localAuth";
import { ensureActionsSourceColumns } from "./migrateActionsColumns";
import { log, serveStatic } from "./static";

/** Push le schéma Drizzle vers la base (création des tables) au démarrage si DATABASE_URL est défini. */
async function ensureDbSchema(): Promise<void> {
  const usingPostgres = !!process.env.DATABASE_URL;
  try {
    log("Pushing database schema...");
    execSync("npx drizzle-kit push --force", {
      stdio: "inherit",
      env: process.env,
    });
    log("Database schema up to date.");
  } catch (err) {
    log("drizzle-kit push failed: " + (err instanceof Error ? err.message : String(err)));
    // En mode SQLite (pas encore 100% compatible avec `shared/schema.ts`),
    // on évite de crasher l'app : on attend le refactor du schéma (m3).
    if (usingPostgres && process.env.NODE_ENV === "production") throw err;
  }
}

/** Réinitialise les séquences PostgreSQL après import CSV (évite "duplicate key" sur les nouveaux INSERT). */
async function syncSequences(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const tables = ["companies", "sectors", "risk_families", "risk_library", "users", "duerp_documents", "actions", "comments", "risk_templates", "custom_measures", "uploaded_documents"];
  for (const table of tables) {
    try {
      // setval(seq, val, true) => le prochain nextval() renverra val+1
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
      );
    } catch (e) {
      log(`syncSequences: ${table} skipped (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  log("Sequences synced.");
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureDbSchema();
  await syncSequences();
  await ensureActionsSourceColumns();
  await ensureAdminUser();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const isWindows = process.platform === "win32";
  const host = app.get("env") === "development" ? "127.0.0.1" : "0.0.0.0";

  // `reusePort` n'est pas supporté sur Windows.
  server.listen(
    isWindows ? { port, host } : { port, host, reusePort: true },
    () => {
    log(`serving on port ${port}`);
    },
  );
})();
