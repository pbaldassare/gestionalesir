import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aggiornaSinistro, eliminaDocumento, registraEvento, salvaDocumento } from "@/lib/api";
import { generaDocumento } from "@/lib/documenti";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, euro } from "@/lib/format";
import { TIPI_DOCUMENTO, type ChecklistVoce, type Documento, type Sinistro, type TipoDocumento, type Valutazione } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Generatore {
  chiave: string;
  tipi: TipoDocumento[];
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

function stimaValutazione(v: Valutazione | null, s: Sinistro): number | null {
  if (!v) return s.importo_richiesto;
  if (v.importo_proposto != null) return v.importo_proposto;
  const base = v.importo_base ?? s.importo_richiesto;
  if (base == null) return null;
  return Math.round(base * (v.riduzioni ?? []).reduce((acc, r) => acc * (1 - Number(r.percentuale) / 100), 1) * 100) / 100;
}

export function TabDocumenti({ sinistro: s, voci, valutazione, documenti }: { sinistro: Sinistro; voci: ChecklistVoce[]; valutazione: Valutazione | null; documenti: Documento[] }) {
  const qc = useQueryClient();
  const { ente, session } = useAuth();
  const [anteprima, setAnteprima] = useState<Documento | null>(null);
  const [importoDialog, setImportoDialog] = useState(false);
  const [importo, setImporto] = useState<string>("");

  const mancanti = voci.filter((v) => !v.completata);
  const positivo = valutazione?.esito === "da_liquidare";
  const generatori: Generatore[] = [
    { chiave: "avvio", tipi: ["avvio_istruttoria"], titolo: TIPI_DOCUMENTO.avvio_istruttoria, descrizione: "Conferma al richiedente la presa in carico e indica i documenti ancora da produrre.", disponibile: true },
    { chiave: "integrazione", tipi: ["richiesta_integrazione"], titolo: TIPI_DOCUMENTO.richiesta_integrazione, descrizione: "Sollecita le voci della checklist non ancora acquisite, con termine di 30 giorni.", disponibile: mancanti.length > 0, motivo: "La checklist è completa: non c'è nulla da integrare." },
    { chiave: "scheda", tipi: ["scheda_danno"], titolo: TIPI_DOCUMENTO.scheda_danno, descrizione: "Scheda interna dell'istruttoria: elementi del danno, documenti acquisiti, relazione tecnica, valutazione ed esito.", disponibile: !!valutazione, motivo: "Serve una valutazione salvata." },
    { chiave: "quietanza", tipi: ["lettera_quietanza", "atto_quietanza"], titolo: "Quietanza: lettera di invio e atto", descrizione: "Genera insieme la lettera di trasmissione e l'atto di quietanza con importo in lettere e spazio per l'IBAN.", disponibile: positivo, motivo: valutazione ? "L'esito della valutazione è negativo." : "Serve una valutazione con esito positivo." },
    { chiave: "rigetto", tipi: ["lettera_rigetto"], titolo: TIPI_DOCUMENTO.lettera_rigetto, descrizione: "Comunica il diniego con la relazione tecnica e le motivazioni emerse dalla valutazione.", disponibile: valutazione?.esito === "non_liquidare", motivo: valutazione ? "L'esito della valutazione è positivo." : "Serve una valutazione con esito negativo." },
  ];

  const genera = useMutation({
    mutationFn: async ({ tipi, importo }: { tipi: TipoDocumento[]; importo?: number | null }) => {
      const generati: Documento[] = [];
      for (const tipo of tipi) {
        const g = generaDocumento(tipo, { ente: ente!, sinistro: s, checklist: voci, valutazione, importo });
        const doc = await salvaDocumento({ sinistro_id: s.id, ente_id: s.ente_id, tipo, titolo: g.titolo, contenuto_html: g.html, created_by: session!.user.id });
        await registraEvento(s.id, s.ente_id, "documento", `Generato: ${g.titolo}`, session!.user.id);
        generati.push(doc);
      }
      if (tipi.includes("avvio_istruttoria") && s.stato === "aperto") await aggiornaSinistro(s.id, { stato: "istruttoria" });
      if (tipi.includes("atto_quietanza")) await aggiornaSinistro(s.id, { stato: "liquidato", importo_liquidato: importo ?? stimaValutazione(valutazione, s) });
      if (tipi.includes("lettera_rigetto")) await aggiornaSinistro(s.id, { stato: "respinto" });
      return generati;
    },
    onSuccess: (docs) => {
      qc.invalidateQueries({ queryKey: ["documenti", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistro", s.id] });
      qc.invalidateQueries({ queryKey: ["eventi", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success(docs.length > 1 ? `${docs.length} documenti generati` : "Documento generato", { description: docs.map((d) => d.titolo).join(" · ") });
      setAnteprima(docs[docs.length - 1]);
    },
    onError: (e: Error) => toast.error("Documento non generato", { description: e.message }),
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaDocumento(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documenti", s.id] }); setAnteprima(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  function avvia(g: Generatore) {
    if (g.chiave === "quietanza") {
      setImporto(String(stimaValutazione(valutazione, s) ?? ""));
      setImportoDialog(true);
      return;
    }
    genera.mutate({ tipi: g.tipi });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <section>
        <h2 className="mb-1 text-[15px] font-semibold">Genera</h2>
        <p className="mb-3 text-[12.5px] text-muted-foreground">Modelli dell'Ufficio Assicurazioni, compilati con l'intestazione dell'Ente e i dati del fascicolo al momento della generazione.</p>
        <ul className="space-y-2">
          {generatori.map((g) => (
            <li key={g.chiave} className={cn("rounded-lg border bg-card px-4 py-3", !g.disponibile && "opacity-60")}>
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
            <DialogTitle className="font-serif">Somma della quietanza</DialogTitle>
            <DialogDescription>Importo accettato in via transattiva, a saldo e stralcio. Il fascicolo passerà allo stato "Liquidato".</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="imp">Importo (€)</Label>
            <Input id="imp" type="number" step="0.01" min="0" className="font-mono" value={importo} onChange={(e) => setImporto(e.target.value)} autoFocus />
            {s.importo_richiesto != null && <div className="text-[12px] text-muted-foreground">Ammontare del danno {euro(s.importo_richiesto)}{valutazione && ` · stima della valutazione ${euro(stimaValutazione(valutazione, s))}`}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportoDialog(false)}>Annulla</Button>
            <Button disabled={importo === "" || genera.isPending} onClick={() => { setImportoDialog(false); genera.mutate({ tipi: ["lettera_quietanza", "atto_quietanza"], importo: Number(importo) }); }}>Genera lettera e atto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
