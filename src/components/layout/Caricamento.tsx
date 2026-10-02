import { cn } from "@/lib/utils";

export function Caricamento({ pieno = false, testo = "Caricamento" }: { pieno?: boolean; testo?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-muted-foreground", pieno ? "min-h-screen" : "py-16")}>
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
      </span>
      <span className="eyebrow">{testo}</span>
    </div>
  );
}
