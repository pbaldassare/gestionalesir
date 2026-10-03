// Caricamento unico di Google Maps JavaScript API (mappa, geocodifica, suggerimenti indirizzo).
// La chiave è una chiave browser: va limitata per referrer HTTP nella console Google Cloud.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __sirMapsPronto?: () => void;
  }
}

const KEY = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) || "AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I";

let promessa: Promise<any> | null = null;

export function caricaMaps(): Promise<any> {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (promessa) return promessa;
  promessa = new Promise((resolve, reject) => {
    window.__sirMapsPronto = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&loading=async&libraries=places&language=it&region=IT&callback=__sirMapsPronto`;
    s.async = true;
    s.onerror = () => {
      promessa = null;
      reject(new Error("Google Maps non raggiungibile"));
    };
    document.head.appendChild(s);
  });
  return promessa;
}

export interface Punto {
  lat: number;
  lng: number;
}

const centri = new Map<string, Punto>();

/** Centro della città dell'ente, usato per orientare suggerimenti e mappa. */
export async function centroCitta(citta: string | null | undefined): Promise<Punto | null> {
  if (!citta) return null;
  if (centri.has(citta)) return centri.get(citta)!;
  const maps = await caricaMaps();
  const { Geocoder } = await maps.importLibrary("geocoding");
  try {
    const r = await new Geocoder().geocode({ address: `${citta}, Italia` });
    const p = r.results[0]?.geometry.location.toJSON() ?? null;
    if (p) centri.set(citta, p);
    return p;
  } catch {
    return null;
  }
}

export async function geocodifica(indirizzo: string): Promise<(Punto & { indirizzo: string }) | null> {
  const maps = await caricaMaps();
  const { Geocoder } = await maps.importLibrary("geocoding");
  try {
    const r = await new Geocoder().geocode({ address: indirizzo, region: "IT" });
    const primo = r.results[0];
    return primo ? { ...primo.geometry.location.toJSON(), indirizzo: primo.formatted_address } : null;
  } catch {
    return null;
  }
}

export interface Suggerimento {
  testo: string;
  dettaglio: string;
  risolvi: () => Promise<(Punto & { indirizzo: string }) | null>;
}

export async function suggerisci(input: string, vicinoA: Punto | null): Promise<Suggerimento[]> {
  const maps = await caricaMaps();
  const { AutocompleteSuggestion } = await maps.importLibrary("places");
  const richiesta: any = { input, includedRegionCodes: ["it"], language: "it" };
  if (vicinoA) richiesta.locationBias = { center: vicinoA, radius: 15000 };
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(richiesta);
  return suggestions
    .filter((s: any) => s.placePrediction)
    .slice(0, 5)
    .map((s: any) => ({
      testo: s.placePrediction.mainText?.text ?? s.placePrediction.text.text,
      dettaglio: s.placePrediction.secondaryText?.text ?? "",
      risolvi: async () => {
        const place = s.placePrediction.toPlace();
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        return place.location ? { ...place.location.toJSON(), indirizzo: place.formattedAddress } : null;
      },
    }));
}

export function linkGoogleMaps(p: Punto): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}
