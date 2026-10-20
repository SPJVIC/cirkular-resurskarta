# Cirkulär Resurskarta – Jönköpings län

> **Demo – syntetiska företags- och resursdata.** Alla aktörer, arbetsställen, resurser och behov i projektet är fiktiva. Orterna och koordinaterna är verkliga, men inga uppgifter avser verkliga företag.

En lokal Proof of Concept för Science Park Jönköping (AIT-04: *Behovsbaserad företagsidentifiering och matchning*). Applikationen visar hur geografisk information, företagsdata, resursflöden och regelbaserad "AI" kan kombineras för att hitta cirkulära samverkansmöjligheter:

```
FÖRETAGSIDENTIFIERING → KARTLÄGGNING → RESURSER & BEHOV → MATCHNING → ANALYS → UNDERLAG FÖR DIALOG
```

## Funktioner

**Karta (huvudvy)**
- Interaktiv karta över Jönköpings län (Leaflet + OpenStreetMap) med 40 aktörer i länets 13 kommuner.
- Färgkodade markörer: **orange** = resurser, **blå** = behov, **grön** = båda, **grå** = ej kartlagd. Lila prick = användarregistrerad aktör.
- **Lägg till aktör direkt på kartan**: klicka *Lägg till aktör* → klicka på kartan → fyll i formuläret. Kommunen förifylls utifrån närmaste ort.
- **Redigera och flytta aktörer**: *Redigera* öppnar formuläret; positionen ändras genom att dra markören, klicka på kartan eller skriva in koordinater.
- Ta bort aktörer (med bekräftelse, kaskad till arbetsställen, resurser och behov) och hantera flera arbetsställen per aktör.
- Filter: fritext, kommun, bransch, aktörstyp, resurskategori (erbjuder/behöver), resursstatus, verifieringsstatus och avstånd från en ort (ritas som cirkel).
- *Visa möjliga samarbeten*: linjer med riktningspilar till matchade aktörer, färgade efter potential, klickbara med flödesinformation. *Återgå till standardvy* stänger läget.
- Sök med naturligt språk, t.ex. *"Visa företag inom 30 km från Värnamo som kan använda träspill"*.

**Matchningar** – prioriterad lista med matchningskort, flikar per status (möjliga, kräver verifiering, avvisade), filter och detaljerad analys i åtta sektioner.

**Aktörer** – sökbar tabell över alla aktörer med antal resurser, behov och matchningar.

**Identifiera potentiella resurser** – en *simulerad* AI-funktion som läser verksamhetsbeskrivning och processer och föreslår sannolika restströmmar med motivering. Förslagen kan granskas, redigeras, läggas till, avvisas eller markeras som verifierade.

All data sparas i `localStorage`. Varje ändring kör om matchningsmotorn och uppdaterar karta, nyckeltal och listor. *Återställ demonstrationsdata* återgår till ursprungsläget.

## Teknikstack

| Del | Teknik |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Design | Tailwind CSS 3, Lucide React |
| Karta | Leaflet 1.9, React Leaflet 4, OpenStreetMap-tiles |
| Routing | React Router 6 (HashRouter) |
| Data | Lokala JSON-filer + `localStorage` |
| Logik | Regelbaserad matchning och inferens i TypeScript |
| Test | Vitest, React Testing Library, jsdom |

Inga API-nycklar, ingen backend, ingen extern AI eller geokodning.

## Installation och start

Kräver Node.js 18 eller senare (`brew install node` på macOS).

```bash
npm install
npm run dev
```

Öppna http://localhost:5173

Övriga kommandon:

```bash
npm test          # enhets- och komponenttester
npm run lint      # ESLint
npm run build     # typkontroll + produktionsbygge till dist/
```

## Publicering på GitHub Pages

Workflowen `.github/workflows/deploy.yml` testar, bygger och publicerar appen automatiskt vid varje push till `main`. Aktivera den en gång under *Settings → Pages → Source: GitHub Actions* i repot. Appen hamnar på `https://<användare>.github.io/<repo>/`. Bygget använder relativa sökvägar (`base: './'`), så repot kan heta vad som helst.

## Projektstruktur

```
src/
  types/index.ts                 Datamodellens TypeScript-interfaces
  data/                          actors/facilities/resources/needs.json, taxonomy.ts, seed.ts
  services/
    matchingEngine.ts            Regelbaserad matchning och poängmodell
    compatibilityRules.ts        Kompatibilitetsregler, avståndsprofiler, materialregler
    distanceCalculator.ts        Haversine
    analysisGenerator.ts         Mallbaserad analys av en matchning
    resourceInference.ts         Simulerad AI (utbytbar provider)
    naturalLanguageSearch.ts     Regelbaserad tolkning av sökfrågor
    filtering.ts                 Index, markörstatus och filter
    dataStore.ts                 Rena CRUD-funktioner
    storage.ts                   localStorage-persistens
  state/AppContext.tsx           Central state – kör om matchning vid varje ändring
  components/                    MapView, ActorPanel, ActorForm, ResourceForm, MatchCard, MatchAnalysis …
  pages/                         MapPage, MatchesPage, ActorsPage
```

UI, data, affärslogik, regler och persistens är separerade. Alla tjänster i `services/` är rena funktioner utan React-beroenden.

## Datamodell

```
Actor 1 ── * Facility 1 ── * Resource
                     └──── * Need
Match (beräknad) = Resource × Need
```

| Entitet | Viktiga fält |
|---|---|
| **Actor** | id, name, actorType (företag/offentlig/förening), industry, description, municipality, employeeRange, source |
| **Facility** | id, actorId, name, latitude, longitude, processes |
| **Resource** | id, facilityId, category, material, description, quantity, unit, quality, availability, classification (egenskapstaggar), temperatureC, status, verificationStatus, source, updatedAt |
| **Need** | id, facilityId, category, material, description, requiredQuantity, unit, technicalRequirements, minTemperatureC, maxDistanceKm, verificationStatus |
| **Match** | id, sourceResourceId, targetNeedId, score, breakdown, distanceKm, reasons, uncertainties, blockers, nextSteps, status |

Resurser och behov är kopplade till **arbetsställen**, inte bara företag, eftersom geografin avgör om ett flöde är möjligt. `source` skiljer på demodata, användarregistrerad data och förslag från inferensen. Matchningar lagras aldrig – de beräknas alltid från aktuell data.

Gemensam resurstaxonomi: träspill, sågspån, bark, plastspill, metallskrot, spillvärme, processvatten, förpackningsmaterial, organiska restströmmar, textilspill.

## Matchningsmotorn

För varje par *resurs × behov* (mellan olika aktörer):

1. **Kompatibilitet (spärr).** En explicit regeltabell (`NEED_ACCEPTS`) anger vilka resurskategorier som kan möta ett behov och med vilken passform. Inkompatibla kategorier ger ingen matchning alls – närhet kan aldrig kompensera.
2. **Material.** För materialkänsliga kategorier (plast, metall) jämförs materialtyp (PP, PE, blandplast, stål, aluminium …). Fel polymer eller blandad fraktion är ett hinder.
3. **Tekniska krav.** Behovets krav (obehandlat, torrt, sorterat, rent, livsmedelskvalitet, lägsta temperatur) jämförs mot resursens egenskaper. Motpol (t.ex. *behandlat* mot krav *obehandlat*) är ett hinder; okänd egenskap är en osäkerhet.
4. **Volym, tillgänglighet, status.** Täckningsgrad, säsong/batch, planerat eller redan avtalat flöde.
5. **Geografi.** Fågelvägsavstånd med Haversine. Varje kategori har en avståndsprofil (ideal- och maxavstånd): spillvärme 1,5/5 km, processvatten 3/15 km, organiskt 20/80 km, trä 30/120 km, plast 50/250 km, metallskrot 80/300 km.
6. **Datakvalitet.** Verifierade uppgifter ger högre poäng; saknade uppgifter flaggas.

**Poängmodell (0–100)**

| Kriterium | Max |
|---|---|
| Resurskompatibilitet | 30 |
| Materialkvalitet | 10 |
| Volym | 15 |
| Tillgänglighet | 10 |
| Geografiskt avstånd | 25 |
| Datakvalitet | 10 |

Finns något hinder blir matchningen **avvisad** och poängen begränsas till max 25. Annars blir den **möjlig** eller **kräver verifiering** (vid ≥ 2 osäkerheter eller overifierade uppgifter).

Poängen är en **indikativ matchningspotential** – inte en sannolikhet för att samarbetet lyckas.

Med demonstrationsdatan ger motorn 67 genomförbara och 31 avvisade matchningar, bland dem tydliga demonstrationsfall:

| Fall | Varför |
|---|---|
| Vetlanda Metallgjuteri → Vetlanda Energi | Spillvärme 70 °C, 1,3 km |
| Huskvarna Precisionsgjuteri → Ådalens Växthusodling | Spillvärme till växthus, 1,7 km |
| Granlunda Såg → Finnvedens Pellets | 4 000 ton sågspån, 28 km |
| Vrigstad Ostförädling → Sävsjö Biogas | Vassle till rötning, 14 km |
| Anderstorps Formsprutning → Värnamo Plaståtervinning | Sorterad PP, 25 km |
| *Avvisad:* Vetlanda Metallgjuteri → Holsbybrunns Gård | Spillvärme 8,6 km – för långt |
| *Avvisad:* Habo Möbelindustri → värmeverk | Lackat trä, krav på obehandlat |
| *Avvisad:* Ekenässjöns Plast → Värnamo Plaståtervinning | Blandplast, kräver ren PP/PE |
| *Avvisad:* Jönköpings kommun → Textilåtervinning | 2 ton mot behov av 150 ton |

## Simulerad AI och naturlig språksökning

- `resourceInference.ts` är en **regelbaserad kunskapsmodell** (nyckelord/processer → typiska restströmmar). Den ligger bakom gränssnittet `ResourceInferenceProvider` och kan ersättas med ett LLM-anrop som returnerar samma struktur utan att UI:t behöver ändras.
- `naturalLanguageSearch.ts` tolkar ort, avstånd (km/mil), resurstyp och erbjudande/behov med reguljära uttryck och översätter frågan till vanliga filter. Om frågan inte kan tolkas får användaren ett förklarande meddelande.
- Analysen av matchningar genereras från strukturerad data och textmallar och märks tydligt som *regelbaserad – ingen AI-modell har använts*.

## Tester

41 tester i 8 filer (`npm test`), bland annat:

- **Matchningsmotorn:** kompatibla resurser ger giltig matchning; inkompatibla kategorier och material avvisas; avstånd sänker poängen och spillvärme är mer avståndskänsligt än metallskrot; saknade uppgifter blir osäkerheter; nya resurser skapar nya matchningar; ändrade behov ändrar resultatet; determinism och ≥ 15 matchningar i demodatan.
- **Data:** 40 aktörer, 13 kommuner, giltiga referenser, koordinater inom länet.
- **CRUD:** skapa, uppdatera, flytta och ta bort aktörer med kaskad.
- **Sök, inferens, localStorage** samt komponenttester för aktörspanel, matchningsvy och aktörsvy.

## Kända begränsningar

- Avstånd är fågelväg; verkligt vägavstånd och transportkostnad beräknas inte.
- Kompatibilitets- och avståndsregler är förenklade antaganden för demonstration, inte branschvaliderade.
- Inferens och språksökning är nyckelordsbaserade och förstår bara de mönster som finns i reglerna.
- Data lagras endast i den egna webbläsaren (`localStorage`) – ingen delning mellan användare.
- Kartunderlaget hämtas från OpenStreetMaps publika tile-server, vilket kräver internet och är avsett för begränsad användning.
- Ingen autentisering, behörighetsstyrning eller versionshistorik.

## Nästa utvecklingssteg och integrationer

Integrationerna nedan är **inte** implementerade i PoC:n. Datamodellen och tjänsteskiktet är utformade för att de ska kunna läggas till.

**SCB:s företagsregister.** Importera arbetsställen (CFAR-nummer), SNI-kod, storleksklass och adress till `Actor`/`Facility`. SNI-koder kan mappas till branscher och användas som indata till inferensen. Arbetsställenas koordinater kan hämtas från registret eller Lantmäteriets adressdata.

**PostgreSQL/PostGIS.** Ersätt JSON-filerna och `storage.ts` med ett API mot PostgreSQL. Lagra arbetsställen som `geography(Point)` och använd `ST_DWithin` för avståndsfilter och förfiltrering av matchningskandidater. Matchningsmotorn kan köras i backend och resultaten cachas eller materialiseras.

**Azure OpenAI eller annat LLM-API.** Implementera en ny `ResourceInferenceProvider` som skickar verksamhetsbeskrivning och processer till modellen och returnerar `ResourceSuggestion[]` (strukturerad JSON). Samma mönster fungerar för språksökningen och för att formulera analystexter, så länge poängen fortfarande kommer från den transparenta regelmotorn.

**Microsoft 365.** Exportera matchningsanalysen som Word-dokument eller till SharePoint inför företagsmöten, boka dialogmöten i Outlook och dela listor via Teams. Inloggning kan ske med Entra ID.

**Externa datakällor.** Naturvårdsverkets och länsstyrelsens miljörapporter (avfallsmängder), energideklarationer, Avfall Sverige, Lantmäteriets kartor och fjärrvärmenätens utbredning kan berika resurser och behov och förbättra avståndsbedömningen.

**CRM-system.** Synkronisera aktörer och kontaktpersoner med t.ex. Dynamics 365 eller HubSpot, logga dialoger per matchning och följ upp status (identifierad → kontaktad → förstudie → avtal).

Övriga förslag: vägavstånd via routing-tjänst, CO₂- och kostnadsuppskattning per matchning, flerpartsmatchning (symbioskedjor), import och export (CSV/Excel), och roller för att verifiera uppgifter.
