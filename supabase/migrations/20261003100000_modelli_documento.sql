-- Modelli di documento personalizzabili per ente. Senza riga vale il modello predefinito nel codice.
create table gestionalesir.modelli_documento (
  id uuid primary key default gen_random_uuid(),
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  chiave text not null check (chiave in (
    'avvio_istruttoria','richiesta_integrazione','scheda_danno','scheda_danno_rigetto',
    'lettera_quietanza','atto_quietanza','lettera_rigetto')),
  contenuto_html text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (ente_id, chiave)
);
create index on gestionalesir.modelli_documento (ente_id);
alter table gestionalesir.modelli_documento enable row level security;

create policy modelli_documento_select on gestionalesir.modelli_documento for select to authenticated
  using (ente_id = gestionalesir.mio_ente());
create policy modelli_documento_insert on gestionalesir.modelli_documento for insert to authenticated
  with check (ente_id = gestionalesir.mio_ente());
create policy modelli_documento_update on gestionalesir.modelli_documento for update to authenticated
  using (ente_id = gestionalesir.mio_ente()) with check (ente_id = gestionalesir.mio_ente());
create policy modelli_documento_delete on gestionalesir.modelli_documento for delete to authenticated
  using (ente_id = gestionalesir.mio_ente());
