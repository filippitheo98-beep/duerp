import { useState } from 'react';
import { Building, FileText, Home, LogOut, Settings, User, Shield, Library, Menu, X, ShieldCheck } from 'lucide-react';
import { RevisionNotifications } from './RevisionNotifications';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@shared/adminConfig';

const navItems = (showAdmin: boolean) => [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/duerp-generator', label: 'Générateur', icon: Shield },
  { path: '/documents', label: 'Mes DUERP', icon: FileText },
  { path: '/revisions', label: 'Révisions', icon: Shield },
  { path: '/risk-library', label: 'Bibliothèque', icon: Library },
  ...(showAdmin ? [{ path: '/admin', label: 'Administration', icon: ShieldCheck }] : []),
];

export function Header() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const showAdmin = isAdminEmail((user as { email?: string })?.email);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleNavigate('/')}
          >
            <Building className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">DUERP</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems(showAdmin).map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={location === item.path ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleNavigate(item.path)}
                  className="transition-all text-xs px-2"
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <RevisionNotifications showInHeader={true} />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{(user as any)?.firstName} {(user as any)?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{(user as any)?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigate('/parametres')}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-2 space-y-1">
            {navItems(showAdmin).map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={location === item.path ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleNavigate(item.path)}
                  className="w-full justify-start"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}