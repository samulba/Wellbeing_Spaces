# Supabase Migrations

## Struktur

```
supabase/migrations/
├── applied/        ← Bereits in Production (Supabase) eingespielt — historisches Archiv
├── *.sql           ← Offene Migrationen, die noch im Supabase SQL-Editor ausgeführt werden müssen
└── README.md
```

## Workflow

1. **Neue Migration anlegen** — direkt in `supabase/migrations/` als `<nr>_<name>.sql`.
   Die Nummer fortlaufend hochzählen (zuletzt 122 — nächste also 123).
2. **In Supabase ausführen** — Datei in den SQL-Editor von Supabase kopieren und ausführen.
3. **Markieren als angewandt** — Datei nach `supabase/migrations/applied/` verschieben (`git mv`).
   So sieht man in GitHub auf einen Blick, welche Migrationen offen sind: alle Dateien direkt
   in `supabase/migrations/` (außer dieser README) sind noch ungeprüft.

## Trade-offs

- **Vorteil:** Visuelle Klarheit, kein Suchen in CLAUDE.md.
- **Hinweis:** Für ein vollständiges DB-Replay (z.B. neue Dev-Umgebung mit `supabase db reset`)
  müssen die Dateien aus `applied/` zurück nach `supabase/migrations/` verschoben werden.
  Da wir bisher Migrationen manuell über den Supabase SQL-Editor einspielen, ist das in der
  Praxis kein Problem.

## Aktueller Stand

- **Letzte angewandte Migration:** 122 (Heilung — verwaiste Alternative-Auswahl-Blöcke erben wieder ihren Bereich).
- **Offene Migrationen:** keine.
