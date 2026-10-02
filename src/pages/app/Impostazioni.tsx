import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aggiornaEnte, eliminaModello, eliminaParametro, listaModelli, listaParametri, salvaModello, salvaParametro } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { maxParametro } from "@/lib/valutazione";
import { TIPOLOGIE, type ChecklistModello, type ConfigParametro, type Ente, type OpzioneScelta, type Parametro, type TipoParametro, type Tipologia } from "@/lib/types";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Ente
// ---------------------------------------------------------------------------
function SezioneEnte() {
  const { ente, ricaricaEnte } = useAuth();
  const [d, setD] = useState<Partial<Ente>>(ente ?? {});
  const m = useMutation({
    mutationFn: () => aggiornaEnte(ente!.id, d),
    onSuccess: async () => { await ricaricaEnte(); toast.success("Dati dell'Ente salvati"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const campo = (k: keyof Ente, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={(d[k] as string | number | null) ?? ""} onChange={(e) => setD((p) => ({ ...p, [k]: props.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value || null }))} {...props} />
    </div>
  );
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }} className="max-w-3xl space-y-5">
      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3"><h2 className="text-[15px] font-semibold">Intestazione dei documenti</h2></div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          {campo("nome", "Denominazione")}
          {campo("ufficio", "Ufficio")}
          {campo("codice_fiscale", "Codice fiscale")}
          {campo("responsabile", "Responsabile firmatario")}
          {campo("indirizzo", "Indirizzo")}
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-3">
            {campo("cap", "CAP")}
            {campo("citta", "Città")}
            {campo("provincia", "Prov.")}
          </div>
          {campo("pec", "PEC", { type: "email" })}
          {campo("email", "Email", { type: "email" })}
          {campo("telefono", "Telefono")}
          {campo("sito_web", "Sito web")}
        </div>
      </section>
      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-[15px] font-semibold">Copertura assicurativa e soglia</h2>
          <p className="text-[12.5px] text-muted-foreground">La soglia è la percentuale minima del punteggio di valutazione perché un sinistro risulti da liquidare.</p>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          {campo("compagnia_assicurativa", "Compagnia assicurativa")}
          {campo("numero_polizza", "Numero di polizza")}
          {campo("franchigia", "Franchigia (€)", { type: "number", step: "0.01", min: 0 })}
          {campo("soglia_liquidazione", "Soglia di liquidabilità (%)", { type: "number", min: 0, max: 100, required: true })}
        </div>
      </section>
      <div className="flex justify-end"><Button type="submit" disabled={m.isPending}>Salva</Button></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Parametri di valutazione
// ---------------------------------------------------------------------------
const vuotoParametro = (ente_id: string, ordine: number): Partial<Parametro> & { ente_id: string } => ({
  ente_id, codice: "", etichetta: "", descrizione: "", tipo: "si_no", config: { punteggio_si: 10, punteggio_no: 0, bloccante_se: null }, ordine, attivo: true,
});

function EditorParametro({ iniziale, onChiudi }: { iniziale: Partial<Parametro> & { ente_id: string }; onChiudi: () => void }) {
  const qc = useQueryClient();
  const [p, setP] = useState(iniziale);
  const c: ConfigParametro = p.config ?? {};
  const setC = (patch: Partial<ConfigParametro>) => setP((prev) => ({ ...prev, config: { ...(prev.config ?? {}), ...patch } }));
  const m = useMutation({
    mutationFn: () => salvaParametro({ ...p, codice: (p.codice || p.etichetta || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parametri"] }); toast.success("Parametro salvato"); onChiudi(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const opzioni = c.opzioni ?? [];
  const setOpz = (i: number, patch: Partial<OpzioneScelta>) => setC({ opzioni: opzioni.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label>Criterio</Label>
          <Input value={p.etichetta ?? ""} onChange={(e) => setP({ ...p, etichetta: e.target.value })} placeholder="Es. Il luogo è di competenza dell'Ente" required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo di risposta</Label>
          <Select value={p.tipo} onValueChange={(v) => setP({ ...p, tipo: v as TipoParametro, config: v === "si_no" ? { punteggio_si: 10, punteggio_no: 0, bloccante_se: null } : v === "numero" ? { operatore: "<=", soglia: 0, punteggio_ok: 10, punteggio_ko: 0, bloccante_se_ko: false } : { opzioni: [{ valore: "a", etichetta: "", punteggio: 10, bloccante: false }, { valore: "b", etichetta: "", punteggio: 0, bloccante: false }] } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="si_no">Sì / No</SelectItem>
              <SelectItem value="numero">Numero con soglia</SelectItem>
              <SelectItem value="scelta">Scelta multipla</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrizione per l'istruttore</Label>
        <Textarea rows={2} value={p.descrizione ?? ""} onChange={(e) => setP({ ...p, descrizione: e.target.value })} />
      </div>

      <div className="rounded border bg-muted/40 p-4">
        <div className="eyebrow mb-3">Punteggi</div>
        {p.tipo === "si_no" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Punti se Sì</Label><Input type="number" className="font-mono" value={c.punteggio_si ?? 0} onChange={(e) => setC({ punteggio_si: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Punti se No</Label><Input type="number" className="font-mono" value={c.punteggio_no ?? 0} onChange={(e) => setC({ punteggio_no: Number(e.target.value) })} /></div>
            <div className="space-y-1.5">
              <Label>Condizione ostativa</Label>
              <Select value={c.bloccante_se ?? "nessuna"} onValueChange={(v) => setC({ bloccante_se: v === "nessuna" ? null : (v as "si" | "no") })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuna">Nessuna</SelectItem>
                  <SelectItem value="si">Se la risposta è Sì</SelectItem>
                  <SelectItem value="no">Se la risposta è No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {p.tipo === "numero" && (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Condizione</Label>
              <Select value={c.operatore ?? "<="} onValueChange={(v) => setC({ operatore: v as "<=" | ">=" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="<=">Valore ≤ soglia</SelectItem><SelectItem value=">=">Valore ≥ soglia</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Soglia</Label><Input type="number" step="any" className="font-mono" value={c.soglia ?? 0} onChange={(e) => setC({ soglia: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Punti se rispettata</Label><Input type="number" className="font-mono" value={c.punteggio_ok ?? 0} onChange={(e) => setC({ punteggio_ok: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Punti se non rispettata</Label><Input type="number" className="font-mono" value={c.punteggio_ko ?? 0} onChange={(e) => setC({ punteggio_ko: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2 text-[13px] sm:col-span-4"><Switch checked={!!c.bloccante_se_ko} onCheckedChange={(v) => setC({ bloccante_se_ko: v })} /> Se non rispettata, il sinistro non è liquidabile</label>
          </div>
        )}
        {p.tipo === "scelta" && (
          <div className="space-y-2">
            {opzioni.map((o, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_auto_auto] items-center gap-2">
                <Input placeholder="Etichetta dell'opzione" value={o.etichetta} onChange={(e) => setOpz(i, { etichetta: e.target.value, valore: o.valore || `opz_${i + 1}` })} />
                <Input type="number" className="font-mono" value={o.punteggio} onChange={(e) => setOpz(i, { punteggio: Number(e.target.value) })} />
                <label className="flex items-center gap-1.5 text-[12px] whitespace-nowrap"><Switch checked={o.bloccante} onCheckedChange={(v) => setOpz(i, { bloccante: v })} /> ostativa</label>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setC({ opzioni: opzioni.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setC({ opzioni: [...opzioni, { valore: `opz_${opzioni.length + 1}`, etichetta: "", punteggio: 0, bloccante: false }] })}><Plus className="mr-1 h-4 w-4" /> Opzione</Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[13px]"><Switch checked={p.attivo ?? true} onCheckedChange={(v) => setP({ ...p, attivo: v })} /> Attivo</label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onChiudi}>Annulla</Button>
          <Button disabled={!p.etichetta || m.isPending} onClick={() => m.mutate()}>Salva</Button>
        </div>
      </div>
    </div>
  );
}

function SezioneParametri() {
  const { ente } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["parametri"], queryFn: listaParametri });
  const [editing, setEditing] = useState<(Partial<Parametro> & { ente_id: string }) | null>(null);
  const elimina = useMutation({ mutationFn: eliminaParametro, onSuccess: () => qc.invalidateQueries({ queryKey: ["parametri"] }), onError: (e: Error) => toast.error(e.message) });
  const toggle = useMutation({ mutationFn: (p: Parametro) => salvaParametro({ id: p.id, ente_id: p.ente_id, attivo: !p.attivo }), onSuccess: () => qc.invalidateQueries({ queryKey: ["parametri"] }) });

  if (q.isLoading) return <Caricamento />;
  const lista = q.data ?? [];
  const totale = lista.filter((p) => p.attivo).reduce((t, p) => t + maxParametro(p), 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-end justify-between">
        <p className="max-w-lg text-[13px] text-muted-foreground">
          Ogni criterio assegna punti; alcune risposte sono <strong>ostative</strong> e rendono il sinistro non liquidabile a prescindere dal punteggio.
          Punteggio massimo attuale: <span className="font-mono">{totale}</span>, soglia <span className="font-mono">{ente?.soglia_liquidazione}%</span>.
        </p>
        <Button onClick={() => setEditing(vuotoParametro(ente!.id, (lista.at(-1)?.ordine ?? 0) + 10))}><Plus className="mr-2 h-4 w-4" /> Criterio</Button>
      </div>
      <ol className="divide-y rounded-lg border bg-card">
        {lista.map((p) => (
          <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3", !p.attivo && "opacity-50")}>
            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(p)}>
              <div className="truncate text-[13.5px] font-medium hover:text-primary">{p.etichetta}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {p.tipo === "si_no" ? "sì/no" : p.tipo === "numero" ? "numero" : "scelta"} · max {maxParametro(p)} pt
                {(p.config?.bloccante_se || p.config?.bloccante_se_ko || p.config?.opzioni?.some((o) => o.bloccante)) && " · con condizione ostativa"}
              </div>
            </button>
            <Switch checked={p.attivo} onCheckedChange={() => toggle.mutate(p)} aria-label="Attivo" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => elimina.mutate(p.id)} aria-label="Elimina"><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
        {lista.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">Nessun criterio definito.</li>}
      </ol>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing?.id ? "Modifica criterio" : "Nuovo criterio di valutazione"}</DialogTitle>
            <DialogDescription>Definisci la domanda che l'istruttore dovrà compilare e come incide sull'esito.</DialogDescription>
          </DialogHeader>
          {editing && <EditorParametro iniziale={editing} onChiudi={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modelli di checklist
// ---------------------------------------------------------------------------
function SezioneChecklist() {
  const { ente } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["modelli"], queryFn: listaModelli });
  const [nuovo, setNuovo] = useState<{ titolo: string; tipologia: Tipologia | "tutte"; obbligatoria: boolean }>({ titolo: "", tipologia: "tutte", obbligatoria: true });
  const inv = () => qc.invalidateQueries({ queryKey: ["modelli"] });
  const salva = useMutation({ mutationFn: (m: Partial<ChecklistModello> & { ente_id: string }) => salvaModello(m), onSuccess: inv, onError: (e: Error) => toast.error(e.message) });
  const elimina = useMutation({ mutationFn: eliminaModello, onSuccess: inv, onError: (e: Error) => toast.error(e.message) });

  if (q.isLoading) return <Caricamento />;
  const lista = q.data ?? [];

  return (
    <div className="max-w-3xl">
      <p className="mb-4 max-w-lg text-[13px] text-muted-foreground">Le voci vengono copiate in ogni nuovo fascicolo: quelle generali sempre, quelle per tipologia solo quando corrisponde.</p>
      <div className="mb-4 grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_200px_auto_auto]">
        <Input placeholder="Nuova voce (es. Relazione del custode)" value={nuovo.titolo} onChange={(e) => setNuovo({ ...nuovo, titolo: e.target.value })} />
        <Select value={nuovo.tipologia} onValueChange={(v) => setNuovo({ ...nuovo, tipologia: v as Tipologia | "tutte" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte le tipologie</SelectItem>
            {(Object.keys(TIPOLOGIE) as Tipologia[]).map((k) => <SelectItem key={k} value={k}>{TIPOLOGIE[k]}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-[13px]"><Switch checked={nuovo.obbligatoria} onCheckedChange={(v) => setNuovo({ ...nuovo, obbligatoria: v })} /> obbligatoria</label>
        <Button disabled={!nuovo.titolo.trim() || salva.isPending} onClick={() => { salva.mutate({ ente_id: ente!.id, titolo: nuovo.titolo.trim(), tipologia: nuovo.tipologia === "tutte" ? null : nuovo.tipologia, obbligatoria: nuovo.obbligatoria, ordine: (lista.at(-1)?.ordine ?? 0) + 10 }); setNuovo({ ...nuovo, titolo: "" }); }}><Plus className="mr-1 h-4 w-4" /> Aggiungi</Button>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {lista.map((m) => (
          <li key={m.id} className={cn("flex items-center gap-3 px-4 py-2.5", !m.attivo && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">{m.titolo}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{m.tipologia ? TIPOLOGIE[m.tipologia] : "tutte le tipologie"} · {m.obbligatoria ? "obbligatoria" : "facoltativa"}</div>
            </div>
            <Switch checked={m.attivo} onCheckedChange={(v) => salva.mutate({ id: m.id, ente_id: m.ente_id, attivo: v })} aria-label="Attiva" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => elimina.mutate(m.id)} aria-label="Elimina"><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Impostazioni() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "ente";
  return (
    <>
      <Intestazione eyebrow="Configurazione" titolo="Impostazioni" descrizione="Intestazione dei documenti, criteri di valutazione e modello di checklist dell'Ente." />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="mb-6">
          <TabsTrigger value="ente">Ente</TabsTrigger>
          <TabsTrigger value="parametri">Parametri di valutazione</TabsTrigger>
          <TabsTrigger value="checklist">Modello di checklist</TabsTrigger>
        </TabsList>
        <TabsContent value="ente"><SezioneEnte /></TabsContent>
        <TabsContent value="parametri"><SezioneParametri /></TabsContent>
        <TabsContent value="checklist"><SezioneChecklist /></TabsContent>
      </Tabs>
    </>
  );
}
