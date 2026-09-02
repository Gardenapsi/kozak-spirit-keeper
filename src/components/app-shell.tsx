import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import cossaco from "@/assets/cossaco.jpg.asset.json";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, usePresence } from "@/lib/admin";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/insumos", label: "Insumos", icon: Boxes },
  { to: "/eventos", label: "Feiras e eventos", icon: CalendarDays },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/movimentacoes", label: "Movimentações", icon: ScrollText },
] as const;

const ADMIN_NAV = [{ to: "/usuarios", label: "Usuários", icon: Users }] as const;


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { data: isAdmin } = useIsAdmin();
  const items = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  return (
    <nav className="space-y-1">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground [&.active]:bg-sidebar-accent [&.active]:font-semibold [&.active]:text-sidebar-primary"
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}


function Brand() {
  return (
    <Link to="/painel" className="flex items-center gap-3">
      <img
        src={cossaco.url}
        alt="Cossaco КОЗАКИ ГОРІЛКА"
        className="size-10 rounded-md border border-sidebar-border object-cover object-top"
      />
      <span className="leading-tight">
        <span className="brand-title block text-xs text-primary">КОЗАКИ ГОРІЛКА</span>
        <span className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          Cachaçaria Artesanal
        </span>
      </span>
    </Link>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  usePresence();


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-4 lg:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <Button variant="ghost" className="justify-start gap-3" onClick={signOut}>
          <LogOut className="size-4" /> Sair
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4">
              <div className="mt-6">
                <Brand />
              </div>
              <div className="mt-8">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <Button variant="ghost" className="mt-4 justify-start gap-3" onClick={signOut}>
                <LogOut className="size-4" /> Sair
              </Button>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {description ? (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
