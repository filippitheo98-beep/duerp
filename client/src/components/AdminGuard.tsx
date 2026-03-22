import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "./AuthGuard";
import { useToast } from "@/hooks/use-toast";
import { isAdminEmail } from "@shared/adminConfig";

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Protège les routes admin : doit être connecté ET être l'utilisateur admin défini par email.
 * Seul l'email configuré dans shared/adminConfig a accès.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const email = (user as { email?: string })?.email;
  const canAccessAdmin = isAdminEmail(email);

  useEffect(() => {
    if (isLoading) return;
    if (user && !canAccessAdmin) {
      toast({
        title: "Accès refusé",
        description: "Cette page est réservée aux administrateurs.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [user, isLoading, canAccessAdmin, navigate, toast]);

  return (
    <AuthGuard>
      {user && canAccessAdmin ? children : null}
    </AuthGuard>
  );
}
