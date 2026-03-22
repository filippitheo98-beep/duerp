type QueuedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  createdAt: number;
};

const STORAGE_KEY = "duerp_offline_queue_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readQueue(): QueuedRequest[] {
  return safeParse<QueuedRequest[]>(localStorage.getItem(STORAGE_KEY), []);
}

function writeQueue(items: QueuedRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueueRequest(req: Omit<QueuedRequest, "createdAt">) {
  const items = readQueue();
  items.push({ ...req, createdAt: Date.now() });
  // garde une taille raisonnable
  const trimmed = items.slice(-200);
  writeQueue(trimmed);
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const items = readQueue();
  if (!items.length) return { flushed: 0, remaining: 0 };

  const remaining: QueuedRequest[] = [];
  let flushed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}

