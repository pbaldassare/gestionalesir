export type Ruolo = "admin" | "utente";
export type Stato = "aperto" | "istruttoria" | "valutato" | "liquidato" | "respinto" | "archiviato";
export type Tipologia = "danni_cose" | "lesioni_persone" | "misto";
export type Esito = "da_liquidare" | "non_liquidare";
export type TipoParametro = "si_no" | "numero" | "scelta";
export type TipoDocumento =
  | "avvio_istruttoria"
  | "richiesta_integrazione"
  | "scheda_danno"
  | "lettera_quietanza"
  | "atto_quietanza"
  | "lettera_rigetto"
  | "report_valutazione"
  | "lettera_liquidazione"
  | "altro";

export interface Ente {
  id: string;
  nome: string;
  tipo: string;
  codice_fiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  pec: string | null;
  email: string | null;
  telefono: string | null;
  responsabile: string | null;
  ufficio: string | null;
  compagnia_assicurativa: string | null;
  numero_polizza: string | null;
  franchigia: number | null;
  sito_web: string | null;
  soglia_liquidazione: number;
  attivo: boolean;
  created_at: string;
}

export interface Profilo {
  id: string;
  ente_id: string | null;
  ruolo: Ruolo;
  nome_completo: string;
  email: string;
  attivo: boolean;
  ultimo_accesso: string | null;
  created_at: string;
}

export interface Sinistro {
  id: string;
  ente_id: string;
  anno: number;
  progressivo: number;
  numero_protocollo: string;
  stato: Stato;
  tipologia: Tipologia;
  data_sinistro: string;
  ora_sinistro: string | null;
  data_denuncia: string;
  data_ricezione: string;
  luogo: string;
  lat: number | null;
  lng: number | null;
  descrizione: string;
  causa_presunta: string | null;
  richiedente_nome: string;
  richiedente_cf: string | null;
  richiedente_indirizzo: string | null;
  richiedente_email: string | null;
  richiedente_telefono: string | null;
  richiedente_pec: string | null;
  conducente: string | null;
  targa: string | null;
  patrocinatore: string | null;
  testimone: string | null;
  importo_richiesto: number | null;
  importo_liquidato: number | null;
  esito: Esito | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistModello {
  id: string;
  ente_id: string;
  tipologia: Tipologia | null;
  titolo: string;
  descrizione: string | null;
  obbligatoria: boolean;
  ordine: number;
  attivo: boolean;
}

export interface ChecklistVoce {
  id: string;
  sinistro_id: string;
  ente_id: string;
  titolo: string;
  descrizione: string | null;
  obbligatoria: boolean;
  completata: boolean;
  completata_il: string | null;
  note: string | null;
  ordine: number;
}

export interface OpzioneScelta {
  valore: string;
  etichetta: string;
  punteggio: number;
  bloccante: boolean;
}

export interface ConfigParametro {
  punteggio_si?: number;
  punteggio_no?: number;
  bloccante_se?: "si" | "no" | null;
  operatore?: ">=" | "<=";
  soglia?: number;
  punteggio_ok?: number;
  punteggio_ko?: number;
  bloccante_se_ko?: boolean;
  opzioni?: OpzioneScelta[];
}

export interface Parametro {
  id: string;
  ente_id: string;
  codice: string;
  etichetta: string;
  descrizione: string | null;
  tipo: TipoParametro;
  config: ConfigParametro;
  ordine: number;
  attivo: boolean;
}

export interface DettaglioValutazione {
  codice: string;
  etichetta: string;
  risposta: string;
  punteggio: number;
  punteggio_max: number;
  bloccante: boolean;
}

export interface Valutazione {
  id: string;
  sinistro_id: string;
  ente_id: string;
  risposte: Record<string, string | number | boolean>;
  dettaglio: DettaglioValutazione[];
  punteggio: number;
  punteggio_max: number;
  percentuale: number;
  soglia: number;
  bloccata: boolean;
  esito: Esito;
  motivazioni: string[];
  importo_proposto: number | null;
  importo_base: number | null;
  riduzioni: Riduzione[];
  iter_istruttorio: string | null;
  relazione_tecnica: string | null;
  verbale_autorita: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Riduzione {
  etichetta: string;
  percentuale: number;
}

export interface Documento {
  id: string;
  sinistro_id: string;
  ente_id: string;
  tipo: TipoDocumento;
  titolo: string;
  contenuto_html: string;
  created_by: string | null;
  created_at: string;
}

export interface Allegato {
  id: string;
  sinistro_id: string;
  ente_id: string;
  checklist_voce_id: string | null;
  nome_file: string;
  storage_path: string;
  mime: string | null;
  dimensione: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Evento {
  id: string;
  sinistro_id: string;
  ente_id: string;
  tipo: string;
  descrizione: string;
  created_by: string | null;
  created_at: string;
}

export const STATI: Record<Stato, string> = {
  aperto: "Aperto",
  istruttoria: "In istruttoria",
  valutato: "Valutato",
  liquidato: "Liquidato",
  respinto: "Respinto",
  archiviato: "Archiviato",
};

export const TIPOLOGIE: Record<Tipologia, string> = {
  danni_cose: "Danni a cose",
  lesioni_persone: "Lesioni a persone",
  misto: "Danni a cose e persone",
};

export const TIPI_DOCUMENTO: Record<TipoDocumento, string> = {
  avvio_istruttoria: "Comunicazione di avvio istruttoria",
  richiesta_integrazione: "Richiesta di integrazione documentale",
  scheda_danno: "Scheda danno",
  lettera_quietanza: "Lettera di invio quietanza",
  atto_quietanza: "Atto di quietanza",
  lettera_rigetto: "Comunicazione di rigetto",
  report_valutazione: "Report di valutazione",
  lettera_liquidazione: "Proposta di liquidazione",
  altro: "Altro documento",
};
