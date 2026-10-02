-- Adeguamento ai modelli reali del Comune di Varese (scheda danno, lettera invio quietanza, atto di quietanza).

alter table gestionalesir.enti add column if not exists sito_web text;

alter table gestionalesir.sinistri
  add column if not exists conducente text,
  add column if not exists targa text,
  add column if not exists patrocinatore text,
  add column if not exists testimone text;

alter table gestionalesir.valutazioni
  add column if not exists iter_istruttorio text,
  add column if not exists relazione_tecnica text,
  add column if not exists verbale_autorita text,
  add column if not exists importo_base numeric(12,2),
  add column if not exists riduzioni jsonb not null default '[]'::jsonb;

alter table gestionalesir.documenti drop constraint if exists documenti_tipo_check;
alter table gestionalesir.documenti add constraint documenti_tipo_check check (tipo in (
  'avvio_istruttoria','richiesta_integrazione','scheda_danno','lettera_quietanza','atto_quietanza',
  'lettera_rigetto','report_valutazione','lettera_liquidazione','altro'));

-- Numero di pratica nel formato usato dall'ufficio: AA/NNN (es. 23/165)
create or replace function gestionalesir.assegna_protocollo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.anno := extract(year from coalesce(new.data_ricezione, current_date))::int;
  select coalesce(max(progressivo), 0) + 1 into new.progressivo
  from gestionalesir.sinistri
  where ente_id = new.ente_id and anno = new.anno;
  new.numero_protocollo := to_char(new.anno % 100, 'FM00') || '/' || lpad(new.progressivo::text, 3, '0');
  return new;
end;
$$;

update gestionalesir.sinistri
set numero_protocollo = to_char(anno % 100, 'FM00') || '/' || lpad(progressivo::text, 3, '0');

-- Intestazione reale del Comune di Varese
update gestionalesir.enti set
  ufficio = 'Attività Valorizzazione e Amministrazione del Patrimonio – Ufficio Assicurazioni',
  responsabile = 'Fabiola Riganti',
  email = 'protocollo.generale@comune.varese.it',
  pec = 'protocollo@comune.varese.legalmail.it',
  telefono = '0332 255.362',
  sito_web = 'www.comune.varese.it'
where id = '0f3c2a6e-1a2b-4c3d-9e8f-000000000001';

-- Checklist come da "Nel corso dell'istruttoria risultava possibile acquisire"
delete from gestionalesir.checklist_modelli where ente_id = '0f3c2a6e-1a2b-4c3d-9e8f-000000000001';
insert into gestionalesir.checklist_modelli (ente_id, tipologia, titolo, descrizione, obbligatoria, ordine) values
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Modulo denuncia sinistro', 'Compilato e firmato dal danneggiato o dal patrocinatore', true, 10),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Documento d''identità e codice fiscale del firmatario', null, true, 20),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Modulo privacy firmato', null, true, 30),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Fattura, scontrino o preventivo del danno', 'Ammontare imponibile del danno', true, 40),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Fotografie dei danni materiali', null, true, 50),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Fotografie del luogo e dell''anomalia', null, true, 60),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Relazione del settore tecnico', 'Competenza comunale e stato dei luoghi', true, 70),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Verbale delle autorità', 'Polizia Locale o altre forze dell''ordine, se intervenute', false, 80),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Dichiarazione testimoniale', 'Con generalità e recapiti del teste', false, 90),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', null, 'Delega o mandato del patrocinatore', 'Se presente un legale o uno studio di infortunistica', false, 100),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'danni_cose', 'Libretto di circolazione del veicolo', 'Per danni a veicoli', true, 110),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'misto', 'Libretto di circolazione del veicolo', 'Per danni a veicoli', true, 110),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'lesioni_persone', 'Referto di Pronto Soccorso', null, true, 120),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'lesioni_persone', 'Certificati medici e spese sanitarie', null, true, 130),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'misto', 'Referto di Pronto Soccorso', null, true, 120);

-- Parametri di valutazione ricavati dalle schede danno (accoglimento e rigetto)
delete from gestionalesir.parametri_valutazione where ente_id = '0f3c2a6e-1a2b-4c3d-9e8f-000000000001';
insert into gestionalesir.parametri_valutazione (ente_id, codice, etichetta, descrizione, tipo, config, ordine) values
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'competenza', 'Il settore tecnico ha confermato la competenza comunale',
   'Strada, marciapiede o area in proprietà o manutenzione del Comune', 'si_no',
   '{"punteggio_si": 20, "punteggio_no": 0, "bloccante_se": "no"}', 10),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'evento_comprovato', 'L''esistenza dell''anomalia e del danno è comprovata da',
   'Riscontri acquisiti nel corso dell''istruttoria', 'scelta',
   '{"opzioni": [
      {"valore": "teste_verbale_foto", "etichetta": "Testimone e/o verbale delle autorità, con fotografie", "punteggio": 25, "bloccante": false},
      {"valore": "solo_foto", "etichetta": "Solo fotografie prodotte dalla controparte", "punteggio": 12, "bloccante": false},
      {"valore": "nessuno", "etichetta": "Nessun riscontro oggettivo", "punteggio": 0, "bloccante": true}
    ]}', 20),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'insidia', 'Natura dell''anomalia',
   'Visibilità, segnaletica, posizione rispetto al percorso dei pneumatici, limite di velocità (art. 141 CdS)', 'scelta',
   '{"opzioni": [
      {"valore": "insidia", "etichetta": "Insidia non visibile né prevedibile con l''ordinaria diligenza", "punteggio": 20, "bloccante": false},
      {"valore": "visibile_obbligata", "etichetta": "Anomalia visibile ma su percorso obbligato o in condizioni di scarsa visibilità", "punteggio": 10, "bloccante": false},
      {"valore": "evitabile", "etichetta": "Anomalia visibile, segnalata o evitabile con il normale controllo del veicolo (art. 141 CdS)", "punteggio": 0, "bloccante": true}
    ]}', 30),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'condotta', 'Velocità e condotta del conducente adeguate al tratto di strada',
   'Ora, luce, limite vigente e andamento della strada', 'si_no',
   '{"punteggio_si": 10, "punteggio_no": 0, "bloccante_se": null}', 40),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'polizia', 'È stata contattata o è intervenuta la Polizia Locale',
   null, 'si_no',
   '{"punteggio_si": 5, "punteggio_no": 0, "bloccante_se": null}', 50),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'documentazione', 'Documentazione acquisita completa',
   'Tutte le voci obbligatorie della checklist risultano acquisite', 'si_no',
   '{"punteggio_si": 10, "punteggio_no": 0, "bloccante_se": null}', 60),
  ('0f3c2a6e-1a2b-4c3d-9e8f-000000000001', 'importo', 'Danno documentato da fattura, scontrino o preventivo e importo congruo',
   'Imponibile coerente con i beni danneggiati e con la dinamica', 'si_no',
   '{"punteggio_si": 10, "punteggio_no": 0, "bloccante_se": null}', 70);
