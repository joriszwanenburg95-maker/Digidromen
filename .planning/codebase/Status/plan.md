Samenvatting
De huidige portal voldoet niet robuust aan de gevraagde scope. De grootste gaten zitten in conceptopslag, productspecific orderdata, bestelworkflow, notificaties, planning/kalender, voorraadmutaties per gebeurtenis, documentverplichtingen en autorisatie op procesniveau. De bestaande order- en donatiepagina’s schrijven nu grotendeels direct vanuit pagina’s naar Supabase, terwijl er elders al een tweede domeinlaag bestaat. Dat is fragiel en verklaart ook waarom invoer en statusgedrag nu inconsistent zijn.
Bestellen door hulporganisaties moet alleen mogelijk zijn binnen een configureerbaar bestelvenster, waarbij het standaardbeleid is: alleen in de eerste week van de maand. Buiten dit venster mag een order niet worden ingediend.

De bezorgdatum moet zichtbaar zijn in de portal, maar hoeft niet door de hulporganisatie bevestigd te worden. Deze datum wordt ingevuld door Aces Direct in de portal; procesverantwoordelijkheid voor deze stap ligt bij de servicepartner.

Daarnaast moet powerbank als apart bestelbaar vervangings-/defectproduct worden toegevoegd aan de ordercatalogus.

Drie realistische routes:

Patch-only: huidige pagina’s oplappen, repair verwijderen, local draft opslag toevoegen. Snel, maar technisch zwak.
Gedeelde flowlaag: alle create/status-mutaties via één service/domeinlaag laten lopen. Beter, maar zonder datamodeluitbreiding blijft het half werk.
Aanbevolen: order-gedreven redesign. Reparaties verdwijnen volledig; vervanging wordt een ordertype/producttype. Orders en donaties krijgen echte conceptopslag, strikte stapvalidatie, uniforme statushistorie, planningsoverzicht en voorraadmutaties op eventniveau.
Mijn advies is 3.
Geconsolideerde requirementslijst
R1 Productcatalogus met bestelbare typen: laptoppakket, defectvervanging en powerbank als ordertype/productvariant.
R2 Productstamgegevens inclusief bundeldefinitie, voorraadsturing, vervangingsvlag, SKU en eenheid.
R3 Organisaties en contactpersonen met volledig bestelprofiel en bestelgerechtigdheid.
R4 Orderkop met bestelmaand, akkoordstatus, verwerker, bezorgdatums, archiefstatus en planning.
R5 Orderregels met productspecifieke verplichte velden, reden, toelichting, defectkoppeling en uploads.
R6 Configureerbare bestelvensters met blokkering buiten venster; standaard alleen in de eerste week van de maand.
R7 Orderworkflow met statussen, statushistorie, toelichting en rolgebonden acties.
R8 E-mailnotificaties en periodieke bestelherinneringen.
R9 Donateurs en donaties met expliciete CRM-leidende keuze en complete pickup/verwerkingsdata.
R10 Donatiestatussen, verwerkingsresultaat en verplichte documentatie/certificaten.
R11 Voorraad, voorraadlocaties en expliciete mutatieregistratie per bronproces.
R12 Integraties met Aces Direct / Blancco en CRM, of anders handmatige fallback met traceerbare velden. Voor Aces Direct specifiek: bezorgdatum wordt door de servicepartner in de portal vastgelegd; deze datum is zichtbaar voor hulporganisaties maar vereist geen bevestigingsactie vanuit hen.
R13 Datakwaliteit: conceptopslag, verplichte velden, adresvalidatie, consistente datums/statussen.
R14 Planning/kalenderoverzicht voor pickups, leveringen en verwachte binnenkomst.
R15 Rapportages inclusief maandrapportages en operationele exports.
R16 Leveringscommunicatie: zichtbare bezorgdatum in portal zonder klantbevestiging, inclusief vastlegging van bron/eigenaar van de datum (Aces Direct / servicepartner), audittrail en statusafhankelijkheid.
Controlematrix
Requirement-ID	Domein	Requirement	Type	Status	Bevinding	Actie	Prioriteit
R1	Catalogus	Bestelbare producttypen incl. laptoppakket, defectvervanging en powerbank	Functioneel	Gedeeltelijk	products bestaat, maar UI ondersteunt feitelijk 1 laptopflow; geen vervangingscatalogus of expliciete powerbank-variant	Productmodel uitbreiden met ordertype, replacement flags, bundle-definitie en bestelbare varianten incl. powerbank	Hoog
R2	Catalogus	Productkenmerken incl. bundelrelatie, voorraadgestuurd, vervangingsproduct, SKU	Data	Gedeeltelijk	products heeft sku, category, is_package, package_components; mist expliciet inventory_managed, replacement_product, unit	Datamodel en settings UI uitbreiden	Hoog
R3	Organisaties	Organisatie + contact + bestelprofiel + bestelgerechtigdheid	Data/Autorisatie	Gedeeltelijk	organizations mist telefoons, doelgroep, bestelgerechtigdheid, reminder-opt-in; 1 contact op org-niveau	Contacten normaliseren en bestelprofiel toevoegen	Hoog
R4	Orders	Volledige orderkop incl. akkoordstatus, verwerker, bezorgdatums, archiefstatus	Data	Gedeeltelijk	orders heeft veel velden al; mist expliciete archiefstatus en scheiding akkoordstatus/orderstatus in UI	Orderheader consolideren en UI daarop baseren	Hoog
R5	Orders	Orderregels met productspecifieke verplichte velden en uploads	Functioneel	Gedeeltelijk	order_lines heeft defectvelden en foto-urls, maar UI gebruikt die niet	Nieuwe wizard per producttype bouwen met stapvalidatie en uploadflow	Hoog
R6	Bestelvenster	Configureerbare bestelvensters met blokkering buiten venster; standaard eerste week van de maand	Business rule	Ontbreekt	Er is nog geen harde bestelvensterlogica of kalendergestuurde blokkering voor hulporganisaties	Window-configuratie toevoegen, validatie op submit én UI-blokkering buiten eerste week/actief venster	Kritiek
R7	Workflow	Gewenste orderstatussen + statushistorie + rollen	Workflow	Gedeeltelijk	workflow_events bestaat; huidige statussen wijken af van requirementset en rollen zijn slechts deels afgedwongen	Nieuwe statusset en transitiematrix definiëren, repairs verwijderen	Hoog
R9	Donateurs	Donateurs met compleet profiel en expliciete CRM-bron	Data/Integratie	Gedeeltelijk	Sponsors lopen nu mee in organizations; geen expliciete donor-governance	Donorbeleid expliciteren en sync-sleutel vastleggen	Hoog
R10	Donaties	Donatieproces, statussen, verwerkingsresultaat, documenten	Functioneel	Gedeeltelijk	Tabel is rijk, UI is dun; documentverplichting bij statusovergang ontbreekt	Donatieflow herontwerpen rond pickup, verwerking, rapportage en afronding	Hoog
R11	Voorraad	Mutaties per bronproces en pakketafboeking	Business rule	Ontbreekt	Alleen inventory_items snapshot-achtig; geen aparte mutatietabel	inventory_movements introduceren en alle events daarop baseren	Kritiek
R12	Integraties	Aces Direct / Blancco / CRM, incl. servicepartner-invoer bezorgdatum	Integratie	Gedeeltelijk	CRM sync jobs bestaan; Aces/Blancco alleen als losse referentievelden; geen duidelijke servicepartnerstap in orderflow	Integratiecontract of handmatige servicepartner-portalflow expliciet modelleren, incl. datumveld, rechten en audittrail	Hoog
R13	Datakwaliteit	Conceptopslag, verplichte velden, adresvalidatie	UX/Quality	Ontbreekt	Geen echte draft-opslag; geen postcode+huisnummer validatie; verplichte velden inconsistent	Draftmodel + validations + address service integreren	Kritiek
R14	Planning	Kalender/planning voor pickups, bezorging en binnenkomst	UX	Ontbreekt	Er is geen echte kalender, alleen losse datumvelden en ruwe forecast	Planning board / kalenderpagina bouwen	Hoog
R15	Rapportages	Maandrapportages en operationele exports	Reporting	Gedeeltelijk	Reports-pagina is vooral demo-achtig; mist maandrapportage-logica en certificaatoverzicht	Rapportages herontwerpen op echte query’s en filters	Midden
R16	Levering	Bezorgdatum zichtbaar in portal, geen bevestiging door hulporganisatie, invoer door Aces Direct/servicepartner	Workflow/Integratie	Ontbreekt	Bezorgdatum is nog geen expliciet servicepartner-gedreven processtap met eigenaarschap en audittrail	Orderworkflow uitbreiden met servicepartner-invoer, read-only zichtbaarheid voor hulporganisatie en logging van datumwijzigingen	Hoog
Redundantie- en inconsistentieanalyse
Er zit overlap tussen producttype, productcategorie, vervangingsproduct en de aparte requirement “wat moet besteld kunnen worden”. Dat moet worden geconsolideerd naar één catalogusmodel met product, order_scenario en optioneel bundle.
De oude repair-flow is nu inconsistent met de gewenste scope. Alles rond repair_cases, repair_logs, repair-menu’s en repair-rapportages moet uit het domein verdwijnen. Alleen defectvervanging blijft bestaan, als orderregeltype.

De gevraagde orderstatussen conflicteren deels met de huidige statusset in de portal. BEOORDEELD, IN_VOORBEREIDING, GELEVERD, AFGESLOTEN zijn niet hetzelfde als Te accorderen, Geaccordeerd, Verwerkt, Gearchiveerd. Dit moet niet gemapt maar vervangen worden door een nieuwe canonieke workflow.

De rol van Aces Direct in de leveringsstap is nu onvoldoende expliciet gemodelleerd. Bezorgdatum moet geen klantactie zijn, maar een servicepartner-actie met duidelijke rechten, zichtbaarheid en audittrail.

Het bestelvenster is nu impliciet afwezig in het ontwerp, terwijl dit een harde business rule is. Die regel moet centraal afgedwongen worden in zowel UI als backendvalidatie.

Openstaande ontwerpkeuzes
O1 Conceptopslag alleen lokaal per browser of ook als server-side concept in Supabase. Mijn advies: server-side drafts met autosave, plus lokale fallback.
O2 Donateurs als apart domeinobject of als subtype van organizations. Mijn advies: voorlopig subtype van organizations, maar wel met donor-specifieke profielvelden.
O3 Aces Direct leidend voor planning of portal leidend. Mijn advies: portal leidend tenzij echte koppeling beschikbaar komt.
O4 Uploads direct in Supabase Storage of eerst metadata-only. Mijn advies: direct in Storage met documentrecords.
O5 Kalenderweergave als aparte pagina of geïntegreerd dashboard. Mijn advies: aparte Planning pagina plus samenvatting op dashboard.
O6 Bestelvenster hardcoded als eerste week van de maand of configureerbaar via settings. Mijn advies: configureerbaar in settings, met default “dag 1 t/m dag 7 van elke maand”.
O7 Aces Direct schrijft bezorgdatum via integratie of via handmatige servicepartner-portalactie. Mijn advies: modelleer beide, maar ontwerp functioneel alsof servicepartner de bronhouder is; integratie is dan slechts één invulmechanisme.
Advies en testscenario’s
Advies voor redesign:
Maak orders het enige aanvraagproces voor uitgifte en vervanging.
Verwijder repair routes, repair tabellen uit UI en repair terminologie uit rapportages.
Voeg echte drafts toe voor orders en donaties.
Voeg inventory_movements toe en laat bundels en vervangingen daaruit boeken.
Bouw een Planning pagina voor geplande pickups, geplande bezorging en verwachte voorraadbinnenkomst.
Laat alle create- en statusacties via één service/domeinlaag lopen, niet meer direct per pagina.
Voeg een configureerbaar bestelvenster toe en blokkeer submit buiten het actieve venster; standaard alleen in de eerste week van de maand.
Maak bezorgdatum zichtbaar voor hulporganisaties, maar read-only aan hun kant.
Leg eigenaarschap van bezorgdatum expliciet bij Aces Direct / servicepartner.
Voeg powerbank toe als apart bestelbaar vervangingsproduct binnen defect-/replacementflow.
Kernscenario’s:
Hulporganisatie start conceptorder, ververst pagina, gaat verder en dient in zonder dat data verloren gaat.
Hulporganisatie bestelt vervangende laptop en wordt geblokkeerd zonder SRN en klachtomschrijving.
Hulporganisatie bestelt voedingskabel en moet óf wattage+poort óf foto’s+SRN invullen.
Bestelling buiten bestelvenster kan niet worden ingediend.
Digidromen accordeert order; statushistorie, notificatie en geplande bezorgdatum worden correct vastgelegd.
Aces Direct verwerkt order en zet bezorgdatum; planningsoverzicht werkt direct bij.
Donatieconcept blijft behouden na refresh en kan later worden afgerond.
Donatie kan niet naar Verwerkt zonder verplichte rapportage/certificaat.
Uitlevering van 1 laptoppakket boekt laptop, muis, headset, rugzak en handleiding afzonderlijk af.
Maandrapportage toont orders, donaties, voorraadmutaties en uitzonderingen zonder repair-data.
Hulporganisatie probeert op dag 12 van de maand een bestelling in te dienen en wordt correct geblokkeerd met duidelijke melding dat bestellen alleen in het actieve bestelvenster mogelijk is.
Hulporganisatie kan in de eerste week van de maand wel bestellen en ziet welk bestelvenster actief is.
Servicepartner vult bezorgdatum in; hulporganisatie ziet deze datum direct in de portal zonder extra bevestigingsknop.
Hulporganisatie kan bezorgdatum niet zelf wijzigen of accorderen.
Wijziging van bezorgdatum door servicepartner wordt gelogd in statushistorie/audittrail.
Powerbank kan als defect-/vervangingsproduct besteld worden en volgt dezelfde order- en voorraadlogica als andere vervangingsartikelen.
Als je dit ontwerp bevestigt, werk ik door naar een concreet implementatieplan en daarna naar de codewijzigingen.