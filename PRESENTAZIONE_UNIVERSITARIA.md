# Comparatore territoriale di Palermo
## Guida alla presentazione universitaria

### 1. Obiettivo del progetto
Il Comparatore territoriale è uno strumento digitale di supporto alla lettura urbana che integra dati demografici, sociali, abitativi, urbanistici, ambientali e cartografici. L'obiettivo è rendere più leggibili le differenze tra le parti della città e consentire di confrontare le condizioni territoriali a scale diverse.

Non è un sistema di certificazione urbanistica e non sostituisce la documentazione ufficiale, i sopralluoghi o le valutazioni tecniche. È una piattaforma di conoscenza e analisi, con tracciabilità delle fonti e limiti espliciti.

### 2. Domanda di ricerca
**Come cambiano le condizioni urbane tra le diverse unità territoriali di Palermo e quali elementi possono orientare una lettura integrata dei bisogni, delle risorse e delle priorità di intervento?**

Il progetto mette in relazione dati che spesso vengono consultati separatamente, cercando di far emergere relazioni tra popolazione, servizi, dotazioni, vulnerabilità e caratteristiche spaziali.

### 3. Organizzazione territoriale
Il sistema di selezione permette di leggere il Comune attraverso:
- Comune di Palermo;
- 8 circoscrizioni;
- 25 quartieri;
- 55 UPL / Unità di Primo Livello;
- sezioni censuarie, quando la disponibilità e la natura del dato consentono una lettura puntuale.

Le scale sono collegate attraverso codici territoriali e geometrie. Un dato disponibile per quartiere non viene automaticamente attribuito a una circoscrizione quando il quartiere attraversa più circoscrizioni: le aggregazioni rispettano la struttura e la fonte dei dati.

### 4. Moduli di analisi

#### Panoramica territoriale
Sintesi delle componenti principali, con filtri territoriali e indicatori di contesto.

#### Demografia
Distribuzione della popolazione per sesso, età e fasce funzionali, con confronto tra territori. La base comunale di riferimento utilizzata nel quadro demografico è 2022.

#### Densità e abitabilità
Lettura della struttura abitativa, densità e indicatori censuari. I dati 2021 e 2023 sono mantenuti distinti quando cambiano fonte, variabili o perimetro.

#### Analisi sociale
Utilizza il quadro IDISE 2023 e gli indicatori DIS1–DIS9 per le 55 UPL. L'indice è un riferimento comparativo socio-economico, non una descrizione completa della qualità di vita o una classificazione individuale.

#### Censimento e analisi dotazioni
Analisi della rete scolastica, inventari, ordini, localizzazione e stato di verifica documentale. Le sedi non validate, prive di coordinate o con informazioni discordanti restano in riserva.

#### Dotazioni realizzate
Inventario delle strutture e dei servizi documentati come esistenti. La presenza in inventario non equivale sempre alla certificazione di apertura, gestione o piena fruibilità attuale: gli stati documentali sono esplicitati.

#### Dotazioni analizzate · PRG e standard urbanistici
Lettura delle previsioni e delle destinazioni urbanistiche del PRG, dei parametri normativi e dei fabbisogni teorici. È distinta dalle dotazioni effettivamente realizzate. In assenza di superfici attuate e validate, deficit e surplus reali non sono certificabili.

#### Verde urbano
Analisi tematica del verde secondo categorie PRG, con distinzione tra destinazioni pubbliche, attrezzate, agricole, collinari e storiche. Layer storici, catastali, Copernicus e OpenStreetMap sono mantenuti separati quando descrivono oggetti, periodi o criteri differenti.

#### Metabolismo urbano e resilienza ecologica
Nuovo modulo che amplia l'analisi oltre la dotazione quantitativa, considerando suolo, acqua, verde, calore, energia e capacità adattiva. Integra un confronto tra due dataset indipendenti di verde accessibile (Copernicus Urban Atlas 2021 e OpenStreetMap 2025), con superficie attribuita, verde per abitante e incidenza indicativa sul territorio. Include una cartografia e un simulatore di interventi.

I risultati del verde accessibile sono aggregati alle UPL mediante punto-on-feature. Questo è un metodo esplorativo e non un clipping esatto: i poligoni che attraversano confini possono essere attribuiti a una sola UPL e le sovrapposizioni delle fonti possono incidere sulle somme. I dataset non sono sommati. Il simulatore produce quantità e volumi teorici, non previsioni idrologiche o microclimatiche.

#### Cartografia GIS
Visualizzazione di confini territoriali e layer tematici, con selezione, controllo e interrogazione delle geometrie. I layer hanno una propria provenienza e sono attivabili separatamente.

#### Analisi spaziale
Esplora distribuzioni, relazioni e prossimità. La lettura dei risultati deve rispettare la scala di disponibilità dei dati: non si attribuiscono automaticamente valori di UPL a una singola sezione censuaria.

#### Confronti
Permette di mettere a confronto unità territoriali per individuare differenze, pattern e possibili priorità.

#### Fonti e metodologia
Documenta dataset, date, riferimenti normativi, elaborazioni, limiti e stato di verifica.

### 5. Principi metodologici
Il Comparatore segue cinque principi:
1. **Tracciabilità:** fonte, anno e metodo devono essere identificabili.
2. **Coerenza spaziale:** ogni indicatore è legato alla scala geografica appropriata.
3. **Separazione concettuale:** previsione di piano, inventario esistente, dato storico e dato derivato non sono intercambiabili.
4. **Trasparenza:** valori mancanti o non validati non vengono sostituiti con stime non dichiarate.
5. **Comparabilità:** gli indicatori sono confrontati solo quando unità, periodo, fonte e perimetro sono coerenti.

### 6. Fonti e archivi
Le principali fonti includono Comune di Palermo e GeoCatalogo, ISTAT, Copernicus, ISPRA/SNPA, OpenStreetMap, documentazione PRG e fonti ufficiali degli istituti e dei servizi.

Gli archivi sono conservati nel repository, in particolare nelle cartelle `data/`, `data/geo/`, `data/geo/prg/` e `data/metabolism/`. Le procedure di controllo qualità sono in `tools/` e nei workflow GitHub Actions.

### 7. Limiti e sviluppi
- Non tutti gli indicatori hanno una copertura territoriale completa o un aggiornamento omogeneo.
- Alcune geometrie richiedono ulteriori verifiche topologiche.
- Le dotazioni documentate non equivalgono sempre a una verifica sul campo.
- Gli standard urbanistici teorici non certificano superfici realizzate o deficit effettivi.
- Il modulo Metabolismo urbano è in evoluzione: gli indicatori su impermeabilizzazione, copertura arborea, calore e ritenzione idrica saranno pubblicati soltanto dopo acquisizione e validazione dei dataset necessari.
- La piattaforma è statica e dipende da fonti esterne e dalla connessione di rete.

### 8. Sequenza suggerita per la presentazione (8–10 minuti)
1. **Introduzione (1 min):** problema della frammentazione delle informazioni urbane e obiettivo del Comparatore.
2. **Scala territoriale (1 min):** mostrare i filtri Comune, circoscrizione, quartiere, UPL e sezione.
3. **Quadro conoscitivo (2 min):** Panoramica, Demografia, Densità e Analisi sociale.
4. **Servizi e pianificazione (2 min):** distinguere Dotazioni realizzate da Dotazioni analizzate/Standard; mostrare il PRG.
5. **Verde e resilienza (2 min):** Verde urbano e nuovo Metabolismo urbano, evidenziando la distinzione tra dati reali, derivati e simulati.
6. **GIS e confronto (1 min):** cartografia e confronto tra territori.
7. **Conclusione (1 min):** lo strumento come base di conoscenza territoriale, supporto alla diagnosi e orientamento di future analisi e progettazioni.

### 9. Messaggio conclusivo
Il valore del Comparatore non risiede in un singolo indice, ma nella possibilità di mettere in relazione più dimensioni della città, rendere esplicite le differenze territoriali e documentare il percorso che porta dai dati a una lettura critica. La piattaforma è quindi un supporto per comprendere il territorio e formulare domande progettuali, non un sostituto del giudizio urbanistico.
