# Cartografia PRG: acquisizione e controlli

Fonti comunali:
- [Dataset 320: zonizzazione PRG](https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320), catalogo aggiornato 10/01/2018.
- [Dataset 321: vincoli vigenti](https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321), catalogo aggiornato 06/09/2021.
- [Record GeoCatalogo](https://geocatalog.comune.palermo.it/geonetwork/srv/api/records/96d68279-f346-45b9-99f9-b2f08d827f52).

La pipeline scarica gli ZIP, estrae tutti gli shapefile e li converte in GeoJSON WGS84. Ogni layer del dataset 320 viene conservato separatamente; il dataset 321 viene suddiviso per famiglie geometriche (areali, lineari, puntuali e miste). La mappa Standard urbanistici attiva separatamente i vincoli areali, lineari e puntuali.

Esecuzione: GitHub → Actions → Acquisizione cartografia PRG Palermo → Run workflow. La pipeline si attiva anche quando i suoi script vengono modificati su main e ha un controllo mensile. Dopo il QA, i GeoJSON vengono committati automaticamente se la cartella PRG resta sotto 85 MB; altrimenti sono conservati come artifact.

Il QA controlla FeatureCollection, geometrie, coordinate WGS84 e intersezione con un inviluppo geografico ampio di Palermo. Non certifica topologia, confini, classificazione, proprietà, attuazione o vigenza. Dataset 320 e 321 ricostruiscono la Variante Generale con presa d'atto DCC 7/2004: confrontare sempre con NTA, tavole, varianti e atti successivi. Il SITR documenta anche procedimenti urbanistici più recenti, da esaminare prima di ogni uso conformativo.

Licenza dichiarata dai dataset comunali: CC BY 4.0 IT.
