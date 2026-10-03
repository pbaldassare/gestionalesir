// Generazione dei documenti a partire dai modelli (predefiniti o personalizzati dall'ente).
import type { TipoDocumento } from "./types";
import { MODELLI_PREDEFINITI, componi, costruisciVariabili, infoModello, type ChiaveModello, type ContestoDocumento } from "./modelli";

export interface DocumentoGenerato {
  tipo: TipoDocumento;
  titolo: string;
  html: string;
}

/** `personalizzati` contiene, per chiave, l'HTML salvato dall'ente; se manca si usa il predefinito. */
export function generaDocumento(chiave: ChiaveModello, ctx: ContestoDocumento, personalizzati: Partial<Record<ChiaveModello, string>> = {}): DocumentoGenerato {
  if ((chiave === "scheda_danno" || chiave === "scheda_danno_rigetto") && !ctx.valutazione) {
    throw new Error("La scheda danno richiede una valutazione salvata");
  }
  const info = infoModello(chiave);
  const modello = personalizzati[chiave] ?? MODELLI_PREDEFINITI[chiave];
  const html = componi(modello, costruisciVariabili(ctx));
  return { tipo: info.tipo, titolo: `${info.titolo} ${ctx.sinistro.numero_protocollo}`, html };
}
