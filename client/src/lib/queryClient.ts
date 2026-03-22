import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { enqueueRequest, flushQueue } from "./offlineQueue";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    try {
      const data = JSON.parse(text);
      if (typeof data?.message === 'string' && data.message) {
        throw new Error(data.message);
      }
    } catch (e) {
      if (e instanceof Error && e.message && !e.message.startsWith('Unexpected')) {
        throw e;
      }
    }
    throw new Error(text || `${res.status}: ${res.statusText}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  // Mode hybride: si offline, on met en file d’attente les mutations.
  if (typeof window !== "undefined" && window.navigator && window.navigator.onLine === false && method !== "GET") {
    enqueueRequest({
      url,
      method,
      headers,
      body: typeof options.body === "string" ? options.body : undefined,
    });
    throw new Error(
      "Hors-ligne: la demande a été mise en attente et sera synchronisée automatiquement à la reconnexion."
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body,
      credentials: "include",
      ...options,
    });
  } catch (e) {
    // Cas fréquent : Internet peut être “online”, mais le serveur distant ne répond pas.
    // On bascule quand même en mode file d’attente pour ne pas perdre la mutation.
    if (method !== "GET") {
      enqueueRequest({
        url,
        method,
        headers,
        body: typeof options.body === "string" ? options.body : undefined,
      });
    }
    throw e;
  }

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Flush automatique au chargement + à la reconnexion
if (typeof window !== "undefined") {
  const flush = async () => {
    if (window.navigator.onLine !== false) {
      await flushQueue();

      // --- Sync best-effort après reconnexion ---
      // On force un pull initial pour récupérer les éventuels changements "last-write-wins".
      try {
        const cursorMs = Number(localStorage.getItem("duerp_sync_cursor_ms") || "0");
        const pullRes = await apiRequest("/api/sync/pull", {
          method: "POST",
          body: JSON.stringify({ cursorMs }),
        });

        const nextCursor = Number(pullRes?.nextCursorMs ?? cursorMs);
        localStorage.setItem("duerp_sync_cursor_ms", String(nextCursor));

        // Pour l'instant pas de génération automatique outbox côté client => on push vide.
        await apiRequest("/api/sync/push", {
          method: "POST",
          body: JSON.stringify({ events: [] }),
        });
      } catch {
        // best-effort uniquement
      }
    }
  };
  window.addEventListener("online", flush);
  // petit flush à froid
  setTimeout(() => void flush(), 1500);
}
