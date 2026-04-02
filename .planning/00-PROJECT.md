# Digidromen Portal — Project Overzicht

## Wat is Digidromen?
Digidromen verstrekt refurbished laptops aan kinderen uit gezinnen met beperkte middelen. Het portal is het centrale digitale knooppunt voor hulporganisaties (aanvragers), Digidromen-medewerkers (regie) en servicepartners zoals Aces Direct (uitvoering: refurbishing, voorraad, reparaties en logistiek).

## Huidige Stack
- **Frontend**: Vite 6 + React 18 SPA, React Router v7, Tailwind CSS 4.2, Lucide icons
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **Deployment**: Vercel (framework: vite)
- **GitHub**: Account `joriszwanenburg95-maker`
- **Supabase Project**: `oyxcwfozoxlgdclchden` (oyxcwfozoxlgdclchden.supabase.co)
- **Vercel Project**: `digidromen` (prj_LBxwTADV6A0COItPTCubcwF4XJVe, team_7f5GvqVpnIcRnHDJgsuPSr6s)

## Doel van het Herontwerp
Volledige herontwerp van het Supply, Service & Administratie Portal op basis van het PRD. Het portaal moet alle huidige Excel-administraties vervangen en HubSpot als CRM integreren.

## Architectuurbeslissingen

| Beslissing | Keuze | Reden |
|---|---|---|
| Framework | Blijf bij Vite + React SPA | Werkende app, migratie naar Next.js kost weken zonder functionele winst |
| API-laag | Supabase Edge Functions | Al 1 werkende functie, webhook-support, service-role key |
| Auth | Supabase Magic Link (passwordless) | Geen wachtwoordbeheer, veiliger, gebruiksvriendelijker |
| CRM | HubSpot via outbox-pattern + Edge Functions | v1 outbound-only, portal blijft operationeel leidend |
| File storage | Supabase Storage | Al geconfigureerd, RLS, signed URLs |
| DB migraties | Additief (geen destructieve changes) | Bestaande data behouden |

## Rolmapping

| PRD Rol | DB Rol (bestaand) | Portaltoegang |
|---|---|---|
| Aanvrager (Klant/Org) | `help_org` | Ja |
| Platform Beheerder | `digidromen_admin` + `digidromen_staff` | Ja |
| Verwerker (Warehouse) | `service_partner` | Ja |
| Donateur | `organization.type = sponsor`, geen portal-login | Nee |

## v1 Scopekeuzes

Deze keuzes begrenzen het eerste gebruik en voorkomen dat operationele bottlenecks open blijven:

- **Bestelvenster**: v1 ondersteunt precies één actief maandvensterbeleid via configuratie; orders buiten venster worden geblokkeerd.
- **Donoren**: donoren bestaan operationeel in het portal als organisatie zonder login; HubSpot synct outbound mee maar is niet leidend voor intake.
- **Aces integratie**: v1 werkt zonder directe Blancco-koppeling; Aces uploadt rapportage/certificaten verplicht bij afronding.
- **Rapportages**: v1 levert één minimale maandrapportage die de bestaande Excel vervangt; uitgebreide BI of meerdere rapportsoorten zijn fase 2.
- **Adresinvoer**: handmatige invoer is altijd beschikbaar; postcode/huisnummer lookup is optioneel en geen blocker voor livegang.

## Planbestanden

| Bestand | Beschrijving |
|---|---|
| `00-PROJECT.md` | Dit bestand — projectoverzicht |
| `01-ARCHITECTURE.md` | Technische architectuur, datamodel, integraties |
| `02-DATABASE-MIGRATIONS.md` | Alle SQL migraties in volgorde |
| `03-AUTH-MAGIC-LINK.md` | Magic Link authenticatie implementatie |
| `04-EDGE-FUNCTIONS.md` | Supabase Edge Functions (API layer) |
| `05-HUBSPOT-INTEGRATION.md` | CRM bi-directionele sync |
| `06-FRONTEND-REDESIGN.md` | Frontend pagina's en componenten |
| `07-VERCEL-SUPABASE-CONFIG.md` | Deployment, env vars, infra |
| `08-EXECUTION-ORDER.md` | GSD-fases en uitvoeringsvolgorde |
