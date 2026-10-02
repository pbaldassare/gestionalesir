-- Seed: Comune di Varese con checklist e parametri di valutazione iniziali.
-- I parametri sono segnaposto ragionevoli: vanno sostituiti con quelli reali dalla pagina Impostazioni.

insert into gestionalesir.enti (id, nome, tipo, codice_fiscale, indirizzo, cap, citta, provincia, pec, responsabile, ufficio, soglia_liquidazione)
values (
  '0f3c2a6e-1a2b-4c3d-9e8f-000000000001',
  'Comune di Varese', 'comune', '00441340122',
  'Via Sacco 5', '21100', 'Varese', 'VA',
  'protocollo@comune.varese.legalmailpa.it',
  'Responsabile Ufficio Sinistri', 'Ufficio Sinistri e Assicurazioni', 60
);

insert into gestionalesir.checklist_modelli (ente_id, tipologia, titolo, descrizione, obbligatoria, ordine) values
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Istanza di risarcimento firmata', 'Richiesta scritta del danneggiato con descrizione del fatto e quantificazione del danno', true, 10),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Documento di identità del richiedente', 'Copia fronte/retro in corso di validità', true, 20),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Codice fiscale', null, true, 30),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Fotografie del luogo del sinistro', 'Con riferimenti che permettano di identificare il punto esatto', true, 40),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Fotografie del danno', null, true, 50),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Verbale o rapporto della Polizia Locale', 'Se intervenuta sul posto', false, 60),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Dichiarazioni dei testimoni', 'Con generalità e recapiti', false, 70),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Relazione dell''ufficio tecnico', 'Sopralluogo e stato dei luoghi', true, 80),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'danni_cose', 'Preventivo o fattura di riparazione', null, true, 90),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'danni_cose', 'Libretto di circolazione o titolo di proprietà del bene', null, true, 100),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'lesioni_persone', 'Referto di Pronto Soccorso', null, true, 110),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'lesioni_persone', 'Certificati medici e spese sanitarie', null, true, 120),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'misto', 'Preventivo o fattura di riparazione', null, true, 90),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'misto', 'Referto di Pronto Soccorso', null, true, 110),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Coordinate IBAN per l''eventuale liquidazione', null, false, 130);

insert into gestionalesir.parametri_valutazione (ente_id, codice, etichetta, descrizione, tipo, config, ordine) values
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'competenza', 'Il luogo del sinistro è di competenza dell''Ente',
   'Strada, marciapiede, area o immobile in proprietà o custodia del Comune', 'si_no',
   '{"punteggio_si": 20, "punteggio_no": 0, "bloccante_se": "no"}', 10),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'termini', 'Denuncia presentata entro i termini',
   'Istanza pervenuta entro il termine previsto dal regolamento', 'si_no',
   '{"punteggio_si": 10, "punteggio_no": 0, "bloccante_se": "no"}', 20),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'nesso_causale', 'Nesso causale documentato',
   'Il danno è riconducibile con evidenza all''insidia segnalata', 'scelta',
   '{"opzioni": [
      {"valore": "provato", "etichetta": "Provato (foto, verbale, testimoni)", "punteggio": 25, "bloccante": false},
      {"valore": "plausibile", "etichetta": "Plausibile ma non pienamente documentato", "punteggio": 12, "bloccante": false},
      {"valore": "assente", "etichetta": "Assente o contraddittorio", "punteggio": 0, "bloccante": true}
    ]}', 30),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'insidia', 'Insidia non visibile né prevedibile',
   'Il pericolo non era segnalato e non era evitabile con l''ordinaria diligenza', 'si_no',
   '{"punteggio_si": 15, "punteggio_no": 0, "bloccante_se": null}', 40),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'concorso_colpa', 'Concorso di colpa del danneggiato',
   'Velocità, distrazione, attraversamento improprio, uso improprio del bene', 'scelta',
   '{"opzioni": [
      {"valore": "nessuno", "etichetta": "Nessuno", "punteggio": 15, "bloccante": false},
      {"valore": "parziale", "etichetta": "Parziale", "punteggio": 7, "bloccante": false},
      {"valore": "prevalente", "etichetta": "Prevalente o esclusivo", "punteggio": 0, "bloccante": true}
    ]}', 50),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'documentazione', 'Documentazione della checklist completa',
   'Tutte le voci obbligatorie risultano acquisite', 'si_no',
   '{"punteggio_si": 10, "punteggio_no": 0, "bloccante_se": null}', 60),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'importo', 'Importo richiesto congruo',
   'Importo entro la soglia oltre la quale è necessaria perizia o il coinvolgimento della compagnia', 'numero',
   '{"operatore": "<=", "soglia": 5000, "punteggio_ok": 5, "punteggio_ko": 0, "bloccante_se_ko": false}', 70);
