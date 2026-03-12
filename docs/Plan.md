# Digidromen Portal - Productieplan

## Doel

Eerst een volledig werkende portal opleveren met een echte backend en frontend die operationeel inzetbaar is voor intern gebruik. De CRM-koppeling gaat nu uit de kritieke route. We bereiden die technisch wel voor, zodat een latere integratie geen grote herbouw vraagt.

## Besluit

- `docs/Plan.md` is de enige actieve bron van waarheid voor de roadmap.
- CRM-integratie is voorlopig `niet in live scope`.
- CRM-voorbereiding blijft `wel` in scope:
  - datamodel en IDs reserveren
  - adaptergrenzen definiëren
  - sync-jobs alleen voorbereiden waar dat architectonisch nuttig is
  - UI markeren als "nog niet gekoppeld"
- Prioriteit is:
  1. Werkende backend
  2. Werkende frontend op echte data
  3. Auth, rollen en operationele workflows
  4. CRM-ready uitbreidbaarheid zonder actieve integratie

## Gewenste eindsituatie

De portal moet zonder CRM al bruikbaar zijn voor:

- Inloggen met echte gebruikersrollen
- Orders aanmaken, bekijken en opvolgen
- Reparaties registreren en status beheren
- Donaties registreren en verwerken
- Voorraad beheren
- Documenten opslaan
- Meldingen en workflow-events tonen
- Basisrapportages tonen op echte backenddata

## Buiten scope voor nu

- Live two-way CRM sync
- Webhooks vanuit een CRM
- CRM-specifieke adapters voor HubSpot, Odoo, Zoho of Xapti
- Productiekeuze voor CRM
- Complex conflict management tussen portal en CRM

## Architectuurkeuze

### Backend

- Supabase voor:
  - PostgreSQL
  - Auth
  - Storage
  - optioneel later Edge Functions
- `src/contracts/` blijft de functionele source of truth voor domeinregels en workflowlogica.

### Frontend

- Bestaande portal-UI blijft leidend.
- Geen redesign; alleen functionele aanpassingen om van demo/localStorage naar backenddata te gaan.

### CRM voorbereiding

- Voorzie tabellen en types van optionele CRM-referentievelden waar logisch.
- Houd een duidelijke integratielaag vrij voor later gebruik:
  - `crm_adapter`
  - `crm_reference`
  - `crm_sync_jobs` alleen als voorbereidende queue, niet als live feature
- Voeg een eenvoudige feature flag of configuratiepad toe zodat CRM-functionaliteit expliciet uit staat.

## Fasering

## Fase 0 - Setup en randvoorwaarden

### Human tasks

1. Maak een Supabase project aan.
2. Installeer en link de Supabase CLI lokaal.
3. Voeg frontend env vars toe voor Supabase.
4. Maak testgebruikers aan voor:
   - admin
   - digidromen staff
   - hulporganisatie
   - servicepartner

### Resultaat

- Werkende projectkoppeling met Supabase
- Credentials lokaal beschikbaar
- Testaccounts klaar

## Fase 1 - Datamodel en backendfundament

### Doel

Het volledige portal-domein op PostgreSQL krijgen, inclusief rollen, relaties en workflowdata.

### Scope

- Migraties voor:
  - organizations
  - user_profiles
  - products
  - inventory_items
  - orders
  - order_lines
  - repair_cases
  - donation_batches
  - workflow_events
  - messages
  - documents
  - notifications
- CRM-ready voorbereiding:
  - optionele `crm_id` of referentievelden waar relevant
  - voorbereidende `crm_sync_jobs` tabel mag bestaan, maar hoeft nog niets actief te doen
- Timestamps, foreign keys en enums
- SQL seed of seed-mechanisme op basis van bestaande demo data

### Acceptatie

- Database kan volledig opnieuw opgebouwd en geseed worden
- Domeinmodellen sluiten aan op `src/contracts/domain.ts`
- Geen localStorage-afhankelijkheid meer voor kerngegevens

## Fase 2 - Auth en autorisatie

### Doel

De demo-auth vervangen door echte login en rolgedrag.

### Scope

- Supabase Auth integreren in de portal
- `AuthContext` omzetten naar echte sessies
- Rollen ophalen uit `user_profiles`
- Role-switcher uit de UI verwijderen
- RLS-beleid voor minimaal:
  - lezen voor ingelogde gebruikers
  - schrijven afhankelijk van rol
  - admin-only beheeracties

### Acceptatie

- Gebruiker kan inloggen en uitloggen
- Elke rol ziet alleen relevante acties en routes
- Handmatige persona-switching bestaat niet meer

## Fase 3 - Functionele portal op echte backenddata

### Doel

De portal volledig bruikbaar maken op live backenddata.

### Scope

- Vervang de huidige store door backendgedreven data access
- Pagina's lezen en schrijven via Supabase
- Workflowtransities afdwingen op basis van contracten
- Dashboard en lijsten tonen echte data
- Detailpagina's en mutaties werken end-to-end
- Documentopslag via Supabase Storage
- Notifications en activity feed op backenddata

### Acceptatie

- Orders, reparaties, donaties en voorraad werken zonder demo-state
- Refresh verliest geen data
- Kritieke gebruikersflows zijn uitvoerbaar van begin tot eind

## Fase 4 - Portal operationeel afronden

### Doel

De oplossing geschikt maken voor dagelijks gebruik zonder CRM-koppeling.

### Scope

- Validatie en foutafhandeling aanscherpen
- Seed/demo-data vervangen of scheiden van operationele data
- Instellingenpagina functioneel maken waar nodig
- Rapportages baseren op backenddata
- Eventuele CRM Sync pagina ombouwen naar:
  - voorbereidende statuspagina
  - uitleg dat koppeling nog niet actief is
  - inzicht in toekomstige integratiepunten, niet in live sync

### Acceptatie

- De portal voelt productierijp voor intern gebruik
- Belangrijkste workflows falen niet bij normaal gebruik
- UI communiceert eerlijk welke onderdelen nog niet geactiveerd zijn

## Fase 5 - CRM voorbereiding afronden

### Doel

De codebase klaarzetten voor een latere CRM-selectie, zonder nu al een koppeling te bouwen.

### Scope

- Definieer adaptercontracten en registratiestructuur
- Reserveer mappingpunten tussen portal-entiteiten en externe CRM-records
- Maak een technische notitie voor toekomstige implementatie:
  - te verwachten entiteiten
  - authenticatie-opties
  - webhook-richting
  - sync-strategie
- Zorg dat huidige backend en frontend geen aanname maken over een al gekozen CRM

### Niet doen in deze fase

- Geen outbound sync worker
- Geen inbound webhookafhandeling
- Geen echte vendor adapters
- Geen conflict resolution UI

### Acceptatie

- Een toekomstige CRM-fase kan starten zonder fundamentele refactor van domein of database
- De live portal blijft volledig onafhankelijk van een CRM

## Aanbevolen uitvoervolgorde

1. Supabase project en env opzetten
2. Datamodel en seed opleveren
3. Auth en rollen opleveren
4. Frontend migreren naar echte data
5. Documenten en notificaties afronden
6. Rapportages en operationele polish
7. CRM-voorbereiding structureren zonder live koppeling

## Concrete productbeslissingen

- De CRM Sync pagina blijft voorlopig bestaan als placeholder of voorbereidingsscherm, niet als actieve integratiehub.
- `crm_sync_jobs` mag bestaan voor toekomstig ontwerp, maar telt niet als live succescriterium.
- "Portal up and running" betekent hier:
  - backend draait
  - frontend draait
  - login werkt
  - kernflows werken
  - data staat persistent in de backend
  - geen afhankelijkheid van een gekozen CRM

## Succescriteria

- De portal kan lokaal en in een gedeelde omgeving draaien met echte backend
- Een gebruiker kan de dagelijkse kernprocessen uitvoeren zonder mockdata of role switch
- De architectuur blokkeert een latere CRM-integratie niet
- Er is nog maar een planbestand dat de prioriteiten bepaalt
