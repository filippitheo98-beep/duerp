import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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

export default function Parametres() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const u = user as { email?: string; firstName?: string; lastName?: string } | undefined;

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
