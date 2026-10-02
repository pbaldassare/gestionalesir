import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { aggiornaVoce, aggiungiVoce, caricaAllegato, eliminaAllegato, eliminaVoce, listaAllegati, registraEvento, urlAllegato } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { dataIt } from "@/lib/format";
import type { Allegato, ChecklistVoce, Sinistro } from "@/lib/types";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function TabChecklist({ sinistro: s, voci, caricamento }: { sinistro: Sinistro; voci: ChecklistVoce[]; caricamento: boolean }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [nuova, setNuova] = useState("");
  const [voceUpload, setVoceUpload] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const allegati = useQuery({ queryKey: ["allegati", s.id], queryFn: () => listaAllegati(s.id) });

  const invalida = () => {
    qc.invalidateQueries({ queryKey: ["checklist", s.id] });
    qc.invalidateQueries({ queryKey: ["allegati", s.id] });
    qc.invalidateQueries({ queryKey: ["eventi", s.id] });
  };

  const spunta = useMutation({
    mutationFn: async (v: ChecklistVoce) => {
      const completata = !v.completata;
      await aggiornaVoce(v.id, { completata, completata_il: completata ? new Date().toISOString() : null });
      await registraEvento(s.id, s.ente_id, "checklist", `${completata ? "Acquisito" : "Rimosso"}: ${v.titolo}`, session!.user.id);
    },
    onSuccess: invalida,
    onError: (e: Error) => toast.error(e.message),
  });

  const nota = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => aggiornaVoce(id, { note: note || null }),
    onSuccess: invalida,
  });

  const aggiungi = useMutation({
    mutationFn: () => aggiungiVoce(s.id, s.ente_id, nuova.trim(), false, (voci.at(-1)?.ordine ?? 0) + 10),
    onSuccess: () => { setNuova(""); invalida(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rimuovi = useMutation({ mutationFn: (id: string) => eliminaVoce(id), onSuccess: invalida, onError: (e: Error) => toast.error(e.message) });

  const upload = useMutation({
    mutationFn: async ({ file, voceId }: { file: File; voceId: string | null }) => {
      await caricaAllegato(file, s, session!.user.id, voceId);
      await registraEvento(s.id, s.ente_id, "allegato", `Allegato caricato: ${file.name}`, session!.user.id);
    },
    onSuccess: () => { toast.success("Allegato caricato"); invalida(); },
    onError: (e: Error) => toast.error("Caricamento non riuscito", { description: e.message }),
  });

  const rimuoviAllegato = useMutation({ mutationFn: (a: Allegato) => eliminaAllegato(a), onSuccess: invalida, onError: (e: Error) => toast.error(e.message) });

  async function apri(a: Allegato) {
    try {
      window.open(await urlAllegato(a), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function scegliFile(voceId: string | null) {
    setVoceUpload(voceId);
    fileRef.current?.click();
  }

  if (caricamento) return <Caricamento />;

  const obbl = voci.filter((v) => v.obbligatoria);
  const fatte = obbl.filter((v) => v.completata).length;
  const perc = obbl.length ? Math.round((fatte / obbl.length) * 100) : 0;
  const perVoce = (id: string) => (allegati.data ?? []).filter((a) => a.checklist_voce_id === id);
  const liberi = (allegati.data ?? []).filter((a) => !a.checklist_voce_id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ file: f, voceId: voceUpload }); e.target.value = ""; }} />

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Documentazione richiesta</h2>
            <p className="text-[12.5px] text-muted-foreground">Spunta le voci acquisite. Le facoltative non incidono sulla completezza.</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[22px] font-medium leading-none">{perc}%</div>
            <div className="eyebrow mt-1">{fatte}/{obbl.length} obbligatorie</div>
          </div>
        </div>
        <Progress value={perc} className="mb-4 h-1.5" />

        <ul className="divide-y rounded-lg border bg-card">
          {voci.map((v) => (
            <li key={v.id} className={cn("px-4 py-3", v.completata && "bg-success/[0.04]")}>
              <div className="flex items-start gap-3">
                <Checkbox id={v.id} checked={v.completata} onCheckedChange={() => spunta.mutate(v)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <label htmlFor={v.id} className={cn("cursor-pointer text-[14px] font-medium", v.completata && "text-muted-foreground line-through decoration-success/60")}>
                    {v.titolo}
                    {!v.obbligatoria && <span className="ml-2 eyebrow">facoltativa</span>}
                  </label>
                  {v.descrizione && <div className="text-[12.5px] text-muted-foreground">{v.descrizione}</div>}
                  {v.completata_il && <div className="mt-0.5 font-mono text-[11px] text-success">acquisito il {dataIt(v.completata_il, true)}</div>}
                  <input
                    className="mt-1.5 w-full border-0 border-b border-dashed border-transparent bg-transparent px-0 text-[12.5px] text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:border-input"
                    placeholder="Aggiungi una nota (es. richiesto il 12/09, atteso in integrazione)"
                    defaultValue={v.note ?? ""}
                    onBlur={(e) => e.target.value !== (v.note ?? "") && nota.mutate({ id: v.id, note: e.target.value })}
                  />
                  {perVoce(v.id).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {perVoce(v.id).map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-[12.5px]">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                          <button className="truncate text-primary hover:underline" onClick={() => apri(a)}>{a.nome_file}</button>
                          <button className="text-muted-foreground hover:text-destructive" aria-label="Elimina allegato" onClick={() => rimuoviAllegato.mutate(a)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Allega file" onClick={() => scegliFile(v.id)}><Upload className="h-4 w-4" /></Button>
                  {!v.obbligatoria && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Rimuovi voce" onClick={() => rimuovi.mutate(v.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            </li>
          ))}
          <li className="flex items-center gap-2 px-4 py-3">
            <Input placeholder="Aggiungi una voce specifica per questo fascicolo" value={nuova} onChange={(e) => setNuova(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nuova.trim() && aggiungi.mutate()} />
            <Button variant="outline" size="sm" disabled={!nuova.trim() || aggiungi.isPending} onClick={() => aggiungi.mutate()}><Plus className="mr-1 h-4 w-4" /> Aggiungi</Button>
          </li>
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Altri allegati</h2>
          <Button variant="outline" size="sm" onClick={() => scegliFile(null)} disabled={upload.isPending}><Upload className="mr-1.5 h-4 w-4" /> {upload.isPending ? "Caricamento" : "Carica file"}</Button>
        </div>
        {liberi.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/60 px-5 py-8 text-center text-[13px] text-muted-foreground">
            Fotografie, perizie, corrispondenza: tutto ciò che non rientra in una voce della checklist.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {liberi.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button className="min-w-0 flex-1 truncate text-left text-primary hover:underline" onClick={() => apri(a)}>{a.nome_file}</button>
                <span className="font-mono text-[11px] text-muted-foreground">{dataIt(a.created_at)}</span>
                <button className="text-muted-foreground hover:text-destructive" aria-label="Elimina allegato" onClick={() => rimuoviAllegato.mutate(a)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
