import express from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: express.Express) {
  // En prod, le serveur est dans dist/index.js donc public = dist/public
  const distPath = path.resolve(import.meta.dirname, "public");
  const fallbackPath = path.join(process.cwd(), "dist", "public");
  const resolvedPath = fs.existsSync(distPath) ? distPath : fallbackPath;

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Could not find the build directory (tried ${distPath} and ${fallbackPath}), make sure to build the client first`,
    );
  }

  app.use(express.static(resolvedPath, { index: "index.html" }));

  // SPA fallback : tout chemin non géré par static → index.html
  app.use((req, res) => {
    res.sendFile(path.join(resolvedPath, "index.html"), (err) => {
      if (err && !res.headersSent) res.status(500).send("Erreur serveur");
    });
  });
}
