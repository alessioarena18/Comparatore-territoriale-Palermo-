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
Sono stati registrati i collegamenti diretti agli archivi ISTAT e aggiunto il protocollo operativo nell'interfaccia GIS. Gli archivi binari non risultano ancora acquisiti e verificati nel repository; pertanto non è dichiarata alcuna geometria pronta all'uso. Il modulo Analisi sociale non è stato modificato.


## Importazione locale GeoJSON nella sezione GIS

Nel modulo Cartografia GIS è disponibile un controllo preliminare nel browser:
- accetta file GeoJSON di tipo `FeatureCollection`, incluse geometrie composte e raccolte di geometrie;
- controlla le coordinate numeriche e la loro compatibilità approssimativa con l'area di Palermo;
- segnala geometrie mancanti o vuote, anelli poligonali non chiusi o troppo brevi, tipi geometrici non riconosciuti, proprietà mancanti e identificativi duplicati;
- visualizza il layer solo se i controlli preliminari non rilevano anomalie;
- permette di scaricare un rapporto testuale e di rimuovere il layer dalla mappa.

Il file viene elaborato localmente nel browser: non viene caricato su GitHub e non resta disponibile dopo il ricaricamento della pagina. I file da sottoporre al controllo devono essere ritagliati sull'area di Palermo ed esportati da QGIS in WGS 84 (EPSG:4326).

**Limiti:** il controllo delle coordinate non trasforma né certifica il sistema di riferimento. Non sostituisce la validazione topologica GIS, la verifica di autointersezioni e sovrapposizioni, la corrispondenza dei codici ISTAT, la verifica della copertura e la validazione della fonte. Un layer visualizzato è quindi solo ispezionabile, non automaticamente certificato o utilizzabile per calcoli statistici.
