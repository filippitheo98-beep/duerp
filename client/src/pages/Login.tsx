import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) navigate("/", { replace: true });
  }, [user, isLoading, navigate]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: identifier, password }),
      });
    },
    onSuccess: async () => {
      // --- Sync multi-PC (last-write-wins) ---
      // Fondée sur outbox_events côté serveur (m4). Pour l'instant, on ne pousse pas encore d'événements locaux
      // (pas de génération automatique d'outbox), mais on force le pull initial.
      try {
        const cursorMs = Number(localStorage.getItem("duerp_sync_cursor_ms") || "0");
        const pullRes = await apiRequest("/api/sync/pull", {
          method: "POST",
          body: JSON.stringify({ cursorMs }),
        });

        const nextCursor = Number(pullRes?.nextCursorMs ?? cursorMs);
        localStorage.setItem("duerp_sync_cursor_ms", String(nextCursor));

        // En l'état actuel, aucune outbox locale n'est encore produite automatiquement côté client,
        // donc on envoie une liste vide.
        await apiRequest("/api/sync/push", {
          method: "POST",
          body: JSON.stringify({ events: [] }),
        });
      } catch {
        // La synchro est "best-effort" : on ne bloque pas la navigation si elle échoue.
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/", { replace: true });
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError("Identifiant et mot de passe requis");
      return;
    }
    loginMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>Accédez à vos DUERP</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifiant</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="admin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                disabled={loginMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loginMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2 text-sm">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-primary hover:underline"
            >
              Mot de passe oublié ?
            </button>
            <p className="text-muted-foreground">
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-primary font-medium hover:underline"
              >
                Créer un compte
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
