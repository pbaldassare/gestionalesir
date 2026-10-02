import type { ChecklistVoce, Ente, Sinistro, TipoDocumento, Valutazione } from "./types";
import { TIPOLOGIE } from "./types";
import { dataEstesa, dataIt, euro } from "./format";

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl = (v: string | null | undefined) => esc(v).replace(/\n/g, "<br/>");

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

function intestazione(ente: Ente, sinistro: Sinistro, protocolloDoc: string) {
  const indirizzo = [ente.indirizzo, [ente.cap, ente.citta, ente.provincia ? `(${ente.provincia})` : ""].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");
  return `
  <div class="intestazione">
    <div>
      <div class="ente">${esc(ente.nome)}</div>
      <div class="ufficio">${esc(ente.ufficio ?? "Ufficio Sinistri")}${indirizzo ? " · " + esc(indirizzo) : ""}</div>
      ${ente.pec ? `<div class="ufficio">PEC ${esc(ente.pec)}</div>` : ""}
    </div>
    <div class="meta">
      Prot. ${esc(sinistro.numero_protocollo)}<br/>
      ${esc(protocolloDoc)}<br/>
      ${esc(ente.citta ?? "")}, ${esc(dataEstesa(new Date().toISOString()))}
    </div>
  </div>`;
}

function destinatario(s: Sinistro) {
  return `
  <div class="destinatario">
    Spett.le / Gent.mo<br/>
    <strong>${esc(s.richiedente_nome)}</strong><br/>
    ${s.richiedente_indirizzo ? nl(s.richiedente_indirizzo) + "<br/>" : ""}
    ${s.richiedente_pec ? "PEC " + esc(s.richiedente_pec) + "<br/>" : s.richiedente_email ? esc(s.richiedente_email) + "<br/>" : ""}
  </div>`;
}

function riepilogoSinistro(s: Sinistro) {
  return `
  <table>
    <tr><th style="width:34%">Protocollo</th><td>${esc(s.numero_protocollo)}</td></tr>
    <tr><th>Data del sinistro</th><td>${esc(dataIt(s.data_sinistro))}${s.ora_sinistro ? " ore " + esc(s.ora_sinistro.slice(0, 5)) : ""}</td></tr>
    <tr><th>Luogo</th><td>${esc(s.luogo)}</td></tr>
    <tr><th>Tipologia</th><td>${esc(TIPOLOGIE[s.tipologia])}</td></tr>
    <tr><th>Richiedente</th><td>${esc(s.richiedente_nome)}${s.richiedente_cf ? " · C.F. " + esc(s.richiedente_cf) : ""}</td></tr>
    <tr><th>Importo richiesto</th><td>${esc(euro(s.importo_richiesto))}</td></tr>
    <tr><th>Descrizione</th><td>${nl(s.descrizione)}</td></tr>
  </table>`;
}

function firma(ente: Ente) {
  return `
  <div class="firma">
    <div>${esc(ente.ufficio ?? "Ufficio Sinistri")}</div>
    <div class="ruolo">${esc(ente.responsabile ?? "Il Responsabile")}</div>
    <div class="linea"></div>
  </div>`;
}

const notaPrivacy = `<div class="nota">I dati personali sono trattati ai sensi del Regolamento (UE) 2016/679 esclusivamente per la gestione della pratica di risarcimento. Documento generato dal Gestionale SIR.</div>`;

export function generaDocumento(tipo: TipoDocumento, ctx: Contesto): DocumentoGenerato {
  switch (tipo) {
    case "avvio_istruttoria":
      return avvioIstruttoria(ctx);
    case "richiesta_integrazione":
      return richiestaIntegrazione(ctx);
    case "report_valutazione":
      return reportValutazione(ctx);
    case "lettera_liquidazione":
      return letteraLiquidazione(ctx);
    case "lettera_rigetto":
      return letteraRigetto(ctx);
    default:
      return { tipo: "altro", titolo: "Documento", html: "" };
  }
}

function avvioIstruttoria({ ente, sinistro: s, checklist = [] }: Contesto): DocumentoGenerato {
  const mancanti = checklist.filter((v) => !v.completata);
  const html = `
  ${intestazione(ente, s, "Avvio istruttoria")}
  ${destinatario(s)}
  <p class="oggetto">Oggetto: comunicazione di avvio del procedimento — richiesta di risarcimento danni, sinistro del ${esc(dataIt(s.data_sinistro))} in ${esc(s.luogo)}.</p>
  <p>Con riferimento alla richiesta di risarcimento pervenuta in data ${esc(dataIt(s.data_ricezione))} e registrata al protocollo <strong>${esc(s.numero_protocollo)}</strong>, si comunica che questo Ente ha avviato l'istruttoria volta ad accertare la dinamica del fatto, la sussistenza della responsabilità e l'entità del danno lamentato.</p>
  ${riepilogoSinistro(s)}
  ${
    mancanti.length
      ? `<p>Al fine di consentire la completa istruttoria della pratica, si invita a far pervenire, ove non già trasmessa, la seguente documentazione:</p>
         <ul>${mancanti.map((v) => `<li>${esc(v.titolo)}${v.obbligatoria ? "" : " <em>(se disponibile)</em>"}${v.descrizione ? " — " + esc(v.descrizione) : ""}</li>`).join("")}</ul>`
      : `<p>La documentazione pervenuta risulta al momento completa. L'Ente si riserva di richiedere eventuali integrazioni nel corso dell'istruttoria.</p>`
  }
  <p>Per ogni comunicazione si prega di citare il numero di protocollo indicato in intestazione${ente.pec ? ` e di utilizzare l'indirizzo PEC ${esc(ente.pec)}` : ""}.</p>
  <p>Distinti saluti.</p>
  ${firma(ente)}
  ${notaPrivacy}`;
  return { tipo: "avvio_istruttoria", titolo: `Avvio istruttoria ${s.numero_protocollo}`, html };
}

function richiestaIntegrazione({ ente, sinistro: s, checklist = [], termineGiorni = 30 }: Contesto): DocumentoGenerato {
  const mancanti = checklist.filter((v) => !v.completata);
  const html = `
  ${intestazione(ente, s, "Richiesta integrazione")}
  ${destinatario(s)}
  <p class="oggetto">Oggetto: richiesta di integrazione documentale — pratica ${esc(s.numero_protocollo)}, sinistro del ${esc(dataIt(s.data_sinistro))}.</p>
  <p>Dall'esame della documentazione trasmessa a corredo della richiesta di risarcimento in oggetto, risulta mancante o incompleta la seguente documentazione, necessaria alla definizione della pratica:</p>
  <ul>${mancanti.map((v) => `<li class="check">${esc(v.titolo)}${v.descrizione ? " — " + esc(v.descrizione) : ""}${v.note ? " <em>(" + esc(v.note) + ")</em>" : ""}</li>`).join("")}</ul>
  <p>Si invita a trasmettere quanto sopra entro <strong>${termineGiorni} giorni</strong> dal ricevimento della presente. In mancanza, l'Ente procederà alla definizione della pratica sulla base degli atti disponibili.</p>
  <p>Distinti saluti.</p>
  ${firma(ente)}
  ${notaPrivacy}`;
  return { tipo: "richiesta_integrazione", titolo: `Richiesta integrazione ${s.numero_protocollo}`, html };
}

function reportValutazione({ ente, sinistro: s, checklist = [], valutazione: v }: Contesto): DocumentoGenerato {
  if (!v) throw new Error("Report non generabile senza una valutazione salvata");
  const obbl = checklist.filter((c) => c.obbligatoria);
  const compl = obbl.filter((c) => c.completata).length;
  const html = `
  ${intestazione(ente, s, "Report di valutazione")}
  <h1>Report di valutazione del sinistro ${esc(s.numero_protocollo)}</h1>
  <p>Relazione istruttoria interna redatta sulla base dei parametri di valutazione adottati dall'Ente. Il presente documento costituisce supporto alla decisione e non ha valore di comunicazione verso il richiedente.</p>
  <h2>1. Dati del sinistro</h2>
  ${riepilogoSinistro(s)}
  <h2>2. Stato della documentazione</h2>
  <p>Voci obbligatorie acquisite: <strong>${compl} su ${obbl.length}</strong>.</p>
  <ul>${checklist.map((c) => `<li class="check ${c.completata ? "ok" : ""}">${esc(c.titolo)}${c.obbligatoria ? "" : " <em>(facoltativa)</em>"}${c.note ? " — " + esc(c.note) : ""}</li>`).join("")}</ul>
  <h2>3. Parametri di valutazione</h2>
  <table>
    <thead><tr><th>Parametro</th><th>Esito</th><th style="width:18%">Punteggio</th></tr></thead>
    <tbody>
    ${v.dettaglio.map((d) => `<tr><td>${esc(d.etichetta)}</td><td>${esc(d.risposta)}${d.bloccante ? " <strong>— ostativo</strong>" : ""}</td><td>${d.punteggio} / ${d.punteggio_max}</td></tr>`).join("")}
    </tbody>
  </table>
  <p>Punteggio complessivo: <strong>${v.punteggio} / ${v.punteggio_max}</strong> pari al <strong>${v.percentuale}%</strong> (soglia di liquidabilità: ${v.soglia}%).${v.bloccata ? " È presente almeno una condizione ostativa." : ""}</p>
  <h2>4. Esito</h2>
  <div class="esito ${v.esito === "da_liquidare" ? "si" : "no"}">${v.esito === "da_liquidare" ? "Sinistro da liquidare" : "Sinistro non liquidabile"}</div>
  ${v.esito === "da_liquidare" && v.importo_proposto != null ? `<p>Importo proposto per la liquidazione: <strong>${esc(euro(v.importo_proposto))}</strong>${s.importo_richiesto ? ` a fronte di ${esc(euro(s.importo_richiesto))} richiesti` : ""}.</p>` : ""}
  ${v.motivazioni.length ? `<p>Motivazioni:</p><ul>${v.motivazioni.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : "<p>Nessun rilievo: tutti i parametri risultano pienamente soddisfatti.</p>"}
  ${v.note ? `<p><em>Note dell'istruttore:</em> ${nl(v.note)}</p>` : ""}
  ${firma(ente)}
  <div class="nota">Report generato il ${esc(dataIt(v.created_at, true))} dal Gestionale SIR sulla base dei parametri in vigore alla data di valutazione.</div>`;
  return { tipo: "report_valutazione", titolo: `Report valutazione ${s.numero_protocollo}`, html };
}

function letteraLiquidazione({ ente, sinistro: s, valutazione: v, importo }: Contesto): DocumentoGenerato {
  const somma = importo ?? v?.importo_proposto ?? s.importo_richiesto;
  const html = `
  ${intestazione(ente, s, "Proposta di liquidazione")}
  ${destinatario(s)}
  <p class="oggetto">Oggetto: definizione della richiesta di risarcimento — pratica ${esc(s.numero_protocollo)}, sinistro del ${esc(dataIt(s.data_sinistro))} in ${esc(s.luogo)}.</p>
  <p>A conclusione dell'istruttoria relativa alla richiesta in oggetto, esaminata la documentazione prodotta e accertata la dinamica del fatto, questo Ente ritiene di poter riconoscere il danno lamentato.</p>
  <p>Si propone pertanto la liquidazione, a titolo di risarcimento e a tacitazione di ogni pretesa connessa al sinistro, della somma di <strong>${esc(euro(somma))}</strong>${s.importo_richiesto && somma !== s.importo_richiesto ? ` a fronte dell'importo richiesto di ${esc(euro(s.importo_richiesto))}` : ""}.</p>
  ${ente.compagnia_assicurativa ? `<p>La liquidazione avverrà${ente.franchigia ? ` per la quota in franchigia a carico dell'Ente e, per l'eventuale eccedenza,` : ""} per il tramite della compagnia ${esc(ente.compagnia_assicurativa)}${ente.numero_polizza ? ` (polizza n. ${esc(ente.numero_polizza)})` : ""}.</p>` : ""}
  <p>Per procedere al pagamento si invita a restituire la presente sottoscritta per accettazione, unitamente alle coordinate bancarie (IBAN) intestate al richiedente, entro 30 giorni dal ricevimento.</p>
  <p>Distinti saluti.</p>
  ${firma(ente)}
  <div class="firma" style="margin-left:0; margin-top:16mm">
    <div>Per accettazione e quietanza</div>
    <div class="ruolo">${esc(s.richiedente_nome)}</div>
    <div class="linea"></div>
  </div>
  ${notaPrivacy}`;
  return { tipo: "lettera_liquidazione", titolo: `Proposta di liquidazione ${s.numero_protocollo}`, html };
}

function letteraRigetto({ ente, sinistro: s, valutazione: v }: Contesto): DocumentoGenerato {
  const motivi = v?.motivazioni ?? [];
  const html = `
  ${intestazione(ente, s, "Comunicazione di rigetto")}
  ${destinatario(s)}
  <p class="oggetto">Oggetto: definizione della richiesta di risarcimento — pratica ${esc(s.numero_protocollo)}, sinistro del ${esc(dataIt(s.data_sinistro))} in ${esc(s.luogo)}.</p>
  <p>A conclusione dell'istruttoria relativa alla richiesta in oggetto, esaminata la documentazione prodotta e gli accertamenti svolti, questo Ente non ritiene sussistenti i presupposti per il riconoscimento del risarcimento richiesto.</p>
  ${motivi.length ? `<p>La decisione si fonda sulle seguenti risultanze:</p><ul>${motivi.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
  <p>Resta salva la facoltà di produrre, entro 30 giorni dal ricevimento della presente, ulteriori elementi documentali o testimoniali idonei a modificare le conclusioni sopra esposte; in tal caso la pratica sarà riesaminata.</p>
  <p>Distinti saluti.</p>
  ${firma(ente)}
  ${notaPrivacy}`;
  return { tipo: "lettera_rigetto", titolo: `Comunicazione di rigetto ${s.numero_protocollo}`, html };
}
