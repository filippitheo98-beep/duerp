import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { User, KeyRound, Palette } from "lucide-react";
import { useEffect, useState } from "react";

type AppConfig = {
  openAiApiKeyPresent: boolean;
  openAiModel: string;
};

export default function Parametres() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [openAiKey, setOpenAiKey] = useState("");
  const [openAiModel, setOpenAiModel] = useState("gpt-4o-mini");
  const [iaError, setIaError] = useState<string | null>(null);

  const u = user as { email?: string; firstName?: string; lastName?: string } | undefined;

  const configQuery = useQuery({
    queryKey: ["/api/config"],
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

  const saveIaConfig = useMutation({
    mutationFn: async () =>
      apiRequest("/api/config", {
        method: "POST",
        body: JSON.stringify({
          OPENAI_API_KEY: openAiKey,
          OPENAI_MODEL: openAiModel,
        }),
      }),
    onSuccess: () => {
      setIaError(null);
      setOpenAiKey("");
      void queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
    onError: (e: any) => {
      setIaError(e?.message || "Impossible d'enregistrer la configuration IA.");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground mb-8">
          Gérez les informations de votre compte et vos préférences.
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Compte
              </CardTitle>
              <CardDescription>
                Informations de votre compte (lecture seule).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{u?.email ?? "—"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Prénom</Label>
                <p className="font-medium">{u?.firstName ?? "—"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Nom</Label>
                <p className="font-medium">{u?.lastName ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>
                Modifiez votre mot de passe pour sécuriser votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => navigate("/change-password")}
              >
                Changer le mot de passe
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                IA (OpenAI)
              </CardTitle>
              <CardDescription>
                Configurez votre clé OpenAI personnelle. Chaque utilisateur peut utiliser sa propre clé.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                État actuel :{" "}
                <span className="font-medium">
                  {configQuery.data?.openAiApiKeyPresent ? "Clé configurée" : "Aucune clé configurée"}
                </span>
              </div>

              {iaError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {iaError}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="openai-key">OPENAI_API_KEY</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  autoComplete="off"
                  disabled={saveIaConfig.isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="openai-model">OPENAI_MODEL</Label>
                <Input
                  id="openai-model"
                  type="text"
                  placeholder="gpt-4o-mini"
                  value={openAiModel}
                  onChange={(e) => setOpenAiModel(e.target.value)}
                  disabled={saveIaConfig.isPending}
                />
              </div>

              <Button
                onClick={() => {
                  setIaError(null);
                  if (!openAiKey.trim()) {
                    setIaError("Veuillez saisir votre OPENAI_API_KEY.");
                    return;
                  }
                  saveIaConfig.mutate();
                }}
                disabled={saveIaConfig.isPending}
              >
                {saveIaConfig.isPending ? "Enregistrement..." : "Enregistrer la configuration IA"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apparence
              </CardTitle>
              <CardDescription>
                Choisissez le thème d’affichage de l’application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label>Thème</Label>
                <Select
                  value={theme}
                  onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="system">Système</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
