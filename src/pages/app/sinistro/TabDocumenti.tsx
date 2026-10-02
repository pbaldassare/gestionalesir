import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aggiornaSinistro, eliminaDocumento, registraEvento, salvaDocumento } from "@/lib/api";
import { generaDocumento } from "@/lib/documenti";
import { useAuth } from "@/hooks/useAuth";
import { dataIt } from "@/lib/format";
import { TIPI_DOCUMENTO, type ChecklistVoce, type Documento, type Sinistro, type TipoDocumento, type Valutazione } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Generatore {
  tipo: TipoDocumento;
  titolo: string;
  descrizione: string;
  disponibile: boolean;
  motivo?: string;
}

/** Scala il foglio A4 (794px) alla larghezza disponibile, senza scroll orizzontale. */
function AnteprimaFoglio({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scala, setScala] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const misura = () => setScala(Math.min(1, (el.clientWidth - 32) / 794));
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="overflow-auto bg-muted/60 p-4">
      <div style={{ width: 794 * scala, minHeight: 1123 * scala }} className="mx-auto">
        <article className="foglio origin-top-left" style={{ transform: `scale(${scala})` }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export function TabDocumenti({ sinistro: s, voci, valutazione, documenti }: { sinistro: Sinistro; voci: ChecklistVoce[]; valutazione: Valutazione | null; documenti: Documento[] }) {
  const qc = useQueryClient();
  const { ente, session } = useAuth();
  const [anteprima, setAnteprima] = useState<Documento | null>(null);
  const [importoDialog, setImportoDialog] = useState(false);
  const [importo, setImporto] = useState<string>("");

  const mancanti = voci.filter((v) => !v.completata);
  const generatori: Generatore[] = [
    { tipo: "avvio_istruttoria", titolo: TIPI_DOCUMENTO.avvio_istruttoria, descrizione: "Conferma al richiedente la presa in carico e indica i documenti ancora da produrre.", disponibile: true },
    { tipo: "richiesta_integrazione", titolo: TIPI_DOCUMENTO.richiesta_integrazione, descrizione: "Sollecita le voci della checklist non ancora acquisite, con termine di 30 giorni.", disponibile: mancanti.length > 0, motivo: "La checklist è completa: non c'è nulla da integrare." },
    { tipo: "report_valutazione", titolo: TIPI_DOCUMENTO.report_valutazione, descrizione: "Relazione interna con parametri, punteggio ed esito motivato.", disponibile: !!valutazione, motivo: "Serve una valutazione salvata." },
    { tipo: "lettera_liquidazione", titolo: TIPI_DOCUMENTO.lettera_liquidazione, descrizione: "Comunica il riconoscimento del danno e l'importo proposto, con quietanza.", disponibile: valutazione?.esito === "da_liquidare", motivo: valutazione ? "L'esito della valutazione è negativo." : "Serve una valutazione con esito positivo." },
    { tipo: "lettera_rigetto", titolo: TIPI_DOCUMENTO.lettera_rigetto, descrizione: "Comunica il diniego con le motivazioni emerse dalla valutazione.", disponibile: valutazione?.esito === "non_liquidare", motivo: valutazione ? "L'esito della valutazione è positivo." : "Serve una valutazione con esito negativo." },
  ];

  const genera = useMutation({
    mutationFn: async ({ tipo, importo }: { tipo: TipoDocumento; importo?: number | null }) => {
      const g = generaDocumento(tipo, { ente: ente!, sinistro: s, checklist: voci, valutazione, importo });
      const doc = await salvaDocumento({ sinistro_id: s.id, ente_id: s.ente_id, tipo, titolo: g.titolo, contenuto_html: g.html, created_by: session!.user.id });
      await registraEvento(s.id, s.ente_id, "documento", `Generato: ${g.titolo}`, session!.user.id);
      if (tipo === "avvio_istruttoria" && s.stato === "aperto") await aggiornaSinistro(s.id, { stato: "istruttoria" });
      if (tipo === "lettera_liquidazione") await aggiornaSinistro(s.id, { stato: "liquidato", importo_liquidato: importo ?? valutazione?.importo_proposto ?? s.importo_richiesto });
      if (tipo === "lettera_rigetto") await aggiornaSinistro(s.id, { stato: "respinto" });
      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["documenti", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistro", s.id] });
      qc.invalidateQueries({ queryKey: ["eventi", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success("Documento generato", { description: doc.titolo });
      setAnteprima(doc);
    },
    onError: (e: Error) => toast.error("Documento non generato", { description: e.message }),
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaDocumento(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documenti", s.id] }); setAnteprima(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  function avvia(g: Generatore) {
    if (g.tipo === "lettera_liquidazione") {
      setImporto(String(valutazione?.importo_proposto ?? s.importo_richiesto ?? ""));
      setImportoDialog(true);
      return;
    }
    genera.mutate({ tipo: g.tipo });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <section>
        <h2 className="mb-1 text-[15px] font-semibold">Genera</h2>
        <p className="mb-3 text-[12.5px] text-muted-foreground">I documenti usano l'intestazione dell'Ente e i dati del fascicolo al momento della generazione.</p>
        <ul className="space-y-2">
          {generatori.map((g) => (
            <li key={g.tipo} className={cn("rounded-lg border bg-card px-4 py-3", !g.disponibile && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13.5px] font-medium">{g.titolo}</div>
                  <div className="text-[12.5px] text-muted-foreground">{g.disponibile ? g.descrizione : g.motivo}</div>
                </div>
                <Button size="sm" variant={g.disponibile ? "default" : "outline"} disabled={!g.disponibile || genera.isPending} onClick={() => avvia(g)}>Genera</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Archivio del fascicolo</h2>
        {documenti.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/60 px-5 py-10 text-center text-[13px] text-muted-foreground">
            Nessun documento generato. Inizia dalla comunicazione di avvio istruttoria.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {documenti.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button className="min-w-0 flex-1 text-left" onClick={() => setAnteprima(d)}>
                  <div className="truncate text-[13.5px] font-medium hover:text-primary">{d.titolo}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{TIPI_DOCUMENTO[d.tipo]} · {dataIt(d.created_at, true)}</div>
                </button>
                <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Apri per la stampa">
                  <Link to={`/app/stampa/${d.id}`} target="_blank"><Printer className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Elimina documento" onClick={() => elimina.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!anteprima} onOpenChange={(o) => !o && setAnteprima(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="font-serif">{anteprima?.titolo}</DialogTitle>
            <DialogDescription>{anteprima && `${TIPI_DOCUMENTO[anteprima.tipo]} · generato il ${dataIt(anteprima.created_at, true)}`}</DialogDescription>
          </DialogHeader>
          <AnteprimaFoglio html={anteprima?.contenuto_html ?? ""} />
          <DialogFooter className="border-t px-6 py-3">
            {anteprima && (
              <Button asChild>
                <Link to={`/app/stampa/${anteprima.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> Apri e stampa</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importoDialog} onOpenChange={setImportoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Importo da liquidare</DialogTitle>
            <DialogDescription>Somma proposta a tacitazione di ogni pretesa. Il fascicolo passerà allo stato "Liquidato".</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="imp">Importo (€)</Label>
            <Input id="imp" type="number" step="0.01" min="0" className="font-mono" value={importo} onChange={(e) => setImporto(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportoDialog(false)}>Annulla</Button>
            <Button disabled={importo === "" || genera.isPending} onClick={() => { setImportoDialog(false); genera.mutate({ tipo: "lettera_liquidazione", importo: Number(importo) }); }}>Genera la lettera</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
