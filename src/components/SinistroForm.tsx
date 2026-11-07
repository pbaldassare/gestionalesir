import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Flusso, Sinistro, Tipologia } from "@/lib/types";
import { FLUSSI, TIPOLOGIE } from "@/lib/types";
import { oggiISO } from "@/lib/format";
import { listaPolizze } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampoLuogo } from "@/components/Mappa";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DatiSinistro = Pick<
  Sinistro,
  | "numero_protocollo" | "flusso" | "polizza_id" | "protocollo_precedente"
  | "tipologia" | "data_sinistro" | "ora_sinistro" | "data_denuncia" | "data_ricezione" | "luogo" | "lat" | "lng" | "descrizione" | "causa_presunta"
  | "richiedente_nome" | "richiedente_cf" | "richiedente_indirizzo" | "richiedente_email" | "richiedente_telefono" | "richiedente_pec"
  | "conducente" | "targa" | "patrocinatore" | "testimone"
  | "importo_richiesto" | "note"
>;

const vuoto: DatiSinistro = {
  numero_protocollo: "",
  flusso: "sir",
  polizza_id: null,
  protocollo_precedente: null,
  tipologia: "danni_cose",
  data_sinistro: oggiISO(),
  ora_sinistro: null,
  data_denuncia: oggiISO(),
  data_ricezione: oggiISO(),
  luogo: "",
  lat: null,
  lng: null,
  descrizione: "",
  causa_presunta: null,
  richiedente_nome: "",
  richiedente_cf: null,
  richiedente_indirizzo: null,
  richiedente_email: null,
  richiedente_telefono: null,
  richiedente_pec: null,
  conducente: null,
  targa: null,
  patrocinatore: null,
  testimone: null,
  importo_richiesto: null,
  note: null,
};

function Campo({ id, label, children, span2 }: { id: string; label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Sezione({ titolo, descrizione, children }: { titolo: string; descrizione?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <h2 className="text-[15px] font-semibold">{titolo}</h2>
        {descrizione && <p className="text-[12.5px] text-muted-foreground">{descrizione}</p>}
      </div>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function SinistroForm({
  iniziale,
  onSalva,
  onAnnulla,
  etichettaSalva = "Salva",
  salvataggio = false,
  nuovo = false,
}: {
  iniziale?: Partial<DatiSinistro>;
  onSalva: (d: DatiSinistro) => void;
  onAnnulla?: () => void;
  etichettaSalva?: string;
  salvataggio?: boolean;
  nuovo?: boolean;
}) {
  const { ente } = useAuth();
  const citta = ente?.citta ?? null;
  const polizze = useQuery({ queryKey: ["polizze"], queryFn: listaPolizze });
  const [d, setD] = useState<DatiSinistro>({ ...vuoto, ...iniziale });
  const set = <K extends keyof DatiSinistro>(k: K, v: DatiSinistro[K]) => setD((p) => ({ ...p, [k]: v }));
  const testo = (k: keyof DatiSinistro) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(k, (e.target.value === "" ? null : e.target.value) as never);

  const polizzeAttive = (polizze.data ?? []).filter((p) => p.attiva || p.id === d.polizza_id);
  const anno2 = String(new Date(d.data_ricezione || oggiISO()).getFullYear() % 100).padStart(2, "0");

  function submit(e: FormEvent) {
    e.preventDefault();
    onSalva({ ...d, ora_sinistro: d.ora_sinistro || null, polizza_id: d.flusso === "polizza" ? d.polizza_id : null, numero_protocollo: (d.numero_protocollo ?? "").trim() });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Sezione titolo="Pratica" descrizione="Numero interno dell'ufficio e flusso di gestione.">
        <Campo id="numero_protocollo" label="Numero interno di sinistro">
          <Input
            id="numero_protocollo"
            className="font-mono"
            value={d.numero_protocollo ?? ""}
            onChange={(e) => set("numero_protocollo", e.target.value)}
            placeholder={nuovo ? `assegnato al salvataggio, es. 0001/${anno2}` : "es. 0001/26"}
            pattern="^\d{1,4}/\d{2}$"
            title="Formato NNNN/AA, es. 0001/26"
          />
          <p className="text-[12px] text-muted-foreground">{nuovo ? "Lascia vuoto per il progressivo automatico, oppure scrivi il numero usato dall'ufficio." : "Formato NNNN/AA."}</p>
        </Campo>
        <Campo id="prot_prec" label="Prot. prec. n. (per la richiesta all'Ufficio Strade)">
          <Input id="prot_prec" className="font-mono" value={d.protocollo_precedente ?? ""} onChange={testo("protocollo_precedente")} />
        </Campo>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Flusso</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(FLUSSI) as Flusso[]).map((f) => (
              <label key={f} className={cn("flex cursor-pointer items-start gap-3 rounded border px-3 py-2.5 text-[13.5px] transition-colors", d.flusso === f ? "border-primary bg-primary/5" : "hover:bg-accent/60")}>
                <input type="radio" name="flusso" className="mt-1 accent-primary" checked={d.flusso === f} onChange={() => set("flusso", f)} />
                <span>
                  <span className="font-medium">{FLUSSI[f]}</span>
                  <span className="block text-[12px] text-muted-foreground">{f === "sir" ? "Gestito e liquidato direttamente dall'Ente, sotto i 2.500 €." : "Gestito tramite la polizza assicurativa dell'Ente."}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        {d.flusso === "polizza" && (
          <Campo id="polizza" label="Polizza" span2>
            <Select value={d.polizza_id ?? ""} onValueChange={(v) => set("polizza_id", v || null)}>
              <SelectTrigger id="polizza"><SelectValue placeholder={polizzeAttive.length ? "Scegli la polizza" : "Nessuna polizza: aggiungila in Impostazioni → Polizze"} /></SelectTrigger>
              <SelectContent>
                {polizzeAttive.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono">{p.numero}</span> · {p.nome}{p.compagnia ? ` (${p.compagnia})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        )}
      </Sezione>

      <Sezione titolo="Evento" descrizione="Quando e dove è avvenuto il fatto denunciato.">
        <Campo id="tipologia" label="Tipologia">
          <Select value={d.tipologia} onValueChange={(v) => set("tipologia", v as Tipologia)}>
            <SelectTrigger id="tipologia"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TIPOLOGIE) as Tipologia[]).map((k) => <SelectItem key={k} value={k}>{TIPOLOGIE[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="data_sinistro" label="Data del sinistro">
            <Input id="data_sinistro" type="date" required value={d.data_sinistro} onChange={(e) => set("data_sinistro", e.target.value)} />
          </Campo>
          <Campo id="ora_sinistro" label="Ora">
            <Input id="ora_sinistro" type="time" value={d.ora_sinistro ?? ""} onChange={(e) => set("ora_sinistro", e.target.value || null)} />
          </Campo>
        </div>
        <Campo id="luogo" label="Luogo (via, civico, punto di riferimento)" span2>
          <CampoLuogo
            valore={d.luogo}
            punto={d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null}
            citta={citta}
            onChange={(luogo, p) => setD((prev) => ({ ...prev, luogo, lat: p?.lat ?? null, lng: p?.lng ?? null }))}
          />
        </Campo>
        <Campo id="descrizione" label="Descrizione del fatto" span2>
          <Textarea id="descrizione" required rows={4} value={d.descrizione} onChange={(e) => set("descrizione", e.target.value)} placeholder="Dinamica dichiarata dal richiedente, danni lamentati, eventuali testimoni." />
        </Campo>
        <Campo id="causa" label="Causa presunta" span2>
          <Input id="causa" value={d.causa_presunta ?? ""} onChange={testo("causa_presunta")} placeholder="Buca sul manto stradale, chiusino dissestato, ramo caduto…" />
        </Campo>
      </Sezione>

      <Sezione titolo="Richiedente" descrizione="Chi presenta la richiesta di risarcimento.">
        <Campo id="r_nome" label="Nome e cognome / ragione sociale">
          <Input id="r_nome" required value={d.richiedente_nome} onChange={(e) => set("richiedente_nome", e.target.value)} />
        </Campo>
        <Campo id="r_cf" label="Codice fiscale / P. IVA">
          <Input id="r_cf" className="font-mono uppercase" value={d.richiedente_cf ?? ""} onChange={testo("richiedente_cf")} />
        </Campo>
        <Campo id="r_ind" label="Indirizzo" span2>
          <Input id="r_ind" value={d.richiedente_indirizzo ?? ""} onChange={testo("richiedente_indirizzo")} />
        </Campo>
        <Campo id="r_email" label="Email">
          <Input id="r_email" type="email" value={d.richiedente_email ?? ""} onChange={testo("richiedente_email")} />
        </Campo>
        <Campo id="r_pec" label="PEC">
          <Input id="r_pec" type="email" value={d.richiedente_pec ?? ""} onChange={testo("richiedente_pec")} />
        </Campo>
        <Campo id="r_tel" label="Telefono">
          <Input id="r_tel" value={d.richiedente_telefono ?? ""} onChange={testo("richiedente_telefono")} />
        </Campo>
        <Campo id="patrocinatore" label="Patrocinatore, se presente (avvocato o studio)">
          <Input id="patrocinatore" value={d.patrocinatore ?? ""} onChange={testo("patrocinatore")} placeholder="Avv. Mario Bianchi" />
        </Campo>
        <Campo id="testimone" label="Teste">
          <Input id="testimone" value={d.testimone ?? ""} onChange={testo("testimone")} placeholder="Nominativo del testimone" />
        </Campo>
        {d.tipologia !== "lesioni_persone" && (
          <>
            <Campo id="conducente" label="Conducente del veicolo">
              <Input id="conducente" value={d.conducente ?? ""} onChange={testo("conducente")} placeholder="Se diverso dall'assicurato" />
            </Campo>
            <Campo id="targa" label="Targa">
              <Input id="targa" className="font-mono uppercase" value={d.targa ?? ""} onChange={testo("targa")} />
            </Campo>
          </>
        )}
      </Sezione>

      <Sezione titolo="Richiesta" descrizione="Date di protocollo e ammontare del danno.">
        <Campo id="data_denuncia" label="Data della denuncia">
          <Input id="data_denuncia" type="date" required value={d.data_denuncia} onChange={(e) => set("data_denuncia", e.target.value)} />
        </Campo>
        <Campo id="data_ricezione" label="Data di ricezione dall'Ente">
          <Input id="data_ricezione" type="date" required value={d.data_ricezione} onChange={(e) => set("data_ricezione", e.target.value)} />
        </Campo>
        <Campo id="importo" label="Ammontare del danno (€, imponibile da fattura/scontrino)">
          <Input id="importo" type="number" step="0.01" min="0" className="font-mono" value={d.importo_richiesto ?? ""} onChange={(e) => set("importo_richiesto", e.target.value === "" ? null : Number(e.target.value))} />
        </Campo>
        <Campo id="note" label="Note interne" span2>
          <Textarea id="note" rows={2} value={d.note ?? ""} onChange={testo("note")} />
        </Campo>
      </Sezione>

      <div className="flex justify-end gap-2">
        {onAnnulla && <Button type="button" variant="outline" onClick={onAnnulla}>Annulla</Button>}
        <Button type="submit" disabled={salvataggio || (d.flusso === "polizza" && !d.polizza_id)}>{salvataggio ? "Salvataggio" : etichettaSalva}</Button>
      </div>
    </form>
  );
}
