const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

function loadDuerpEnv() {
  try {
    const userDataDir = app.getPath("userData");
    const duerpEnvPath = path.join(userDataDir, "duerp.env");
    if (fs.existsSync(duerpEnvPath)) {
      const raw = fs.readFileSync(duerpEnvPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        let value = (m[2] || "").trim();
        value = value.replace(/^["']|["']$/g, "");
        if (value.length) process.env[key] = value;
      }
    }
  } catch {
    // Best-effort
  }
}

function getLogPath() {
  return path.join(app.getPath("userData"), "duerp-electron.log");
}

function log(line) {
  try {
    const logPath = getLogPath();
    const dir = path.dirname(logPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, line + "\n");
  } catch {
    // ignore
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function isReachable(url) {
  try {
    const res = await fetchWithTimeout(url, 1500);
    return !!res && res.ok;
  } catch {
    return false;
  }
}

function normalizeUrl(input) {
  let url = (input || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    new URL(url);
    return url;
  } catch {
    return "";
  }
}

const CONFIG_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0b1220;
      color: #e2e8f0;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px; text-align: center; }
    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 400px;
    }
    input {
      padding: 12px 16px;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #1e293b;
      color: #f1f5f9;
      font-size: 1rem;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    button {
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 500;
    }
    button:hover { background: #2563eb; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #f87171; font-size: 0.875rem; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>DUERP – Configuration du serveur</h1>
  <p>Indiquez l'URL du serveur DUERP (ex : https://duerp.example.com)</p>
  <form id="form">
    <input type="url" id="url" placeholder="https://duerp.example.com" autocomplete="url" required />
    <span id="error" class="error"></span>
    <button type="submit" id="btn">Se connecter</button>
  </form>
  <script>
    const form = document.getElementById('form');
    const input = document.getElementById('url');
    const error = document.getElementById('error');
    const btn = document.getElementById('btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = input.value.trim();
      if (!url) return;
      error.textContent = '';
      btn.disabled = true;
      try {
        const result = await window.duerp.saveServerUrl(url);
        if (result.ok) {
          window.close();
        } else {
          error.textContent = result.error || 'Erreur inconnue';
        }
      } catch (err) {
        error.textContent = 'Erreur : ' + (err.message || String(err));
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
`;

let configWindow = null;

async function showConfigWindow() {
  return new Promise((resolve) => {
    configWindow = new BrowserWindow({
      width: 480,
      height: 320,
      backgroundColor: "#0b1220",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    configWindow.setMenuBarVisibility(false);
    configWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(CONFIG_HTML));

    configWindow.on("closed", () => {
      configWindow = null;
      resolve();
    });
  });
}

async function createWindow() {
  loadDuerpEnv();

  const remoteUrl = normalizeUrl(process.env.DUERP_REMOTE_URL || "");
  const reachable = remoteUrl && (await isReachable(remoteUrl));

  if (!reachable) {
    log(`[createWindow] no server URL or unreachable: ${remoteUrl || "(empty)"}`);
    await showConfigWindow();
    if (!configWindow) {
      loadDuerpEnv();
      const newUrl = normalizeUrl(process.env.DUERP_REMOTE_URL || "");
      if (newUrl && (await isReachable(newUrl))) {
        return createWindow();
      }
    }
    return;
  }

  const targetUrl = remoteUrl;
  log(`[createWindow] targetUrl=${targetUrl}`);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    x: 80,
    y: 80,
    backgroundColor: "#0b1220",
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.webContents.on("did-fail-load", (_evt, errorCode, errorDesc) => {
    log(`[web] did-fail-load code=${errorCode} desc=${String(errorDesc)}`);
  });

  win.webContents.on("did-finish-load", () => {
    log(`[web] did-finish-load url=${targetUrl}`);
  });

  win.once("ready-to-show", () => {
    try {
      win.setAlwaysOnTop(true, "screen-saver");
      win.setVisibleOnAllWorkspaces(true);
      try {
        win.setSkipTaskbar(false);
      } catch {
        /* ignore */
      }
      win.center();
      win.show();
      win.focus();
      setTimeout(() => {
        try {
          win.setAlwaysOnTop(false);
        } catch {
          /* ignore */
        }
      }, 2500);
    } catch {
      /* ignore */
    }
  });

  try {
    await win.loadURL(targetUrl);
  } catch (e) {
    log(`[web] loadURL throw: ${e && e.stack ? e.stack : String(e)}`);
    throw e;
  }
}

ipcMain.handle("duerp-save-server-url", async (_event, urlInput) => {
  const url = normalizeUrl(urlInput);
  if (!url) {
    return { ok: false, error: "URL invalide" };
  }
  if (!(await isReachable(url))) {
    return { ok: false, error: "Serveur injoignable. Vérifiez l'URL et votre connexion." };
  }
  try {
    const userDataDir = app.getPath("userData");
    const duerpEnvPath = path.join(userDataDir, "duerp.env");
    fs.mkdirSync(userDataDir, { recursive: true });
    const content = `DUERP_REMOTE_URL=${url}\n`;
    fs.writeFileSync(duerpEnvPath, content);
    process.env.DUERP_REMOTE_URL = url;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

app.whenReady().then(async () => {
  await createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
