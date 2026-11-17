# Cartografia PRG: acquisizione e controlli

Fonti comunali:
- [Dataset 320: zonizzazione PRG](https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320), catalogo aggiornato 10/01/2018.
- [Dataset 321: vincoli della Variante Generale](https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321), catalogo aggiornato 06/09/2021.
- [Record GeoCatalogo](https://geocatalog.comune.palermo.it/geonetwork/srv/api/records/96d68279-f346-45b9-99f9-b2f08d827f52).

## Layer acquisiti il 17 novembre 2026

- Dataset 320: `prg_320_vg_zonizzazione.geojson`, 5.879 geometrie cartografiche valide su 5.880 record sorgente. Una feature priva di geometria è stata esclusa e conteggiata in `metadata.json` e `qa_prg.json`.
- Dataset 321: `prg_vincoli_areali.geojson`, 662 poligoni.
- Dataset 321: `prg_vincoli_lineari.geojson`, 100 linee. Il conteggio include una componente lineare estratta da una GeometryCollection originariamente presente nello shapefile areale, oltre alle 99 linee dello shapefile lineare.
- Le famiglie puntuali e miste non hanno file nel rilascio acquisito e non sono mostrate come overlay vuoti.

La pipeline scarica gli ZIP originali, ne registra hash SHA-256 e dimensione, estrae gli shapefile e li converte in GeoJSON WGS84. I dati sorgente mantengono il riferimento allo shapefile; le parti esplose conservano anche l'indice della geometria di origine. Le date del catalogo sono metadati di pubblicazione e non certificano la vigenza urbanistica.

## Controlli e limiti

Il QA controlla struttura FeatureCollection, geometrie presenti, coordinate WGS84 e intersezione con un inviluppo geografico ampio di Palermo. Il run del 17/11/2026 ha superato questi controlli su tre layer. Non certifica topologia, validità catastale, confini, classificazione normativa, proprietà, attuazione, accessibilità, disponibilità o vigenza.

I dataset 320 e 321 ricostruiscono la Variante Generale con presa d'atto DCC 7/2004. Le geometrie e i codici devono essere letti con NTA, tavole e atti successivi. Il SITR documenta procedimenti urbanistici più recenti: ogni variante va verificata per perimetro, approvazione ed efficacia prima di applicarla all'analisi.

## Esecuzione

GitHub → Actions → Acquisizione cartografia PRG Palermo. La pipeline si attiva dopo modifiche agli script e ha una pianificazione mensile. Dopo QA, i GeoJSON vengono committati su main se la cartella resta sotto 85 MB; l'artifact del run viene conservato per 30 giorni.

Licenza dichiarata dai dataset comunali: CC BY 4.0 IT.
