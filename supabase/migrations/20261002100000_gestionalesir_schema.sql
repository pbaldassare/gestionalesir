-- Gestionale SIR — schema dedicato sul progetto Supabase condiviso (uanazxrxtzcuircypklo).
-- Tutte le tabelle vivono in `gestionalesir`; `auth.users` è in comune con le altre app.

create schema if not exists gestionalesir;

grant usage on schema gestionalesir to anon, authenticated, service_role;
alter default privileges in schema gestionalesir grant all on tables to anon, authenticated, service_role;
alter default privileges in schema gestionalesir grant all on functions to anon, authenticated, service_role;
alter default privileges in schema gestionalesir grant all on sequences to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enti (il primo è il Comune di Varese)
-- ---------------------------------------------------------------------------
create table gestionalesir.enti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'comune',
  codice_fiscale text,
  indirizzo text,
  cap text,
  citta text,
  provincia text,
  pec text,
  email text,
  telefono text,
  responsabile text,
  ufficio text default 'Ufficio Sinistri',
  compagnia_assicurativa text,
  numero_polizza text,
  franchigia numeric(12,2) default 0,
  soglia_liquidazione int not null default 60,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profili (admin senza ente, utenti legati a un ente)
-- ---------------------------------------------------------------------------
create table gestionalesir.profili (
  id uuid primary key references auth.users(id) on delete cascade,
  ente_id uuid references gestionalesir.enti(id) on delete set null,
  ruolo text not null check (ruolo in ('admin','utente')),
  nome_completo text not null,
  email text not null,
  attivo boolean not null default true,
  ultimo_accesso timestamptz,
  created_at timestamptz not null default now(),
  constraint profili_utente_con_ente check (ruolo = 'admin' or ente_id is not null)
);
create index on gestionalesir.profili (ente_id);

-- Funzioni helper (security definer: evitano la ricorsione nelle policy)
create or replace function gestionalesir.mio_ente()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select ente_id from gestionalesir.profili
  where id = (select auth.uid()) and attivo;
$$;

create or replace function gestionalesir.sono_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select ruolo = 'admin' and attivo from gestionalesir.profili where id = (select auth.uid())),
    false
  );
$$;

revoke execute on function gestionalesir.mio_ente(), gestionalesir.sono_admin() from public;
grant execute on function gestionalesir.mio_ente(), gestionalesir.sono_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sinistri
-- ---------------------------------------------------------------------------
create table gestionalesir.sinistri (
  id uuid primary key default gen_random_uuid(),
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  anno int not null default extract(year from now())::int,
  progressivo int not null default 0,
  numero_protocollo text not null default '',
  stato text not null default 'aperto'
    check (stato in ('aperto','istruttoria','valutato','liquidato','respinto','archiviato')),
  tipologia text not null default 'danni_cose'
    check (tipologia in ('danni_cose','lesioni_persone','misto')),
  data_sinistro date not null,
  ora_sinistro time,
  data_denuncia date not null default current_date,
  data_ricezione date not null default current_date,
  luogo text not null,
  descrizione text not null,
  causa_presunta text,
  richiedente_nome text not null,
  richiedente_cf text,
  richiedente_indirizzo text,
  richiedente_email text,
  richiedente_telefono text,
  richiedente_pec text,
  importo_richiesto numeric(12,2),
  importo_liquidato numeric(12,2),
  esito text check (esito in ('da_liquidare','non_liquidare')),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ente_id, anno, progressivo)
);
create index on gestionalesir.sinistri (ente_id);
create index on gestionalesir.sinistri (ente_id, stato);

-- Numero di protocollo progressivo per ente e anno: SIR-2026-0001
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
  new.numero_protocollo := 'SIR-' || new.anno || '-' || lpad(new.progressivo::text, 4, '0');
  return new;
end;
$$;

create trigger sinistri_protocollo
before insert on gestionalesir.sinistri
for each row execute function gestionalesir.assegna_protocollo();

create or replace function gestionalesir.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sinistri_touch
before update on gestionalesir.sinistri
for each row execute function gestionalesir.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Checklist: modelli per ente e voci per sinistro
-- ---------------------------------------------------------------------------
create table gestionalesir.checklist_modelli (
  id uuid primary key default gen_random_uuid(),
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  tipologia text check (tipologia in ('danni_cose','lesioni_persone','misto')),
  titolo text not null,
  descrizione text,
  obbligatoria boolean not null default true,
  ordine int not null default 0,
  attivo boolean not null default true
);
create index on gestionalesir.checklist_modelli (ente_id);

create table gestionalesir.checklist_voci (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references gestionalesir.sinistri(id) on delete cascade,
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  titolo text not null,
  descrizione text,
  obbligatoria boolean not null default true,
  completata boolean not null default false,
  completata_il timestamptz,
  note text,
  ordine int not null default 0
);
create index on gestionalesir.checklist_voci (sinistro_id);
create index on gestionalesir.checklist_voci (ente_id);

-- ---------------------------------------------------------------------------
-- Parametri di valutazione (configurabili per ente) e valutazioni
-- ---------------------------------------------------------------------------
-- tipo 'si_no'   → config: { punteggio_si, punteggio_no, bloccante_se: 'si'|'no'|null }
-- tipo 'numero'  → config: { operatore: '>='|'<=', soglia, punteggio_ok, punteggio_ko, bloccante_se_ko }
-- tipo 'scelta'  → config: { opzioni: [{ valore, etichetta, punteggio, bloccante }] }
create table gestionalesir.parametri_valutazione (
  id uuid primary key default gen_random_uuid(),
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  codice text not null,
  etichetta text not null,
  descrizione text,
  tipo text not null check (tipo in ('si_no','numero','scelta')),
  config jsonb not null default '{}'::jsonb,
  ordine int not null default 0,
  attivo boolean not null default true,
  unique (ente_id, codice)
);
create index on gestionalesir.parametri_valutazione (ente_id);

create table gestionalesir.valutazioni (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references gestionalesir.sinistri(id) on delete cascade,
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  risposte jsonb not null default '{}'::jsonb,
  dettaglio jsonb not null default '[]'::jsonb,
  punteggio numeric(8,2) not null default 0,
  punteggio_max numeric(8,2) not null default 0,
  percentuale numeric(5,2) not null default 0,
  soglia int not null default 60,
  bloccata boolean not null default false,
  esito text not null check (esito in ('da_liquidare','non_liquidare')),
  motivazioni jsonb not null default '[]'::jsonb,
  importo_proposto numeric(12,2),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on gestionalesir.valutazioni (sinistro_id);
create index on gestionalesir.valutazioni (ente_id);

-- ---------------------------------------------------------------------------
-- Documenti generati, allegati, eventi (timeline)
-- ---------------------------------------------------------------------------
create table gestionalesir.documenti (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references gestionalesir.sinistri(id) on delete cascade,
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  tipo text not null check (tipo in (
    'avvio_istruttoria','richiesta_integrazione','report_valutazione',
    'lettera_liquidazione','lettera_rigetto','altro')),
  titolo text not null,
  contenuto_html text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on gestionalesir.documenti (sinistro_id);
create index on gestionalesir.documenti (ente_id);

create table gestionalesir.allegati (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references gestionalesir.sinistri(id) on delete cascade,
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  checklist_voce_id uuid references gestionalesir.checklist_voci(id) on delete set null,
  nome_file text not null,
  storage_path text not null,
  mime text,
  dimensione bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on gestionalesir.allegati (sinistro_id);
create index on gestionalesir.allegati (ente_id);

create table gestionalesir.eventi (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references gestionalesir.sinistri(id) on delete cascade,
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  tipo text not null,
  descrizione text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on gestionalesir.eventi (sinistro_id);
create index on gestionalesir.eventi (ente_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table gestionalesir.enti enable row level security;
alter table gestionalesir.profili enable row level security;
alter table gestionalesir.sinistri enable row level security;
alter table gestionalesir.checklist_modelli enable row level security;
alter table gestionalesir.checklist_voci enable row level security;
alter table gestionalesir.parametri_valutazione enable row level security;
alter table gestionalesir.valutazioni enable row level security;
alter table gestionalesir.documenti enable row level security;
alter table gestionalesir.allegati enable row level security;
alter table gestionalesir.eventi enable row level security;

-- enti: l'admin li gestisce, l'utente vede e aggiorna solo il proprio
create policy enti_select on gestionalesir.enti for select to authenticated
  using (gestionalesir.sono_admin() or id = gestionalesir.mio_ente());
create policy enti_insert on gestionalesir.enti for insert to authenticated
  with check (gestionalesir.sono_admin());
create policy enti_update on gestionalesir.enti for update to authenticated
  using (gestionalesir.sono_admin() or id = gestionalesir.mio_ente())
  with check (gestionalesir.sono_admin() or id = gestionalesir.mio_ente());
create policy enti_delete on gestionalesir.enti for delete to authenticated
  using (gestionalesir.sono_admin());

-- profili: ognuno legge il proprio, l'admin li vede tutti e li modifica
create policy profili_select on gestionalesir.profili for select to authenticated
  using (id = (select auth.uid()) or gestionalesir.sono_admin());
create policy profili_update on gestionalesir.profili for update to authenticated
  using (gestionalesir.sono_admin())
  with check (gestionalesir.sono_admin());
-- insert/delete avvengono solo via edge function con service_role

-- tabelle di dominio: isolate per ente
do $$
declare t text;
begin
  foreach t in array array[
    'sinistri','checklist_modelli','checklist_voci','parametri_valutazione',
    'valutazioni','documenti','allegati','eventi'
  ] loop
    execute format('create policy %I_select on gestionalesir.%I for select to authenticated using (ente_id = gestionalesir.mio_ente())', t, t);
    execute format('create policy %I_insert on gestionalesir.%I for insert to authenticated with check (ente_id = gestionalesir.mio_ente())', t, t);
    execute format('create policy %I_update on gestionalesir.%I for update to authenticated using (ente_id = gestionalesir.mio_ente()) with check (ente_id = gestionalesir.mio_ente())', t, t);
    execute format('create policy %I_delete on gestionalesir.%I for delete to authenticated using (ente_id = gestionalesir.mio_ente())', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: bucket privato, path <ente_id>/<sinistro_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('gestionalesir', 'gestionalesir', false, 20971520)
on conflict (id) do nothing;

create policy gestionalesir_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'gestionalesir' and (storage.foldername(name))[1] = gestionalesir.mio_ente()::text);
create policy gestionalesir_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'gestionalesir' and (storage.foldername(name))[1] = gestionalesir.mio_ente()::text);
create policy gestionalesir_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'gestionalesir' and (storage.foldername(name))[1] = gestionalesir.mio_ente()::text);

-- ---------------------------------------------------------------------------
-- Gli utenti di questa app non devono finire in public.profiles (piattaforma broker)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
when (coalesce(new.raw_user_meta_data->>'app', '') <> 'gestionalesir')
execute function public.handle_new_user();
