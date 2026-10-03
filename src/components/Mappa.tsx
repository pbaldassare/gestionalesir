/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { caricaMaps, centroCitta, geocodifica, suggerisci, type Punto, type Suggerimento } from "@/lib/maps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mappa con un segnaposto. Con `onSposta` il segnaposto è trascinabile e la mappa è cliccabile. */
export function MappaLuogo({ punto, centro, onSposta, className }: { punto: Punto | null; centro?: Punto | null; onSposta?: (p: Punto) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mappa = useRef<any>(null);
  const marker = useRef<any>(null);
  const sposta = useRef(onSposta);
  sposta.current = onSposta;
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const maps = await caricaMaps();
        const { Map } = await maps.importLibrary("maps");
        const { Marker } = await maps.importLibrary("marker");
        if (!vivo || !ref.current) return;
        const iniziale = punto ?? centro ?? { lat: 45.8206, lng: 8.8251 };
        mappa.current = new Map(ref.current, {
          center: iniziale,
          zoom: punto ? 17 : 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        marker.current = new Marker({ map: punto ? mappa.current : null, position: iniziale, draggable: !!sposta.current });
        if (sposta.current) {
          marker.current.addListener("dragend", () => sposta.current?.(marker.current.getPosition().toJSON()));
          mappa.current.addListener("click", (e: any) => sposta.current?.(e.latLng.toJSON()));
        }
      } catch {
        if (vivo) setErrore(true);
      }
    })();
    return () => {
      vivo = false;
    };
    // la mappa si crea una volta; gli aggiornamenti passano dagli effetti sotto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mappa.current || !marker.current) return;
    if (punto) {
      marker.current.setPosition(punto);
      marker.current.setMap(mappa.current);
      mappa.current.panTo(punto);
      if (mappa.current.getZoom() < 16) mappa.current.setZoom(17);
    } else {
      marker.current.setMap(null);
    }
  }, [punto?.lat, punto?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mappa.current && !punto && centro) mappa.current.setCenter(centro);
  }, [centro?.lat, centro?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (errore) {
    return <div className={cn("flex items-center justify-center rounded-lg border border-dashed bg-card/60 text-[12.5px] text-muted-foreground", className)}>Mappa non disponibile in questo momento.</div>;
  }
  return <div ref={ref} className={cn("overflow-hidden rounded-lg border bg-muted", className)} />;
}

/** Campo indirizzo con suggerimenti di Google e mappa per fissare il punto esatto. */
export function CampoLuogo({
  valore,
  punto,
  citta,
  onChange,
}: {
  valore: string;
  punto: Punto | null;
  citta?: string | null;
  onChange: (luogo: string, punto: Punto | null) => void;
}) {
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([]);
  const [aperto, setAperto] = useState(false);
  const [attivo, setAttivo] = useState(-1);
  const [centro, setCentro] = useState<Punto | null>(null);
  const [cerca, setCerca] = useState(false);
  const timer = useRef<number>();
  const richiesta = useRef(0);

  useEffect(() => {
    centroCitta(citta).then(setCentro).catch(() => {});
  }, [citta]);

  function digita(testo: string) {
    onChange(testo, punto);
    window.clearTimeout(timer.current);
    if (testo.trim().length < 3) {
      setSuggerimenti([]);
      return;
    }
    const id = ++richiesta.current;
    timer.current = window.setTimeout(async () => {
      try {
        const s = await suggerisci(testo, centro);
        if (id === richiesta.current) {
          setSuggerimenti(s);
          setAperto(true);
          setAttivo(-1);
        }
      } catch {
        setSuggerimenti([]);
      }
    }, 250);
  }

  async function scegli(s: Suggerimento) {
    setAperto(false);
    setSuggerimenti([]);
    const r = await s.risolvi();
    onChange(r?.indirizzo?.replace(/, Italia$/, "") ?? `${s.testo}${s.dettaglio ? ", " + s.dettaglio : ""}`, r ? { lat: r.lat, lng: r.lng } : punto);
  }

  async function trova() {
    if (!valore.trim()) return;
    setCerca(true);
    const r = await geocodifica(citta && !valore.toLowerCase().includes(citta.toLowerCase()) ? `${valore}, ${citta}` : valore);
    setCerca(false);
    if (r) onChange(valore, { lat: r.lat, lng: r.lng });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="luogo"
              required
              autoComplete="off"
              className="pl-9"
              value={valore}
              placeholder="Via Sacco 5, marciapiede lato ovest"
              role="combobox"
              aria-expanded={aperto}
              aria-controls="luogo-suggerimenti"
              onChange={(e) => digita(e.target.value)}
              onFocus={() => suggerimenti.length && setAperto(true)}
              onBlur={() => window.setTimeout(() => setAperto(false), 150)}
              onKeyDown={(e) => {
                if (!aperto || !suggerimenti.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setAttivo((a) => (a + 1) % suggerimenti.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); setAttivo((a) => (a <= 0 ? suggerimenti.length - 1 : a - 1)); }
                if (e.key === "Enter" && attivo >= 0) { e.preventDefault(); scegli(suggerimenti[attivo]); }
                if (e.key === "Escape") setAperto(false);
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={trova} disabled={cerca || !valore.trim()}>
            <LocateFixed className="mr-1.5 h-4 w-4" /> {cerca ? "Ricerca" : "Trova sulla mappa"}
          </Button>
        </div>
        {aperto && suggerimenti.length > 0 && (
          <ul id="luogo-suggerimenti" role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
            {suggerimenti.map((s, i) => (
              <li key={i} role="option" aria-selected={i === attivo}>
                <button type="button" className={cn("flex w-full items-baseline gap-2 px-3 py-2 text-left text-[13.5px] hover:bg-accent", i === attivo && "bg-accent")} onMouseDown={(e) => e.preventDefault()} onClick={() => scegli(s)}>
                  <span className="font-medium">{s.testo}</span>
                  <span className="truncate text-[12px] text-muted-foreground">{s.dettaglio}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <MappaLuogo punto={punto} centro={centro} onSposta={(p) => onChange(valore, p)} className="h-56" />
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{punto ? "Trascina il segnaposto o clicca sulla mappa per fissare il punto esatto." : "Scegli un suggerimento o clicca sulla mappa per indicare il punto."}</span>
        {punto && (
          <span className="flex items-center gap-2">
            <span className="font-mono">{punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}</span>
            <button type="button" className="text-primary underline" onClick={() => onChange(valore, null)}>rimuovi</button>
          </span>
        )}
      </div>
    </div>
  );
}
