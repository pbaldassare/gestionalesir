import { cn } from "@/lib/utils";
import type { Esito, Stato } from "@/lib/types";
import { STATI } from "@/lib/types";

export function Protocollo({ numero, className }: { numero: string; className?: string }) {
  return (
    <span className={cn("protocollo", className)}>
      <span className="text-muted-foreground">Rif.</span> {numero}
    </span>
  );
}

const coloriStato: Record<Stato, string> = {
  aperto: "bg-secondary text-secondary-foreground",
  istruttoria: "bg-warning/10 text-warning border-warning/30",
  valutato: "bg-primary/10 text-primary border-primary/30",
  liquidato: "bg-success/10 text-success border-success/30",
  respinto: "bg-destructive/10 text-destructive border-destructive/30",
  archiviato: "bg-muted text-muted-foreground",
};

export function StatoBadge({ stato, className }: { stato: Stato; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border border-transparent px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em]", coloriStato[stato], className)}>
      {STATI[stato]}
    </span>
  );
}

export function TimbroEsito({ esito, inclinato = true, piccolo = false, className }: { esito: Esito; inclinato?: boolean; piccolo?: boolean; className?: string }) {
  const positivo = esito === "da_liquidare";
  return (
    <div
      className={cn(
        "timbro",
        positivo ? "timbro-verde" : "timbro-rosso",
        inclinato && "timbro-inclinato animate-stamp-in",
        piccolo ? "text-[11px] px-3 py-1.5" : "text-[15px] px-5 py-3",
        className,
      )}
      role="status"
    >
      <span className="font-semibold">{positivo ? "Da liquidare" : "Non liquidabile"}</span>
      {!piccolo && <span className="mt-1 text-[9px] tracking-[0.2em] opacity-80">Gestionale SIR</span>}
    </div>
  );
}

export function TimbroProtocollo({ numero, data }: { numero: string; data: string }) {
  return (
    <div className="timbro timbro-blu whitespace-nowrap text-[12px] px-4 py-2">
      <span className="font-semibold">{numero}</span>
      <span className="mt-1 text-[9px] tracking-[0.2em] opacity-80">Ricevuto il {data}</span>
    </div>
  );
}
