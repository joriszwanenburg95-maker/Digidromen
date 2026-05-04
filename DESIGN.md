# Digidromen Design System en Huisstijl

Laatste update: 2026-05-04

Dit document is de actuele designbron voor de portal. De rolgerichte UX-specificatie staat in:

`docs/2026-05-04-ui-ux-role-spec.md`

## Merkidentiteit

Digidromen is warm, toegankelijk en missiegedreven. De portal moet professioneel genoeg zijn voor operatie en beheer, maar nooit koud of generiek aanvoelen.

Tone of voice:
- warm en direct
- menselijk, niet technisch
- gericht op gelijke kansen
- “Samen maken we digidromen waar”

## Kleuren

| Token | Hex | Gebruik |
|---|---:|---|
| `digidromen-yellow` | `#FFD500` | primaire CTA |
| `digidromen-orange` | `#EE7219` | links, actieve accenten |
| `digidromen-orange-hover` | `#B75C0E` | hover op oranje acties |
| `digidromen-dark` | `#2E3848` | tekst/headings |
| `digidromen-beige` | `#FBF4EB` | app achtergrond |
| `digidromen-blue` | `#87CEDC` | tertiaire accenten |
| `surface` | `#FFFFFF` | kaarten/panels |

Regel:
- Gebruik tokens/classes, geen losse hexes in componenten.
- Kleur mag nooit de enige statusindicator zijn.

## Typografie

- Headings: `Sora`, weight 600.
- Body: `Roboto`, weight 400/500/700.
- Bodytekst minimaal 16px op mobiel.
- Lange tekst: line-height 1.5-1.75.

## Componentstijl

- Primaire knoppen: geel, donkergrijze tekst, 20px radius, minimaal 44px hoog.
- Secundaire acties: wit/beige oppervlak met duidelijke border.
- Iconen: Lucide, consistent formaat.
- Geen emoji als UI-iconen.
- Panels/cards: rustig, duidelijke hiërarchie, geen card-in-card patronen tenzij het echte herhaalde items zijn.
- Logo: echte asset, geen CSS invert/filter.

## Rolgerichte surfaces

### Hulporganisatie

UX: klant/webshop.

Taal:
- “Aanvragen” in plaats van “Orders”
- “Nieuwe aanvraag”
- “Mijn aanvragen”

UI:
- warme mission hero
- primaire CTA naar aanvraagflow
- eenvoudige statuslijn
- weinig kolommen, geen operationele termen

### Servicepartner

UX: werkvoorraad/warehouse.

UI:
- takenlijsten
- statuskolommen
- grote touch targets
- mobile-first voor ontvangst/verwerking

### Digidromen staff/admin

UX: operations cockpit.

UI:
- accorderingsinbox
- bento metrics
- datatabellen met filters
- signalen en uitzonderingen bovenaan

## Accessibility checklist

- Contrast minimaal WCAG AA.
- Focus rings zichtbaar.
- Icon-only buttons hebben `aria-label`.
- Touch targets minimaal 44x44px.
- Skeleton/loading states voor async data.
- Geen horizontale scroll op 375px.
- Animatie alleen transform/opacity en respecteert `prefers-reduced-motion`.
