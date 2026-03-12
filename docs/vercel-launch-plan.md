# Vercel Launch Plan

## Doel

De portal snel beschikbaar maken via Vercel, terwijl Supabase de bron blijft voor auth en data.

## Fase 1 - Preview live zetten

1. Koppel het juiste Vercel-project aan deze repo of map `portal/`.
2. Stel als root directory `portal` in.
3. Voeg deze env vars toe in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Maak een preview deployment.
5. Test preview op:
   - login
   - dashboard
   - order flow
   - repair flow
   - donation flow
   - Excel export

## Fase 2 - Operationele hardening

1. Controleer of login en reads werken zonder lokale demo-state.
2. Controleer of writes terugkomen in Supabase:
   - orders
   - repairs
   - donations
   - messages
   - documents
3. Controleer roltoegang:
   - Pauline als staff
   - Karin als admin
   - Joris als admin
4. Loop de CRM-pagina na als voorbereid scherm, niet als live integratie.

## Fase 3 - Eerste productiegang

1. Pas copy en navigatie aan waar nog demo-termen zichtbaar zijn.
2. Bevestig of demo-seeddata nog moet blijven staan.
3. Maak pas daarna een production deployment in Vercel.

## Belangrijke keuze voor nu

- Eerst preview valideren.
- Geen CRM-koppeling live zetten.
- Portal moet zelfstandig werken op Supabase.
- Excel-export hoort al in deze fase bruikbaar te zijn.
