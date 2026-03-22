import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import NewDuerpGenerator from "@/pages/new-duerp-generator";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Documents from "@/pages/documents";
import Revisions from "@/pages/revisions";
import RiskLibraryManagement from "@/pages/RiskLibraryManagement";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ChangePassword from "@/pages/ChangePassword";
import Parametres from "@/pages/Parametres";
import Setup from "@/pages/Setup";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/AdminGuard";

function getPath(location: any): string {
  return typeof location === "string" ? location : location?.pathname || "";
}

function Router() {
  const [location, navigate] = useLocation();
  const currentPath = getPath(location);

  const configQuery = useQuery({
    queryKey: ["/api/config"],
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/config", { credentials: "include" });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      return res.json();
    },
  });

  useEffect(() => {
    if (configQuery.isLoading) return;
    if (!configQuery.data?.openAiApiKeyPresent && currentPath !== "/setup") {
      navigate("/setup", { replace: true });
    }
  }, [configQuery.isLoading, configQuery.data?.openAiApiKeyPresent, currentPath, navigate]);

  return (
    <Switch>
      {/* Route publique config */}
      <Route path="/setup" component={Setup} />

      {/* Routes publiques (auth) */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/change-password">
        <AuthGuard>
          <ChangePassword />
        </AuthGuard>
      </Route>
      <Route path="/landing" component={Landing} />

      {/* Routes protégées */}
      <Route path="/">
        <AuthGuard>
          <Home />
        </AuthGuard>
      </Route>
      <Route path="/duerp-generator">
        <AuthGuard>
          <NewDuerpGenerator />
        </AuthGuard>
      </Route>
      <Route path="/documents">
        <AuthGuard>
          <Documents />
        </AuthGuard>
      </Route>
      <Route path="/revisions">
        <AuthGuard>
          <Revisions />
        </AuthGuard>
      </Route>
      <Route path="/risk-library">
        <AuthGuard>
          <RiskLibraryManagement />
        </AuthGuard>
      </Route>
      <Route path="/parametres">
        <AuthGuard>
          <Parametres />
        </AuthGuard>
      </Route>
      <Route path="/admin">
        <AdminGuard>
          <Admin />
        </AdminGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="duerp-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
