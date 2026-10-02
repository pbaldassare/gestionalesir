import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileStack, Plus } from "lucide-react";
import { listaSinistri } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, euro, giorniDa } from "@/lib/format";
import { TIPOLOGIE } from "@/lib/types";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Protocollo, StatoBadge, TimbroEsito } from "@/components/Timbro";
import { Vuoto } from "@/components/Vuoto";
import { cn } from "@/lib/utils";

function Indicatore({ etichetta, valore, nota, tono }: { etichetta: string; valore: string | number; nota?: string; tono?: "primario" | "verde" | "rosso" | "ambra" }) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4">
      <div className="eyebrow">{etichetta}</div>
      <div className={cn("mt-2 font-mono text-[30px] font-medium leading-none", tono === "verde" && "text-success", tono === "rosso" && "text-destructive", tono === "ambra" && "text-warning", tono === "primario" && "text-primary")}>
        {valore}
      </div>
      {nota && <div className="mt-2 text-[12px] text-muted-foreground">{nota}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { ente, profilo } = useAuth();
  const { data: sinistri, isLoading, error } = useQuery({ queryKey: ["sinistri"], queryFn: listaSinistri });

  if (isLoading) return <Caricamento />;
  if (error) return <div className="text-destructive">{(error as Error).message}</div>;

  const tutti = sinistri ?? [];
  const anno = new Date().getFullYear();
  const diQuestAnno = tutti.filter((s) => s.anno === anno);
  const inLavorazione = tutti.filter((s) => ["aperto", "istruttoria"].includes(s.stato));
  const valutati = tutti.filter((s) => s.stato === "valutato");
  const liquidati = diQuestAnno.filter((s) => s.stato === "liquidato");
  const respinti = diQuestAnno.filter((s) => s.stato === "respinto");
  const esposizione = inLavorazione.reduce((t, s) => t + (s.importo_richiesto ?? 0), 0);
  const liquidato = liquidati.reduce((t, s) => t + (s.importo_liquidato ?? 0), 0);
  const fermi = inLavorazione.filter((s) => (giorniDa(s.updated_at.slice(0, 10)) ?? 0) > 20);
  const recenti = tutti.slice(0, 8);

  return (
    <>
      <Intestazione
        eyebrow={ente?.nome}
        titolo={<>Buongiorno, {profilo?.nome_completo}</>}
        descrizione={`Situazione dei sinistri al ${dataIt(new Date().toISOString())}.`}
        azioni={
          <Button asChild>
            <Link to="/app/sinistri/nuovo">
              <Plus className="mr-2 h-4 w-4" /> Registra sinistro
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicatore etichetta="In lavorazione" valore={inLavorazione.length} nota={`Esposizione ${euro(esposizione)}`} tono="primario" />
        <Indicatore etichetta="Valutati, in attesa di lettera" valore={valutati.length} nota={valutati.length ? "Genera la lettera di esito" : "Nessuno in sospeso"} tono="ambra" />
        <Indicatore etichetta={`Liquidati nel ${anno}`} valore={liquidati.length} nota={`Erogato ${euro(liquidato)}`} tono="verde" />
        <Indicatore etichetta={`Respinti nel ${anno}`} valore={respinti.length} nota={diQuestAnno.length ? `${Math.round((respinti.length / diQuestAnno.length) * 100)}% delle pratiche dell'anno` : undefined} tono="rosso" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Ultimi fascicoli</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/sinistri">
                Tutti i sinistri <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {recenti.length === 0 ? (
            <Vuoto
              icona={FileStack}
              titolo="Nessun sinistro registrato"
              testo={`Il primo fascicolo riceverà il protocollo SIR-${anno}-0001.`}
              azione={
                <Button asChild>
                  <Link to="/app/sinistri/nuovo">Registra il primo sinistro</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {recenti.map((s) => (
                <Link key={s.id} to={`/app/sinistri/${s.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/60">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Protocollo numero={s.numero_protocollo} />
                      <StatoBadge stato={s.stato} />
                    </div>
                    <div className="mt-1 truncate text-[14px] font-medium">{s.richiedente_nome}</div>
                    <div className="truncate text-[12.5px] text-muted-foreground">
                      {TIPOLOGIE[s.tipologia]} · {s.luogo} · {dataIt(s.data_sinistro)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px]">{euro(s.importo_richiesto)}</div>
                    {s.esito && <TimbroEsito esito={s.esito} piccolo inclinato={false} className="mt-1" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[17px] font-semibold">Da attenzionare</h2>
          {fermi.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card/60 px-5 py-8 text-center text-[13px] text-muted-foreground">
              Nessuna pratica ferma da più di 20 giorni.
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {fermi.map((s) => (
                <Link key={s.id} to={`/app/sinistri/${s.id}`} className="block px-4 py-3 transition-colors hover:bg-accent/60">
                  <div className="flex items-center justify-between">
                    <Protocollo numero={s.numero_protocollo} />
                    <span className="font-mono text-[11px] text-warning">{giorniDa(s.updated_at.slice(0, 10))} gg fermo</span>
                  </div>
                  <div className="mt-0.5 truncate text-[13.5px]">{s.richiedente_nome}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
