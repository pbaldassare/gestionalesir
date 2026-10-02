// Modelli dei documenti, ricalcati sui modelli in uso all'Ufficio Assicurazioni del Comune di Varese:
// lettera di invio quietanza, atto di quietanza, scheda danno (accoglimento e rigetto).
import type { ChecklistVoce, Ente, Sinistro, TipoDocumento, Valutazione } from "./types";
import { TIPOLOGIE } from "./types";
import { dataEstesa, dataIt, euro, importoInLettere } from "./format";

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl = (v: string | null | undefined) => esc(v).replace(/\n/g, "<br/>");
const vuoto = (v: string | null | undefined, segnaposto = "________________") => (v && v.trim() ? esc(v) : segnaposto);

export interface DocumentoGenerato {
  tipo: TipoDocumento;
  titolo: string;
  html: string;
}

interface Contesto {
  ente: Ente;
  sinistro: Sinistro;
  checklist?: ChecklistVoce[];
  valutazione?: Valutazione | null;
  importo?: number | null;
  termineGiorni?: number;
}

// ---------------------------------------------------------------------------
// Blocchi comuni
// ---------------------------------------------------------------------------
function intestazioneEnte(ente: Ente) {
  const righeUfficio = (ente.ufficio ?? "Ufficio Sinistri").split(/\s[–-]\s/);
  return `
  <div class="intestazione">
    <div>
      <div class="ente">${esc(ente.nome)}</div>
      <div class="ufficio">${righeUfficio.map(esc).join("<br/>")}</div>
    </div>
    <div class="meta">${esc(ente.citta ?? "")}, ${esc(dataEstesa(new Date().toISOString()))}</div>
  </div>`;
}

function piedeEnte(ente: Ente) {
  const sede = [ente.indirizzo, [ente.cap, ente.citta].filter(Boolean).join(" ")].filter(Boolean).join(" - ");
  const contatti = [ente.email, ente.pec].filter(Boolean).join(" - ");
  const altro = [ente.telefono ? `tel. ${ente.telefono}` : "", ente.sito_web].filter(Boolean).join(" - ");
  return `
  <div class="piede">
    <strong>${esc(ente.nome).toUpperCase()}</strong>${sede ? " - " + esc(sede) : ""}${ente.codice_fiscale ? " - C.F./P.IVA " + esc(ente.codice_fiscale) : ""}<br/>
    ${esc(ente.ufficio ?? "")}<br/>
    ${esc(contatti)}${altro ? "<br/>" + esc(altro) : ""}
  </div>`;
}

function destinatario(s: Sinistro) {
  const conPatrocinio = s.patrocinatore ? `${s.richiedente_nome} c/o ${s.patrocinatore}` : s.richiedente_nome;
  return `
  <div class="destinatario">
    Spett.le ${s.patrocinatore ? "Studio Legale / " : ""}Sig.${s.patrocinatore ? "" : "/Sig.ra"}<br/>
    <strong>${esc(conPatrocinio).toUpperCase()}</strong><br/>
    ${s.richiedente_indirizzo ? nl(s.richiedente_indirizzo) + "<br/>" : ""}
    ${s.richiedente_pec ? "PEC " + esc(s.richiedente_pec) : s.richiedente_email ? esc(s.richiedente_email) : ""}
  </div>`;
}

function oggettoSinistro(ente: Ente, s: Sinistro) {
  const conPatrocinio = s.patrocinatore ? `${s.richiedente_nome} c/o ${s.patrocinatore}` : s.richiedente_nome;
  return `
  <p class="oggetto">Oggetto: Sinistro del ${esc(dataIt(s.data_sinistro))}<br/>
  avvenuto in ${esc(ente.citta ?? "")}, ${esc(s.luogo)}<br/>
  ${esc(conPatrocinio).toUpperCase()}<br/>
  Ns. rif. n. ${esc(s.numero_protocollo)} <span class="normale">(da citare sempre nella corrispondenza)</span>.</p>`;
}

function firma(ente: Ente) {
  const righeUfficio = (ente.ufficio ?? "Ufficio Sinistri").split(/\s[–-]\s/);
  return `
  <div class="firma">
    <div>${righeUfficio.map(esc).join("<br/>")}</div>
    <div class="ruolo">(${esc(ente.responsabile ?? "Il Responsabile")})</div>
  </div>
  <div class="nota">Il documento è firmato digitalmente ai sensi del D.Lgs. 82/2005 s.m.i. e norme collegate e sostituisce il documento cartaceo e la firma autografa.</div>`;
}

function stimaDaValutazione(v: Valutazione | null | undefined, s: Sinistro): number | null {
  if (!v) return s.importo_richiesto;
  if (v.importo_proposto != null) return v.importo_proposto;
  const base = v.importo_base ?? s.importo_richiesto;
  if (base == null) return null;
  return Math.round(base * (v.riduzioni ?? []).reduce((acc, r) => acc * (1 - Number(r.percentuale) / 100), 1) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Generatore
// ---------------------------------------------------------------------------
export function generaDocumento(tipo: TipoDocumento, ctx: Contesto): DocumentoGenerato {
  switch (tipo) {
    case "avvio_istruttoria":
      return avvioIstruttoria(ctx);
    case "richiesta_integrazione":
      return richiestaIntegrazione(ctx);
    case "scheda_danno":
    case "report_valutazione":
      return schedaDanno(ctx);
    case "lettera_quietanza":
      return letteraQuietanza(ctx);
    case "atto_quietanza":
    case "lettera_liquidazione":
      return attoQuietanza(ctx);
    case "lettera_rigetto":
      return letteraRigetto(ctx);
    default:
      return { tipo: "altro", titolo: "Documento", html: "" };
  }
}

function avvioIstruttoria({ ente, sinistro: s, checklist = [] }: Contesto): DocumentoGenerato {
  const mancanti = checklist.filter((v) => !v.completata);
  const html = `
  ${intestazioneEnte(ente)}
  ${destinatario(s)}
  ${oggettoSinistro(ente, s)}
  <p>Gentile utente,</p>
  <p>con la presente si comunica che la richiesta di risarcimento pervenuta in data ${esc(dataIt(s.data_ricezione))} è stata presa in carico da questo Ufficio con il riferimento indicato in oggetto. È stata avviata l'istruttoria volta ad accertare la dinamica del fatto, la competenza dell'Ente e l'entità del danno lamentato.</p>
  ${
    mancanti.length
      ? `<p>Per il corretto perfezionamento della pratica Vi preghiamo di far pervenire, ove non già trasmessa, la seguente documentazione:</p>
         <ul>${mancanti.map((v) => `<li>${esc(v.titolo)}${v.obbligatoria ? "" : " <em>(se disponibile)</em>"}${v.descrizione ? " — " + esc(v.descrizione) : ""}</li>`).join("")}</ul>`
      : `<p>La documentazione pervenuta risulta al momento completa. L'Ufficio si riserva di richiedere eventuali integrazioni nel corso dell'istruttoria.</p>`
  }
  <p>L'intera documentazione dovrà essere inviata al seguente indirizzo email: <strong>${esc(ente.email ?? ente.pec ?? "")}</strong>, citando sempre il numero di riferimento.</p>
  <p>Cordiali saluti.</p>
  ${firma(ente)}`;
  return { tipo: "avvio_istruttoria", titolo: `Avvio istruttoria ${s.numero_protocollo}`, html };
}

function richiestaIntegrazione({ ente, sinistro: s, checklist = [], termineGiorni = 30 }: Contesto): DocumentoGenerato {
  const mancanti = checklist.filter((v) => !v.completata);
  const html = `
  ${intestazioneEnte(ente)}
  ${destinatario(s)}
  ${oggettoSinistro(ente, s)}
  <p>Gentile utente,</p>
  <p>dall'esame della documentazione trasmessa a corredo della richiesta in oggetto risulta mancante o incompleta la seguente documentazione, necessaria alla definizione della pratica:</p>
  <ul>${mancanti.map((v) => `<li class="check">${esc(v.titolo)}${v.descrizione ? " — " + esc(v.descrizione) : ""}${v.note ? " <em>(" + esc(v.note) + ")</em>" : ""}</li>`).join("")}</ul>
  <p>Vi preghiamo di trasmettere quanto sopra entro <strong>${termineGiorni} giorni</strong> dal ricevimento della presente all'indirizzo email <strong>${esc(ente.email ?? ente.pec ?? "")}</strong>. In mancanza, l'Ufficio procederà alla definizione della pratica sulla base degli atti disponibili.</p>
  <p>Si precisa che l'invio di quanto sopra indicato è strettamente necessario per il corretto perfezionamento e la definizione della pratica.</p>
  <p>Cordiali saluti.</p>
  ${firma(ente)}`;
  return { tipo: "richiesta_integrazione", titolo: `Richiesta integrazione ${s.numero_protocollo}`, html };
}

function schedaDanno({ ente, sinistro: s, checklist = [], valutazione: v }: Contesto): DocumentoGenerato {
  if (!v) throw new Error("La scheda danno richiede una valutazione salvata");
  const positivo = v.esito === "da_liquidare";
  const stima = positivo ? stimaDaValutazione(v, s) : 0;
  const descrizione = `${s.causa_presunta ? "danni " + (s.tipologia === "lesioni_persone" ? "alla persona" : "materiali") + " a causa di " + s.causa_presunta.toLowerCase() : s.descrizione}${s.targa ? " tg. " + s.targa.toUpperCase() : ""}`;
  const html = `
  ${intestazioneEnte(ente)}
  <h1>SCHEDA DANNO</h1>
  <p class="progr">N° progr. <strong>${esc(s.numero_protocollo)}</strong></p>
  <h2>Elementi identificativi del danno</h2>
  <table class="scheda">
    <tr><th>Sinistro data</th><td>${esc(dataIt(s.data_sinistro))}${s.ora_sinistro ? " ore " + esc(s.ora_sinistro.slice(0, 5)) : ""}</td></tr>
    <tr><th>Assicurato</th><td>${esc(s.richiedente_nome).toUpperCase()}${s.patrocinatore ? " C/O " + esc(s.patrocinatore).toUpperCase() : ""}</td></tr>
    <tr><th>Conducente</th><td>${vuoto(s.conducente, "—").toUpperCase()}</td></tr>
    <tr><th>Descrizione sinistro</th><td>${esc(descrizione)}</td></tr>
    <tr><th>Ammont. danno €</th><td>${esc(euro(s.importo_richiesto))} <em>(imponibile da fattura/scontrino)</em></td></tr>
    <tr><th>Luogo del sinistro Via/P.zza</th><td>${esc(s.luogo)}</td></tr>
    <tr><th>Teste</th><td>${vuoto(s.testimone, "—")}</td></tr>
    <tr><th>Stima attribuita al danno €</th><td><strong>${esc(euro(stima))}</strong></td></tr>
    <tr><th>Patrocinatore – se presente</th><td>${vuoto(s.patrocinatore, "—")}</td></tr>
    <tr><th>Tipologia</th><td>${esc(TIPOLOGIE[s.tipologia])}</td></tr>
  </table>

  <h2>Breve descrizione dell'iter istruttorio posto in essere</h2>
  <p>${v.iter_istruttorio ? nl(v.iter_istruttorio) : nl(s.descrizione)}</p>
  ${!positivo ? `<p><strong>Il sinistro viene rigettato${v.relazione_tecnica ? " come da relazione tecnica" : ""}.</strong></p>` : ""}

  <h2>Nel corso dell'istruttoria risultava possibile acquisire</h2>
  <ul>${checklist.map((c) => `<li class="check ${c.completata ? "ok" : ""}">${esc(c.titolo)}${c.note ? " — " + esc(c.note) : ""}</li>`).join("")}</ul>

  <h2>La relazione del settore tecnico segnala quanto segue</h2>
  <p>${v.relazione_tecnica ? nl(v.relazione_tecnica) : "—"}</p>
  <h2>Il verbale delle autorità segnala quanto segue</h2>
  <p>${v.verbale_autorita ? nl(v.verbale_autorita) : "—"}</p>

  <h2>Valutazione</h2>
  <p>Al termine dell'istruttoria condotta, lo scrivente ritiene opportuno procedere alla definizione della posizione, evidenziando quanto segue.</p>
  <p>Alla luce di quanto sopra esposto, si consideri che:</p>
  <ul>${v.dettaglio.map((d) => `<li>${esc(d.etichetta)}: <strong>${esc(d.risposta)}</strong>${d.bloccante ? " <em>(elemento ostativo)</em>" : ""}</li>`).join("")}</ul>
  <p>Punteggio complessivo ${v.punteggio} / ${v.punteggio_max} pari al <strong>${v.percentuale}%</strong> (soglia ${v.soglia}%).</p>
  ${
    positivo
      ? `${(v.riduzioni ?? []).length ? `<p>Riduzioni applicate all'imponibile di ${esc(euro(v.importo_base ?? s.importo_richiesto))}:</p><ul>${v.riduzioni.map((r) => `<li>${esc(r.etichetta)}: ${r.percentuale}% in meno</li>`).join("")}</ul>` : ""}
         <p>L'importo pari a <strong>${esc(euro(stima))}</strong> si ritiene congruo.</p>
         <div class="esito si">Si procede con la trattazione del sinistro a saldo e stralcio per la somma MAX di ${esc(euro(stima))}</div>
         <p>Inoltrata quietanza con il ____________________</p>`
      : `${v.motivazioni.length ? `<p>Motivazioni del rigetto:</p><ul>${v.motivazioni.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
         <div class="esito no">Inviato rigetto il ____________________</div>`
  }
  ${v.note ? `<p><em>Note:</em> ${nl(v.note)}</p>` : ""}
  ${firma(ente)}`;
  return { tipo: "scheda_danno", titolo: `Scheda danno ${s.numero_protocollo}${positivo ? "" : " (rigetto)"}`, html };
}

function letteraQuietanza({ ente, sinistro: s }: Contesto): DocumentoGenerato {
  const veicolo = s.targa || s.tipologia !== "lesioni_persone";
  const html = `
  ${intestazioneEnte(ente)}
  ${destinatario(s)}
  ${oggettoSinistro(ente, s)}
  <p>Gentile utente,</p>
  <p>con la presente si trasmette la quietanza in allegato, che Vi preghiamo di restituire debitamente compilata e sottoscritta.</p>
  <p>Alla documentazione dovrà essere allegata la copia del documento d'identità e del codice fiscale del firmatario, oltre che il modulo privacy firmato${veicolo ? " e i documenti dell'auto (libretto di circolazione)" : ""}.</p>
  <p>L'intera documentazione richiesta dovrà essere inviata al seguente indirizzo email: <strong>${esc(ente.email ?? ente.pec ?? "")}</strong>.</p>
  <p>Si precisa che l'invio di quanto sopra indicato è strettamente necessario per il corretto perfezionamento e la definizione della pratica.</p>
  <p>Cordiali saluti.</p>
  ${firma(ente)}`;
  return { tipo: "lettera_quietanza", titolo: `Lettera invio quietanza ${s.numero_protocollo}`, html };
}

function attoQuietanza({ ente, sinistro: s, valutazione: v, importo }: Contesto): DocumentoGenerato {
  const somma = importo ?? stimaDaValutazione(v, s) ?? 0;
  const caselle = Array.from({ length: 27 }, () => "<td></td>").join("");
  const html = `
  <h1 class="centro">ATTO DI QUIETANZA</h1>
  <p class="progr">Sinistro n. <strong>${esc(s.numero_protocollo)}</strong><br/>Data sinistro: <strong>${esc(dataIt(s.data_sinistro))}</strong></p>
  <p>Il presente accordo è stato raggiunto ai soli fini di prevenire l'alea del giudizio a seguito di valutazione del sinistro da parte dell'Ufficio Assicurazioni, il quale ha agito esclusivamente nell'interesse del ${esc(ente.nome)}.</p>
  <h2>Sezione per danneggiato</h2>
  <p>In relazione al sinistro di cui sopra, il/la sottoscritto/a <strong>${esc(s.richiedente_nome).toUpperCase()}</strong>${s.patrocinatore ? " c/o " + esc(s.patrocinatore).toUpperCase() : ""} (${s.richiedente_cf ? "C.F. " + esc(s.richiedente_cf).toUpperCase() : "C.F. ____________________"}) dichiara di accettare in via transattiva la somma di <strong>${esc(euro(somma))}</strong> (${esc(importoInLettere(somma))}), proposta dall'Ufficio Assicurazioni, in nome e per conto e nell'esclusivo interesse del ${esc(ente.nome)}, quale integrale e definitivo risarcimento di tutti i danni patrimoniali e non patrimoniali subiti, diretti ed indiretti, presenti e futuri, conosciuti e non, alle cose ed alle persone, accessori e spese, anche di patrocinio.</p>
  <p>Con la sottoscrizione del presente atto dichiara conseguentemente che, a seguito del ricevimento di tale somma, sarà completamente soddisfatta ogni sua pretesa in relazione al suindicato sinistro e non avrà più nulla a che pretendere dal ${esc(ente.nome)}, per qualsiasi titolo, ragione o causa, nonché da eventuali coobbligati dell'Ente medesimo, con espressa rinuncia a qualsiasi azione, intrapresa e/o da intraprendere, in sede civile e/o penale.</p>
  <p>Fornisce gli estremi del proprio IBAN al fine del versamento della somma accettata.</p>
  <p>Istituto bancario/Poste ________________________________________________________________</p>
  <p>IBAN</p>
  <table class="iban"><tr>${caselle}</tr></table>
  <p class="piccolo">Al fine di evitare errori di trascrizione e/o problemi di leggibilità, si prega di inviare copia dell'intestazione del conto con visibilità dell'IBAN.</p>
  <table class="scheda">
    <tr><th>Intestatario conto</th><td>Nome ______________________________________<br/>Indirizzo ___________________________________</td></tr>
  </table>
  <p class="sottoscrizione">Letto, confermato e sottoscritto<br/>in __________________________________ il ____/____/________ &nbsp;&nbsp;&nbsp;&nbsp; Firma ______________________________</p>
  ${piedeEnte(ente)}`;
  return { tipo: "atto_quietanza", titolo: `Atto di quietanza ${s.numero_protocollo}`, html };
}

function letteraRigetto({ ente, sinistro: s, valutazione: v }: Contesto): DocumentoGenerato {
  const motivi = v?.motivazioni ?? [];
  const html = `
  ${intestazioneEnte(ente)}
  ${destinatario(s)}
  ${oggettoSinistro(ente, s)}
  <p>Gentile utente,</p>
  <p>a conclusione dell'istruttoria relativa alla richiesta in oggetto, esaminata la documentazione prodotta e gli accertamenti svolti, questo Ufficio non ritiene sussistenti i presupposti per il riconoscimento del risarcimento richiesto.</p>
  ${v?.relazione_tecnica ? `<p>La relazione del settore tecnico segnala quanto segue: <em>${nl(v.relazione_tecnica)}</em></p>` : ""}
  ${motivi.length ? `<p>La decisione si fonda sulle seguenti risultanze:</p><ul>${motivi.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
  <p>Resta salva la facoltà di produrre, entro 30 giorni dal ricevimento della presente, ulteriori elementi documentali o testimoniali idonei a modificare le conclusioni sopra esposte; in tal caso la pratica sarà riesaminata.</p>
  <p>Cordiali saluti.</p>
  ${firma(ente)}`;
  return { tipo: "lettera_rigetto", titolo: `Comunicazione di rigetto ${s.numero_protocollo}`, html };
}
