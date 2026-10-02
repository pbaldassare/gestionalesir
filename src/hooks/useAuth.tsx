import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Ente, Profilo } from "@/lib/types";

interface AuthState {
  session: Session | null;
  profilo: Profilo | null;
  ente: Ente | null;
  caricamento: boolean;
  errore: string | null;
  accedi: (email: string, password: string) => Promise<string | null>;
  esci: () => Promise<void>;
  ricaricaEnte: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [ente, setEnte] = useState<Ente | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  async function caricaProfilo(s: Session | null) {
    if (!s) {
      setProfilo(null);
      setEnte(null);
      setCaricamento(false);
      return;
    }
    const { data: p, error } = await supabase.from("profili").select("*").eq("id", s.user.id).maybeSingle();
    if (error) {
      setErrore(error.message);
      setProfilo(null);
      setEnte(null);
      setCaricamento(false);
      return;
    }
    if (!p || !p.attivo) {
      setErrore(p ? "Utenza disattivata. Contatta l'amministratore." : "Questo account non è abilitato al Gestionale SIR.");
      await supabase.auth.signOut();
      setProfilo(null);
      setEnte(null);
      setCaricamento(false);
      return;
    }
    setErrore(null);
    setProfilo(p as Profilo);
    if (p.ente_id) {
      const { data: e } = await supabase.from("enti").select("*").eq("id", p.ente_id).maybeSingle();
      setEnte((e as Ente) ?? null);
    } else {
      setEnte(null);
    }
    supabase.from("profili").update({ ultimo_accesso: new Date().toISOString() }).eq("id", s.user.id).then(() => {});
    setCaricamento(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      caricaProfilo(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s);
      if (evento === "SIGNED_OUT") {
        setProfilo(null);
        setEnte(null);
        setCaricamento(false);
      } else if (evento === "SIGNED_IN" || evento === "USER_UPDATED") {
        // differito: evitare chiamate supabase dentro il callback di auth
        setTimeout(() => caricaProfilo(s), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function accedi(email: string, password: string) {
    setErrore(null);
    setCaricamento(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setCaricamento(false);
      return error.message.includes("Invalid login") ? "Email o password non corretti." : error.message;
    }
    return null;
  }

  async function esci() {
    await supabase.auth.signOut();
  }

  async function ricaricaEnte() {
    if (!profilo?.ente_id) return;
    const { data: e } = await supabase.from("enti").select("*").eq("id", profilo.ente_id).maybeSingle();
    setEnte((e as Ente) ?? null);
  }

  return (
    <AuthContext.Provider value={{ session, profilo, ente, caricamento, errore, accedi, esci, ricaricaEnte }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuori da AuthProvider");
  return ctx;
}
