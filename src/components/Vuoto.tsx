import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Vuoto({ icona: Icona, titolo, testo, azione }: { icona: LucideIcon; titolo: string; testo?: string; azione?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed bg-card/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded border-2 border-double border-muted-foreground/40 text-muted-foreground">
        <Icona className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="font-serif text-[17px] font-semibold">{titolo}</div>
      {testo && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{testo}</p>}
      {azione && <div className="mt-5">{azione}</div>}
    </div>
  );
}
