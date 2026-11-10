import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenitore che rimpicciolisce un foglio A4 (794px) alla larghezza disponibile, senza scroll orizzontale.
 * Usa `zoom` e non `transform`: zoom cambia anche l'ingombro, quindi niente spazio vuoto sotto i fogli lunghi
 * e il cursore dell'editor resta allineato. In stampa torna a grandezza reale.
 */
export function FoglioScalato({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scala, setScala] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const misura = () => setScala(Math.min(1, Math.max(0.2, (el.clientWidth - 32) / 794)));
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("overflow-auto bg-muted/60 p-4", className)}>
      <div style={{ "--scala": scala } as CSSProperties} className="mx-auto w-fit [zoom:var(--scala)] print:[zoom:1]">
        {children}
      </div>
    </div>
  );
}

export function AnteprimaFoglio({ html, className }: { html: string; className?: string }) {
  return (
    <FoglioScalato className={className}>
      <article className="foglio" dangerouslySetInnerHTML={{ __html: html }} />
    </FoglioScalato>
  );
}
