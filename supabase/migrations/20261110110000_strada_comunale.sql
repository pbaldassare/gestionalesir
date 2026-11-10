-- Flag sul luogo del sinistro: la strada è di proprietà del Comune?
alter table gestionalesir.sinistri add column if not exists strada_comunale boolean not null default false;
