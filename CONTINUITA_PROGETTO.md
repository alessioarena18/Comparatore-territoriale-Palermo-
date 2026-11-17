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
