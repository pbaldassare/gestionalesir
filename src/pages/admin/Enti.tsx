import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { aggiornaEnte, creaEnte, listaEnti, listaProfili } from "@/lib/api";
import type { Ente } from "@/lib/types";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vuoto } from "@/components/Vuoto";
import { cn } from "@/lib/utils";

export default function Enti() {
  const qc = useQueryClient();
  const enti = useQuery({ queryKey: ["enti"], queryFn: listaEnti });
  const profili = useQuery({ queryKey: ["profili"], queryFn: listaProfili });
  const [nuovo, setNuovo] = useState(false);
  const [form, setForm] = useState({ nome: "", citta: "", provincia: "", pec: "" });

  const crea = useMutation({
    mutationFn: () => creaEnte({ ...form, tipo: "comune" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enti"] }); setNuovo(false); setForm({ nome: "", citta: "", provincia: "", pec: "" }); toast.success("Ente creato", { description: "Ora puoi creare gli utenti dell'ente." }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const attivo = useMutation({
    mutationFn: (e: Ente) => aggiornaEnte(e.id, { attivo: !e.attivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enti"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const utentiPer = (id: string) => (profili.data ?? []).filter((p) => p.ente_id === id).length;

  return (
    <>
      <Intestazione
        eyebrow="Amministrazione"
        titolo="Enti"
        descrizione="Gli enti che usano il gestionale. I dati di intestazione li completa l'ente stesso dalle sue impostazioni."
        azioni={<Button onClick={() => setNuovo(true)}><Plus className="mr-2 h-4 w-4" /> Nuovo ente</Button>}
      />
      {enti.isLoading ? (
        <Caricamento />
      ) : (enti.data ?? []).length === 0 ? (
        <Vuoto icona={Building2} titolo="Nessun ente" testo="Crea il primo ente per poterne registrare gli utenti." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(enti.data ?? []).map((e) => (
            <li key={e.id} className={cn("rounded-lg border bg-card p-5", !e.attivo && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-serif text-[17px] font-semibold">{e.nome}</div>
                  <div className="text-[12.5px] text-muted-foreground">{[e.citta, e.provincia && `(${e.provincia})`].filter(Boolean).join(" ") || "Sede non indicata"}</div>
                </div>
                <Switch checked={e.attivo} onCheckedChange={() => attivo.mutate(e)} aria-label="Ente attivo" />
              </div>
              <div className="mt-4 flex gap-6 border-t pt-3">
                <div><div className="font-mono text-[18px] leading-none">{utentiPer(e.id)}</div><div className="eyebrow mt-1">utenti</div></div>
                <div><div className="font-mono text-[18px] leading-none">{e.soglia_liquidazione}%</div><div className="eyebrow mt-1">soglia</div></div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={nuovo} onOpenChange={setNuovo}>
        <DialogContent className="max-w-md">
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); crea.mutate(); }}>
            <DialogHeader>
              <DialogTitle className="font-serif">Nuovo ente</DialogTitle>
              <DialogDescription>Bastano i dati essenziali: il resto lo completerà l'ente.</DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="nome">Denominazione</Label><Input id="nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Comune di …" /></div>
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <div className="space-y-1.5"><Label htmlFor="citta">Città</Label><Input id="citta" value={form.citta} onChange={(e) => setForm({ ...form, citta: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="prov">Prov.</Label><Input id="prov" maxLength={2} className="uppercase" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value.toUpperCase() })} /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="pec">PEC</Label><Input id="pec" type="email" value={form.pec} onChange={(e) => setForm({ ...form, pec: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuovo(false)}>Annulla</Button>
              <Button type="submit" disabled={crea.isPending}>Crea ente</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
