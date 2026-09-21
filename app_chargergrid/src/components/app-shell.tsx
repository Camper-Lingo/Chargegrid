import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, LayoutDashboard, Car, History, LogOut, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/eletropostos", label: "Eletropostos", icon: MapPin },
  { to: "/veiculo", label: "Veículo", icon: Car },
  { to: "/historico", label: "Histórico", icon: History },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const pathname = router.state.location.pathname;

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <header className="sticky top-0 z-10 border-b border-border bg-background sm:bg-background/80 sm:backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">ChargeGrid</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.to
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            ))}
            <Button
              variant="ghost"
              onClick={handleSignOut}
              title="Sair"
              className="ml-1 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background px-1 py-1.5 sm:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium",
              pathname === item.to ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
        <Button variant="ghost" onClick={handleSignOut} title="Sair" className="flex h-auto min-w-0 flex-col gap-1 px-1 py-2 text-[10px] text-muted-foreground">
          <LogOut className="h-4 w-4" /><span>Sair</span>
        </Button>
      </nav>
    </div>
  );
}
