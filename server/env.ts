import { existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Charge d'abord `duerp.env` depuis un dossier modifiable (userData),
// puis fallback vers le `.env` local du projet.
//
// En Electron, on renseigne `DUERP_USERDATA_DIR` depuis `desktop/main.cjs`.
const userDataDir = process.env.DUERP_USERDATA_DIR;
if (userDataDir) {
  const duerpEnvPath = join(userDataDir, "duerp.env");
  if (existsSync(duerpEnvPath)) {
    // `override: true` pour écraser un `OPENAI_API_KEY=` vide embarqué dans les assets.
    dotenv.config({ path: duerpEnvPath, override: true });
  }
}

// Charge les variables depuis `.env` en local.
// En production (Railway), les variables sont injectées par l'environnement.
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

