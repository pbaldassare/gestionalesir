import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { accedi, session, profilo, caricamento, errore } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invio, setInvio] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (errore) setMsg(errore);
  }, [errore]);

  if (!caricamento && session && profilo) {
    return <Navigate to={profilo.ruolo === "admin" ? "/admin/utenti" : "/app"} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInvio(true);
    setMsg(null);
    const err = await accedi(email.trim(), password);
    if (err) setMsg(err);
    setInvio(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border-2 border-double border-white/70 font-mono text-[12px] font-semibold tracking-[0.14em]">
            SIR
          </div>
          <div className="eyebrow !text-ink-muted">Gestione sinistri per enti</div>
        </div>

        <div className="relative">
          <div className="timbro timbro-inclinato absolute -top-16 right-6 text-[13px] text-white/60 px-5 py-3 animate-stamp-in">
            <span className="font-semibold">Protocollo</span>
            <span className="mt-1 text-[9px] tracking-[0.2em]">Istruttoria · Valutazione</span>
          </div>
          <h1 className="max-w-xl text-[44px] font-semibold leading-[1.08] text-white">
            Dalla denuncia alla decisione, <em className="font-normal italic text-ink-muted">un fascicolo alla volta.</em>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Registra il sinistro, completa la checklist documentale, applica i parametri dell'Ente e genera lettere e report pronti per il protocollo.
          </p>
        </div>

        <div className="flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted/70">
          <span>Checklist</span>
          <span>Valutazione</span>
          <span>Documenti</span>
          <span>Report</span>
        </div>

        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full border-[28px] border-double border-white/5" />
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded border-2 border-double border-ink font-mono text-[12px] font-semibold tracking-[0.14em] text-ink">SIR</div>
          </div>
          <div className="eyebrow mb-2">Accesso riservato</div>
          <h2 className="text-[28px] font-semibold leading-tight">Entra nel gestionale</h2>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">Le credenziali sono rilasciate dall'amministratore. Non è prevista la registrazione autonoma.</p>

          <div className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@ente.it" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {msg && (
            <div role="alert" className="mt-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {msg}
            </div>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={invio || caricamento}>
            {invio ? "Accesso in corso" : "Accedi"}
            {!invio && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          <p className="mt-8 text-center text-[12px] text-muted-foreground">
            Password dimenticata? Chiedi all'amministratore di reimpostarla.
          </p>
        </form>
      </section>
    </div>
  );
}
