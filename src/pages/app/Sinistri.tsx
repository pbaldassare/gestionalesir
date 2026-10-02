import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileStack, Plus, Search } from "lucide-react";
import { listaSinistri } from "@/lib/api";
import { dataIt, euro } from "@/lib/format";
import { STATI, TIPOLOGIE, type Stato, type Tipologia } from "@/lib/types";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Protocollo, StatoBadge, TimbroEsito } from "@/components/Timbro";
import { Vuoto } from "@/components/Vuoto";

export default function Sinistri() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["sinistri"], queryFn: listaSinistri });
  const [testo, setTesto] = useState("");
  const [stato, setStato] = useState<Stato | "tutti">("tutti");
  const [tipologia, setTipologia] = useState<Tipologia | "tutte">("tutte");

  const filtrati = useMemo(() => {
    const q = testo.trim().toLowerCase();
    return (data ?? []).filter(
      (s) =>
        (stato === "tutti" || s.stato === stato) &&
        (tipologia === "tutte" || s.tipologia === tipologia) &&
        (!q || [s.numero_protocollo, s.richiedente_nome, s.luogo, s.richiedente_cf ?? ""].some((v) => v.toLowerCase().includes(q))),
    );
  }, [data, testo, stato, tipologia]);

  return (
    <>
      <Intestazione
        eyebrow="Fascicoli"
        titolo="Sinistri"
        descrizione="Tutte le richieste di risarcimento registrate dall'Ente, con stato dell'istruttoria ed esito."
        azioni={
          <Button asChild>
            <Link to="/app/sinistri/nuovo">
              <Plus className="mr-2 h-4 w-4" /> Registra sinistro
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cerca per protocollo, richiedente, luogo o codice fiscale" value={testo} onChange={(e) => setTesto(e.target.value)} />
        </div>
        <Select value={stato} onValueChange={(v) => setStato(v as Stato | "tutti")}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {(Object.keys(STATI) as Stato[]).map((k) => <SelectItem key={k} value={k}>{STATI[k]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipologia} onValueChange={(v) => setTipologia(v as Tipologia | "tutte")}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte le tipologie</SelectItem>
            {(Object.keys(TIPOLOGIE) as Tipologia[]).map((k) => <SelectItem key={k} value={k}>{TIPOLOGIE[k]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Caricamento />
      ) : error ? (
        <div className="text-destructive">{(error as Error).message}</div>
      ) : filtrati.length === 0 ? (
        <Vuoto
          icona={FileStack}
          titolo={data?.length ? "Nessun risultato con questi filtri" : "Nessun sinistro registrato"}
          testo={data?.length ? "Prova a cambiare stato, tipologia o testo di ricerca." : "Registra la prima richiesta di risarcimento per aprire il fascicolo."}
          azione={!data?.length && <Button asChild><Link to="/app/sinistri/nuovo">Registra sinistro</Link></Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-40">Protocollo</TableHead>
                <TableHead>Richiedente</TableHead>
                <TableHead className="hidden md:table-cell">Sinistro</TableHead>
                <TableHead className="hidden lg:table-cell">Tipologia</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="hidden sm:table-cell">Esito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrati.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/app/sinistri/${s.id}`)}>
                  <TableCell><Protocollo numero={s.numero_protocollo} /></TableCell>
                  <TableCell>
                    <div className="font-medium">{s.richiedente_nome}</div>
                    <div className="text-[12px] text-muted-foreground md:hidden">{dataIt(s.data_sinistro)} · {s.luogo}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="font-mono text-[12.5px]">{dataIt(s.data_sinistro)}</div>
                    <div className="max-w-[260px] truncate text-[12.5px] text-muted-foreground">{s.luogo}</div>
                  </TableCell>
                  <TableCell className="hidden text-[13px] lg:table-cell">{TIPOLOGIE[s.tipologia]}</TableCell>
                  <TableCell className="text-right font-mono text-[13px]">{euro(s.importo_richiesto)}</TableCell>
                  <TableCell><StatoBadge stato={s.stato} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{s.esito ? <TimbroEsito esito={s.esito} piccolo inclinato={false} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-2 text-[12px] text-muted-foreground">
            {filtrati.length} {filtrati.length === 1 ? "fascicolo" : "fascicoli"}
          </div>
        </div>
      )}
    </>
  );
}
