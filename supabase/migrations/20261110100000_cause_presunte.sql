-- Cause presunte: elenco per ente, gestito da Impostazioni e scelto nel modulo del sinistro.
-- sinistri.causa_presunta resta testo libero (copia del nome), così i sinistri già registrati e i documenti non cambiano.
create table if not exists gestionalesir.cause_presunte (
  id uuid primary key default gen_random_uuid(),
  ente_id uuid not null references gestionalesir.enti(id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  ordine int not null default 0,
  created_at timestamptz not null default now(),
  unique (ente_id, nome)
);
create index if not exists cause_presunte_ente_id_idx on gestionalesir.cause_presunte (ente_id);
alter table gestionalesir.cause_presunte enable row level security;
grant all on gestionalesir.cause_presunte to authenticated, service_role;

-- come le altre tabelle di configurazione: lettura per tutto l'ente, scrittura solo dell'ufficio
create policy cause_presunte_select on gestionalesir.cause_presunte for select to authenticated
  using (ente_id = gestionalesir.mio_ente());
create policy cause_presunte_insert on gestionalesir.cause_presunte for insert to authenticated
  with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');
create policy cause_presunte_update on gestionalesir.cause_presunte for update to authenticated
  using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente')
  with check (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');
create policy cause_presunte_delete on gestionalesir.cause_presunte for delete to authenticated
  using (ente_id = gestionalesir.mio_ente() and gestionalesir.mio_ruolo() = 'utente');

-- prime tre cause per ogni ente esistente
insert into gestionalesir.cause_presunte (ente_id, nome, ordine)
select e.id, c.nome, c.ordine
from gestionalesir.enti e
cross join (values ('Buca in strada', 10), ('Tombino', 20), ('Albero in strada', 30)) as c(nome, ordine)
on conflict (ente_id, nome) do nothing;
