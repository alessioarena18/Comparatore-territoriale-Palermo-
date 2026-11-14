# Comparatore territoriale di Palermo – versione avanzata

Questa è una base applicativa avanzata e pubblicabile con GitHub Pages. Non contiene dati territoriali inventati: i moduli restano esplicitamente in attesa finché i dataset non sono stati acquisiti, normalizzati e verificati.

## Moduli
Panoramica, demografia, analisi sociale, scuole, standard urbanistici, GIS, analisi spaziale, confronti, fonti e metodologia.

## Installazione
Caricare **il contenuto** di questo archivio nella radice del repository GitHub, sovrascrivendo i file omonimi. In particolare `styles.css` sostituisce il file precedente `stili.css`: il nome deve corrispondere a quello richiamato da `index.html`.

Dopo il commit, GitHub Pages pubblica il ramo `principale` dalla cartella radice, se questa è la configurazione già impostata nel repository.

## Dati
Schema applicativo in `data/territoriale.json`. Gli array sono volutamente vuoti. Non inserire valori aggregati finché non è verificata la relazione tra codici delle sezioni censuarie e confini di quartieri/circoscrizioni.

Fonti da usare:
- Comune di Palermo, popolazione residente 31/12/2022 per sezione e classi quinquennali: https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1706
- ISTAT, dati censuari 2023 per sezioni e aree subcomunali: https://www.istat.it/notizia/dati-per-sezioni-di-censimento/
- USR Sicilia, open data delle istituzioni scolastiche: https://www.usr.sicilia.it/open-data/

## Schema minimo del JSON
- `meta`: stato, data aggiornamento, note.
- `territories.circoscrizioni`: oggetti `{ "id": "...", "name": "..." }`.
- `territories.quartieri`: oggetti `{ "id": "...", "name": "...", "circ_id": "..." }`.
- `demografia`: record validati con `territorio_id`, `anno`, `pop_totale`, `maschi`, `femmine`, `eta_0_14`, `eta_15_64`, `eta_65_plus`, `fonte`.
- `scuole`: oggetti con identificativo, denominazione, tipologia, indirizzo, latitudine, longitudine, anno scolastico e fonte.
- `standard`: oggetti con territorio, categoria, superficie, unità, anno e fonte.
- `geojson`: FeatureCollection GeoJSON con proprietà `territorio_id` e `nome`.

## Limiti e criteri
La mappa usa Leaflet e cartografia OpenStreetMap via rete. Il sito è statico: non ha database server né autenticazione. Gli aggiornamenti automatici richiedono un flusso GitHub Actions separato e la verifica dei tracciati delle fonti prima di automatizzare la trasformazione.


## Integrazione cartografica ISTAT 2021 – protocollo operativo

### Archivi primari
- Sezioni censuarie Sicilia: [R19_21.zip](https://www.istat.it/storage/cartografia/basi_territoriali/2021/R19_21.zip)
- Aree subcomunali: [ASC_21.zip](https://www.istat.it/wp-content/uploads/2025/04/ASC_21.zip)
- Documentazione tecnica: [descrizione dei dati geografici e delle variabili censuarie](https://www.istat.it/wp-content/uploads/2024/07/Descrizione-dei-dati-Basi-territoriali.pdf)

### Campi delle aree subcomunali
Per le tabelle ASC 2021 documentare almeno: `PRO_COM`, `COM_ASCn`, `COD_ASCn`, `COD_ASCn_T`, `DEN_ASCn`, `TIPO_ASCn`. I livelli ASC1, ASC2 e ASC3 non sono intercambiabili. Per Palermo la documentazione ISTAT contempla anche il livello ASC3, coerente con il perimetro delle UPL utilizzato nell'analisi sociale; la corrispondenza effettiva va comunque verificata sui codici e sulle geometrie.

### Strumento riproducibile per preparare i layer ISTAT

Nel repository è disponibile `tools/prepara_cartografia_istat.py`. Lo script lavora su shapefile già scaricati ed estratti dall'utente; non scarica gli archivi e non modifica i dati originali.

1. Scaricare gli archivi ufficiali [R19_21.zip](https://www.istat.it/storage/cartografia/basi_territoriali/2021/R19_21.zip) e [ASC_21.zip](https://www.istat.it/wp-content/uploads/2025/04/ASC_21.zip).
2. Estrarre gli archivi in due cartelle distinte.
3. Installare Python e le dipendenze: `pip install geopandas pyogrio`.
4. Dalla cartella principale del repository eseguire, adattando i percorsi:

```bash
python tools/prepara_cartografia_istat.py --sezioni "/percorso/R19_21" --asc "/percorso/ASC_21" --out "data/geo"
```

Lo script cerca il codice comunale ISTAT 082053, verifica che il CRS sia dichiarato e coerente tra gli shapefile selezionati, controlla geometrie nulle/vuote/non valide e produce GeoJSON EPSG:4326 più un rapporto JSON. Se il CRS manca o differisce, blocca l'unione. Non ripara geometrie e non certifica topologia, copertura o corrispondenza amministrativa.

**Importante:** i GeoJSON generati sono output tecnici preliminari. Prima di inserirli nella pubblicazione occorre verificare i campi identificativi, le denominazioni, il livello ASC corretto, i duplicati, la copertura e le sovrapposizioni in QGIS. Lo script non modifica né attiva il modulo Analisi sociale.

### Abbinamento tra geometrie 2021 e dati censuari 2023

Il rilascio ISTAT del 31/12/2023 utilizza le Basi Territoriali 2021. L'abbinamento deve quindi essere effettuato attraverso il codice ufficiale della sezione censuaria, non attraverso il nome del quartiere o una corrispondenza testuale. Prima dell'unione occorre:
- verificare che i codici delle sezioni nei dati 2023 siano riferiti ai Comuni al 31/12/2021;
- controllare unicità e formato del codice su entrambi i dataset;
- registrare le righe senza corrispondenza e quelle con più corrispondenze, senza eliminarle automaticamente;
- mantenere separate le sezioni fittizie `888888x` (persone senza tetto e senza fissa dimora) e `999999x` (zone in contestazione), che non rappresentano normali poligoni territoriali;
- effettuare la quadratura dei totali dopo l'unione, esplicitando eventuali differenze dovute a sezioni non geografiche o a dati mancanti.

La popolazione anagrafica comunale 2022, i dati censuari ISTAT 2023 e le geometrie 2021 restano tre basi distinte: non vanno fuse in un unico indicatore senza dichiarare anno, fonte, scala e criterio di aggregazione.

### Pipeline di validazione prima della pubblicazione
1. Conservare gli ZIP originali e registrare URL, data di acquisizione, dimensione e impronta SHA-256.
2. Estrarre gli shapefile e verificare encoding, CRS dichiarato, campi e numero di record.
3. Filtrare il Comune di Palermo usando il codice ISTAT ufficiale, non il solo nome.
4. Controllare geometrie nulle/non valide, multipart, duplicati, sovrapposizioni, vuoti e copertura.
5. Confrontare codici e denominazioni con le tabelle ISTAT e con l'assetto locale, documentando le differenze.
6. Esportare una copia web in GeoJSON EPSG:4326; conservare separatamente gli originali e i codici.
7. Eseguire un controllo finale di conteggi, estensione geografica e rendering in Leaflet.

**Regola di rilascio:** fino al completamento dei controlli e alla registrazione dell'esito, i layer restano non validati e non vengono utilizzati per conteggi, aggregazioni o mappe tematiche. La cartografia di base OpenStreetMap non costituisce una base statistica ufficiale.

### Stato al 12 novembre 2026

Gli archivi originali `R19_21.zip` e `ASC_21.zip` sono stati acquisiti ed elaborati localmente. Per il Comune di Palermo (codice ISTAT 082053) sono stati estratti quattro livelli in GeoJSON EPSG:4326:

| Livello | Feature | Popolazione POP21 | Geometrie non valide |
|---|---:|---:|---:|
| Sezioni censuarie | 3.600 | 635.439 | 3 |
| Circoscrizioni (ASC1) | 8 | 635.439 | 0 |
| Aree subcomunali (ASC2) | 25 | 635.439 | 0 |
| Aree subcomunali (ASC3) | 55 | 635.439 | 0 |

I codici `COM_ASC1`, `COM_ASC2` e `COM_ASC3` delle sezioni trovano corrispondenza completa nei rispettivi livelli territoriali. Il rapporto dettagliato è versionato in `data/geo/rapporto_controllo_istat_palermo_2021.json`.

**Stato di validazione: preliminare.** Tre geometrie di sezione presentano auto-intersezioni e sono state mantenute senza correzione: `SEZ21 8`, `2119` e `3803`. I layer non sono ancora certificati per analisi topologiche o statistiche. Prima dell'attivazione pubblica occorre la verifica in QGIS delle tre geometrie e delle sovrapposizioni tra livelli.

Il totale `POP21=635.439` è censuario 2021 e resta distinto dall'anagrafe comunale 2022. Il modulo Analisi sociale non è stato modificato.


## Importazione locale GeoJSON nella sezione GIS

Nel modulo Cartografia GIS è disponibile un controllo preliminare nel browser:
- accetta file GeoJSON di tipo `FeatureCollection`, incluse geometrie composte e raccolte di geometrie;
- controlla le coordinate numeriche e la loro compatibilità approssimativa con l'area di Palermo;
- segnala geometrie mancanti o vuote, anelli poligonali non chiusi o troppo brevi, tipi geometrici non riconosciuti, proprietà mancanti e identificativi duplicati;
- visualizza il layer solo se i controlli preliminari non rilevano anomalie;
- permette di scaricare un rapporto testuale e di rimuovere il layer dalla mappa.

Il file viene elaborato localmente nel browser: non viene caricato su GitHub e non resta disponibile dopo il ricaricamento della pagina. I file da sottoporre al controllo devono essere ritagliati sull'area di Palermo ed esportati da QGIS in WGS 84 (EPSG:4326).

**Limiti:** il controllo delle coordinate non trasforma né certifica il sistema di riferimento. Non sostituisce la validazione topologica GIS, la verifica di autointersezioni e sovrapposizioni, la corrispondenza dei codici ISTAT, la verifica della copertura e la validazione della fonte. Un layer visualizzato è quindi solo ispezionabile, non automaticamente certificato o utilizzabile per calcoli statistici.


## Aggiornamento anagrafica scolastica – 14 novembre 2026

La sezione **Servizi e dotazioni** integra ora due archivi aggiuntivi:

- `data/anagrafica_plessi_2025_26.json`: 401 record, uno per codice meccanografico di plesso, con ordine scolastico, denominazione, consistenza alunni/classi e collegamento al registro delle istituzioni 2026/27 effettuato esclusivamente per codice istituzione esatto.
- `data/verifica_sedi_scolastiche_v13.json`: crosswalk documentale delle 73 sedi comunali incluse nella verifica v13, con istituzione candidata corretta, stato della verifica, fonte ufficiale e nota istruttoria.

I dati statistici USR e i punti cartografici comunali restano distinti. La verifica dell'istituzione non viene utilizzata per attribuire automaticamente tutti gli ordini scolastici al singolo edificio. I codici di plesso e quelli di istituzione sono campi separati.

Esito del controllo di join del registro:
- 401 codici di plesso distinti;
- 395 record con codice istituzione coincidente nel registro 2026/27;
- 6 record mantenuti e segnalati per riallineamento.

La tabella statistica della sezione scuole mostra ora anche codice, denominazione e indirizzo dell'istituzione 2026/27, oltre all'esito del collegamento. La mappa e l'elenco delle sedi espongono la verifica documentale e la relativa fonte quando disponibile.

Fonte statistica: USR Sicilia, Organico di fatto 2025/26, IODL 2.0. Fonti cartografiche: Comune di Palermo, catalogo scuole 2021. Verifiche istituzionali: siti ufficiali scolastici e documentazione pubblica riportata nel crosswalk v13.


## Raccordo documentale delle istituzioni annesse – 14 novembre 2026

I sei record che non trovavano corrispondenza automatica nel registro delle istituzioni 2026/27 appartengono a due complessi scolastici: Convitto Nazionale Giovanni Falcone ed Educandato Statale Maria Adelaide. Il raccordo è stato completato sulla base delle pagine e dei documenti ufficiali dei due istituti. Per i plessi del Convitto è stato usato il codice dell'istituzione principale PAVC010006; per quelli dell'Educandato PAVE010005. I codici di plesso e i codici storici di settore restano distinti e conservati. I sei record sono marcati `ASSOCIAZIONE_DOCUMENTALE_CONFERMATA`, non come match automatici per codice esatto. Fonti: [Convitto Nazionale, iscrizioni 2026/27](https://www.convittonazionalepalermo.edu.it/avviso-iscrizioni-a-s-2026-2027/); [Educandato, PTOF 2025-2028](https://www.educandatomariadelaide.it/wp-content/uploads/2026/01/PTOF-2025-2028.pdf).


## Rettifica delle etichette cartografiche – 14 novembre 2026

La verifica dei siti ufficiali ha permesso di correggere due denominazioni del catalogo comunale 2021: il punto di via Dogali è il plesso Emanuela Loi (non Tomasi di Lampedusa); il punto di via Serradifalco 3 è il plesso Ievovella (non Manzoni/Impastato). Per Manzoni-Impastato, la sede Manzoni è in via Filippo Parlatore 56, il plesso Impastato in via Girolamo Di Martino 42 e il plesso La Pira in via Pietro Merenda. Fonti: [IC Boccadifalco-Tomasi di Lampedusa](https://www.icboccadifalcotomasidilampedusa.edu.it/la-scuola/dove-siamo); [IC Manzoni-Impastato](https://www.manzoniimpastato.edu.it/); [PTOF Manzoni-Impastato](https://www.manzoniimpastato.edu.it/manzoniimpastato/index.php?id=9b2e035e5362c96aea4c28083f02d6ff&option=com_cwattachments&sid=2d2704862c17307a4c13c2c9e2c9e859&task=open).


## Ulteriori correzioni documentali – 14 novembre 2026

Sono state corrette altre due etichette del catalogo cartografico: il punto di via Francesco De Gobbis 13 è il plesso Leonardo Sciascia (secondaria di I grado, codice PAMM870015) dell’IC Leonardo Sciascia PAIC870004, non “Sciacca”; il punto di via Messina Marine 811 è il plesso Casa del Fanciullo (infanzia PAAA85501V e primaria PAEE855025) dell’IC Renato Guttuso PAIC855002, non la sede genericamente denominata “R. Guttuso”. Fonti: [IC Leonardo Sciascia – luoghi](https://www.istitutosciascia.edu.it/luogo/); [PTOF IC Leonardo Sciascia](https://www.istitutosciascia.edu.it/wp-content/uploads/2024/02/PAIC870004-202225-202324-20240113.pdf); [USR Sicilia – elenco plessi 2025/26](https://www.usr.sicilia.it/download/4650/28939/28963/elenco-istituti-scolastic-iregione-sicilia_scuola-attiva-infanzia_m_pi-aoodrsi-registro-ufficialeu-0061221-02-12-2025.pdf).


## Chiusura della verifica delle ultime due posizioni – 14 novembre 2026

**Perez-Madre Teresa di Calcutta (kml-school-196):** è confermata l'istituzione PAIC81300X, ma resta in riserva l'associazione del punto KML di via Vincenzo Errante 1 a un edificio scolastico. La Carta dei Servizi Educativi del Comune di Palermo (agosto 2024) distingue la sede amministrativa di Piazza Perez 1, il plesso Perez in via D'Ondes Reggio 1 e il plesso Madre Teresa di Calcutta in via Maqueda 53; l'anagrafe scolastica 2024/25 identifica la secondaria PAMM813011 in via Fiume 14. Non sono trasferite coordinate né assegnati codici di plesso al punto KML senza riscontro.

**Nazario Sauro (kml-school-46):** il punto KML in via Padre Giuseppe Puglisi 20 non è stato associato a un istituto. Le fonti ufficiali collocano il plesso Nazario Sauro in via Nazario Sauro 11 o viale Amedeo D'Aosta 20; il plesso Padre Giuseppe Puglisi dell'IC Sperone-Pertini è in via Nicolò Giannotta 4. Il punto è quindi marcato come non verificato, con istituzione non attribuita e nessun ordine scolastico assegnato. La geometria originale è conservata.

Fonti: [Carta dei Servizi Educativi del Comune di Palermo, agosto 2024](https://docs.comune.palermo.it/js/server/uploads/trasparenza_all/_09092024085419.pdf); [USR Sicilia, organico secondaria I grado 2024/25](https://gildapalermo.it/wp-content/uploads/2024/05/I-Grado-Organico-di-Diritto-24-25.pdf); [Direzione Didattica De Amicis, plesso Nazario Sauro](https://www.deamicispa.edu.it/index.php/plessi/plesso-nazario-sauro); [IC De Amicis-Da Vinci, sede Nazario Sauro](https://www.icdeamicisdavinci.edu.it/la-scuola/dove-siamo/plesso-nazario-sauro); [IC Sperone-Pertini, plesso Padre Giuseppe Puglisi](https://www.icssperonepertini.it/sedi_plesso_puglisi.html).


## Integrazione della rete scolastica con i filtri territoriali – 14 novembre 2026

La pagina Servizi e dotazioni urbane include un riepilogo dinamico della rete scolastica che risponde alla selezione territoriale condivisa: circoscrizione, quartiere, UPL/ASC3 e sezione censuaria. Il conteggio distingue i punti cartografici totali dai punti per cui è documentato almeno un ordine scolastico; il dettaglio per ordine è una presenza di servizi e può sovrapporsi nello stesso edificio. Non viene presentato come numero di istituzioni né come numero di alunni. È stato inoltre corretto il filtro spaziale ASC2 (quartiere) nella mappa scolastica, che prima non applicava quel livello geografico. Il punto Nazario Sauro non verificato resta senza ordine attribuito.


## Controllo di qualità del collegamento statistico-cartografico – 14 novembre 2026

Un controllo incrociato ha individuato quattro associazioni erronee tra record USR 2025/26 e punti KML: Liceo Galilei ↔ Gabelli, Liceo Garibaldi ↔ Garzilli, Liceo Danilo Dolci ↔ Maredolce e Liceo Vittorio Emanuele II ↔ punto Vittorio Emanuele/Capitano Basile. I codici erano presenti come candidati storici nel crosswalk, ma non identificano i plessi fisici rappresentati dai punti. I quattro `mapPointId` sono stati azzerati e marcati `NON_ASSOCIATO_CON_CERTEZZA`, con motivazione puntuale. Non viene quindi presentato alcun join statistico-cartografico come certo finché il codice del singolo plesso non è documentato. Il dato statistico 2025/26 resta consultabile per codice meccanografico, separato dal catalogo cartografico comunale 2021.


**Limite esplicito dell'integrazione statistico-cartografica:** i 401 record USR 2025/26 non sono ancora associati in modo univoco ai 271 punti comunali 2021. Per questo motivo l'applicazione mostra la rete fisica georeferenziata e il registro statistico in pannelli distinti; non attribuisce conteggi di alunni o classi a quartieri, UPL o sezioni censuarie sulla base di corrispondenze nominali o istituzionali non dimostrate.


## Grafici territoriali e raggi di influenza scolastici – 14 novembre 2026

È stato aggiunto un grafico a torta in ciascuna sezione del comparatore. La composizione del grafico è specifica della pagina: popolazione italiana/straniera, classi IDISE delle UPL, distribuzione dei punti scolastici per ordine prevalente, parametri minimi degli standard, livelli cartografici, stato delle analisi spaziali e confronto demografico. Il grafico è descrittivo e non sostituisce gli indicatori tabellari; le categorie scolastiche sono rese mutuamente esclusive usando il primo ordine documentato per il singolo punto, mentre gli edifici con più ordini restano esplicitati nella mappa e nei dati di classificazione.

Nella sezione Standard urbanistici è stata aggiunta una mappa Leaflet con buffer circolari per le sedi scolastiche georeferenziate e classificate: nidi/infanzia 500 m, primaria 800 m, secondaria di I grado 1.000 m e secondaria di II grado 1.500 m. I raggi sono soglie analitiche di prossimità configurate per il confronto, non prescrizioni normative, non isocrone pedonali e non misure di accessibilità effettiva. I buffer non considerano rete stradale, barriere, pendenze o attraversamenti. Le sedi senza ordine scolastico documentato non ricevono buffer; gli edifici con più ordini possono generare buffer sovrapposti. Il riferimento ai 1,5 km per la primaria è coerente con una specifica elaborazione Openpolis sull'accessibilità alle scuole primarie a tempo pieno, ma non è assunto come raggio legale generale.

Fonti metodologiche: D.M. 1444/1968 (standard minimi e criterio dei raggi di influenza nel contesto specifico previsto dall'art. 4); D.M. 18/12/1975 (localizzazione scolastica in rapporto a età, modalità e tempi di percorrenza); Openpolis, analisi sulla prossimità alle scuole primarie a tempo pieno a Palermo (soglia di 1,5 km). I buffer visualizzati sono esplicitamente distinti da una verifica normativa di conformità.


## Primo lotto di collegamenti puntuali tra plessi USR e cartografia comunale – 14 novembre 2026

È stato creato `data/crosswalk_plessi_statistici_v1.json`, che documenta i primi collegamenti verificati tra codici meccanografici USR 2025/26 e punti del catalogo comunale 2021. Il lotto comprende 14 codici di plesso associati a 11 punti fisici, con ordini scolastici, alunni, classi, indirizzo cartografico, fonti e metodo di verifica. Sono stati collegati: Castellana (Boccadifalco), Vitali (infanzia e primaria), Castellana (Buonarroti), De Gasperi primaria, Collodi (infanzia e primaria), Trieste (infanzia e primaria), Vivaldi, Oberdan, Montegrappa, Trinacria e Tomaselli.

Le fonti sono i siti ufficiali degli istituti e i documenti USR Sicilia citati nel crosswalk. Per il plesso Vivaldi è segnalata la differenza di suffisso del civico (20/20 B), pur essendo coerenti strada, denominazione e codice; questo caso va considerato con cautela. Non sono stati collegati i punti De Cosmi, Rosmini, Marabitti, Luinetti, Smith, Garzilli o altri candidati quando l'indirizzo non coincideva, era discordante o la sede fisica non risultava univoca. I codici dell'istituzione principale non sono stati propagati ai singoli plessi.


## Secondo lotto di raccordi puntuali e correzione del codice Maneri-Ingrassia – 14 novembre 2026

Il crosswalk è stato esteso con ulteriori associazioni documentate: Emanuela Loi, Casa del Fanciullo, Padre Kolbe, De Amicis/Nazario Sauro, Capitano Basile, Largo Ercole, Via Villagrazia 110, Scipione Di Castro, Abba/Calcedonio, Marinella Bragaglia, Vittorino da Feltre, Diaz Nuovo, Pirandello-Borgo Ulivia e Maneri-Ingrassia. Sono stati aggiunti i codici relativi agli ordini distinti solo quando la sede fisica è la stessa e la fonte lo dimostra.

**Correzione importante:** il punto KML Maneri-Ingrassia in Viale dei Picciotti 8 è associato al codice PAEE8BB03V (D.D. C. Maneri-Ingrassia). Il codice PAEE8BB01R identifica invece il Plesso Passaggio, in Passaggio dei Picciotti 5, e non deve essere attribuito al punto di Viale dei Picciotti 8. La classificazione del punto è stata corretta e la motivazione documentata.


## Terzo lotto di collegamenti e controllo dei falsi positivi – 14 novembre 2026

Sono stati aggiunti i collegamenti di infanzia e primaria per Riso (Via Mondello 5), Pascoli (Via Nettuno 6), Rosario Gregorio (Via Euridice 24), Santocanale (Via Santocanale 23/B) e Ragusa Moleti (Via Ragusa Moleti 8), oltre a Antonino Agostino (Via Sacco e Vanzetti 42) e Paulsen (Piazzale Cardinale Francesco Carpino 3/5). I codici e gli indirizzi sono riportati nei documenti USR Sicilia 2025/26 e, per Ragusa Moleti, nel PTOF ufficiale 2022-2025.

È stato rimosso il collegamento errato di PAEE8BN03A dal punto KML di Piazza Zisa 21: il documento USR 2025/26 colloca il plesso Pascoli di quel codice in Via Nettuno 6, corrispondente al punto KML kml-school-65. Il punto di Piazza Zisa 21 resta non classificato finché non sarà chiarita documentalmente la co-localizzazione fra la scuola Pascoli dell'IC Antonio Ugo e la sede Gabelli indicata nel KML.


## Quarto lotto di raccordi documentali – 14 novembre 2026

Sono stati aggiunti i plessi Nuccio (infanzia e primaria, Via Mongitore 4), Pertini (infanzia e primaria, Via Felice Cavallotti 1), Buttitta (infanzia e primaria, Via Cimabue 20), Bernini (infanzia e primaria, Via Papaleo 8), Titone (infanzia, Via Titone 45), San Lorenzo (infanzia, primaria e secondaria, Via San Lorenzo 89), Rosolino Pilo (infanzia e primaria, Via Sebastiano La Franca 70) e Via Maestri del Lavoro/Rosolino Pilo (infanzia, Via Maestri del Lavoro 42).

Il PTOF ufficiale dell'IC Uditore/Setti Carraro distingue la sede secondaria Setti Carraro in Via Tiepolo 4 dalla sede Buttitta in Via Cimabue 20; pertanto il codice PAMM8AQ014 non è stato associato al punto cartografico di Via Cimabue 20. La scuola secondaria è mantenuta separata dalla sede di infanzia e primaria.


## Quinto lotto di raccordi documentali – 14 novembre 2026

Sono stati aggiunti i collegamenti per Oreto (infanzia e primaria, Via Oreto 106), Nicolò Turrisi (infanzia e primaria, Piazza Vittorio Emanuele Orlando 3), A. Sole (infanzia e primaria, Via Molara 30), Via Villagrazia (infanzia e primaria, Via Villagrazia 298), A.U. Cagni (infanzia e primaria, Via Cagni 40/42) e D'Angelo (infanzia e primaria, Via San Lorenzo 295). Per i primi quattro plessi sono stati utilizzati elenchi Open Fiber, documenti di trasparenza dell'istituto o pagine istituzionali; per Cagni è stata integrata la Carta dei Servizi comunale.


## Sesto lotto di raccordi e rimozione di due falsi positivi – 14 novembre 2026

Sono stati aggiunti i collegamenti per Ilaria Alpi (Corso dei Mille 1672), Natoli (Corso dei Mille 1486), Mattarella (Viale Di Vittorio 7), Principessa Elena (Via Ustica 46), Abba-Alighieri (Via Ruggero Marturano 77/79), Sunseri (Via Sunseri 19), Randazzo (Via Sperone 79), Via del Vespro/Rosolino Pilo (Via Augusto Elia 1), Boccone (Via del Vespro 72), Guttuso (Via Galletti 78), San Ciro (Via San Ciro 48/A), Virgilio Marone (Via Valdemone 7), Sferracavallo (Via Tacito 34), Ingrassia (Via Statella 21), Giafar (Via Giafar 17), Medaglie d'Oro (Via Deodato 7), Bonanno (Via Pitrè 183), Centro Sociale (Via Palmerino 1), Cuscinà (Via Cuscina 7) e Via del Fervore-Capuana (Via del Fervore 5).

Sono stati rimossi due abbinamenti che la verifica degli indirizzi ha smentito: il codice PAEE8A003L Michelangelo (Via Tindari 52) non corrisponde al punto KML Michelangelo in Largo Michelangelo 15; i codici Livio Bassi PAAA87101R e PAEE871023 (Via Casalini 65) non corrispondono al punto KML Livio Bassi in Salita Castellana 65. Entrambi i punti restano fuori dal crosswalk statistico fino a un riscontro fisico documentale.


## Settimo lotto di collegamenti documentali – 14 novembre 2026

Sono stati aggiunti: Industriale (Via S. Alberto degli Abati, quartiere Sperone), G. Di Vittorio secondaria (Viale Di Vittorio 11), Giuseppe Scelsa secondaria (Via Villani 40, con civico non presente nel KML), Palagonia primaria (Via Principe di Palagonia 46), Verga primaria (Via Uditore 21), P. Borsellino primaria (Largo Camastra 7) e Paladini infanzia (Piazza Benvenuto Cellini 4).

Il punto Michelangelo resta sospeso: il registro scolastico riporta Via Tindari 52, mentre Open Fiber 2022 elenca per lo stesso codice anche Largo Michelangelo 6/11/15. Non si assume una sede univoca finché la possibile multi-sede non è chiarita.


## Ottavo lotto di raccordi documentali – 14 novembre 2026

Sono stati collegati: Industriale infanzia (Via S. Alberto degli Abati), G. Di Vittorio secondaria (Viale Di Vittorio 11), Giuseppe Scelsa secondaria (Via Villani 40), Palagonia primaria (Via Principe di Palagonia 46), Verga primaria (Via Uditore 21), P. Borsellino primaria (Largo Camastra 7) e Paladini infanzia (Piazza Benvenuto Cellini 4). È stato inoltre completato il plesso Bonanno con i codici di primaria PAEE85303E e secondaria PAMM85301B, oltre all'infanzia PAAA853028: il PTOF ufficiale 2025-2028 conferma che il plesso di Via Pitrè 183 ospita tutti e tre gli ordini.


## Nono lotto di raccordi e distinzione codice istituzione/codice plesso – 14 novembre 2026

Sono stati collegati i codici di plesso PAMM8AQ014 (Setti Carraro, Via Tiepolo 4), PAMM8BB01Q (Don Milani, Passaggio dei Picciotti 3) e PAMM8BE017 (Raimondo Franchetti, Viale Amedeo d'Aosta 52/54). Nei record di classificazione sono stati rimossi i codici istituzione PAIC8AQ003 e PAIC8BB00P dai campi destinati ai codici di plesso: restano identificativi delle istituzioni comprensive e non devono essere confusi con i codici dei singoli edifici/plessi.


## Stato consolidato del crosswalk – 14 novembre 2026

Dopo i lotti successivi di verifica, il raccordo contiene **104 codici di plesso associati a 76 punti cartografici**. Restano 297 record statistici senza un collegamento fisico univoco: non sono forzati su una sede per semplice somiglianza nominale. Il crosswalk conserva anche i candidati non associati e le motivazioni dei conflitti.

Sono stati rimossi dal livello di classificazione i candidati che presentavano discrepanze verificabili tra civici, indirizzi o tipologia istituzionale: Barone Scala, De Cosmi, Impastato, Fondo Petrazzi, Bentivegna, Lambruschini, Conte Federico, Garibaldi, Sacco e Vanzetti e Mancini. Turrisi Colonna resta in sospeso perché un solo codice è riferito a due corpi distinti e il modello deve supportare in modo esplicito le associazioni uno-a-molti.


## Gestione dei campus con più corpi – 14 novembre 2026

È stata introdotta la relazione uno-a-molti per i codici di plesso che insistono su più corpi cartografici. Per il campus Turrisi Colonna, il PTOF dell'IC Rita Atria documenta infanzia PAAA8AB022 e primaria PAEE8AB016 in Piazza Gran Cancelliere 1; la cartografia comunale distingue Corpo A e Corpo B. I due codici sono collegati a entrambi i corpi e la tabella statistica presenta due azioni di apertura separate. Per Valverde-Ferrara, il PTOF documenta infanzia PAAA8AB033 in Via Valverde 1 e primaria PAEE8AB038 in Via Valverde 2; il punto KML, privo di civico, rappresenta il campus a livello di strada.


## Riepilogo consolidato del raccordo scolastico – 14 novembre 2026

Stato dopo l'ultimo lotto: **108 codici di plesso collegati a 79 punti cartografici**, su 401 record statistici USR. Restano **293 codici** senza collegamento fisico univoco, mantenuti separati per evitare attribuzioni errate. Due codici scolastici sono collegati a due corpi cartografici distinti (Turrisi Colonna Corpo A e Corpo B) tramite il campo `mapPointIds`; la tabella dell'applicazione presenta un'azione separata per ciascun corpo. Il conteggio dei punti fisici è calcolato sull'unione degli identificativi, non sul numero dei codici.


## Quinto lotto di collegamenti documentali – 14 novembre 2026

Aggiunti i codici di infanzia e primaria del Plesso Salerno (IC Cruillas), entrambi in Via Salerno 19, e i codici di infanzia e primaria della sede centrale Garzilli in Via Isonzo 7. La fonte ufficiale Garzilli distingue la sede centrale dal plesso Trinacria, pertanto i codici sono associati esclusivamente alla sede centrale.


## Sesto lotto e grafico territoriale degli standard – 14 novembre 2026

È stato collegato il codice di infanzia PAAA84802R al punto Don Milani di Via Sferracavallo 132, sulla base dell'elenco ufficiale USR 2025/26. Il codice della primaria PAEE848011 non è stato associato perché le fonti consultate riportano civici discordanti e richiedono un controllo ulteriore.

Nella sezione Standard urbanistici, il grafico a torta è stato reso territoriale e dinamico: mostra la distribuzione dei punti scolastici classificati per ordine, applicando i filtri di circoscrizione, quartiere, UPL e sezione censuaria. La mappa degli standard mantiene i raggi indicativi distinti per ordine: nido 500 m, infanzia 500 m, primaria 800 m, secondaria di I grado 1.000 m, secondaria di II grado 1.500 m. I raggi sono parametri di analisi impostati nell'applicazione, non distanze normative o tempi di percorrenza.
