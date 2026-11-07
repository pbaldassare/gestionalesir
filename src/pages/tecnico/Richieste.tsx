import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { listaSinistri } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, giorniDa } from "@/lib/format";
import { FLUSSI, TIPOLOGIE, type Documento } from "@/lib/types";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { Protocollo } from "@/components/Timbro";
import { Vuoto } from "@/components/Vuoto";
import { cn } from "@/lib/utils";

async function relazioniConsegnate(): Promise<Pick<Documento, "sinistro_id" | "created_at">[]> {
  const { data, error } = await supabase.from("documenti").select("sinistro_id, created_at").eq("tipo", "relazione_tecnica");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function Richieste() {
  const { ente } = useAuth();
  const sinistri = useQuery({ queryKey: ["sinistri"], queryFn: listaSinistri });
  const relazioni = useQuery({ queryKey: ["relazioni-consegnate"], queryFn: relazioniConsegnate });

  if (sinistri.isLoading) return <Caricamento />;
  if (sinistri.error) return <div className="text-destructive">{(sinistri.error as Error).message}</div>;

  const consegnate = new Set((relazioni.data ?? []).map((r) => r.sinistro_id));
  const lista = [...(sinistri.data ?? [])].sort((a, b) => (b.richiesta_relazione_il ?? "").localeCompare(a.richiesta_relazione_il ?? ""));
  const aperte = lista.filter((s) => !consegnate.has(s.id));
  const chiuse = lista.filter((s) => consegnate.has(s.id));

  const Riga = ({ s, fatta }: { s: (typeof lista)[number]; fatta: boolean }) => {
    const giorni = giorniDa(s.richiesta_relazione_il?.slice(0, 10));
    return (
      <Link to={`/tecnico/sinistri/${s.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/60">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Protocollo numero={s.numero_protocollo} />
            <span className="text-[12px] text-muted-foreground">{FLUSSI[s.flusso]}</span>
          </div>
          <div className="mt-1 truncate text-[14px] font-medium">{s.luogo}</div>
          <div className="truncate text-[12.5px] text-muted-foreground">
            Sinistro del {dataIt(s.data_sinistro)} · {TIPOLOGIE[s.tipologia]} · {s.causa_presunta ?? s.richiedente_nome}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] text-muted-foreground">richiesta il {dataIt(s.richiesta_relazione_il)}</div>
          {fatta ? (
            <span className="font-mono text-[11px] uppercase tracking-wider text-success">relazione consegnata</span>
          ) : (
            <span className={cn("font-mono text-[11px] uppercase tracking-wider", (giorni ?? 0) > 10 ? "text-destructive" : "text-warning")}>{giorni ?? 0} gg · entro 10</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <Intestazione eyebrow={ente?.nome} titolo="Richieste di relazione tecnica" descrizione="I sinistri per cui l'Ufficio Assicurazioni ha chiesto la relazione all'Attività Strade. Apri il fascicolo, esamina documenti e foto, genera la relazione." />
      <section>
        <h2 className="mb-3 text-[17px] font-semibold">Da evadere</h2>
        {aperte.length === 0 ? (
          <Vuoto icona={ClipboardList} titolo="Nessuna richiesta in attesa" testo="Quando l'Ufficio Assicurazioni invierà una richiesta di relazione, il fascicolo comparirà qui." />
        ) : (
          <div className="divide-y rounded-lg border bg-card">{aperte.map((s) => <Riga key={s.id} s={s} fatta={false} />)}</div>
        )}
      </section>
      {chiuse.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[17px] font-semibold">Relazioni consegnate</h2>
          <div className="divide-y rounded-lg border bg-card">{chiuse.map((s) => <Riga key={s.id} s={s} fatta />)}</div>
        </section>
      )}
    </>
  );
}
