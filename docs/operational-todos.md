# Operational Todo's

## Nu nog doen

1. Controleer of de drie loginaccounts kunnen inloggen:
   - `pauline@digidromen.nl`
   - `karin@digidromen.nl`
   - `joris.zwanenburg@eyeti.nl`
   Wachtwoord: `test123`
2. Test de kernflows live:
   - login
   - order aanmaken
   - reparatie aanmaken
   - donatie aanmaken
   - statusupdate op detailpagina
   - Excel-export vanuit rapportages
3. Voeg in Vercel de frontend env vars toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy eerst als preview en test live login tegen Supabase.
5. Controleer of `user_profiles` en Auth-users automatisch aan elkaar gekoppeld zijn via e-mailadres.

## Kort daarna

1. Vervang demo-copy in de UI waar nog "demo" staat door productiecopy.
2. Zet een vaste lijst testcases uit voor staff/admin login.
3. Beslis of `org-servicepartner` en de seed-helporgs in de eerste live versie blijven of via cleanup-script weg kunnen.
4. Maak een eerste back-up/exportmoment van Supabase na live validatie.

## Demo-data later verwijderen

- Gebruik [cleanup_demo_data.sql](/Users/joris/Documents/Code%20projecten/Werk/Digidromen/supabase/cleanup_demo_data.sql) zodra je van seed/demo-data naar echte operationele data wilt gaan.
- De drie portal-users voor Pauline, Karin en Joris blijven buiten die cleanup staan.
