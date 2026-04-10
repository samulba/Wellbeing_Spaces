-- Einstellungen-Tabelle (Key-Value-Store für App-Konfiguration)
create table if not exists einstellungen (
  schluessel text primary key,
  wert       text not null,
  updated_at timestamptz not null default now()
);

-- RLS aktivieren (nur authentifizierte Nutzer)
alter table einstellungen enable row level security;

create policy "Einstellungen lesen" on einstellungen
  for select using (auth.role() = 'authenticated');

create policy "Einstellungen schreiben" on einstellungen
  for all using (auth.role() = 'authenticated');

-- Standardwerte
insert into einstellungen (schluessel, wert) values
  ('app_name',          'Studio'),
  ('mwst_satz',         '19'),
  ('produktkategorien', 'Möbel,Leuchten,Textilien,Accessoires,Pflanzen,Sonstiges')
on conflict (schluessel) do nothing;
