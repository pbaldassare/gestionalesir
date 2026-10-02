import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aggiornaSinistro, listaParametri, registraEvento, salvaValutazione } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, euro } from "@/lib/format";
import { valuta, type Risposte } from "@/lib/valutazione";
import type { ChecklistVoce, Parametro, Riduzione, Sinistro, Valutazione } from "@/lib/types";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TimbroEsito } from "@/components/Timbro";
import { cn } from "@/lib/utils";

const RIDUZIONI_PREDEFINITE: Riduzione[] = [
  { etichetta: "Evitabilità del danno", percentuale: 30 },
  { etichetta: "Degrado d'uso del bene", percentuale: 20 },
];

function CampoParametro({ p, valore, onChange }: { p: Parametro; valore: string | number | boolean | undefined; onChange: (v: string | number | boolean) => void }) {
  const c = p.config ?? {};
  if (p.tipo === "si_no") {
    return (
      <RadioGroup value={valore === undefined ? "" : valore === true || valore === "si" ? "si" : "no"} onValueChange={(v) => onChange(v)} className="flex gap-2">
        {(["si", "no"] as const).map((o) => (
          <Label key={o} className={cn("flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-[13px]", (valore === o || (o === "si" && valore === true)) && "border-primary bg-primary/5")}>
            <RadioGroupItem value={o} /> {o === "si" ? "Sì" : "No"}
          </Label>
        ))}
      </RadioGroup>
    );
  }
  if (p.tipo === "numero") {
    return (
      <div className="flex items-center gap-2">
        <Input type="number" step="any" className="w-40 font-mono" value={valore === undefined ? "" : String(valore)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        <span className="text-[12px] text-muted-foreground">soglia {c.operatore ?? "<="} {c.soglia ?? 0}</span>
      </div>
    );
  }
  return (
    <RadioGroup value={valore === undefined ? "" : String(valore)} onValueChange={onChange} className="grid gap-1.5">
      {(c.opzioni ?? []).map((o) => (
        <Label key={o.valore} className={cn("flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-[13px] font-normal", String(valore) === o.valore && "border-primary bg-primary/5")}>
          <RadioGroupItem value={o.valore} /> <span className="flex-1">{o.etichetta}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{o.bloccante ? "ostativo" : `${o.punteggio} pt`}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}

export function TabValutazione({ sinistro: s, voci, valutazione: ultima, vaiA }: { sinistro: Sinistro; voci: ChecklistVoce[]; valutazione: Valutazione | null; vaiA: (tab: string) => void }) {
  const qc = useQueryClient();
  const { ente, session } = useAuth();
  const parametri = useQuery({ queryKey: ["parametri"], queryFn: listaParametri });
  const [risposte, setRisposte] = useState<Risposte>({});
  const [note, setNote] = useState("");
  const [iter, setIter] = useState("");
  const [relazione, setRelazione] = useState("");
  const [verbale, setVerbale] = useState("");
  const [importoBase, setImportoBase] = useState<string>("");
  const [riduzioni, setRiduzioni] = useState<Riduzione[]>([]);
  const [importo, setImporto] = useState<string>("");
  const [importoManuale, setImportoManuale] = useState(false);
  const [nuova, setNuova] = useState(!ultima);

  const obbl = voci.filter((v) => v.obbligatoria);
  const checklistCompleta = obbl.length > 0 && obbl.every((v) => v.completata);

  // precompila dall'ultima valutazione o dai dati del fascicolo
  useEffect(() => {
    if (ultima) {
      setRisposte(ultima.risposte as Risposte);
      setNote(ultima.note ?? "");
      setIter(ultima.iter_istruttorio ?? "");
      setRelazione(ultima.relazione_tecnica ?? "");
      setVerbale(ultima.verbale_autorita ?? "");
      setImportoBase(ultima.importo_base != null ? String(ultima.importo_base) : s.importo_richiesto != null ? String(s.importo_richiesto) : "");
      setRiduzioni(ultima.riduzioni ?? []);
      setImporto(ultima.importo_proposto != null ? String(ultima.importo_proposto) : "");
      setImportoManuale(ultima.importo_proposto != null);
      setNuova(false);
      return;
    }
    const base: Risposte = {};
    for (const p of parametri.data ?? []) {
      if (p.codice === "documentazione") base[p.codice] = checklistCompleta ? "si" : "no";
      if (p.codice === "polizia" && s.causa_presunta === null) continue;
      if (p.codice === "importo" && p.tipo === "numero" && s.importo_richiesto != null) base[p.codice] = s.importo_richiesto;
    }
    setRisposte(base);
    setImportoBase(s.importo_richiesto != null ? String(s.importo_richiesto) : "");
    setRiduzioni([]);
    setImporto(s.importo_richiesto != null ? String(s.importo_richiesto) : "");
    setImportoManuale(false);
  }, [ultima, parametri.data, checklistCompleta, s.importo_richiesto, s.causa_presunta]);

  const soglia = ente?.soglia_liquidazione ?? 60;
  const attivi = useMemo(() => (parametri.data ?? []).filter((p) => p.attivo), [parametri.data]);
  const r = useMemo(() => valuta(attivi, risposte, soglia), [attivi, risposte, soglia]);

  const stima = useMemo(() => {
    const base = Number(importoBase);
    if (importoBase === "" || Number.isNaN(base)) return null;
    return Math.round(base * riduzioni.reduce((acc, x) => acc * (1 - Number(x.percentuale) / 100), 1) * 100) / 100;
  }, [importoBase, riduzioni]);

  useEffect(() => {
    if (!importoManuale && stima != null) setImporto(String(stima));
  }, [stima, importoManuale]);

  const salva = useMutation({
    mutationFn: async () => {
      const v = await salvaValutazione({
        sinistro_id: s.id,
        ente_id: s.ente_id,
        risposte: risposte as Valutazione["risposte"],
        dettaglio: r.dettaglio,
        punteggio: r.punteggio,
        punteggio_max: r.punteggio_max,
        percentuale: r.percentuale,
        soglia,
        bloccata: r.bloccata,
        esito: r.esito,
        motivazioni: r.motivazioni,
        importo_proposto: r.esito === "da_liquidare" && importo !== "" ? Number(importo) : null,
        importo_base: importoBase === "" ? null : Number(importoBase),
        riduzioni,
        iter_istruttorio: iter || null,
        relazione_tecnica: relazione || null,
        verbale_autorita: verbale || null,
        note: note || null,
        created_by: session!.user.id,
      });
      await aggiornaSinistro(s.id, { esito: r.esito, stato: "valutato" });
      await registraEvento(s.id, s.ente_id, "valutazione", `Valutazione salvata: ${r.esito === "da_liquidare" ? "da liquidare" : "non liquidabile"} (${r.percentuale}%)`, session!.user.id);
      return v;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["valutazione", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistro", s.id] });
      qc.invalidateQueries({ queryKey: ["eventi", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success("Valutazione salvata", { description: "Ora puoi generare la scheda danno e la quietanza o il rigetto." });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (parametri.isLoading) return <Caricamento />;
  if (attivi.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
        <Settings2 className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
        <div className="font-serif text-[17px] font-semibold">Nessun parametro di valutazione attivo</div>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">Definisci i criteri con cui l'Ente decide se un sinistro è da liquidare nelle impostazioni.</p>
        <Button asChild className="mt-5" variant="outline"><Link to="/app/impostazioni?tab=parametri">Vai ai parametri</Link></Button>
      </div>
    );
  }

  const soloLettura = !!ultima && !nuova;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <section className="space-y-4">
        {!checklistCompleta && (
          <div className="flex items-start gap-3 rounded border border-warning/40 bg-warning/5 px-4 py-3 text-[13px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              La checklist obbligatoria non è completa ({obbl.filter((v) => v.completata).length}/{obbl.length}). Puoi comunque valutare, ma il parametro sulla documentazione ne terrà conto.{" "}
              <button className="text-primary underline" onClick={() => vaiA("checklist")}>Apri la checklist</button>
            </div>
          </div>
        )}

        {soloLettura && (
          <div className="flex items-center justify-between rounded border bg-card px-4 py-3 text-[13px]">
            <span>Valutazione del <span className="font-mono">{dataIt(ultima!.created_at, true)}</span>. I campi sono bloccati.</span>
            <Button size="sm" variant="outline" onClick={() => { setNuova(true); setImportoManuale(false); }}>Rivaluta</Button>
          </div>
        )}

        <fieldset disabled={soloLettura} className="space-y-4">
          <div>
            <div className="eyebrow mb-2">Criteri di valutazione</div>
            <ol className="divide-y rounded-lg border bg-card">
              {attivi.map((p, i) => {
                const d = r.dettaglio.find((x) => x.codice === p.codice);
                return (
                  <li key={p.id} className="px-5 py-4">
                    <div className="mb-2.5 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[14px] font-medium"><span className="mr-2 font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>{p.etichetta}</div>
                        {p.descrizione && <div className="text-[12.5px] text-muted-foreground">{p.descrizione}</div>}
                      </div>
                      <div className={cn("shrink-0 font-mono text-[12px]", d?.bloccante ? "text-destructive" : "text-muted-foreground")}>
                        {d?.bloccante ? "ostativo" : `${d?.punteggio ?? 0}/${d?.punteggio_max ?? 0}`}
                      </div>
                    </div>
                    <CampoParametro p={p} valore={risposte[p.codice]} onChange={(v) => setRisposte((prev) => ({ ...prev, [p.codice]: v }))} />
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <div className="eyebrow mb-2">Istruttoria (riportata nella scheda danno)</div>
            <div className="grid gap-4 rounded-lg border bg-card px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="iter">Breve descrizione dell'iter istruttorio posto in essere</Label>
                <Textarea id="iter" rows={4} value={iter} onChange={(e) => setIter(e.target.value)} placeholder="Es. L'esistenza della buca e del danno è comprovata da fotografie e dichiarazione testimoniale; pieno giorno, velocità prevedibile per il tratto; si riconosce solo uno pneumatico." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="relazione">La relazione del settore tecnico segnala quanto segue</Label>
                <Textarea id="relazione" rows={4} value={relazione} onChange={(e) => setRelazione(e.target.value)} placeholder="Competenza comunale, posizione e visibilità dell'anomalia, segnaletica, limite di velocità, eventuale richiamo all'art. 141 CdS." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="verbale">Il verbale delle autorità segnala quanto segue</Label>
                <Textarea id="verbale" rows={3} value={verbale} onChange={(e) => setVerbale(e.target.value)} placeholder="Se la Polizia Locale è intervenuta o è stata contattata." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note interne</Label>
                <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <div className="eyebrow mb-2">Quantificazione del danno</div>
            <div className="grid gap-4 rounded-lg border bg-card px-5 py-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="base">Imponibile riconosciuto (€)</Label>
                <Input id="base" type="number" step="0.01" min="0" className="font-mono" value={importoBase} onChange={(e) => setImportoBase(e.target.value)} />
                {s.importo_richiesto != null && <div className="text-[12px] text-muted-foreground">Ammontare del danno dichiarato {euro(s.importo_richiesto)}</div>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proposto">Stima attribuita al danno (€)</Label>
                <Input id="proposto" type="number" step="0.01" min="0" className="font-mono" value={importo} onChange={(e) => { setImporto(e.target.value); setImportoManuale(true); }} />
                <div className="text-[12px] text-muted-foreground">
                  {stima != null ? <>Calcolata: {euro(stima)}{importoManuale && importo !== String(stima) && <button type="button" className="ml-2 text-primary underline" onClick={() => { setImportoManuale(false); setImporto(String(stima)); }}>usa la calcolata</button>}</> : "Indica l'imponibile per calcolarla"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Riduzioni applicate</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {RIDUZIONI_PREDEFINITE.map((rp) => {
                    const attiva = riduzioni.some((x) => x.etichetta === rp.etichetta);
                    return (
                      <button
                        key={rp.etichetta}
                        type="button"
                        className={cn("rounded border px-3 py-1.5 text-[12.5px] transition-colors", attiva ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent")}
                        onClick={() => setRiduzioni((prev) => (attiva ? prev.filter((x) => x.etichetta !== rp.etichetta) : [...prev, rp]))}
                      >
                        {rp.etichetta} <span className="font-mono">−{rp.percentuale}%</span>
                      </button>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setRiduzioni((prev) => [...prev, { etichetta: "Altra riduzione", percentuale: 10 }])}><Plus className="mr-1 h-3.5 w-3.5" /> Altra</Button>
                </div>
                {riduzioni.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {riduzioni.map((x, i) => (
                      <li key={i} className="grid grid-cols-[1fr_90px_auto] items-center gap-2">
                        <Input value={x.etichetta} onChange={(e) => setRiduzioni((prev) => prev.map((y, j) => (j === i ? { ...y, etichetta: e.target.value } : y)))} />
                        <div className="relative">
                          <Input type="number" min="0" max="100" className="pr-7 font-mono" value={x.percentuale} onChange={(e) => setRiduzioni((prev) => prev.map((y, j) => (j === i ? { ...y, percentuale: Number(e.target.value) } : y)))} />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">%</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setRiduzioni((prev) => prev.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </fieldset>
      </section>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <div className="rounded-lg border bg-card p-5">
          <div className="eyebrow">Esito {r.completa ? "" : "provvisorio"}</div>
          <div className="my-5 flex justify-center"><TimbroEsito esito={r.esito} key={r.esito + String(r.completa)} /></div>
          <div className="grid grid-cols-2 gap-3 border-t pt-4 text-center">
            <div>
              <div className="font-mono text-[24px] font-medium leading-none">{r.percentuale}%</div>
              <div className="eyebrow mt-1">punteggio</div>
            </div>
            <div>
              <div className="font-mono text-[24px] font-medium leading-none text-muted-foreground">{soglia}%</div>
              <div className="eyebrow mt-1">soglia ente</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-muted">
            <div className={cn("h-full transition-all", r.esito === "da_liquidare" ? "bg-success" : "bg-destructive")} style={{ width: `${Math.min(100, r.percentuale)}%` }} />
          </div>
          {r.esito === "da_liquidare" && importo !== "" && (
            <div className="mt-4 flex items-baseline justify-between border-t pt-4">
              <span className="eyebrow">Somma a saldo e stralcio</span>
              <span className="font-mono text-[18px] font-medium text-success">{euro(Number(importo))}</span>
            </div>
          )}
          {r.motivazioni.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t pt-4 text-[12.5px] text-muted-foreground">
              {r.motivazioni.map((m, i) => <li key={i} className="flex gap-2"><span className="text-muted-foreground/60">·</span>{m}</li>)}
            </ul>
          )}
          {!r.completa && <p className="mt-4 text-[12px] text-warning">Rispondi a tutti i criteri per salvare.</p>}
          {!soloLettura ? (
            <Button className="mt-5 w-full" disabled={!r.completa || salva.isPending} onClick={() => salva.mutate()}>
              {salva.isPending ? "Salvataggio" : "Salva valutazione"}
            </Button>
          ) : (
            <Button className="mt-5 w-full" variant="outline" onClick={() => vaiA("documenti")}>
              Genera scheda danno e documenti <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
