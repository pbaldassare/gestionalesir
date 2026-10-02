import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aggiornaSinistro, listaEventi, registraEvento } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, euro } from "@/lib/format";
import { TIPOLOGIE, type Sinistro } from "@/lib/types";
import { SinistroForm, type DatiSinistro } from "@/components/SinistroForm";

function Riga({ etichetta, valore, mono }: { etichetta: string; valore: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b py-2.5 text-[13.5px] last:border-0">
      <div className="text-muted-foreground">{etichetta}</div>
      <div className={mono ? "font-mono" : ""}>{valore ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function TabFascicolo({ sinistro: s, modifica, onFineModifica }: { sinistro: Sinistro; modifica: boolean; onFineModifica: () => void }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const eventi = useQuery({ queryKey: ["eventi", s.id], queryFn: () => listaEventi(s.id) });

  const salva = useMutation({
    mutationFn: async (d: DatiSinistro) => {
      await aggiornaSinistro(s.id, d);
      await registraEvento(s.id, s.ente_id, "modifica", "Dati del fascicolo aggiornati", session!.user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sinistro", s.id] });
      qc.invalidateQueries({ queryKey: ["eventi", s.id] });
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success("Fascicolo aggiornato");
      onFineModifica();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (modifica) {
    return (
      <div className="max-w-3xl">
        <SinistroForm iniziale={s} onSalva={(d) => salva.mutate(d)} onAnnulla={onFineModifica} etichettaSalva="Salva modifiche" salvataggio={salva.isPending} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <section className="rounded-lg border bg-card px-5 py-3">
          <h2 className="mb-1 text-[15px] font-semibold">Evento</h2>
          <Riga etichetta="Tipologia" valore={TIPOLOGIE[s.tipologia]} />
          <Riga etichetta="Data e ora" valore={`${dataIt(s.data_sinistro)}${s.ora_sinistro ? " · " + s.ora_sinistro.slice(0, 5) : ""}`} mono />
          <Riga etichetta="Luogo" valore={s.luogo} />
          <Riga etichetta="Descrizione" valore={<span className="whitespace-pre-wrap">{s.descrizione}</span>} />
          <Riga etichetta="Causa presunta" valore={s.causa_presunta} />
        </section>
        <section className="rounded-lg border bg-card px-5 py-3">
          <h2 className="mb-1 text-[15px] font-semibold">Richiedente</h2>
          <Riga etichetta="Nominativo" valore={s.richiedente_nome} />
          <Riga etichetta="Codice fiscale" valore={s.richiedente_cf} mono />
          <Riga etichetta="Indirizzo" valore={s.richiedente_indirizzo} />
          <Riga etichetta="Email" valore={s.richiedente_email} />
          <Riga etichetta="PEC" valore={s.richiedente_pec} />
          <Riga etichetta="Telefono" valore={s.richiedente_telefono} mono />
        </section>
        <section className="rounded-lg border bg-card px-5 py-3">
          <h2 className="mb-1 text-[15px] font-semibold">Richiesta</h2>
          <Riga etichetta="Denuncia" valore={dataIt(s.data_denuncia)} mono />
          <Riga etichetta="Ricezione" valore={dataIt(s.data_ricezione)} mono />
          <Riga etichetta="Importo richiesto" valore={euro(s.importo_richiesto)} mono />
          <Riga etichetta="Importo liquidato" valore={euro(s.importo_liquidato)} mono />
          <Riga etichetta="Note interne" valore={s.note && <span className="whitespace-pre-wrap">{s.note}</span>} />
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Cronologia</h2>
        <ol className="relative ml-2 border-l pl-5">
          {(eventi.data ?? []).map((e) => (
            <li key={e.id} className="relative mb-5 last:mb-0">
              <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <div className="font-mono text-[11px] text-muted-foreground">{dataIt(e.created_at, true)}</div>
              <div className="text-[13.5px]">{e.descrizione}</div>
            </li>
          ))}
          {eventi.data?.length === 0 && <li className="text-[13px] text-muted-foreground">Nessun evento registrato.</li>}
        </ol>
      </section>
    </div>
  );
}
