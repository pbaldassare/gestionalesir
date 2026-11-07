-- Secondo flusso "in polizza", anagrafica polizze, numero interno di sinistro (0001/26),
-- carta intestata per ente, ruolo "tecnico" (Ufficio Strade) e richiesta/relazione tecnica.

-- ---------------------------------------------------------------------------
-- Enti: carta intestata
-- ---------------------------------------------------------------------------
alter table gestionalesir.enti
  add column if not exists logo_data_url text,
  add column if not exists piede_pagina text;

-- ---------------------------------------------------------------------------
-- Polizze (elenco semplice: numero e nome, scelte dal fascicolo in polizza)
-- ---------------------------------------------------------------------------
create table if not exists gestionalesir.polizze (
  id uuid primary key default gen_random_uuid(),
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  numero text not null,
  nome text not null,
  compagnia text,
  attiva boolean not null default true,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists polizze_ente_id_idx on gestionalesir.polizze (ente_id);
alter table gestionalesir.polizze enable row level security;

-- ---------------------------------------------------------------------------
-- Sinistri: flusso, polizza, numero interno, richiesta relazione tecnica
-- ---------------------------------------------------------------------------
alter table gestionalesir.sinistri
  add column if not exists flusso text not null default 'sir' check (flusso in ('sir','polizza')),
  add column if not exists polizza_id uuid references gestionalesir.polizze(id) on delete set null,
  add column if not exists protocollo_precedente text,
  add column if not exists richiesta_relazione_il timestamptz;
create index if not exists sinistri_polizza_id_idx on gestionalesir.sinistri (polizza_id);

-- Numero interno di sinistro nel formato NNNN/AA (es. 0001/26): proposto automaticamente, modificabile a mano.
alter table gestionalesir.sinistri drop constraint if exists sinistri_ente_id_anno_progressivo_key;
update gestionalesir.sinistri
set numero_protocollo = lpad(progressivo::text, 4, '0') || '/' || to_char(anno % 100, 'FM00')
where numero_protocollo !~ '^\d{4}/\d{2}$';
alter table gestionalesir.sinistri add constraint sinistri_numero_interno_unico unique (ente_id, numero_protocollo);

create or replace function gestionalesir.assegna_protocollo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  anno_ric int := extract(year from coalesce(new.data_ricezione, current_date))::int;
begin
  new.numero_protocollo := btrim(coalesce(new.numero_protocollo, ''));
  if tg_op = 'UPDATE' and new.numero_protocollo = '' then
    new.numero_protocollo := old.numero_protocollo;
  end if;
  if new.numero_protocollo = '' then
    new.anno := anno_ric;
    select coalesce(max(progressivo), 0) + 1 into new.progressivo
    from gestionalesir.sinistri
    where ente_id = new.ente_id and anno = new.anno and (tg_op = 'INSERT' or id <> new.id);
    new.numero_protocollo := lpad(new.progressivo::text, 4, '0') || '/' || to_char(new.anno % 100, 'FM00');
  elsif new.numero_protocollo ~ '^\d{1,4}/\d{2}$' then
    new.progressivo := split_part(new.numero_protocollo, '/', 1)::int;
    new.anno := 2000 + split_part(new.numero_protocollo, '/', 2)::int;
    new.numero_protocollo := lpad(new.progressivo::text, 4, '0') || '/' || split_part(new.numero_protocollo, '/', 2);
  elsif tg_op = 'INSERT' then
    new.anno := anno_ric;
    select coalesce(max(progressivo), 0) + 1 into new.progressivo
    from gestionalesir.sinistri where ente_id = new.ente_id and anno = new.anno;
  end if;
  return new;
end;
$$;

drop trigger if exists sinistri_protocollo on gestionalesir.sinistri;
create trigger sinistri_protocollo
before insert or update of numero_protocollo on gestionalesir.sinistri
for each row execute function gestionalesir.assegna_protocollo();

-- ---------------------------------------------------------------------------
-- Ruolo tecnico e nuovi tipi di documento
-- ---------------------------------------------------------------------------
alter table gestionalesir.profili drop constraint if exists profili_ruolo_check;
alter table gestionalesir.profili add constraint profili_ruolo_check check (ruolo in ('admin','utente','tecnico'));

create or replace function gestionalesir.mio_ruolo()
returns text
language sql stable security definer
set search_path = ''
as $$
  select ruolo from gestionalesir.profili where id = (select auth.uid()) and attivo;
$$;
revoke execute on function gestionalesir.mio_ruolo() from public;
grant execute on function gestionalesir.mio_ruolo() to authenticated, service_role;

alter table gestionalesir.documenti drop constraint if exists documenti_tipo_check;
alter table gestionalesir.documenti add constraint documenti_tipo_check check (tipo in (
  'avvio_istruttoria','richiesta_integrazione','richiesta_relazione_tecnica','relazione_tecnica',
  'scheda_danno','lettera_quietanza','atto_quietanza','lettera_rigetto',
  'report_valutazione','lettera_liquidazione','altro'));

alter table gestionalesir.modelli_documento drop constraint if exists modelli_documento_chiave_check;
alter table gestionalesir.modelli_documento add constraint modelli_documento_chiave_check check (chiave in (
  'avvio_istruttoria','richiesta_integrazione','richiesta_relazione_tecnica','relazione_tecnica',
  'scheda_danno','scheda_danno_rigetto','lettera_quietanza','atto_quietanza','lettera_rigetto'));

-- ---------------------------------------------------------------------------
-- RLS: l'utente dell'ufficio fa tutto nel proprio ente; il tecnico vede solo i sinistri
-- con richiesta di relazione inviata e può aggiungere relazione, allegati ed eventi.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sinistri','checklist_voci','valutazioni','documenti','allegati','eventi',
                           'checklist_modelli','parametri_valutazione','modelli_documento'] loop
    execute format('drop policy if exists %I_select on gestionalesir.%I', t, t);
    execute format('drop policy if exists %I_insert on gestionalesir.%I', t, t);
    execute format('drop policy if exists %I_update on gestionalesir.%I', t, t);
    execute format('drop policy if exists %I_delete on gestionalesir.%I', t, t);
  end loop;
end $$;

-- sinistri
create policy sinistri_select on gestionalesir.sinistri for select to authenticated
  using (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente' or richiesta_relazione_il is not null));
create policy sinistri_insert on gestionalesir.sinistri for insert to authenticated
  with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');
create policy sinistri_update on gestionalesir.sinistri for update to authenticated
  using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')
  with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');
create policy sinistri_delete on gestionalesir.sinistri for delete to authenticated
  using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');

-- tabelle figlie del sinistro: lettura se il sinistro è visibile
do $$
declare t text;
begin
  foreach t in array array['checklist_voci','valutazioni','documenti','allegati','eventi'] loop
    execute format($p$create policy %I_select on gestionalesir.%I for select to authenticated
      using (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente'
             or exists (select 1 from gestionalesir.sinistri s where s.id = %I.sinistro_id)))$p$, t, t, t);
    execute format($p$create policy %I_update on gestionalesir.%I for update to authenticated
      using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')
      with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')$p$, t, t);
  end loop;
  foreach t in array array['checklist_voci','valutazioni'] loop
    execute format($p$create policy %I_insert on gestionalesir.%I for insert to authenticated
      with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')$p$, t, t);
    execute format($p$create policy %I_delete on gestionalesir.%I for delete to authenticated
      using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')$p$, t, t);
  end loop;
end $$;

create policy eventi_insert on gestionalesir.eventi for insert to authenticated
  with check (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente'
    or (gestionalesir.mio_ruolo() = 'tecnico' and exists (select 1 from gestionalesir.sinistri s where s.id = eventi.sinistro_id))));
create policy eventi_delete on gestionalesir.eventi for delete to authenticated
  using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');

create policy documenti_insert on gestionalesir.documenti for insert to authenticated
  with check (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente'
    or (gestionalesir.mio_ruolo() = 'tecnico' and tipo = 'relazione_tecnica'
        and exists (select 1 from gestionalesir.sinistri s where s.id = documenti.sinistro_id))));
create policy documenti_delete on gestionalesir.documenti for delete to authenticated
  using (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente'
    or (gestionalesir.mio_ruolo() = 'tecnico' and tipo = 'relazione_tecnica' and created_by = (select auth.uid()))));

create policy allegati_insert on gestionalesir.allegati for insert to authenticated
  with check (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente'
    or (gestionalesir.mio_ruolo() = 'tecnico' and exists (select 1 from gestionalesir.sinistri s where s.id = allegati.sinistro_id))));
create policy allegati_delete on gestionalesir.allegati for delete to authenticated
  using (ente_id = gestionalesir.mio_ente() and (gestionalesir.mio_ruolo() = 'utente'
    or (gestionalesir.mio_ruolo() = 'tecnico' and created_by = (select auth.uid()))));

-- tabelle di configurazione: lettura per tutto l'ente, scrittura solo dell'ufficio
do $$
declare t text;
begin
  foreach t in array array['checklist_modelli','parametri_valutazione','modelli_documento','polizze'] loop
    execute format('create policy %I_select on gestionalesir.%I for select to authenticated using (ente_id = gestionalesir.mio_ente())', t, t);
    execute format($p$create policy %I_insert on gestionalesir.%I for insert to authenticated
      with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')$p$, t, t);
    execute format($p$create policy %I_update on gestionalesir.%I for update to authenticated
      using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')
      with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')$p$, t, t);
    execute format($p$create policy %I_delete on gestionalesir.%I for delete to authenticated
      using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')$p$, t, t);
  end loop;
end $$;

drop policy if exists enti_update on gestionalesir.enti;
create policy enti_update on gestionalesir.enti for update to authenticated
  using (gestionalesir.sono_admin() or (id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente'))
  with check (gestionalesir.sono_admin() or (id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente'));

-- ---------------------------------------------------------------------------
-- Comune di Varese: contatti come da carta intestata
-- ---------------------------------------------------------------------------
update gestionalesir.enti set email = 'assicurazioni@comune.varese.it'
where id = '0f3c2a6e-1a2b-4c3d-9e8f-000000000001';
