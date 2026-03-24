/**
 * Module centralisé pour les appels à OpenAI.
 * Objectif: retourner du JSON valide, avec un coût (tokens) maîtrisé.
 */

import OpenAI from "openai";
import { hashForCache } from "./ai-context";

const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
const OPENAI_MODEL_ENV = "OPENAI_MODEL";
const OPENAI_BASE_URL_ENV = "OPENAI_BASE_URL";

const DEFAULT_MODEL = "gpt-4o-mini";

function getModel(): string {
  return process.env[OPENAI_MODEL_ENV]?.trim() || DEFAULT_MODEL;
}

/**
 * Extrait le JSON brut d'une réponse pouvant contenir des blocs markdown ou du texte parasite.
 * (Tolérance défensive: utile si le modèle dévie malgré response_format.)
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export interface GenerateJsonOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseJsonSchema?: unknown;
  apiKeyOverride?: string;
  modelOverride?: string;
}

type CacheEntry = { value: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

/**
 * Génère une réponse (attendue JSON) depuis OpenAI.
 */
export async function generateJson(prompt: string, options: GenerateJsonOptions = {}): Promise<string> {
  const effectiveApiKey = options.apiKeyOverride?.trim() || process.env[OPENAI_API_KEY_ENV]?.trim() || "";
  if (!effectiveApiKey) {
    throw new Error(`Configuration IA manquante: ${OPENAI_API_KEY_ENV} n'est pas défini.`);
  }

  const baseURL = process.env[OPENAI_BASE_URL_ENV]?.trim();
  const client = new OpenAI({ apiKey: effectiveApiKey, baseURL: baseURL || undefined });
  const model = options.modelOverride?.trim() || getModel();

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (options.systemPrompt) messages.push({ role: "system", content: options.systemPrompt });
  messages.push({ role: "user", content: prompt });

  try {
    const cacheKey = hashForCache({
      v: 1,
      model,
      system: options.systemPrompt || "",
      prompt,
      schema: options.responseJsonSchema ?? null,
      temperature: options.temperature ?? null,
      maxOutputTokens: options.maxOutputTokens ?? null,
    });
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.value;

    const response_format =
      options.responseJsonSchema != null
        ? {
            type: "json_schema" as const,
            json_schema: {
              name: "duerp_json",
              schema: options.responseJsonSchema as any,
              strict: true,
            },
          }
        : ({ type: "json_object" as const } as const);

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens,
      response_format,
    });

    const text = completion.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      throw new Error("Réponse IA vide ou invalide.");
    }
    const json = extractJson(text);
    cache.set(cacheKey, { value: json, expiresAt: now + DEFAULT_CACHE_TTL_MS });
    return json;
  } catch (err: any) {
    const msg = err?.message || String(err);
    throw new Error(`Service IA indisponible (OpenAI): ${msg}`);
  }
}

