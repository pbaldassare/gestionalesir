import type { ReactNode } from "react";

export function Intestazione({
  eyebrow,
  titolo,
  descrizione,
  azioni,
}: {
  eyebrow?: string;
  titolo: ReactNode;
  descrizione?: ReactNode;
  azioni?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight">{titolo}</h1>
        {descrizione && <p className="mt-1 max-w-2xl text-[13.5px] text-muted-foreground">{descrizione}</p>}
      </div>
      {azioni && <div className="flex shrink-0 flex-wrap gap-2">{azioni}</div>}
    </div>
  );
}
