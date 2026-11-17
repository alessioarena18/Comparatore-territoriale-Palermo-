# Continuità progetto: Comparatore territoriale di Palermo

## Stato al 17 novembre 2026

Repository: https://github.com/alessioarena18/Comparatore-territoriale-Palermo-  
Branch di pubblicazione: main  
Pull request integrata: #1, "Integra layer separati dei vincoli PRG e pipeline automatizzata"  
Commit di merge: 6ded57c4c41b0c3be25ec9eb25b9f8f8e61f3fc0

## Modifiche integrate

- Pagina **Standard urbanistici**: aggiunto il caricamento indipendente dei vincoli areali, lineari e puntuali del dataset comunale 321.
- La zonizzazione PRG (dataset 320) resta separata dai vincoli (dataset 321), dalle sedi scolastiche e dai servizi OpenStreetMap.
- Aggiunti gli script `tools/acquisisci_prg_comune.py`, `tools/convert_prg_shapefiles.py` e `tools/qa_prg_geojson.py`.
- Aggiunta la GitHub Action `.github/workflows/acquisisci-prg.yml`: esecuzione manuale, dopo modifiche agli script e pianificazione mensile. Dopo il QA, i GeoJSON vengono committati su main se il peso totale non supera 85 MB; in caso contrario sono conservati come artifact.
- La conversione conserva i diversi shapefile e suddivide il dataset 321 per famiglia geometrica, senza accorpare linee e poligoni.

## Fonti

- Dataset 320: https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320
- Dataset 321: https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321
- GeoCatalogo: https://geocatalog.comune.palermo.it/geonetwork/srv/api/records/96d68279-f346-45b9-99f9-b2f08d827f52
- Procedimenti/varianti urbanistiche più recenti SITR: https://www.sitr.regione.sicilia.it/comune-di-palermo-variante-urbanistica-parziale-al-vigente-p-r-g/

## Verifiche e limiti

La pipeline controlla struttura GeoJSON, presenza delle geometrie, coordinate WGS84 e plausibilità geografica generale. Questi controlli non certificano topologia, proprietà, attuazione, destinazione effettiva o vigenza urbanistica. I dataset 320 e 321 ricostruiscono la Variante Generale con presa d'atto DCC 7/2004; non devono essere presentati come disciplina attuale senza confronto con NTA, tavole e atti successivi.

## Prossimi passi

1. Controllare in GitHub Actions l'esecuzione "Acquisizione cartografia PRG Palermo" attivata dopo il merge.
2. Se il workflow fallisce, leggere i log del job e correggere download, estrazione o conversione. Se completa, verificare l'artifact e il commit automatico dei GeoJSON.
3. Aprire i GeoJSON in QGIS: CRS, copertura, geometrie invalide, sovrapposizioni, attributi e legenda.
4. Confrontare la disciplina 2004 con gli atti successivi e con la documentazione SITR aggiornata al 2026.
5. Solo dopo tali controlli, aggiornare descrizioni, legenda e indicatori della pagina Standard urbanistici. Non stimare superfici effettivamente disponibili a partire dalla sola zonizzazione.

## Continuità tra conversazioni

In una nuova conversazione, riprendere dal presente documento e dal repository main. Non usare copie ZIP precedenti come fonte di verità se il branch main è più aggiornato.

## Aggiornamento tecnico del 17 novembre 2026

Pull request successive integrate in `main`:
- #2: correzione del nome artifact GitHub Actions.
- #3: lettura robusta dei testi degli shapefile, con fallback CP1252 quando il GeoJSON temporaneo non è UTF-8 valido.
- #4: suddivisione del dataset 321 per geometria effettiva e aggiunta del layer cartografico per geometrie miste.
- #5: esplosione delle GeometryCollection in geometrie semplici, tracciamento delle feature prive di geometria nei metadati e nel report QA; etichette dei vincoli esplicitamente riferite alla Variante Generale 2004.

Esecuzioni osservate:
- Run 44094740706: pubblicazione GitHub Pages completata con esito success.
- Run 44094709168: acquisizione bloccata da caratteri legacy non UTF-8.
- Run 44095082400: stesso errore di codifica, prima della correzione.
- Run 44095171998: download, conversione e controlli di sintassi superati; QA fermata da una feature sorgente priva di geometria.
- Run 44095279686: stessa QA pre-normalizzazione.
- Run 44095465462: nuova esecuzione dopo la normalizzazione geometrica, ancora in corso al momento dell'aggiornamento.

Riscontro preliminare sui dati sorgente:
- Dataset 320: 5.880 feature lette in conversione; una feature è risultata priva di geometria ed è stata esclusa dall'output cartografico, con conteggio nei metadati.
- Dataset 321: presenti geometrie miste; la conversione aggiornata separa le componenti di GeometryCollection e conserva il riferimento allo shapefile e all'indice della parte.
- La conversione precedente aveva già prodotto 99 geometrie lineari e 662 feature nel gruppo misto proveniente da `Vincoli_Ariali.shp`; tali conteggi vanno verificati nel run definitivo dopo l'esplosione.

Stato attuale: i GeoJSON finali non vanno considerati pubblicati finché il run 44095465462 non conclude QA e upload/commit. Le verifiche strutturali e geografiche preliminari non certificano la topologia né la vigenza urbanistica. La denominazione cartografica deve restare riferita alla Variante Generale 2004 e accompagnata dall'avvertenza sulle varianti successive.
