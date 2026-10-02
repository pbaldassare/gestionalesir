import type { DettaglioValutazione, Esito, Parametro } from "./types";

export type Risposte = Record<string, string | number | boolean | undefined>;

export interface RisultatoValutazione {
  dettaglio: DettaglioValutazione[];
  punteggio: number;
  punteggio_max: number;
  percentuale: number;
  soglia: number;
  bloccata: boolean;
  esito: Esito;
  motivazioni: string[];
  completa: boolean;
}

/**
 * Motore di valutazione: ogni parametro produce un punteggio e può essere bloccante.
 * Esito "da liquidare" se nessun parametro bloccante è scattato e la percentuale
 * (punteggio / massimo ottenibile) raggiunge la soglia dell'ente.
 */
export function valuta(parametri: Parametro[], risposte: Risposte, soglia: number): RisultatoValutazione {
  const dettaglio: DettaglioValutazione[] = [];
  const motivazioni: string[] = [];
  let completa = true;

  for (const p of parametri.filter((x) => x.attivo)) {
    const r = risposte[p.codice];
    const c = p.config ?? {};
    let punteggio = 0;
    let max = 0;
    let bloccante = false;
    let etichettaRisposta = "—";

    if (r === undefined || r === "" || r === null) {
      completa = false;
      max = maxParametro(p);
      dettaglio.push({ codice: p.codice, etichetta: p.etichetta, risposta: "non compilato", punteggio: 0, punteggio_max: max, bloccante: false });
      continue;
    }

    switch (p.tipo) {
      case "si_no": {
        const si = r === true || r === "si";
        const pSi = Number(c.punteggio_si ?? 0);
        const pNo = Number(c.punteggio_no ?? 0);
        max = Math.max(pSi, pNo);
        punteggio = si ? pSi : pNo;
        etichettaRisposta = si ? "Sì" : "No";
        if ((c.bloccante_se === "si" && si) || (c.bloccante_se === "no" && !si)) bloccante = true;
        break;
      }
      case "numero": {
        const n = Number(r);
        const soglia = Number(c.soglia ?? 0);
        const ok = c.operatore === ">=" ? n >= soglia : n <= soglia;
        const pOk = Number(c.punteggio_ok ?? 0);
        const pKo = Number(c.punteggio_ko ?? 0);
        max = Math.max(pOk, pKo);
        punteggio = ok ? pOk : pKo;
        etichettaRisposta = String(n);
        if (!ok && c.bloccante_se_ko) bloccante = true;
        break;
      }
      case "scelta": {
        const opzioni = c.opzioni ?? [];
        max = opzioni.reduce((m, o) => Math.max(m, Number(o.punteggio ?? 0)), 0);
        const scelta = opzioni.find((o) => o.valore === String(r));
        if (scelta) {
          punteggio = Number(scelta.punteggio ?? 0);
          etichettaRisposta = scelta.etichetta;
          bloccante = Boolean(scelta.bloccante);
        } else {
          completa = false;
          etichettaRisposta = "non compilato";
        }
        break;
      }
    }

    if (bloccante) motivazioni.push(`${p.etichetta}: ${etichettaRisposta} (condizione ostativa)`);
    else if (punteggio < max) motivazioni.push(`${p.etichetta}: ${etichettaRisposta} (${punteggio}/${max} punti)`);

    dettaglio.push({ codice: p.codice, etichetta: p.etichetta, risposta: etichettaRisposta, punteggio, punteggio_max: max, bloccante });
  }

  const punteggio = dettaglio.reduce((s, d) => s + d.punteggio, 0);
  const punteggio_max = dettaglio.reduce((s, d) => s + d.punteggio_max, 0);
  const percentuale = punteggio_max > 0 ? Math.round((punteggio / punteggio_max) * 1000) / 10 : 0;
  const bloccata = dettaglio.some((d) => d.bloccante);
  const esito: Esito = !bloccata && percentuale >= soglia ? "da_liquidare" : "non_liquidare";

  if (!bloccata && percentuale < soglia) {
    motivazioni.unshift(`Punteggio complessivo ${percentuale}% inferiore alla soglia del ${soglia}%`);
  }

  return { dettaglio, punteggio, punteggio_max, percentuale, soglia, bloccata, esito, motivazioni, completa };
}

export function maxParametro(p: Parametro): number {
  const c = p.config ?? {};
  switch (p.tipo) {
    case "si_no":
      return Math.max(Number(c.punteggio_si ?? 0), Number(c.punteggio_no ?? 0));
    case "numero":
      return Math.max(Number(c.punteggio_ok ?? 0), Number(c.punteggio_ko ?? 0));
    case "scelta":
      return (c.opzioni ?? []).reduce((m, o) => Math.max(m, Number(o.punteggio ?? 0)), 0);
  }
}
