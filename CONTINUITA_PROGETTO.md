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

## Stato consolidato al 17 novembre 2026, ore 13:52

### Cartografia PRG acquisita e pubblicata
La pipeline `Acquisizione cartografia PRG Palermo` è terminata con esito SUCCESS nel run [44096133160](https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/runs/44096133160). Conversione, controlli di sintassi, QA strutturale/geografica, upload artifact e commit automatico su `main` sono tutti riusciti.

File pubblicati in `data/geo/prg/`:
- `prg_320_vg_zonizzazione.geojson`: 5.879 geometrie su 5.880 record sorgente.
- `prg_vincoli_areali.geojson`: 662 geometrie areali.
- `prg_vincoli_lineari.geojson`: 100 geometrie lineari, incluse le componenti lineari estratte da una GeometryCollection del layer areale.
- `metadata.json`, `layers.json`, `qa_prg.json`: provenienza, hash SHA-256, conteggi, famiglie geometriche e controlli.

Una feature del dataset 320 era priva di geometria: esclusa dai layer cartografici e conteggiata nei metadati. QA superata per 3 layer; controlli limitati a struttura e plausibilità geografica grossolana. Non certificano topologia, proprietà, attuazione o vigenza.

### Mappa e fonti
- La mappa Standard urbanistici dispone ora di un layer separato, disattivato all'apertura, per la zonizzazione integrale ufficiale dataset 320 (5.879 geometrie).
- I vincoli areali e lineari del dataset 321 sono layer separati. I layer sono etichettati come Variante Generale 2004.
- La classificazione cromatica dei codici ZTO è solo orientativa; i codici combinati sono visualizzati come misti. Le zone F non sono automaticamente equiparate agli standard ex art. 3 D.M. 1444/1968.
- La pagina Fonti e metodologia registra dataset 320/321 e una prima ricognizione di varianti parziali 2025–2026, distinguendo atti adottati da atti approvati/trasmessi. Ogni variante va verificata per ambito catastale ed efficacia.

### Pull request integrate
- #6: serializzazione pipeline e rebase prima del push, per evitare conflitti tra commit concorrenti.
- #7: layer della zonizzazione integrale ufficiale nella mappa Standard urbanistici.
- #8: workflow di verifica automatica di JavaScript, Python e presenza dei layer PRG.
- #9: aggiornamento del registro delle fonti PRG e delle varianti successive.

### Verifiche CI e pubblicazione
- Run [44096512432](https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/runs/44096512432): controlli applicazione/dati superati.
- Run [44096812982](https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/runs/44096812982): controlli applicazione/dati superati dopo l'aggiornamento del registro fonti.
- Run [44096812385](https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/runs/44096812385): GitHub Pages build e deploy terminati con esito SUCCESS.

Prossime attività:
1. Verifica funzionale nel browser della mappa Standard urbanistici, del layer integrale 320 e dei vincoli 321.
2. Verifica della separazione tra Servizi e dotazioni, Standard urbanistici e Cartografia GIS.
3. Controllo dei raggi d'influenza scolastici e dei grafici a torta, senza attribuire superfici o coperture non verificate.
4. Proseguimento dell'audit degli atti PRG successivi e dei relativi perimetri geografici.

## Aggiornamento successivo: 17 novembre 2026, ore 13:53

- La prima esecuzione con QA superata (#44095465462) ha caricato l'artifact ma il commit automatico è stato respinto per un aggiornamento concorrente del branch `main` (non per dimensione dei file).
- La pipeline è stata serializzata e ribasata con PR #6. La nuova esecuzione #44096133160 è terminata con SUCCESS in tutti gli step, compresi commit dei GeoJSON e QA.
- Commit dati: `fb33c2b464c629cea38f06307b2986685092ef0f`. I file sono presenti nel repository in `data/geo/prg/`.
- PR #7 aggiunge la zonizzazione integrale dataset 320 alla mappa Standard urbanistici come overlay distinto. PR #8 aggiunge verifiche automatiche di sintassi e presenza dei layer. PR #9 aggiorna la tabella Fonti e metodologia con dataset 320/321, NTA e varianti parziali 2025–2026.
- PR #11 (integrata nel commit `f54b6eb8726cf3daf88eae1dcfad58baf2be68e0`) rimuove gli overlay puntuali/misti vuoti, non presenti nel rilascio, e aggiorna README e legenda ai soli layer effettivamente acquisiti: zonizzazione 5.879, vincoli areali 662, vincoli lineari 100.
- QA PRG: 3 layer validati per struttura e plausibilità geografica; una feature sorgente senza geometria esclusa e conteggiata; una GeometryCollection convertita in una componente areale e una lineare. Nessuna certificazione topologica o giuridica.
- Deploy Pages del commit `39791508b8cadf9fa64c4d0b484ca71189f1e482` concluso SUCCESS. Dopo PR #11, verifica automatica #44097120615 conclusa SUCCESS e deploy successivo #44097159609 concluso SUCCESS (commit handoff `011059ede088d8652a4a9e00f23d61a246169736`).

Prossimi passi:
1. Attendere l'esito della verifica CI e del deploy dopo PR #11.
2. Verificare che il layer integrale 320 e i due layer 321 siano effettivamente caricati nella mappa Standard urbanistici, e che i layer GIS iniziali restino limitati alle circoscrizioni.
3. Eseguire una verifica funzionale delle pagine Servizi e dotazioni e Standard urbanistici, con attenzione ai grafici a torta e ai raggi d'influenza scolastici.
4. Continuare l'audit giuridico delle varianti successive con perimetri e stato di efficacia, senza sovrapporre automaticamente gli atti parziali alla zonizzazione comunale.
