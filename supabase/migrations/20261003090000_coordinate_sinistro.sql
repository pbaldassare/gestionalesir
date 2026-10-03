-- Posizione del sinistro scelta su Google Maps
alter table gestionalesir.sinistri
  add column if not exists lat double precision,
  add column if not exists lng double precision;
