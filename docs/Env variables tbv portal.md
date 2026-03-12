# Env Variables tbv Portal

## Belangrijk

- Zet geen echte secrets of database-wachtwoorden in markdownbestanden of Git.
- Dit project heeft eerder database-credentials in plain text bevat. Behandel dat wachtwoord als gelekt en roteer het in Supabase.
- Bewaar echte secrets alleen in lokale `.env.local` bestanden, Supabase secrets of een password manager.

## Projectgegevens

- GitHub owner: `joriszwanenburg95-maker`
- GitHub repo: `Digidromen`
- Supabase projectnaam: `Digidromen`
- Supabase project ref: `oyxcwfozoxlgdclchden`

## Frontend env vars

Maak dit bestand aan:

- `portal/.env.local`

Inhoud:

```env
VITE_SUPABASE_URL=https://oyxcwfozoxlgdclchden.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Waar vind je deze waarden:

- `VITE_SUPABASE_URL`: Supabase Dashboard -> Project Settings -> API -> Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard -> Project Settings -> API -> anon / publishable key

## Backend / lokale tooling

Alleen lokaal gebruiken, niet committen:

```env
SUPABASE_DB_PASSWORD=<database-password>
SUPABASE_ACCESS_TOKEN=<optioneel-voor-cli-of-ci>
DATABASE_URL=<alleen-toevoegen-als-backend-tooling-dit-echt-gebruikt>
DIRECT_URL=<alleen-toevoegen-als-backend-tooling-dit-echt-gebruikt>
```

Opmerking:

- Voeg `DATABASE_URL` en `DIRECT_URL` pas toe zodra de backend of migratietooling daar echt om vraagt.
- Gebruik de connection strings uit Supabase Dashboard direct, zonder handmatige spaties of aanpassingen.
- Als het wachtwoord speciale tekens bevat, gebruik dan exact de versie die Supabase toont of URL-encode het wachtwoord correct.

## Supabase CLI setup

1. Installeer de CLI:
   `brew install supabase/tap/supabase`
2. Log in:
   `supabase login`
3. Controleer dat je in het juiste account zit:
   `supabase projects list`
4. Link deze repo aan het project:
   `cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"`
   `supabase link --project-ref oyxcwfozoxlgdclchden`

## Wat niet in dit document moet staan

- Direct connection string
- Transaction pooler string
- Session pooler string
- Database password
- Service role key
- Toekomstige CRM API keys

Deze horen in:

- lokale `.env.local`
- Supabase secrets
- password manager

## Aanbevolen lokale bestanden

- `portal/.env.local` voor frontend vars
- eventueel later `supabase/.env` of een niet-gecommit lokaal backend env-bestand als backend tooling dat nodig heeft

## Resterende human tasks

1. Roteer het huidige Supabase database-wachtwoord omdat het eerder in plain text in docs heeft gestaan.
2. Controleer met `supabase projects list` dat je bent ingelogd op het juiste Supabase account voor project `Digidromen`.
3. Link de lokale repo met `supabase link --project-ref oyxcwfozoxlgdclchden`.
4. Maak `portal/.env.local` aan met `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`.
5. Maak in Supabase testgebruikers aan voor:
   - admin
   - digidromen staff
   - hulporganisatie
   - servicepartner
6. Bevestig welke backend-tooling gebruikt gaat worden voor migraties en seeds, zodat duidelijk is of `DATABASE_URL` en `DIRECT_URL` echt nodig zijn.
7. Zodra fase 1 start: bepaal of documenten via Supabase Storage in hetzelfde project komen of dat daar nog een aparte storage-keuze voor nodig is.

## Niet nu doen

- Nog geen CRM secrets toevoegen
- Nog geen CRM vendor kiezen
- Nog geen webhook-URLs vastleggen

CRM is voorlopig geparkeerd, maar de portal moet wel volledig werkend worden op Supabase.
