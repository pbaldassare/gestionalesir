import { useState, type FormEvent } from "react";
import type { Sinistro, Tipologia } from "@/lib/types";
import { TIPOLOGIE } from "@/lib/types";
import { oggiISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DatiSinistro = Pick<
  Sinistro,
  | "tipologia" | "data_sinistro" | "ora_sinistro" | "data_denuncia" | "data_ricezione" | "luogo" | "descrizione" | "causa_presunta"
  | "richiedente_nome" | "richiedente_cf" | "richiedente_indirizzo" | "richiedente_email" | "richiedente_telefono" | "richiedente_pec"
  | "conducente" | "targa" | "patrocinatore" | "testimone"
  | "importo_richiesto" | "note"
>;

const vuoto: DatiSinistro = {
  tipologia: "danni_cose",
  data_sinistro: oggiISO(),
  ora_sinistro: null,
  data_denuncia: oggiISO(),
  data_ricezione: oggiISO(),
  luogo: "",
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
}: {
  iniziale?: Partial<DatiSinistro>;
  onSalva: (d: DatiSinistro) => void;
  onAnnulla?: () => void;
  etichettaSalva?: string;
  salvataggio?: boolean;
}) {
  const [d, setD] = useState<DatiSinistro>({ ...vuoto, ...iniziale });
  const set = <K extends keyof DatiSinistro>(k: K, v: DatiSinistro[K]) => setD((p) => ({ ...p, [k]: v }));
  const testo = (k: keyof DatiSinistro) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(k, (e.target.value === "" ? null : e.target.value) as never);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSalva({ ...d, ora_sinistro: d.ora_sinistro || null });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
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
          <Input id="luogo" required value={d.luogo} onChange={(e) => set("luogo", e.target.value)} placeholder="Via Sacco, altezza civico 5, marciapiede lato ovest" />
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
        <Button type="submit" disabled={salvataggio}>{salvataggio ? "Salvataggio" : etichettaSalva}</Button>
      </div>
    </form>
  );
}
