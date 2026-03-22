import crypto from "crypto";

export function normalizeText(text: string): string {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateByChars(text: string, maxChars: number): string {
  const t = normalizeText(text);
  if (t.length <= maxChars) return t;
  return t.slice(0, Math.max(0, maxChars - 12)).trimEnd() + "\n[…tronqué…]";
}

export function hashForCache(input: unknown): string {
  const raw = typeof input === "string" ? input : JSON.stringify(input);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export type PromptDocument = {
  title: string;
  description?: string | null;
  extractedText?: string | null;
};

/**
 * Compacte un ensemble de documents pour réduire les tokens envoyés au modèle.
 * - limite nb documents
 * - limite nb caractères par doc
 * - limite total
 */
export function buildCompactDocumentsBlock(docs: PromptDocument[], opts?: {
  maxDocs?: number;
  maxCharsPerDoc?: number;
  maxTotalChars?: number;
}): string {
  const maxDocs = opts?.maxDocs ?? 3;
  const maxCharsPerDoc = opts?.maxCharsPerDoc ?? 1200;
  const maxTotalChars = opts?.maxTotalChars ?? 3000;

  const picked = (docs || []).slice(0, maxDocs);
  const parts: string[] = [];
  for (const doc of picked) {
    const chunks: string[] = [];
    chunks.push(`--- Document: ${doc.title} ---`);
    if (doc.description) chunks.push(`Description: ${truncateByChars(doc.description, 300)}`);
    if (doc.extractedText) chunks.push(`Extrait: ${truncateByChars(doc.extractedText, maxCharsPerDoc)}`);
    parts.push(chunks.join("\n"));
  }

  const merged = parts.join("\n\n");
  return truncateByChars(merged, maxTotalChars);
}

