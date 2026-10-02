import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { it } from "date-fns/locale";

export function dataIt(value: string | null | undefined, conOra = false): string {
  if (!value) return "—";
  try {
    const d = value.length <= 10 ? parseISO(value) : new Date(value);
    return format(d, conOra ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: it });
  } catch {
    return value;
  }
}

export function dataEstesa(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = value.length <= 10 ? parseISO(value) : new Date(value);
    return format(d, "d MMMM yyyy", { locale: it });
  } catch {
    return value;
  }
}

export function euro(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export function giorniDa(value: string | null | undefined): number | null {
  if (!value) return null;
  return differenceInCalendarDays(new Date(), parseISO(value));
}

export function oggiISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function iniziali(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const UNITA = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"];
const DECINE = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];

function centinaia(n: number): string {
  if (n === 0) return "";
  if (n < 20) return UNITA[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    let dec = DECINE[d];
    if (u === 1 || u === 8) dec = dec.slice(0, -1);
    return dec + (u === 3 ? "tré" : UNITA[u]);
  }
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return (c === 1 ? "cento" : UNITA[c] + "cento") + centinaia(resto);
}

/** 258 → "duecentocinquantotto"; usato nell'atto di quietanza (es. "Euro duecentocinquantotto/00"). */
export function numeroInLettere(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  const milioni = Math.floor(n / 1_000_000);
  const migliaia = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  let s = "";
  if (milioni) s += milioni === 1 ? "unmilione" : centinaia(milioni) + "milioni";
  if (migliaia) s += migliaia === 1 ? "mille" : centinaia(migliaia) + "mila";
  s += centinaia(resto);
  return s;
}

/** 258 → "€ 258,00 (Euro duecentocinquantotto/00)" */
export function importoInLettere(valore: number): string {
  const interi = Math.floor(valore);
  const cent = Math.round((valore - interi) * 100);
  return `Euro ${numeroInLettere(interi)}/${String(cent).padStart(2, "0")}`;
}
