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
