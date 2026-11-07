// Modelli di documento: testo HTML con campi {{segnaposto}} sostituiti al momento della generazione.
// I predefiniti ricalcano i modelli dell'Ufficio Assicurazioni del Comune di Varese; ogni ente può
// personalizzarli dalla pagina "Modelli" (tabella gestionalesir.modelli_documento).
import type { ChecklistVoce, Ente, Polizza, Sinistro, TipoDocumento, Valutazione } from "./types";
import { FLUSSI, TIPOLOGIE } from "./types";
import { dataEstesa, dataIt, euro, importoInLettere } from "./format";

export type ChiaveModello =
  | "avvio_istruttoria"
  | "richiesta_integrazione"
  | "richiesta_relazione_tecnica"
  | "relazione_tecnica"
  | "scheda_danno"
  | "scheda_danno_rigetto"
  | "lettera_quietanza"
  | "atto_quietanza"
  | "lettera_rigetto";

export interface InfoModello {
  chiave: ChiaveModello;
  tipo: TipoDocumento;
  titolo: string;
  descrizione: string;
  gruppo: "Istruttoria" | "Ufficio Strade" | "Accoglimento" | "Rigetto";
}

export const GRUPPI_MODELLI: InfoModello["gruppo"][] = ["Istruttoria", "Ufficio Strade", "Accoglimento", "Rigetto"];

export const MODELLI: InfoModello[] = [
  { chiave: "avvio_istruttoria", tipo: "avvio_istruttoria", titolo: "Comunicazione di avvio istruttoria", descrizione: "Presa in carico e documenti ancora da produrre.", gruppo: "Istruttoria" },
  { chiave: "richiesta_integrazione", tipo: "richiesta_integrazione", titolo: "Richiesta documentazione (RCVT)", descrizione: "Richiesta al danneggiato dei documenti mancanti, con termine di 15 giorni.", gruppo: "Istruttoria" },
  { chiave: "richiesta_relazione_tecnica", tipo: "richiesta_relazione_tecnica", titolo: "Richiesta di relazione tecnica (Strade)", descrizione: "Trasmissione della denuncia all'Area Attività Strade con richiesta di relazione entro 10 giorni.", gruppo: "Ufficio Strade" },
  { chiave: "relazione_tecnica", tipo: "relazione_tecnica", titolo: "Relazione tecnica", descrizione: "Compilata dal tecnico dell'Ufficio Strade con i dati del fascicolo. Testo provvisorio in attesa del modello ufficiale.", gruppo: "Ufficio Strade" },
  { chiave: "scheda_danno", tipo: "scheda_danno", titolo: "Scheda di valutazione", descrizione: "Scheda danno con definizione a saldo e stralcio.", gruppo: "Accoglimento" },
  { chiave: "lettera_quietanza", tipo: "lettera_quietanza", titolo: "Lettera invio quietanza", descrizione: "Trasmissione dell'atto di quietanza al danneggiato.", gruppo: "Accoglimento" },
  { chiave: "atto_quietanza", tipo: "atto_quietanza", titolo: "Atto di quietanza", descrizione: "Accettazione transattiva della somma, con IBAN.", gruppo: "Accoglimento" },
  { chiave: "scheda_danno_rigetto", tipo: "scheda_danno", titolo: "Scheda di valutazione – rigetto", descrizione: "Scheda danno con rigetto come da relazione tecnica.", gruppo: "Rigetto" },
  { chiave: "lettera_rigetto", tipo: "lettera_rigetto", titolo: "Comunicazione di rigetto", descrizione: "Diniego motivato al richiedente.", gruppo: "Rigetto" },
];

export const infoModello = (chiave: ChiaveModello) => MODELLI.find((m) => m.chiave === chiave)!;

// ---------------------------------------------------------------------------
// Campi disponibili
// ---------------------------------------------------------------------------
export interface Campo {
  nome: string;
  etichetta: string;
  gruppo: string;
  blocco?: boolean;
}

export const CAMPI: Campo[] = [
  { nome: "oggi", etichetta: "Data di oggi (estesa)", gruppo: "Generali" },
  { nome: "ente.nome", etichetta: "Denominazione dell'ente", gruppo: "Ente" },
  { nome: "ente.citta", etichetta: "Città", gruppo: "Ente" },
  { nome: "ente.ufficio", etichetta: "Ufficio", gruppo: "Ente" },
  { nome: "ente.responsabile", etichetta: "Responsabile firmatario", gruppo: "Ente" },
  { nome: "ente.email", etichetta: "Email di protocollo", gruppo: "Ente" },
  { nome: "ente.pec", etichetta: "PEC", gruppo: "Ente" },
  { nome: "ente.telefono", etichetta: "Telefono", gruppo: "Ente" },
  { nome: "ente.indirizzo", etichetta: "Indirizzo completo", gruppo: "Ente" },
  { nome: "ente.codice_fiscale", etichetta: "Codice fiscale / P.IVA", gruppo: "Ente" },
  { nome: "ente.sito_web", etichetta: "Sito web", gruppo: "Ente" },
  { nome: "sinistro.numero", etichetta: "Numero interno di sinistro (Ns. rif.)", gruppo: "Sinistro" },
  { nome: "sinistro.protocollo_precedente", etichetta: "Prot. prec. n.", gruppo: "Sinistro" },
  { nome: "sinistro.flusso", etichetta: "Flusso (sotto soglia / in polizza)", gruppo: "Sinistro" },
  { nome: "polizza.numero", etichetta: "Numero della polizza", gruppo: "Polizza" },
  { nome: "polizza.nome", etichetta: "Nome della polizza", gruppo: "Polizza" },
  { nome: "polizza.compagnia", etichetta: "Compagnia della polizza", gruppo: "Polizza" },
  { nome: "relazione.tecnico", etichetta: "Nome del tecnico", gruppo: "Relazione tecnica" },
  { nome: "relazione.data", etichetta: "Data della relazione", gruppo: "Relazione tecnica" },
  { nome: "relazione.natura_strada", etichetta: "Natura della strada (comunale/privata)", gruppo: "Relazione tecnica" },
  { nome: "relazione.stato_luoghi", etichetta: "Stato dei luoghi", gruppo: "Relazione tecnica" },
  { nome: "relazione.nesso", etichetta: "Valutazione del nesso causale", gruppo: "Relazione tecnica" },
  { nome: "relazione.ripristini", etichetta: "Interventi di ripristino successivi", gruppo: "Relazione tecnica" },
  { nome: "relazione.conclusioni", etichetta: "Conclusioni", gruppo: "Relazione tecnica" },
  { nome: "sinistro.data", etichetta: "Data del sinistro", gruppo: "Sinistro" },
  { nome: "sinistro.ora", etichetta: "Ora del sinistro", gruppo: "Sinistro" },
  { nome: "sinistro.mese", etichetta: "Mese del sinistro", gruppo: "Sinistro" },
  { nome: "sinistro.luogo", etichetta: "Luogo (via/piazza)", gruppo: "Sinistro" },
  { nome: "sinistro.descrizione", etichetta: "Descrizione completa del fatto", gruppo: "Sinistro" },
  { nome: "sinistro.descrizione_breve", etichetta: "Descrizione breve con targa", gruppo: "Sinistro" },
  { nome: "sinistro.tipologia", etichetta: "Tipologia", gruppo: "Sinistro" },
  { nome: "sinistro.data_ricezione", etichetta: "Data di ricezione", gruppo: "Sinistro" },
  { nome: "sinistro.ammontare_danno", etichetta: "Ammontare del danno (imponibile)", gruppo: "Sinistro" },
  { nome: "sinistro.targa", etichetta: "Targa", gruppo: "Sinistro" },
  { nome: "sinistro.conducente", etichetta: "Conducente", gruppo: "Sinistro" },
  { nome: "sinistro.teste", etichetta: "Teste", gruppo: "Sinistro" },
  { nome: "sinistro.patrocinatore", etichetta: "Patrocinatore", gruppo: "Sinistro" },
  { nome: "richiedente.nome", etichetta: "Nome del richiedente", gruppo: "Richiedente" },
  { nome: "richiedente.con_patrocinio", etichetta: "Richiedente c/o patrocinatore", gruppo: "Richiedente" },
  { nome: "richiedente.cf", etichetta: "Codice fiscale", gruppo: "Richiedente" },
  { nome: "richiedente.indirizzo", etichetta: "Indirizzo", gruppo: "Richiedente" },
  { nome: "richiedente.recapito", etichetta: "PEC o email", gruppo: "Richiedente" },
  { nome: "valutazione.stima", etichetta: "Stima attribuita al danno", gruppo: "Valutazione" },
  { nome: "valutazione.stima_in_lettere", etichetta: "Stima in lettere", gruppo: "Valutazione" },
  { nome: "valutazione.imponibile", etichetta: "Imponibile riconosciuto", gruppo: "Valutazione" },
  { nome: "valutazione.iter_istruttorio", etichetta: "Iter istruttorio", gruppo: "Valutazione" },
  { nome: "valutazione.relazione_tecnica", etichetta: "Relazione del settore tecnico", gruppo: "Valutazione" },
  { nome: "valutazione.verbale_autorita", etichetta: "Verbale delle autorità", gruppo: "Valutazione" },
  { nome: "valutazione.punteggio", etichetta: "Punteggio (es. 90 / 100)", gruppo: "Valutazione" },
  { nome: "valutazione.percentuale", etichetta: "Percentuale", gruppo: "Valutazione" },
  { nome: "valutazione.soglia", etichetta: "Soglia dell'ente", gruppo: "Valutazione" },
  { nome: "valutazione.note", etichetta: "Note dell'istruttore", gruppo: "Valutazione" },
  { nome: "frase.libretto", etichetta: "Frase sui documenti dell'auto (solo veicoli)", gruppo: "Frasi automatiche" },
  { nome: "blocco.intestazione", etichetta: "Intestazione dell'ente con data", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.firma", etichetta: "Firma dell'ufficio e nota di firma digitale", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.piede", etichetta: "Piè di pagina con i dati dell'ente", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.documenti_acquisiti", etichetta: "Elenco dei documenti acquisiti", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.documenti_mancanti", etichetta: "Elenco dei documenti mancanti", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.criteri", etichetta: "Esito dei criteri di valutazione", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.riduzioni", etichetta: "Riduzioni applicate", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.motivazioni", etichetta: "Motivazioni del rigetto", gruppo: "Blocchi", blocco: true },
  { nome: "blocco.caselle_iban", etichetta: "Caselle per l'IBAN", gruppo: "Blocchi", blocco: true },
];

// ---------------------------------------------------------------------------
// Modelli predefiniti
// ---------------------------------------------------------------------------
const DESTINATARIO = `<div class="destinatario">Spett.le Studio Legale / Sig.<br/><strong>{{richiedente.con_patrocinio}}</strong><br/>{{richiedente.indirizzo}}<br/>{{richiedente.recapito}}</div>`;
const OGGETTO = `<p class="oggetto">Oggetto: Sinistro del {{sinistro.data}}<br/>avvenuto in {{ente.citta}}, {{sinistro.luogo}}<br/>{{richiedente.con_patrocinio}}<br/>Ns. rif. n. {{sinistro.numero}} <span class="normale">(da citare sempre nella corrispondenza)</span>.</p>`;
const TABELLA_ELEMENTI = (stima: string) => `<table class="scheda">
<tr><th>Sinistro data</th><td>{{sinistro.data}}</td></tr>
<tr><th>Assicurato</th><td>{{richiedente.con_patrocinio}}</td></tr>
<tr><th>Conducente</th><td>{{sinistro.conducente}}</td></tr>
<tr><th>Descrizione sinistro</th><td>{{sinistro.descrizione_breve}}</td></tr>
<tr><th>Ammont. danno €</th><td>{{sinistro.ammontare_danno}} <em>(imponibile da fattura/scontrino)</em></td></tr>
<tr><th>Luogo del sinistro Via/P.zza</th><td>{{sinistro.luogo}}</td></tr>
<tr><th>Teste</th><td>{{sinistro.teste}}</td></tr>
<tr><th>Stima attribuita al danno €</th><td><strong>${stima}</strong></td></tr>
<tr><th>Patrocinatore – se presente</th><td>{{sinistro.patrocinatore}}</td></tr>
</table>`;

export const MODELLI_PREDEFINITI: Record<ChiaveModello, string> = {
  avvio_istruttoria: `<p>{{blocco.intestazione}}</p>
${DESTINATARIO}
${OGGETTO}
<p>Gentile utente,</p>
<p>con la presente si comunica che la richiesta di risarcimento pervenuta in data {{sinistro.data_ricezione}} è stata presa in carico da questo Ufficio con il riferimento indicato in oggetto. È stata avviata l'istruttoria volta ad accertare la dinamica del fatto, la competenza dell'Ente e l'entità del danno lamentato.</p>
<p>Per il corretto perfezionamento della pratica Vi preghiamo di far pervenire, ove non già trasmessa, la seguente documentazione:</p>
<p>{{blocco.documenti_mancanti}}</p>
<p>L'intera documentazione dovrà essere inviata al seguente indirizzo email: <strong>{{ente.email}}</strong>, citando sempre il numero di riferimento.</p>
<p>Cordiali saluti.</p>
<p>{{blocco.firma}}</p>
<p>{{blocco.piede}}</p>`,

  richiesta_integrazione: `<p>{{blocco.intestazione}}</p>
${DESTINATARIO}
${OGGETTO}
<p>Salvo e impregiudicato ogni rispettivo e reciproco diritto e senza che la presente comunicazione costituisca ammissione di responsabilità alcuna, con riferimento alla domanda risarcitoria di cui all'oggetto, al fine di consentire alla scrivente Amministrazione una corretta istruttoria della pratica, si chiede di fornire, entro 15 giorni dalla data di ricevimento della presente, e qualora non si sia già provveduto, copia della seguente documentazione in Vostro possesso:</p>
<p>{{blocco.documenti_mancanti}}</p>
<ul>
<li>autorizzazione al trattamento dei dati personali, allegata alla presente, debitamente sottoscritta;</li>
<li>dichiarazioni testimoniali se e in quanto già indicate nel modulo di richiesta danni (con relativo documento d'identità dei testimoni);</li>
<li>dichiarazione di inesistenza di ulteriori coperture assicurative in ordine al danno de quo;</li>
<li>ogni altro documento o atto che si ritiene utile a provare l'evento dannoso.</li>
</ul>
<p>È possibile, altresì, fornire ogni altro documento che il/la danneggiato/a ritiene utile a provare l'evento dannoso.</p>
<p>In caso di mancata o incompleta risposta, non potrà darsi seguito alla richiesta di risarcimento.</p>
<p>Per la successiva gestione della pratica, è operativo l'Ufficio Assicurazioni del {{ente.nome}}, {{ente.indirizzo}}, dal lunedì al venerdì dalle ore 08.30 alle ore 12.00 al seguente riferimento telefonico {{ente.telefono}}.</p>
<p>È possibile, altresì, inviare mail al seguente indirizzo: {{ente.email}}</p>
<p>Per ogni comunicazione, telefonica o scritta, dovrà essere sempre fatto riferimento al numero di pratica del sinistro riportato nell'oggetto della presente.</p>
<p>Distinti saluti.</p>
<p>{{blocco.firma}}</p>
<p>{{blocco.piede}}</p>`,

  richiesta_relazione_tecnica: `<p>{{blocco.intestazione}}</p>
<p>Prot. prec. n. {{sinistro.protocollo_precedente}}</p>
<div class="destinatario">All'AREA X<br/><strong>ATTIVITÀ STRADE</strong></div>
${OGGETTO}
<p>Si trasmette la denuncia e la documentazione pervenuta in relazione al sinistro in oggetto, con richiesta di voler produrre allo scrivente Ufficio - entro e non oltre 10 giorni dalla data della presente - una dettagliata relazione in merito alle cause che hanno provocato il sinistro in oggetto, restituendo allo scrivente Ufficio Assicurazioni l'eventuale documentazione fotografica in originale qui allegata.</p>
<p>Preventivamente andrà accertata la natura comunale o privata della strada.</p>
<p>In particolare occorre che l'ufficio in indirizzo esamini i documenti e valuti, rispetto alla situazione effettiva dei luoghi, se la stessa è stata determinante per la causazione del danno lamentato. Si chiedono, pertanto, tutte le valutazioni tecniche necessarie che possano essere utilizzate dallo scrivente ufficio al fine di poter correttamente analizzare il sinistro in termini di nesso di causalità tra stato dei luoghi (quindi responsabilità dell'Ente) ed evento dannoso.</p>
<p>Si invita, a voler precisare se il luogo del sinistro sia stato oggetto di successivi interventi di ripristino, nei casi riferibili a buche stradali.</p>
<p>Si precisa che l'evasione della presente da parte dell'Area destinataria nei ristretti tempi previsti è assolutamente necessaria, al fine di poter definire la pratica e di evitare un procedimento di contenzioso.</p>
<p>Distinti saluti.</p>
<p>{{blocco.firma}}</p>
<p>{{blocco.piede}}</p>`,

  relazione_tecnica: `<p>{{blocco.intestazione}}</p>
<div class="destinatario">All'Ufficio Assicurazioni<br/>{{ente.ufficio}}</div>
<p class="oggetto">Oggetto: relazione tecnica sul sinistro del {{sinistro.data}} in {{sinistro.luogo}} - {{richiedente.con_patrocinio}} - Ns. rif. n. {{sinistro.numero}}.</p>
<p>In riscontro alla richiesta di relazione, esaminata la documentazione trasmessa ed effettuati gli accertamenti del caso, si relaziona quanto segue.</p>
<h2>Natura della strada</h2>
<p>{{relazione.natura_strada}}</p>
<h2>Stato dei luoghi</h2>
<p>{{relazione.stato_luoghi}}</p>
<h2>Nesso tra stato dei luoghi ed evento</h2>
<p>{{relazione.nesso}}</p>
<h2>Interventi di ripristino successivi</h2>
<p>{{relazione.ripristini}}</p>
<h2>Conclusioni</h2>
<p>{{relazione.conclusioni}}</p>
<div class="firma"><div>Area X - Attività Strade</div><div class="ruolo">Il tecnico: {{relazione.tecnico}}</div><div class="ruolo">{{relazione.data}}</div></div>
<p>{{blocco.piede}}</p>`,

  scheda_danno: `<p>{{blocco.intestazione}}</p>
<h1>SCHEDA DANNO</h1>
<p class="progr">N° progr. <strong>{{sinistro.numero}}</strong></p>
<h2>Elementi identificativi del danno</h2>
${TABELLA_ELEMENTI("{{valutazione.stima}}")}
<h2>Breve descrizione dell'iter istruttorio posto in essere:</h2>
<p>{{valutazione.iter_istruttorio}}</p>
<h2>Nel corso dell'istruttoria risultava possibile acquisire:</h2>
<p>{{blocco.documenti_acquisiti}}</p>
<h2>La relazione del settore tecnico segnala quanto segue:</h2>
<p>{{valutazione.relazione_tecnica}}</p>
<h2>Il verbale delle autorità segnala quanto segue:</h2>
<p>{{valutazione.verbale_autorita}}</p>
<p>Al termine dell'istruttoria condotta, lo scrivente ritiene opportuno procedere alla definizione della posizione, evidenziando quanto segue.</p>
<p>Alla luce di quanto sopra esposto, si consideri che:</p>
<p>{{blocco.criteri}}</p>
<p>{{blocco.riduzioni}}</p>
<ul>
<li>l'importo pari a <strong>{{valutazione.stima}}</strong> si ritiene congruo;</li>
<li>si procede con la trattazione del sinistro a saldo e stralcio per la somma MAX di <strong>{{valutazione.stima}}</strong> – inoltrata quietanza con il ____________________</li>
</ul>
<p>{{blocco.firma}}</p>`,

  scheda_danno_rigetto: `<p>{{blocco.intestazione}}</p>
<h1>SCHEDA DANNO</h1>
<p class="progr">N° progr. <strong>{{sinistro.numero}}</strong></p>
<h2>Elementi identificativi del danno</h2>
${TABELLA_ELEMENTI("0")}
<h2>Breve descrizione dell'iter istruttorio posto in essere:</h2>
<p>{{valutazione.iter_istruttorio}}</p>
<p><strong>Il sinistro viene rigettato come da relazione tecnica.</strong></p>
<h2>La relazione del settore tecnico segnala quanto segue:</h2>
<p>{{valutazione.relazione_tecnica}}</p>
<h2>Il verbale delle autorità segnala quanto segue:</h2>
<p>{{valutazione.verbale_autorita}}</p>
<p>{{blocco.motivazioni}}</p>
<p>Al termine dell'istruttoria condotta, lo scrivente ritiene opportuno procedere alla definizione della posizione, <strong>INVIATO RIGETTO IL ____________________</strong></p>
<p>{{blocco.firma}}</p>`,

  lettera_quietanza: `<p>{{blocco.intestazione}}</p>
${DESTINATARIO}
${OGGETTO}
<p>Gentile utente,</p>
<p>con la presente si trasmette la quietanza in allegato, che Vi preghiamo di restituire debitamente compilata e sottoscritta.</p>
<p>Alla documentazione dovrà essere allegata la copia del documento d'identità e del codice fiscale del firmatario, oltre che il modulo privacy firmato{{frase.libretto}}.</p>
<p>L'intera documentazione richiesta dovrà essere inviata al seguente indirizzo email: <strong>{{ente.email}}</strong>.</p>
<p>Si precisa che l'invio di quanto sopra indicato è strettamente necessario per il corretto perfezionamento e la definizione della pratica.</p>
<p>Cordiali saluti.</p>
<p>{{blocco.firma}}</p>
<p>{{blocco.piede}}</p>`,

  atto_quietanza: `<h1 class="centro">ATTO DI QUIETANZA</h1>
<p class="progr">Sinistro n. <strong>{{sinistro.numero}}</strong><br/>Data sinistro: <strong>{{sinistro.data}}</strong></p>
<p>Il presente accordo è stato raggiunto ai soli fini di prevenire l'alea del giudizio a seguito di valutazione del sinistro da parte dell'Ufficio Assicurazioni, il quale ha agito esclusivamente nell'interesse del {{ente.nome}}.</p>
<h2>Sezione per danneggiato</h2>
<p>In relazione al sinistro di cui sopra, il/la sottoscritto/a <strong>{{richiedente.con_patrocinio}}</strong> (C.F. {{richiedente.cf}}) dichiara di accettare in via transattiva la somma di <strong>{{valutazione.stima}}</strong> ({{valutazione.stima_in_lettere}}), proposta dall'Ufficio Assicurazioni, in nome e per conto e nell'esclusivo interesse del {{ente.nome}}, quale integrale e definitivo risarcimento di tutti i danni patrimoniali e non patrimoniali subiti, diretti ed indiretti, presenti e futuri, conosciuti e non, alle cose ed alle persone, accessori e spese, anche di patrocinio. Con la sottoscrizione del presente atto dichiara conseguentemente che, a seguito del ricevimento di tale somma, sarà completamente soddisfatta ogni sua pretesa in relazione al suindicato sinistro e non avrà più nulla a che pretendere dal {{ente.nome}}, per qualsiasi titolo, ragione o causa, nonché da eventuali coobbligati dell'Ente medesimo, con espressa rinuncia a qualsiasi azione, intrapresa e/o da intraprendere, in sede civile e/o penale.</p>
<p>Fornisce gli estremi del proprio IBAN al fine del versamento della somma accettata</p>
<p>Istituto bancario/Poste ________________________________________________________________</p>
<p>IBAN</p>
<p>{{blocco.caselle_iban}}</p>
<p class="piccolo">al fine di evitare errori di trascrizione e/o problemi di leggibilità, si prega di inviare copia dell'intestazione del conto con visibilità dell'IBAN</p>
<table class="scheda"><tr><th>Intestatario conto</th><td>NOME ______________________________________<br/>INDIRIZZO ___________________________________</td></tr></table>
<p class="sottoscrizione">Letto, confermato e sottoscritto<br/>in __________________________________ il ____/____/________ &nbsp;&nbsp;&nbsp;&nbsp; Firma ______________________________</p>
<p>{{blocco.piede}}</p>`,

  lettera_rigetto: `<p>{{blocco.intestazione}}</p>
${DESTINATARIO}
${OGGETTO}
<p>Gentile utente,</p>
<p>a conclusione dell'istruttoria relativa alla richiesta in oggetto, esaminata la documentazione prodotta e gli accertamenti svolti, questo Ufficio non ritiene sussistenti i presupposti per il riconoscimento del risarcimento richiesto.</p>
<p>La relazione del settore tecnico segnala quanto segue: <em>{{valutazione.relazione_tecnica}}</em></p>
<p>{{blocco.motivazioni}}</p>
<p>Resta salva la facoltà di produrre, entro 30 giorni dal ricevimento della presente, ulteriori elementi documentali o testimoniali idonei a modificare le conclusioni sopra esposte; in tal caso la pratica sarà riesaminata.</p>
<p>Cordiali saluti.</p>
<p>{{blocco.firma}}</p>
<p>{{blocco.piede}}</p>`,
};

// ---------------------------------------------------------------------------
// Variabili e composizione
// ---------------------------------------------------------------------------
export interface DatiRelazione {
  tecnico: string;
  natura_strada: string;
  stato_luoghi: string;
  nesso: string;
  ripristini: string;
  conclusioni: string;
}

export interface ContestoDocumento {
  ente: Ente;
  sinistro: Sinistro;
  checklist?: ChecklistVoce[];
  valutazione?: Valutazione | null;
  importo?: number | null;
  polizza?: Polizza | null;
  relazione?: DatiRelazione | null;
}

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const nl = (v: string | null | undefined) => esc(v).replace(/\n/g, "<br/>");

export function stimaValutazione(v: Valutazione | null | undefined, s: Sinistro): number | null {
  if (!v) return s.importo_richiesto;
  if (v.importo_proposto != null) return v.importo_proposto;
  const base = v.importo_base ?? s.importo_richiesto;
  if (base == null) return null;
  return Math.round(base * (v.riduzioni ?? []).reduce((acc, r) => acc * (1 - Number(r.percentuale) / 100), 1) * 100) / 100;
}

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** Valori già pronti per l'HTML: i testi sono sottoposti a escape, i blocchi sono HTML. */
export function costruisciVariabili({ ente, sinistro: s, checklist = [], valutazione: v, importo, polizza, relazione }: ContestoDocumento): Record<string, string> {
  const righeUfficio = (ente.ufficio ?? "Ufficio Sinistri").split(/\s[–-]\s/);
  const sede = [ente.indirizzo, [ente.cap, ente.citta].filter(Boolean).join(" ")].filter(Boolean).join(" - ");
  const dataOggi = esc(dataEstesa(new Date().toISOString()));
  const intestazioneTesto = `<div class="intestazione"><div><div class="ente">${esc(ente.nome)}</div><div class="ufficio">${righeUfficio.map(esc).join("<br/>")}</div></div><div class="meta">${esc(ente.citta ?? "")}, ${dataOggi}</div></div>`;
  const intestazioneLogo = `<div class="carta"><img class="logo" src="${ente.logo_data_url ?? ""}" alt="${esc(ente.nome)}"/></div><p class="data-luogo">${esc(ente.citta ?? "")}, ${dataOggi}</p>`;
  const piedeAutomatico = `<strong>${esc(ente.nome).toUpperCase()}</strong>${sede ? " - " + esc(sede) : ""}${ente.codice_fiscale ? " - C.F./P.IVA " + esc(ente.codice_fiscale) : ""}<br/>${esc([ente.email, ente.pec].filter(Boolean).join(" - "))}<br/>${esc([ente.telefono ? "tel. " + ente.telefono : "", ente.sito_web].filter(Boolean).join(" - "))}`;
  const stima = importo ?? stimaValutazione(v, s);
  const conPatrocinio = (s.patrocinatore ? `${s.richiedente_nome} c/o ${s.patrocinatore}` : s.richiedente_nome).toUpperCase();
  const descrizioneBreve = `${s.causa_presunta ? "danni " + (s.tipologia === "lesioni_persone" ? "alla persona" : "materiali") + " a causa di " + s.causa_presunta.toLowerCase() : s.descrizione}${s.targa ? " tg. " + s.targa.toUpperCase() : ""}`;
  const mancanti = checklist.filter((c) => !c.completata);
  const acquisiti = checklist.filter((c) => c.completata);
  const veicolo = !!s.targa || s.tipologia !== "lesioni_persone";

  return {
    oggi: esc(dataEstesa(new Date().toISOString())),
    "ente.nome": esc(ente.nome),
    "ente.citta": esc(ente.citta),
    "ente.ufficio": esc(ente.ufficio),
    "ente.responsabile": esc(ente.responsabile),
    "ente.email": esc(ente.email ?? ente.pec),
    "ente.pec": esc(ente.pec),
    "ente.telefono": esc(ente.telefono),
    "ente.indirizzo": esc(sede),
    "ente.codice_fiscale": esc(ente.codice_fiscale),
    "ente.sito_web": esc(ente.sito_web),
    "sinistro.numero": esc(s.numero_protocollo),
    "sinistro.protocollo_precedente": esc(s.protocollo_precedente || "____________"),
    "sinistro.flusso": esc(FLUSSI[s.flusso ?? "sir"]),
    "polizza.numero": esc(polizza?.numero),
    "polizza.nome": esc(polizza?.nome),
    "polizza.compagnia": esc(polizza?.compagnia),
    "relazione.tecnico": esc(relazione?.tecnico),
    "relazione.data": dataOggi,
    "relazione.natura_strada": nl(relazione?.natura_strada),
    "relazione.stato_luoghi": nl(relazione?.stato_luoghi),
    "relazione.nesso": nl(relazione?.nesso),
    "relazione.ripristini": nl(relazione?.ripristini),
    "relazione.conclusioni": nl(relazione?.conclusioni),
    "sinistro.data": esc(dataIt(s.data_sinistro)),
    "sinistro.ora": esc(s.ora_sinistro?.slice(0, 5)),
    "sinistro.mese": esc(s.data_sinistro ? MESI[Number(s.data_sinistro.slice(5, 7)) - 1] : ""),
    "sinistro.luogo": esc(s.luogo),
    "sinistro.descrizione": nl(s.descrizione),
    "sinistro.descrizione_breve": esc(descrizioneBreve),
    "sinistro.tipologia": esc(TIPOLOGIE[s.tipologia]),
    "sinistro.data_ricezione": esc(dataIt(s.data_ricezione)),
    "sinistro.ammontare_danno": esc(euro(s.importo_richiesto)),
    "sinistro.targa": esc(s.targa?.toUpperCase()),
    "sinistro.conducente": esc(s.conducente?.toUpperCase()),
    "sinistro.teste": esc(s.testimone),
    "sinistro.patrocinatore": esc(s.patrocinatore),
    "richiedente.nome": esc(s.richiedente_nome),
    "richiedente.con_patrocinio": esc(conPatrocinio),
    "richiedente.cf": esc(s.richiedente_cf?.toUpperCase() || "____________________"),
    "richiedente.indirizzo": nl(s.richiedente_indirizzo),
    "richiedente.recapito": esc(s.richiedente_pec ? "PEC " + s.richiedente_pec : s.richiedente_email),
    "valutazione.stima": esc(euro(stima)),
    "valutazione.stima_in_lettere": esc(stima != null ? importoInLettere(stima) : ""),
    "valutazione.imponibile": esc(euro(v?.importo_base ?? s.importo_richiesto)),
    "valutazione.iter_istruttorio": nl(v?.iter_istruttorio),
    "valutazione.relazione_tecnica": nl(v?.relazione_tecnica),
    "valutazione.verbale_autorita": nl(v?.verbale_autorita),
    "valutazione.punteggio": v ? `${v.punteggio} / ${v.punteggio_max}` : "",
    "valutazione.percentuale": v ? `${v.percentuale}%` : "",
    "valutazione.soglia": v ? `${v.soglia}%` : "",
    "valutazione.note": nl(v?.note),
    "frase.libretto": veicolo ? " e i documenti dell'auto (libretto di circolazione)" : "",
    "blocco.intestazione": ente.logo_data_url ? intestazioneLogo : intestazioneTesto,
    "blocco.firma": `<div class="firma"><div>${righeUfficio.map(esc).join("<br/>")}</div><div class="ruolo">(${esc(ente.responsabile ?? "Il Responsabile")})</div></div><div class="nota">Il documento è firmato digitalmente ai sensi del D.Lgs. 82/2005 s.m.i. e norme collegate e sostituisce il documento cartaceo e la firma autografa.</div>`,
    "blocco.piede": `<div class="piede">${ente.piede_pagina ? nl(ente.piede_pagina) : piedeAutomatico}</div>`,
    "blocco.documenti_acquisiti": acquisiti.length ? `<ul>${acquisiti.map((c) => `<li>${esc(c.titolo.toLowerCase())}${c.note ? " – " + esc(c.note) : ""}</li>`).join("")}</ul>` : "<p>—</p>",
    "blocco.documenti_mancanti": mancanti.length
      ? `<ul>${mancanti.map((c) => `<li>${esc(c.titolo)}${c.obbligatoria ? "" : " <em>(se disponibile)</em>"}${c.descrizione ? " — " + esc(c.descrizione) : ""}</li>`).join("")}</ul>`
      : "<p><em>Nessun documento mancante: la documentazione risulta completa.</em></p>",
    "blocco.criteri": v ? `<ul>${v.dettaglio.map((d) => `<li>${esc(d.etichetta.charAt(0).toLowerCase() + d.etichetta.slice(1))}: <strong>${esc(d.risposta)}</strong>${d.bloccante ? " <em>(elemento ostativo)</em>" : ""};</li>`).join("")}</ul>` : "",
    "blocco.riduzioni": v?.riduzioni?.length ? `<ul>${v.riduzioni.map((r) => `<li>si applica il ${r.percentuale}% in meno per ${esc(r.etichetta.charAt(0).toLowerCase() + r.etichetta.slice(1))};</li>`).join("")}</ul>` : "",
    "blocco.motivazioni": v?.motivazioni?.length ? `<ul>${v.motivazioni.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : "",
    "blocco.caselle_iban": `<table class="iban"><tr>${Array.from({ length: 27 }, () => "<td></td>").join("")}</tr></table>`,
  };
}

/** Toglie script, gestori di eventi e URL javascript: dai modelli scritti dagli utenti. */
export function sanifica(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, style, form").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) || a.name === "contenteditable") el.removeAttribute(a.name);
    }
  });
  return doc.body.firstElementChild?.innerHTML ?? "";
}

/** Sostituisce i campi; un blocco da solo in un paragrafo prende il posto del paragrafo. */
export function componi(html: string, variabili: Record<string, string>): string {
  const valore = (nome: string) => (nome in variabili ? variabili[nome] : `{{${nome}}}`);
  return sanifica(html)
    .replace(/<p[^>]*>\s*\{\{\s*(blocco\.[\w.]+)\s*\}\}\s*<\/p>/g, (_, nome) => valore(nome))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, nome) => valore(nome))
    .replace(/<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>/g, "");
}

export function campiSconosciuti(html: string): string[] {
  const noti = new Set(CAMPI.map((c) => c.nome));
  return [...new Set([...html.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).filter((n) => !noti.has(n)))];
}

// ---------------------------------------------------------------------------
// Dati di esempio per l'anteprima
// ---------------------------------------------------------------------------
export function contestoEsempio(ente: Ente): ContestoDocumento {
  const sinistro = {
    id: "esempio", ente_id: ente.id, anno: 2026, progressivo: 165, numero_protocollo: "0165/26", flusso: "sir", polizza_id: null, protocollo_precedente: "12345", richiesta_relazione_il: null, stato: "valutato", tipologia: "danni_cose",
    data_sinistro: "2026-09-07", ora_sinistro: "16:40:00", data_denuncia: "2026-09-10", data_ricezione: "2026-09-10",
    luogo: "Via Piana di Luco", lat: null, lng: null,
    descrizione: "Danni a pneumatico e cerchio a causa di una buca sulla carreggiata.", causa_presunta: "Una buca",
    richiedente_nome: "Mario Bianchi", richiedente_cf: "BNCMRA80A01L682X", richiedente_indirizzo: "Via Roma 10, 21100 Varese",
    richiedente_email: "mario.bianchi@example.com", richiedente_telefono: null, richiedente_pec: null,
    conducente: "Luigi Russo", targa: "FP464XF", patrocinatore: "Avv. Bruno Fedeli", testimone: "Anna Verdi",
    importo_richiesto: 354.1, importo_liquidato: null, esito: "da_liquidare", note: null, created_by: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as Sinistro;
  const voce = (titolo: string, completata: boolean, obbligatoria = true): ChecklistVoce => ({ id: titolo, sinistro_id: "esempio", ente_id: ente.id, titolo, descrizione: null, obbligatoria, completata, completata_il: null, note: null, ordine: 0 });
  const checklist = [voce("Modulo denuncia sinistro", true), voce("Libretto di circolazione del veicolo", true), voce("Verbale delle autorità", true, false), voce("Dichiarazione testimoniale", true, false), voce("Fotografie dei danni materiali", true), voce("Modulo privacy firmato", false)];
  const valutazione = {
    id: "esempio", sinistro_id: "esempio", ente_id: ente.id, risposte: {},
    dettaglio: [
      { codice: "competenza", etichetta: "Il settore tecnico ha confermato la competenza comunale", risposta: "Sì", punteggio: 20, punteggio_max: 20, bloccante: false },
      { codice: "evento", etichetta: "L'esistenza dell'anomalia e del danno è comprovata da", risposta: "Testimone e/o verbale delle autorità, con fotografie", punteggio: 25, punteggio_max: 25, bloccante: false },
      { codice: "polizia", etichetta: "È stata contattata o è intervenuta la Polizia Locale", risposta: "Sì", punteggio: 5, punteggio_max: 5, bloccante: false },
    ],
    punteggio: 90, punteggio_max: 100, percentuale: 90, soglia: ente.soglia_liquidazione, bloccata: false, esito: "da_liquidare",
    motivazioni: ["Natura dell'anomalia: visibile, segnalata o evitabile con il normale controllo del veicolo (art. 141 CdS)"],
    importo_proposto: 242, importo_base: 345.7, riduzioni: [{ etichetta: "Evitabilità del danno", percentuale: 30 }],
    iter_istruttorio: "L'esistenza della buca e del danno a causa della stessa è comprovata da fotografie e dichiarazione testimoniale. Siamo in pieno giorno (ora 16:40 del mese di settembre), buca sulla percorrenza, con una velocità media che è quella prevedibile per quel tratto di strada. Applichiamo esclusivamente il 30% in meno per evitabilità; riconosciamo solo uno pneumatico.",
    relazione_tecnica: "Il settore tecnico conferma la competenza comunale del tratto di strada e la presenza dell'anomalia alla data del sinistro.",
    verbale_autorita: "La Polizia Locale, contattata, non è intervenuta sul posto.",
    note: null, created_by: null, created_at: new Date().toISOString(),
  } as Valutazione;
  const polizza: Polizza = { id: "esempio", ente_id: ente.id, numero: "123456789", nome: "RCT/RCO Enti pubblici", compagnia: "Compagnia Assicurazioni S.p.A.", attiva: true, ordine: 0, created_at: new Date().toISOString() };
  const relazione: DatiRelazione = {
    tecnico: "Geom. Paolo Verdi",
    natura_strada: "La via è di proprietà comunale e in manutenzione dell'Area X.",
    stato_luoghi: "Sopralluogo del 12/09/2026: presenza di una buca di circa 40x30 cm e profondità 6 cm sulla corsia di marcia, non segnalata.",
    nesso: "La posizione dell'anomalia sulla traiettoria di marcia e la sua profondità sono compatibili con il danno lamentato allo pneumatico.",
    ripristini: "L'anomalia è stata ripristinata con conglomerato a freddo in data 14/09/2026.",
    conclusioni: "Si ritiene sussistente il nesso tra lo stato dei luoghi e l'evento; si rimette all'Ufficio Assicurazioni ogni valutazione sulla responsabilità.",
  };
  return { ente, sinistro, checklist, valutazione, polizza, relazione };
}
