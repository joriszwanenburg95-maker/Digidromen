# Handleiding — Digidromen portal (voor beheerders & medewerkers)

Korte uitleg van hoe de portal werkt sinds de omslag naar een **bestelportal/webshop**.
Bedoeld voor Digidromen-medewerkers en -beheerders.

---

## 1. Rollen in het kort

| Rol | Wie | Ziet / kan |
|---|---|---|
| **Hulporganisatie** (`help_org`) | De klant: scholen/stichtingen die laptops aanvragen | Alleen de eigen organisatie: eigen bestellingen plaatsen/volgen, eigen leveradres + doelgroep bewerken |
| **Medewerker** (`digidromen_staff`) | Digidromen-operatie | Alle bestellingen beoordelen, organisaties beheren |
| **Beheerder** (`digidromen_admin`) | Volledig beheer | Alles van medewerker + gebruikers, instellingen, audit |

> Alleen Digidromen ziet álle organisaties en bestellingen. Een hulporganisatie is strikt afgeschermd tot de eigen gegevens.

---

## 2. Nieuwe klant aanmaken (onboarding)

**Instellingen → Organisaties → Nieuwe organisatie**, type **Hulporganisatie**.

- Vul de organisatiegegevens in **plus de eerste besteller** (naam + e-mail). Dat is meestal de enige gebruiker.
- Klik **"Aanmaken & uitnodigen"**.
- Wat er dan gebeurt:
  1. De organisatie wordt aangemaakt.
  2. De eerste besteller wordt direct gekoppeld als gebruiker.
  3. Diegene krijgt automatisch een **activatiemail** met een knop "Account activeren" (magic link — geen wachtwoord nodig).
- Extra collega's van dezelfde organisatie voeg je later toe via **Instellingen → Gebruikers**.

> Eén gebruiker hoort altijd bij **één** organisatie. Lukt de uitnodiging niet (bijv. e-mailadres bestaat al), dan staat de organisatie er wél, en nodig je de persoon handmatig uit via Gebruikers.

---

## 3. Inloggen voor de klant

- De klant logt in met **magic link**: e-mailadres invullen op de inlogpagina → ze krijgen een inloglink per mail.
- Er is **geen zelf-registratie**: alleen mensen die Digidromen heeft uitgenodigd kunnen inloggen.
- Vertrekt iemand? Deactiveer het account via **Gebruikers**; de bestelhistorie blijft bij de organisatie.

---

## 4. Bestellingen beoordelen (de inbox)

**Bestellingen** is je werklijst. De tabs zijn op actie gericht:

| Tab | Betekenis |
|---|---|
| **Te beoordelen** | Nieuw ingediende aanvragen — hier moet je iets mee (accorderen of afwijzen). Het getal toont hoeveel er wachten. |
| **Goedgekeurd** | Geaccordeerd, wacht op levering |
| **Geleverd** | Afgeleverd, nog niet afgesloten |
| **Afgerond** | Afgesloten bestellingen |
| **Afgewezen** | Afgewezen aanvragen |
| **Alle** | Alles (behalve concepten) |

> **Concepten** (half-afgemaakte aanvragen van klanten die nog niet zijn ingediend) zie je bewust niet — daar valt niets te beoordelen.

### Een aanvraag afhandelen
Open een aanvraag (status **Ingediend**) → rechtsboven:
- **Accorderen** → de klant krijgt een goedkeuringsmail.
- **Afwijzen** → er verschijnt een veld voor een **optionele reden**. Die reden komt in de afwijzingsmail aan de klant (laat je 'm leeg, dan gaat er een nette mail zonder reden). 

Daarna zet je de bestelling op **Geleverd** zodra de spullen weg zijn. **Afsluiten** (Afgerond) doe je als de zaak helemaal klaar is.

---

## 5. Welke e-mails gaan automatisch naar de klant?

| Moment | Mail |
|---|---|
| Aanvraag ingediend | Bevestiging ("we hebben je aanvraag ontvangen") |
| Jij accordeert | Goedkeuring |
| Jij wijst af | Afwijzing (met je reden, indien ingevuld) |
| Jij zet op Geleverd | Leveringsmail ("je bestelling is geleverd 🎉") |
| Je zet/wijzigt een verzend-/bezorgdatum | Update met de datum |
| Bestelvenster gaat open | Uitnodiging om te bestellen |

> **Let op de timing:** mails worden **gebundeld en elke ~15 minuten** verstuurd (niet direct). Doe je snel achter elkaar meerdere acties, dan komen ze gebundeld. De klant ziet na het indienen een melding dat de bevestiging binnen ~15 min komt en eventueel in spam kan staan.

Afsluiten (Afgerond) stuurt geen mail.

---

## 6. Bestelvenster

**Instellingen → Bestelvenster.**

- Klanten kunnen standaard alleen bestellen tussen **dag 1 en dag 7** van de maand (instelbaar).
- **Bestelvenster ingeschakeld** (aan/uit): zet je het uit, dan kunnen klanten helemaal niet bestellen — ook niet binnen de vaste dagen (bijv. als er geen voorraad is). Dan gaat er ook géén openingsmail.
- **Handmatig open**: tijdelijk openzetten buiten de vaste dagen.
- Op de openingsdag krijgen alle actieve hulporganisaties automatisch de "venster is open"-mail.

---

## 7. Wat mag de klant zelf wijzigen?

Een hulporganisatie kan onder **Mijn organisatie** alleen:
- het **leveradres** (straat, postcode, plaats), en
- de **doelgroepomschrijving**.

De **organisatienaam en contactgegevens** zijn vergrendeld — die beheert Digidromen. Wil de klant die wijzigen, dan doen jullie dat (of pas je het aan via Organisaties).

---

## 8. Veelgestelde "waarom"-vragen

- **Waarom zie ik geen concepten?** Dat zijn nog niet-ingediende aanvragen; je kunt ze niet beoordelen, dus ze zijn weggelaten om de lijst schoon te houden.
- **Waarom komt een mail niet meteen?** Mails worden elke ~15 minuten gebundeld verstuurd.
- **Een klant zegt geen activatiemail te hebben.** Check de spammap; anders opnieuw uitnodigen via Gebruikers. Mails lopen via Brevo (logboek daar toont of de mail vertrok).
