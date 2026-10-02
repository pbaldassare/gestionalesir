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
