/**
 * Point d'entrée production — n'importe jamais vite.
 * Utilisé pour le build Docker/Railway.
 * Migrations : exécuter `railway run npx drizzle-kit push` manuellement.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";

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
import { ensureActionsSourceColumns } from "./migrateActionsColumns";
import { log, serveStatic } from "./static";

async function syncSequences(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const tables = ["companies", "sectors", "risk_families", "risk_library", "users", "duerp_documents", "actions", "comments", "risk_templates", "custom_measures", "uploaded_documents"];
  for (const table of tables) {
    try {
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

// Trust proxy (Railway, load balancers)
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));

// Health check — avant tout le reste, pour Railway / load balancers
app.get("/health", async (_req, res) => {
  try {
    if (process.env.DATABASE_URL) await pool.query("SELECT 1");
    res.sendStatus(200);
  } catch {
    res.status(503).send("DB unreachable");
  }
});

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
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  await syncSequences();
  await ensureActionsSourceColumns();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  serveStatic(app);

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port} (PORT=${process.env.PORT})`);
  });

  function shutdown(signal: string) {
    log(`${signal} received, shutting down gracefully`);
    server.close(() => {
      if (process.env.DATABASE_URL) {
        pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
      } else {
        process.exit(0);
      }
    });
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
