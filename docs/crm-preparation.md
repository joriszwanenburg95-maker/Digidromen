# CRM voorbereiding

## Besluit

- De portal moet volledig functioneel zijn zonder live CRM-koppeling.
- CRM blijft voorlopig uitgeschakeld in de live flow.
- Voorbereiding blijft wel in scope zodat een latere integratie geen fundamentele refactor vraagt.

## Wat nu al blijft bestaan

- Optionele CRM-referenties op organisaties, orders, reparaties en donaties.
- Een voorbereid `crmSync` model voor queue-items en buffered changes.
- Een aparte UI-surface waarin zichtbaar is dat CRM niet actief gekoppeld is.

## Adaptergrenzen voor later

- `crm_reference`
  Beschikbare externe IDs per entiteit, zonder aanname over vendor.
- `crm_adapter`
  Een latere adapter implementeert outbound writes, inbound reads en webhook-authenticatie.
- `crm_sync_jobs`
  Blijft een queue-achtig concept, maar wordt pas actief zodra een gekozen CRM en sync-strategie vastliggen.

## Niet nu bouwen

- Geen live outbound sync-worker.
- Geen inbound webhook-afhandeling.
- Geen vendor-specifieke mapping voor HubSpot, Odoo, Zoho of Xapti.
- Geen conflict resolution UI.

## Voorwaarden voor de latere CRM-fase

- Portal-auth, rollen en kernflows draaien stabiel op echte backenddata.
- CRUD en workflowtransities voor orders, reparaties, donaties en voorraad zijn end-to-end operationeel.
- Documenten en notificaties zijn backendgedreven.
- De gekozen CRM-leverancier en sync-richting zijn expliciet besloten.
