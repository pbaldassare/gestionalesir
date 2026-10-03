import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Contenitore che scala un foglio A4 (794px) alla larghezza disponibile, senza scroll orizzontale. */
export function FoglioScalato({ children, className }: { children: (scala: number) => ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scala, setScala] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const misura = () => setScala(Math.min(1, (el.clientWidth - 32) / 794));
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("overflow-auto bg-muted/60 p-4", className)}>
      <div style={{ width: 794 * scala, minHeight: 1123 * scala }} className="mx-auto">
        {children(scala)}
      </div>
    </div>
  );
}

export function AnteprimaFoglio({ html, className }: { html: string; className?: string }) {
  return (
    <FoglioScalato className={className}>
      {(scala) => <article className="foglio origin-top-left" style={{ transform: `scale(${scala})` }} dangerouslySetInnerHTML={{ __html: html }} />}
    </FoglioScalato>
  );
}
