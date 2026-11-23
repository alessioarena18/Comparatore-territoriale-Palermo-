# Verifica tecnica · 24 novembre 2026

## Stato repository
- Repository: `alessioarena18/Comparatore-territoriale-Palermo-` (nome con trattino finale).
- Branch: `main`.
- Repository pubblico e accessibile; permessi di scrittura confermati tramite GitHub connector.
- Il controllo della sintassi applicativa ha individuato e corretto una virgola mancante nell'oggetto `pages` di `app.js`, che causava un errore JavaScript.

## Metabolismo urbano e resilienza ecologica
La sezione esistente è stata estesa con il file `metabolism-data.js`, caricato da `index.html`, e con stili dedicati in `styles.css`.

Funzionalità aggiunte:
- lettura delle geometrie ISTAT 2021 di circoscrizioni, quartieri e 55 UPL;
- caricamento dei dataset verdi indipendenti Copernicus Urban Atlas 2021 e OpenStreetMap 2025;
- aggregazione esplorativa per UPL tramite point-on-feature e aggregazione delle UPL a quartieri e circoscrizioni;
- indicatori: superficie verde attribuita, verde per abitante e incidenza indicativa sul territorio;
- confronto tra fonti, cartografia Leaflet con layer attivabili e ranking delle UPL;
- simulatore di quantità di intervento: nuova superficie verde, de-impermeabilizzazione, rain garden e precipitazione di scenario;
- avvertenze metodologiche su attribuzione per centroide, sovrapposizioni, accessibilità e limiti delle stime.

### Dataset controllati
| Fonte | Feature | Somma attributi area_sqm |
|---|---:|---:|
| Copernicus Urban Atlas 2021 · verde accessibile | 129 | 3.356.826,97 m² |
| OpenStreetMap 2025 · verde accessibile mappato | 118 | 4.292.042,34 m² |

Le superfici sono somme degli attributi dei dataset, non union topologiche certificate. Le due fonti non vengono sommate. La copertura arborea, l'impermeabilizzazione, il calore urbano e la ritenzione idrologica non sono ancora misurati direttamente nel nuovo modulo.

## Documentazione
- `data/metabolism/metadata.json`: catalogo dataset, formule, fonti, licenze e limiti.
- `tools/qa_metabolism_data.py`: controllo riproducibile delle FeatureCollection, conteggi, codici territoriali, aree dichiarate, popolazione UPL e riferimenti al modulo.
- `PRESENTAZIONE_UNIVERSITARIA.md`: guida alla presentazione, architettura, moduli, metodologia, limiti e sequenza suggerita.
- README aggiornato con la struttura attuale e il nuovo modulo.

## Controlli automatici
Run GitHub Actions **Add dataset totals and territorial assignment coverage to metabolism…** (commit `403e32844d39f0e72e918a5329c4f0672b02f110`) concluso con esito **SUCCESS**:
- sintassi JavaScript: superata;
- sintassi Python: superata;
- whitespace/patch: superato;
- audit integrità dei dataset territoriali: superato;
- QA Metabolismo urbano: superata;
- verifica layer PRG pubblicati: superata.

La verifica è statica e automatizzata; non sostituisce il collaudo manuale in browser su desktop e smartphone.

## Limiti e attività ancora aperte del Comparatore
- Validazione topologica in QGIS delle tre sezioni censuarie segnalate nell'audit precedente.
- Acquisizione e validazione delle superfici effettive delle dotazioni urbanistiche, prima di calcolare deficit/surplus reali.
- Completamento della classificazione documentale delle sedi scolastiche ancora non classificate.
- Verifica puntuale delle sedi scolastiche prive di coordinate.
- Ulteriore integrazione di servizi territoriali solo con fonti e coordinate documentate.
- Nel modulo Metabolismo: acquisizione e validazione dei raster Copernicus TCD e dei dataset su impermeabilizzazione, temperature superficiali e rischio idraulico, per sostituire gradualmente le letture esplorative con indicatori GIS verificati.

## Nota sulla presentazione
Il nuovo modulo è presentabile come **prima analisi territoriale derivata e comparativa**, non come indice certificato di resilienza. Per la presentazione è importante distinguere i dataset reali, i risultati aggregati con metodo esplorativo e le simulazioni.

