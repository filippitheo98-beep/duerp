import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type AppConfig = {
  openAiApiKeyPresent: boolean;
  openAiModel: string;
};

export default function Setup() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [openAiKey, setOpenAiKey] = useState("");
  const [openAiModel, setOpenAiModel] = useState("gpt-4o-mini");
  const [error, setError] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["/api/config"],
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/config", { credentials: "include" });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return (await res.json()) as AppConfig;
    },
  });

  useEffect(() => {
    if (configQuery.data?.openAiModel) {
      setOpenAiModel(configQuery.data.openAiModel);
    }
  }, [configQuery.data?.openAiModel]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/config", {
        method: "POST",
        body: JSON.stringify({
          OPENAI_API_KEY: openAiKey,
          OPENAI_MODEL: openAiModel,
        }),
      });
    },
    onSuccess: () => {
      // Forcer la garde de route à recharger la présence de clé.
      void queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      navigate("/parametres", { replace: true });
    },
    onError: (e: any) => {
      setError(e?.message || "Impossible d'enregistrer la configuration.");
    },
  });

  const isKeyPresent = !!configQuery.data?.openAiApiKeyPresent;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configuration</CardTitle>
          <CardDescription>Renseignez votre clé OpenAI pour activer l'IA.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          {isKeyPresent ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Clé OpenAI déjà configurée. Modèle actuel : <span className="font-medium">{openAiModel}</span>
              </div>
              <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
                Continuer
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (!openAiKey.trim()) {
                  setError("Veuillez saisir votre OPENAI_API_KEY.");
                  return;
                }
                saveMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="openai-key">OPENAI_API_KEY</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  autoComplete="off"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-model">OPENAI_MODEL</Label>
                <Input
                  id="openai-model"
                  type="text"
                  placeholder="gpt-4o-mini"
                  value={openAiModel}
                  onChange={(e) => setOpenAiModel(e.target.value)}
                  disabled={saveMutation.isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

