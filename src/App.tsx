import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/app/Dashboard";
import Sinistri from "@/pages/app/Sinistri";
import NuovoSinistro from "@/pages/app/NuovoSinistro";
import SinistroDettaglio from "@/pages/app/sinistro/SinistroDettaglio";
import Impostazioni from "@/pages/app/Impostazioni";
import Modelli from "@/pages/app/Modelli";
import Stampa from "@/pages/app/Stampa";
import Utenti from "@/pages/admin/Utenti";
import Enti from "@/pages/admin/Enti";
import RichiesteTecnico from "@/pages/tecnico/Richieste";
import RelazioneTecnico from "@/pages/tecnico/Relazione";
import type { Ruolo } from "@/lib/types";
import { Caricamento } from "@/components/layout/Caricamento";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});

const homeDi = (r: Ruolo) => (r === "admin" ? "/admin/utenti" : r === "tecnico" ? "/tecnico" : "/app");

function Protetto({ ruoli, children }: { ruoli?: Ruolo[]; children: React.ReactNode }) {
  const { session, profilo, caricamento } = useAuth();
  if (caricamento) return <Caricamento pieno />;
  if (!session || !profilo) return <Navigate to="/accedi" replace />;
  if (ruoli && !ruoli.includes(profilo.ruolo)) return <Navigate to={homeDi(profilo.ruolo)} replace />;
  return <>{children}</>;
}

function Home() {
  const { profilo, caricamento, session } = useAuth();
  if (caricamento) return <Caricamento pieno />;
  if (!session || !profilo) return <Navigate to="/accedi" replace />;
  return <Navigate to={homeDi(profilo.ruolo)} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter>
            <Routes>
              <Route path="/accedi" element={<Login />} />
              <Route path="/" element={<Home />} />

              <Route
                path="/app"
                element={
                  <Protetto ruoli={["utente"]}>
                    <AppShell />
                  </Protetto>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="sinistri" element={<Sinistri />} />
                <Route path="sinistri/nuovo" element={<NuovoSinistro />} />
                <Route path="sinistri/:id" element={<SinistroDettaglio />} />
                <Route path="modelli" element={<Modelli />} />
                <Route path="impostazioni" element={<Impostazioni />} />
              </Route>
              <Route
                path="/app/stampa/:id"
                element={
                  <Protetto ruoli={["utente", "tecnico"]}>
                    <Stampa />
                  </Protetto>
                }
              />

              <Route
                path="/tecnico"
                element={
                  <Protetto ruoli={["tecnico"]}>
                    <AppShell />
                  </Protetto>
                }
              >
                <Route index element={<RichiesteTecnico />} />
                <Route path="sinistri/:id" element={<RelazioneTecnico />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <Protetto ruoli={["admin"]}>
                    <AppShell />
                  </Protetto>
                }
              >
                <Route index element={<Navigate to="utenti" replace />} />
                <Route path="utenti" element={<Utenti />} />
                <Route path="enti" element={<Enti />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
