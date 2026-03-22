/**
 * Module centralisé pour les appels à Ollama (serveur self-hosted).
 * Utilise l'API native /api/chat (pas de clé API).
 */

const OLLAMA_BASE_URL_ENV = 'OLLAMA_BASE_URL';
const OLLAMA_MODEL_ENV = 'OLLAMA_MODEL';

const OLLAMA_LOCAL_ONLY_ENV = 'OLLAMA_LOCAL_ONLY';

const OLLAMA_TEMPERATURE_ENV = 'OLLAMA_TEMPERATURE';
const OLLAMA_TOP_P_ENV = 'OLLAMA_TOP_P';
const OLLAMA_TOP_K_ENV = 'OLLAMA_TOP_K';
const OLLAMA_REPEAT_PENALTY_ENV = 'OLLAMA_REPEAT_PENALTY';
const OLLAMA_NUM_CTX_ENV = 'OLLAMA_NUM_CTX';
const OLLAMA_NUM_PREDICT_ENV = 'OLLAMA_NUM_PREDICT';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2';

const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_TOP_K = 40;
const DEFAULT_REPEAT_PENALTY = 1.1;
const DEFAULT_NUM_PREDICT = 2000;

function isLocalhostHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

function parseNumberEnv(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function getBaseUrl(): string {
  const raw = (process.env[OLLAMA_BASE_URL_ENV]?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const localOnly = (process.env[OLLAMA_LOCAL_ONLY_ENV] ?? 'true').trim().toLowerCase() !== 'false';

  if (localOnly) {
    try {
      const url = new URL(raw);
      if (!isLocalhostHostname(url.hostname)) {
        throw new Error(
          `OLLAMA_BASE_URL doit pointer vers localhost (ex: http://127.0.0.1:11434). Reçu: ${raw}`
        );
      }
    } catch {
      throw new Error(`OLLAMA_BASE_URL invalide. Reçu: ${raw}`);
    }
  }

  return raw;
}

function getModel(): string {
  return process.env[OLLAMA_MODEL_ENV]?.trim() || DEFAULT_MODEL;
}

function getOllamaDefaults() {
  const temperature = parseNumberEnv(OLLAMA_TEMPERATURE_ENV) ?? DEFAULT_TEMPERATURE;
  const top_p = parseNumberEnv(OLLAMA_TOP_P_ENV) ?? DEFAULT_TOP_P;
  const top_k = parseNumberEnv(OLLAMA_TOP_K_ENV) ?? DEFAULT_TOP_K;
  const repeat_penalty = parseNumberEnv(OLLAMA_REPEAT_PENALTY_ENV) ?? DEFAULT_REPEAT_PENALTY;

  // num_ctx: si non défini, on laisse Ollama choisir son défaut (peut varier selon modèle)
  const num_ctx = parseNumberEnv(OLLAMA_NUM_CTX_ENV);

  // num_predict limite la taille de sortie; valeur par défaut stable mais configurable
  const num_predict = parseNumberEnv(OLLAMA_NUM_PREDICT_ENV) ?? DEFAULT_NUM_PREDICT;

  return { temperature, top_p, top_k, repeat_penalty, num_ctx, num_predict };
}

/**
 * Extrait le JSON brut d'une réponse pouvant contenir des blocs markdown ou du texte parasite.
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  // Bloc ```json ... ``` ou ``` ... ```
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  // Objet JSON : premier { jusqu'au dernier }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export interface GenerateJsonOptions {
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  contextTokens?: number;
  maxOutputTokens?: number;
  responseJsonSchema?: unknown;
}

/**
 * Génère une réponse (attendue JSON) depuis Ollama.
 */
export async function generateJson(
  prompt: string,
  options: GenerateJsonOptions = {}
): Promise<string> {
  const baseUrl = getBaseUrl();
  const model = getModel();
  const defaults = getOllamaDefaults();

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3 min (Ollama sur CPU peut être lent)

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        // `format` peut être "json" ou un JSON Schema (plus robuste)
        format: options.responseJsonSchema ?? 'json',
        messages,
        options: {
          temperature: options.temperature ?? defaults.temperature,
          top_p: options.topP ?? defaults.top_p,
          top_k: options.topK ?? defaults.top_k,
          repeat_penalty: options.repeatPenalty ?? defaults.repeat_penalty,
          ...(Number.isFinite(options.contextTokens as number)
            ? { num_ctx: options.contextTokens }
            : defaults.num_ctx !== undefined
              ? { num_ctx: defaults.num_ctx }
              : {}),
          // Ollama utilise num_predict pour limiter la taille de sortie
          num_predict: options.maxOutputTokens ?? defaults.num_predict,
        },
      }),
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Service Ollama indisponible : délai dépassé (vérifiez le pare-feu et que Ollama écoute sur 0.0.0.0).');
    }
    throw new Error(`Service Ollama indisponible : ${err?.message || err}. Vérifiez OLLAMA_BASE_URL et le pare-feu (port 11434).`);
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Service Ollama indisponible (${res.status}). ${errText}`.trim());
  }

  const data = (await res.json()) as any;
  const text = data?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('Réponse IA vide ou invalide.');
  }
  return extractJson(text);
}

