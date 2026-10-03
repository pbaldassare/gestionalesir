import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Building2, FilePenLine, FileStack, LayoutDashboard, LogOut, Menu, Settings2, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { iniziali } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const vociUtente: { a: string; label: string; icona: typeof LayoutDashboard; end?: boolean }[] = [
  { a: "/app", label: "Cruscotto", icona: LayoutDashboard, end: true },
  { a: "/app/sinistri", label: "Sinistri", icona: FileStack },
  { a: "/app/modelli", label: "Modelli", icona: FilePenLine },
  { a: "/app/impostazioni", label: "Impostazioni", icona: Settings2 },
];

const vociAdmin: { a: string; label: string; icona: typeof LayoutDashboard; end?: boolean }[] = [
  { a: "/admin/utenti", label: "Utenti", icona: Users },
  { a: "/admin/enti", label: "Enti", icona: Building2 },
];

function Navigazione({ onNaviga }: { onNaviga?: () => void }) {
  const { profilo, ente, esci } = useAuth();
  const voci = profilo?.ruolo === "admin" ? vociAdmin : vociUtente;
  return (
    <div className="flex h-full flex-col bg-ink text-ink-muted">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border-2 border-double border-white/70 font-mono text-[11px] font-semibold tracking-[0.14em] text-white">
            SIR
          </div>
          <div className="leading-tight">
            <div className="font-serif text-[15px] font-semibold text-white">Gestione sinistri</div>
            <div className="eyebrow !text-ink-muted/70">{profilo?.ruolo === "admin" ? "Amministrazione" : "Istruttoria"}</div>
          </div>
        </div>
      </div>

      {ente && (
        <div className="mx-4 mb-4 rounded border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="eyebrow !text-ink-muted/60">Ente</div>
          <div className="mt-0.5 truncate text-[13px] font-medium text-white">{ente.nome}</div>
        </div>
      )}

      <nav className="flex-1 px-3">
        {voci.map((v) => (
          <NavLink
            key={v.a}
            to={v.a}
            end={v.end}
            onClick={onNaviga}
            className={({ isActive }) =>
              cn(
                "mb-0.5 flex items-center gap-3 rounded px-3 py-2 text-[13.5px] transition-colors",
                isActive ? "bg-white/10 text-white" : "hover:bg-white/10 hover:text-white",
              )
            }
          >
            <v.icona className="h-4 w-4" strokeWidth={1.75} />
            {v.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] font-medium text-white">
            {iniziali(profilo?.nome_completo ?? "")}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium text-white">{profilo?.nome_completo}</div>
            <div className="truncate text-[11.5px] text-ink-muted/70">{profilo?.email}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-muted hover:bg-white/10 hover:text-white" onClick={esci} aria-label="Esci">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [aperto, setAperto] = useState(false);
  const location = useLocation();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <Navigazione />
        </div>
      </aside>

      <Sheet open={aperto} onOpenChange={setAperto}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <Navigazione onNaviga={() => setAperto(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setAperto(true)} aria-label="Apri il menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-serif font-semibold">SIR</span>
        </header>
        <main key={location.pathname} className="flex-1 animate-fade-up px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
