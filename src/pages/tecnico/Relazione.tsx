import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, FileText, Paperclip, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { caricaAllegato, leggiSinistro, listaAllegati, listaChecklist, listaDocumenti, listaModelliDocumento, registraEvento, salvaDocumento, urlAllegato } from "@/lib/api";
import { generaDocumento } from "@/lib/documenti";
import type { ChiaveModello, DatiRelazione } from "@/lib/modelli";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, euro } from "@/lib/format";
import { FLUSSI, TIPI_DOCUMENTO, TIPOLOGIE, type Allegato, type Documento } from "@/lib/types";
import { Caricamento } from "@/components/layout/Caricamento";
import { MappaLuogo } from "@/components/Mappa";
import { linkGoogleMaps } from "@/lib/maps";
import { AnteprimaFoglio } from "@/components/Foglio";
import { TimbroProtocollo } from "@/components/Timbro";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Riga({ etichetta, valore, mono }: { etichetta: string; valore: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b py-2 text-[13.5px] last:border-0">
      <div className="text-muted-foreground">{etichetta}</div>
      <div className={mono ? "font-mono" : ""}>{valore ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

const vuota: DatiRelazione = { tecnico: "", natura_strada: "", stato_luoghi: "", nesso: "", ripristini: "", conclusioni: "" };

export default function Relazione() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { ente, profilo, session } = useAuth();
  const q = useQuery({ queryKey: ["sinistro", id], queryFn: () => leggiSinistro(id) });
  const checklist = useQuery({ queryKey: ["checklist", id], queryFn: () => listaChecklist(id) });
  const allegati = useQuery({ queryKey: ["allegati", id], queryFn: () => listaAllegati(id) });
  const documenti = useQuery({ queryKey: ["documenti", id], queryFn: () => listaDocumenti(id) });
  const modelli = useQuery({ queryKey: ["modelli-documento"], queryFn: listaModelliDocumento });
  const [aperto, setAperto] = useState(false);
  const [r, setR] = useState<DatiRelazione>({ ...vuota, tecnico: profilo?.nome_completo ?? "" });
  const [anteprima, setAnteprima] = useState<Documento | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const genera = useMutation({
    mutationFn: async () => {
      const personalizzati = Object.fromEntries((modelli.data ?? []).map((m) => [m.chiave, m.contenuto_html])) as Partial<Record<ChiaveModello, string>>;
      const g = generaDocumento("relazione_tecnica", { ente: ente!, sinistro: q.data!, checklist: checklist.data ?? [], relazione: r }, personalizzati);
      const doc = await salvaDocumento({ sinistro_id: id, ente_id: q.data!.ente_id, tipo: g.tipo, titolo: g.titolo, contenuto_html: g.html, created_by: session!.user.id });
      await registraEvento(id, q.data!.ente_id, "relazione", `Relazione tecnica consegnata da ${r.tecnico || profilo?.nome_completo}`, session!.user.id);
      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["documenti", id] });
      qc.invalidateQueries({ queryKey: ["relazioni-consegnate"] });
      setAperto(false);
      setAnteprima(doc);
      toast.success("Relazione generata", { description: "L'Ufficio Assicurazioni la trova nel fascicolo." });
    },
    onError: (e: Error) => toast.error("Relazione non generata", { description: e.message }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      await caricaAllegato(file, q.data!, session!.user.id, null);
      await registraEvento(id, q.data!.ente_id, "allegato", `Allegato caricato dal tecnico: ${file.name}`, session!.user.id);
    },
    onSuccess: () => { toast.success("Allegato caricato"); qc.invalidateQueries({ queryKey: ["allegati", id] }); },
    onError: (e: Error) => toast.error("Caricamento non riuscito", { description: e.message }),
  });

  async function apri(a: Allegato) {
    try {
      window.open(await urlAllegato(a), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (q.isLoading) return <Caricamento />;
  if (q.error || !q.data) return <div className="text-destructive">{(q.error as Error)?.message ?? "Sinistro non disponibile"}</div>;
  const s = q.data;
  const relazioni = (documenti.data ?? []).filter((d) => d.tipo === "relazione_tecnica");
  const richieste = (documenti.data ?? []).filter((d) => d.tipo === "richiesta_relazione_tecnica");
  const campi: { k: keyof DatiRelazione; label: string; righe: number; aiuto: string }[] = [
    { k: "natura_strada", label: "Natura della strada", righe: 2, aiuto: "Comunale o privata, chi ne cura la manutenzione." },
    { k: "stato_luoghi", label: "Stato dei luoghi", righe: 4, aiuto: "Esito del sopralluogo: dimensioni dell'anomalia, segnaletica, visibilità." },
    { k: "nesso", label: "Nesso tra stato dei luoghi ed evento", righe: 4, aiuto: "Se la situazione dei luoghi è stata determinante per il danno lamentato." },
    { k: "ripristini", label: "Interventi di ripristino successivi", righe: 2, aiuto: "Se e quando il punto è stato sistemato." },
    { k: "conclusioni", label: "Conclusioni", righe: 3, aiuto: "Valutazione tecnica finale da trasmettere all'Ufficio Assicurazioni." },
  ];

  return (
    <>
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/tecnico"><ArrowLeft className="mr-1.5 h-4 w-4" /> Richieste</Link>
        </Button>
      </div>

      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          <div className="hidden sm:block"><TimbroProtocollo numero={s.numero_protocollo} data={dataIt(s.data_ricezione)} /></div>
          <div>
            <div className="text-[12.5px] text-muted-foreground">{TIPOLOGIE[s.tipologia]} · {FLUSSI[s.flusso]} · richiesta del {dataIt(s.richiesta_relazione_il)}</div>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight">{s.luogo}</h1>
            <div className="mt-1 text-[13.5px] text-muted-foreground">Sinistro del <span className="font-mono">{dataIt(s.data_sinistro)}</span>{s.ora_sinistro ? ` alle ${s.ora_sinistro.slice(0, 5)}` : ""} · {s.causa_presunta ?? "causa non indicata"}</div>
          </div>
        </div>
        <Button onClick={() => setAperto(true)}>
          <FileText className="mr-2 h-4 w-4" /> {relazioni.length ? "Genera una nuova relazione" : "Genera la relazione"}
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-lg border bg-card px-5 py-3">
            <h2 className="mb-1 text-[15px] font-semibold">Il fatto</h2>
            <Riga etichetta="Luogo" valore={s.luogo} />
            {s.lat != null && s.lng != null && (
              <div className="border-b py-3">
                <MappaLuogo punto={{ lat: s.lat, lng: s.lng }} className="h-56" />
                <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted-foreground">
                  <span className="font-mono">{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</span>
                  <a className="text-primary underline" href={linkGoogleMaps({ lat: s.lat, lng: s.lng })} target="_blank" rel="noreferrer">Apri in Google Maps</a>
                </div>
              </div>
            )}
            <Riga etichetta="Descrizione" valore={<span className="whitespace-pre-wrap">{s.descrizione}</span>} />
            <Riga etichetta="Causa presunta" valore={s.causa_presunta} />
            <Riga etichetta="Teste" valore={s.testimone} />
            {s.targa && <Riga etichetta="Veicolo" valore={`${s.targa.toUpperCase()}${s.conducente ? " · conducente " + s.conducente : ""}`} />}
            <Riga etichetta="Danno dichiarato" valore={euro(s.importo_richiesto)} mono />
            <Riga etichetta="Richiedente" valore={s.richiedente_nome} />
          </section>

          <section className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-[15px] font-semibold">Documenti e fotografie</h2>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={upload.isPending}><Upload className="mr-1.5 h-4 w-4" /> {upload.isPending ? "Caricamento" : "Aggiungi foto del sopralluogo"}</Button>
            </div>
            {(allegati.data ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">Nessun allegato nel fascicolo.</p>
            ) : (
              <ul className="divide-y">
                {(allegati.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <button className="min-w-0 flex-1 truncate text-left text-primary hover:underline" onClick={() => apri(a)}>{a.nome_file}</button>
                    <span className="font-mono text-[11px] text-muted-foreground">{dataIt(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
            {(checklist.data ?? []).length > 0 && (
              <div className="border-t px-5 py-3">
                <div className="eyebrow mb-1.5">Documentazione acquisita dall'ufficio</div>
                <ul className="grid gap-1 text-[12.5px] sm:grid-cols-2">
                  {(checklist.data ?? []).map((c) => <li key={c.id} className={c.completata ? "" : "text-muted-foreground line-through"}>{c.titolo}</li>)}
                </ul>
              </div>
            )}
          </section>
        </div>

        <section className="space-y-5">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3"><h2 className="text-[15px] font-semibold">Richiesta dell'Ufficio Assicurazioni</h2></div>
            {richieste.length === 0 ? (
              <p className="px-5 py-5 text-[13px] text-muted-foreground">La lettera di richiesta non è nel fascicolo.</p>
            ) : (
              <ul className="divide-y">
                {richieste.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setAnteprima(d)}>
                      <div className="truncate text-[13.5px] font-medium hover:text-primary">{d.titolo}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{dataIt(d.created_at, true)}</div>
                    </button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8"><Link to={`/app/stampa/${d.id}`} target="_blank"><Printer className="h-4 w-4" /></Link></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3"><h2 className="text-[15px] font-semibold">Relazioni consegnate</h2></div>
            {relazioni.length === 0 ? (
              <p className="px-5 py-5 text-[13px] text-muted-foreground">Nessuna relazione ancora generata per questo sinistro.</p>
            ) : (
              <ul className="divide-y">
                {relazioni.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setAnteprima(d)}>
                      <div className="truncate text-[13.5px] font-medium hover:text-primary">{d.titolo}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{dataIt(d.created_at, true)}</div>
                    </button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8"><Link to={`/app/stampa/${d.id}`} target="_blank"><Printer className="h-4 w-4" /></Link></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Dialog open={aperto} onOpenChange={setAperto}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Relazione tecnica · {s.numero_protocollo}</DialogTitle>
            <DialogDescription>I dati del sinistro sono già nel documento. Compila le valutazioni tecniche: il testo finale segue il modello dell'Ente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tecnico">Tecnico</Label>
              <input id="tecnico" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={r.tecnico} onChange={(e) => setR({ ...r, tecnico: e.target.value })} />
            </div>
            {campi.map((c) => (
              <div key={c.k} className="space-y-1.5">
                <Label htmlFor={c.k}>{c.label}</Label>
                <Textarea id={c.k} rows={c.righe} value={r[c.k]} onChange={(e) => setR({ ...r, [c.k]: e.target.value })} placeholder={c.aiuto} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAperto(false)}>Annulla</Button>
            <Button disabled={genera.isPending || !r.conclusioni.trim()} onClick={() => genera.mutate()}>{genera.isPending ? "Generazione" : "Genera la relazione"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!anteprima} onOpenChange={(o) => !o && setAnteprima(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="font-serif">{anteprima?.titolo}</DialogTitle>
            <DialogDescription>{anteprima && `${TIPI_DOCUMENTO[anteprima.tipo]} · ${dataIt(anteprima.created_at, true)}`}</DialogDescription>
          </DialogHeader>
          <AnteprimaFoglio html={anteprima?.contenuto_html ?? ""} />
          <DialogFooter className="border-t px-6 py-3">
            {anteprima && <Button asChild><Link to={`/app/stampa/${anteprima.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> Apri e stampa</Link></Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
