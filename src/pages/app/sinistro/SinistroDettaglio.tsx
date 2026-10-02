import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aggiornaSinistro, eliminaSinistro, leggiSinistro, listaChecklist, listaDocumenti, registraEvento, ultimaValutazione } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { dataIt, euro } from "@/lib/format";
import { STATI, TIPOLOGIE, type Stato } from "@/lib/types";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatoBadge, TimbroEsito, TimbroProtocollo } from "@/components/Timbro";
import { TabFascicolo } from "./TabFascicolo";
import { TabChecklist } from "./TabChecklist";
import { TabDocumenti } from "./TabDocumenti";
import { TabValutazione } from "./TabValutazione";
import { cn } from "@/lib/utils";

const fasi: { chiave: string; label: string }[] = [
  { chiave: "fascicolo", label: "Fascicolo" },
  { chiave: "checklist", label: "Checklist" },
  { chiave: "valutazione", label: "Valutazione" },
  { chiave: "documenti", label: "Documenti" },
];

export default function SinistroDettaglio() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "fascicolo";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const [confermaElimina, setConfermaElimina] = useState(false);

  const q = useQuery({ queryKey: ["sinistro", id], queryFn: () => leggiSinistro(id) });
  const checklist = useQuery({ queryKey: ["checklist", id], queryFn: () => listaChecklist(id) });
  const valutazione = useQuery({ queryKey: ["valutazione", id], queryFn: () => ultimaValutazione(id) });
  const documenti = useQuery({ queryKey: ["documenti", id], queryFn: () => listaDocumenti(id) });

  const cambiaStato = useMutation({
    mutationFn: async (stato: Stato) => {
      const s = await aggiornaSinistro(id, { stato });
      await registraEvento(id, s.ente_id, "stato", `Stato aggiornato a "${STATI[stato]}"`, session!.user.id);
      return s;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sinistro", id] });
      qc.invalidateQueries({ queryKey: ["eventi", id] });
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success("Stato aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: () => eliminaSinistro(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success("Fascicolo eliminato");
      navigate("/app/sinistri");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Caricamento />;
  if (q.error || !q.data) return <div className="text-destructive">{(q.error as Error)?.message ?? "Sinistro non trovato"}</div>;
  const s = q.data;

  const voci = checklist.data ?? [];
  const obbligatorie = voci.filter((v) => v.obbligatoria);
  const completate = obbligatorie.filter((v) => v.completata).length;
  const avanzamento = { fascicolo: true, checklist: obbligatorie.length > 0 && completate === obbligatorie.length, valutazione: !!valutazione.data, documenti: (documenti.data?.length ?? 0) > 0 };

  return (
    <>
      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/app/sinistri"><ArrowLeft className="mr-1.5 h-4 w-4" /> Sinistri</Link>
        </Button>
      </div>

      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          <div className="hidden sm:block"><TimbroProtocollo numero={s.numero_protocollo} data={dataIt(s.data_ricezione)} /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="protocollo sm:hidden">{s.numero_protocollo}</span>
              <StatoBadge stato={s.stato} />
              <span className="text-[12.5px] text-muted-foreground">{TIPOLOGIE[s.tipologia]}</span>
            </div>
            <h1 className="mt-1.5 text-[26px] font-semibold leading-tight">{s.richiedente_nome}</h1>
            <div className="mt-1 text-[13.5px] text-muted-foreground">
              Sinistro del <span className="font-mono">{dataIt(s.data_sinistro)}</span> · {s.luogo}
              {s.importo_richiesto != null && <> · richiesti <span className="font-mono text-foreground">{euro(s.importo_richiesto)}</span></>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {s.esito && <TimbroEsito esito={s.esito} piccolo />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Altre azioni"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="eyebrow font-normal">Cambia stato</DropdownMenuLabel>
              {(Object.keys(STATI) as Stato[]).map((k) => (
                <DropdownMenuItem key={k} disabled={k === s.stato} onClick={() => cambiaStato.mutate(k)}>{STATI[k]}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setParams({ tab: "fascicolo", modifica: "1" })}><Pencil className="mr-2 h-4 w-4" /> Modifica dati</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfermaElimina(true)}><Trash2 className="mr-2 h-4 w-4" /> Elimina fascicolo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="mb-6 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {fasi.map((f, i) => (
            <TabsTrigger
              key={f.chiave}
              value={f.chiave}
              className="relative rounded-none border-b-2 border-transparent px-3 py-2.5 text-[13.5px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <span className={cn("mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[9px]", avanzamento[f.chiave as keyof typeof avanzamento] ? "border-success bg-success text-white" : "border-muted-foreground/40 text-muted-foreground")}>
                {i + 1}
              </span>
              {f.label}
              {f.chiave === "checklist" && obbligatorie.length > 0 && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{completate}/{obbligatorie.length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="fascicolo"><TabFascicolo sinistro={s} modifica={params.get("modifica") === "1"} onFineModifica={() => setParams({ tab: "fascicolo" })} /></TabsContent>
        <TabsContent value="checklist"><TabChecklist sinistro={s} voci={voci} caricamento={checklist.isLoading} /></TabsContent>
        <TabsContent value="valutazione"><TabValutazione sinistro={s} voci={voci} valutazione={valutazione.data ?? null} vaiA={(t) => setParams({ tab: t })} /></TabsContent>
        <TabsContent value="documenti"><TabDocumenti sinistro={s} voci={voci} valutazione={valutazione.data ?? null} documenti={documenti.data ?? []} /></TabsContent>
      </Tabs>

      <AlertDialog open={confermaElimina} onOpenChange={setConfermaElimina}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il fascicolo {s.numero_protocollo}?</AlertDialogTitle>
            <AlertDialogDescription>Verranno eliminati anche checklist, valutazioni, documenti e allegati. L'operazione non è reversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => elimina.mutate()}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
