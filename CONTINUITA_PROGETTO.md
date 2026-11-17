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

## Stato verificato dopo acquisizione PRG (17/11/2026)

- Workflow PRG run **#6 / 44096133160** concluso con esito `success`: download dei dataset 320/321, conversione, controlli di sintassi, QA, upload artifact e commit automatico su `main`.
- Commit dati: `fb33c2b` (successivamente incluso nella storia del branch principale).
- Artifact: [prg-palermo-geojson-6](https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/runs/44096133160/artifacts/14333997178), SHA-256 ZIP `642d60411dde16590c204db18e06405251b5ac706a2ea235538da41a1f2efbc5`.
- Cartella `data/geo/prg/` su `main`: `prg_320_vg_zonizzazione.geojson` (5.879 feature), `prg_vincoli_areali.geojson` (662), `prg_vincoli_lineari.geojson` (100), `metadata.json`, `layers.json`, `qa_prg.json` e README.
- QA: superati i controlli strutturali e geografici preliminari su tre layer. Una feature del dataset 320 senza geometria è stata esclusa e conteggiata. Una GeometryCollection del dataset 321 è stata scomposta in componenti areali e lineari, mantenendo la provenienza.
- La mappa Standard urbanistici carica i vincoli areali e lineari e offre la zonizzazione integrale dataset 320 come overlay separato. I livelli si riferiscono alla Variante Generale DCC 7/2004, non attestano da soli la disciplina vigente.
- PR #12 integrata: corretta la nota della mappa sui vincoli 321 e gli errori di caricamento dei layer ora vengono esposti nello stato della mappa.
- La pubblicazione Pages era già riuscita per il commit `610f119`; la nuova pubblicazione conseguente alla PR #12 è stata avviata e va verificata separatamente.

Restano da completare: verifica della pubblicazione Pages successiva alla PR #12; verifica visuale del caricamento dei layer nel browser; audit documentale della vigenza delle varianti urbanistiche successive; QA topologica e semantica delle geometrie PRG; completamento dei grafici e degli indicatori territoriali nelle sezioni.


## Audit documentale PRG e aggiornamento fonti (17/11/2026)

### Esito della ricognizione degli atti successivi
Sono stati aggiunti al registro data/fonti.json (versione 1.3, aggiornato 17/11/2026) quattro riferimenti istituzionali:
- Variante parziale via Tommaso Natale, delibera Commissario ad acta n. 136 del 13/04/2026, pubblicata dal Comune il 17/07/2026. Atto adottato con i poteri del Consiglio comunale; avviso con termine di 45 giorni per osservazioni.
- Variante parziale via Gioacchino Belli, delibera Commissario ad acta n. 287 del 17/06/2026, pubblicata l'11/09/2026. Riguarda il foglio 8, particelle 2180 e quota parte 2181; avviso con termine di 45 giorni per osservazioni.
- Variante parziale via Giuseppe Sunseri, delibera Commissario ad acta n. 380 del 24/11/2025, con documentazione e accordo di pianificazione del 11/09/2025.
- Schema di massima del nuovo PRG Palermo 2025, registrato come documento di pianificazione e non come piano automaticamente approvato/vigente.

Fonti istituzionali consultate:
- https://www.comune.palermo.it/novita/avviso-e-delibera-commissario-ad-acta-n-136-del-13042026/
- https://www.comune.palermo.it/novita/variante-urbanistica-parziale-al-vigente-prg-2/
- https://www.comune.palermo.it/novita/avviso-e-delibera-commissario-ad-acta-n-380-del-24112025/
- https://trasparenza.comune.palermo.it/page/10723/schema-di-massima-del-nuovo-prg-palermo-2025.html
- https://www.sitr.regione.sicilia.it/comune-di-palermo-variante-urbanistica-parziale-al-vigente-p-r-g/

### Regola interpretativa confermata
Le varianti parziali individuate sono localizzate e non autorizzano a sostituire in blocco la base della Variante Generale 2004. La loro efficacia deve essere verificata caso per caso sulla documentazione conclusiva, pubblicazione e perimetro catastale. Lo Schema di massima 2025 è un quadro di pianificazione, non va trattato come piano approvato. Il registro delle fonti impone ora di mantenere separate le varianti localizzate dalla base generale finché non ne sia verificata l'efficacia.

### Audit del calcolo degli standard
- app.js calcola intersezioni geometriche tra le feature del layer tematico prg_standard_2004.geojson e le unità territoriali, usando Turf e bounding box preliminari.
- Il calcolo usa i gruppi S, IC, V, P, F; la categoria F resta separata e non entra nel confronto pro capite 4,5 + 2 + 9 + 2,5 m²/abitante.
- Le categorie combinate rimangono nella categoria sorgente e non vengono ripartite arbitrariamente.
- Il testo dell'app avverte correttamente che le superfici geometriche non certificano attuazione, proprietà pubblica, accessibilità, fruibilità, capienza o disponibilità reale.
- Lo script tools/qa_prg_standard_2004.py verifica conteggi, superfici aggregate, CRS, attributi essenziali, tipi geometrici e chiusura degli anelli. Non esegue ancora validazione topologica completa, test di auto-intersezione, sovrapposizioni tra poligoni o confronto semantico sistematico tra ogni codice PRG e NTA. Non descrivere quindi questo controllo come QA topologico o giuridico.

### Pubblicazione
- Aggiornamento registro fonti data/fonti.json committato su main: 0357b175e4ec758caa536cc48dd686eba6c051c0.
- Deployment GitHub Pages del commit di continuità precedente 404b34da982718842a7af3bbef87bdd9e8c3ec61: run 44098083102, conclusione success.
- Il nuovo aggiornamento del registro fonti richiede il relativo controllo CI e deployment Pages.

### Prossime attività
1. Controllare esito CI e Pages dopo il commit 0357b175.
2. Eseguire audit geometrico approfondito del layer tematico PRG: validità, auto-intersezioni, duplicati e possibili sovrapposizioni, mantenendo separati gli esiti automatici dai controlli giuridici.
3. Confrontare i codici PRG e le categorie S/IC/V/P/F con legenda, NTA e tavole comunali, in particolare per le codifiche combinate.
4. Georiferire le varianti localizzate solo dopo aver acquisito gli allegati ufficiali e ricostruito il perimetro catastale, senza alterare la base generale.
5. Verificare nel browser il rendering delle pagine e dei layer; il successo del deployment non equivale a verifica visiva dell'interfaccia.


## Audit topologico e correzione standard urbanistici (17/11/2026, aggiornamento pomeridiano)

### PR #13 integrata: diagnostica topologica PRG
- PR #13: https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/pull/13, merge commit `ef4dd4b27ed4ef3c3e5c94fd54afe37ecfa82c35`.
- Il workflow `audit-prg-standard.yml` installa Shapely 2.1.2 e pyproj 3.7.2 e verifica validità, duplicati e intersezioni geometriche sul layer tematico di 1.628 poligoni.
- Run main #44099016039: SUCCESS. Artifact `audit-zonizzazione-prg-palermo` ID `14336095142`.
- Risultati: 0 geometrie invalide; 4 geometrie duplicate; 16 coppie con sovrapposizione superiore a 1 m². Somma delle intersezioni a coppie 265.564,13 m² (può contare più volte porzioni interessate da intersezioni multiple).
- I duplicati comprendono due geometrie IC coincidenti (IC3/IC4, 27.697,51 m²), una S2 coincidente con F1 (14.198,03 m²), una S2 coincidente con F1-S2 (14.639,51 m²) e una V3 coincidente con F11 (148.692,74 m²). La diagnostica riporta ID, codici e descrizioni. Non correggere o eliminare automaticamente: verificare NTA, tavole e natura delle sovrapposizioni.
- Le 16 coppie di sovrapposizione sono documentate nell'artifact con attributi dei due poligoni. Gli overlap tra categorie diverse restano distinti e non vanno sommati come superficie univoca.
- Il QA topologico è diagnostico: 0 invalidi non certifica correttezza giuridica, completezza o attuazione. Le sovrapposizioni richiedono revisione semantica.

### PR #14 integrata: standard locali e generali, calcolo senza doppi conteggi interni
- PR #14: https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/pull/14, merge commit `17bd4eb9885bf5b61513ae3157c000e1549570d3`.
- La funzione di analisi calcola ora l'unione geometrica delle intersezioni per ciascuna categoria e unità territoriale. Questo evita di sommare due volte geometrie sovrapposte all'interno della stessa categoria.
- Standard locali: S 4,5; IC 2; V 9; P 2,5 m²/abitante, totale 18 m²/abitante.
- Standard di interesse generale distinti: F1 1,5; F2 1; F4 15 m²/abitante, secondo la ricognizione riportata nella Relazione generale PRG2.0 2025. La categoria F aggregata resta visibile solo come dato descrittivo e non entra in un rapporto normativo.
- Il riconoscimento F1/F2/F4 avviene solo quando il codice contiene il token esatto. I codici combinati non vengono ripartiti arbitrariamente. Le sovrapposizioni tra categorie diverse restano separate: i rapporti per categoria non vanno sommati senza una verifica delle funzioni e delle geometrie.
- Registro fonti aggiornato a versione 1.4: aggiunte la pagina comunale delle NTA/tavole PRG e la Relazione generale dello Schema di massima PRG2.0 2025.
- Cache key di app.js aggiornata in index.html per evitare il riuso della precedente versione lato browser.
- Run verifica applicazione e dati #44099231584: SUCCESS (sintassi JS/Python, whitespace, presenza dei layer PRG).
- Deploy GitHub Pages #44099231321: SUCCESS per il commit `17bd4eb9885bf5b61513ae3157c000e1549570d3`.

### Prossime verifiche obbligatorie
1. Verificare visivamente nel browser la tabella standard per circoscrizioni, quartieri, UPL e sezioni, con particolare attenzione a performance e righe con unione non riuscita.
2. Esaminare le 4 geometrie duplicate e le 16 coppie sovrapposte sulle tavole ufficiali; non eliminare feature finché non sia chiaro se rappresentano duplicazioni, funzioni compresenti o livelli di piano sovrapposti.
3. Controllare la corrispondenza di tutti i codici PRG con art. 24 NTA, tavole P2A e disposizioni speciali, soprattutto i codici combinati e le zone F diverse da F1/F2/F4.
4. Georiferire gli atti di variante parziale 2025-2026 sui rispettivi perimetri catastali solo dopo aver acquisito gli allegati e verificato l'efficacia.
5. Non considerare il progetto concluso prima della verifica visiva dell'interfaccia e della revisione semantico-giuridica delle geometrie.


## Rettifica interpretazione standard di interesse generale F3/F4 (17/11/2026)

### Fonte primaria e lettura corretta
La Relazione generale PRG2.0 Palermo 2025, pp. 78-82, è stata riletta direttamente nei passaggi relativi agli standard (fonte PDF comunale: https://docs.comune.palermo.it/js/server/uploads/trasparenza_all/_25112015084706.pdf).
- Le zone locali S/IC/V/P sono disciplinate dall'art. 24 NTA; le zone F sono disciplinate dall'art. 19 NTA (p. 80).
- La relazione elenca F1 istruzione secondaria superiore, F2 ospedali/sanità, F3 attrezzature sportive e F4 parchi urbani/territoriali (p. 80).
- I minimi richiamati dall'art. 4, comma 5, D.M. 1444/1968 sono F1 1,5 m²/ab, F2 1 m²/ab e 15 m²/ab per parchi pubblici urbani e territoriali; nel quadro del PRG la relazione tratta le attrezzature sportive F3 e i parchi F4 congiuntamente come gruppo F3+F4 (pp. 80-81).
- I valori 1,47 / 1,46 / 15,76 m²/ab sono quelli storici riportati dalla tabella commissariale n. 470/01; la relazione cita inoltre valori successivi di 1,06 / 1,63 / 15,65 m²/ab dopo le modifiche di adeguamento (p. 81). Non sono i minimi normativi.
- La tabella di stato al 2015 (p. 82) riporta le superfici esistenti per F1, F2 e F4; sono valori storici e non certificano la dotazione odierna.

### Correzione tecnica predisposta
- La precedente PR #14 aveva mostrato F1/F2/F4 come tre parametri separati; questa rappresentazione viene rettificata.
- Il calcolo corretto mantiene F1 (1,5) e F2 (1), ma aggrega F3 e F4 in un unico gruppo analitico F34 (15 m²/ab), coerente con la trattazione congiunta riportata dalla relazione.
- I codici combinati che includono altre categorie (es. F1-S2) non vengono attribuiti automaticamente a F1/F2/F34; i codici composti esclusivamente da F3 e F4 possono essere ricondotti al gruppo F34.
- Il gruppo generale F resta mostrato come aggregato descrittivo e non entra nel rapporto normativo.
- Registro fonti aggiornato a versione 1.5 con separazione esplicita tra minimi normativi, valori storici di dimensionamento e superfici esistenti 2015.
- Cache key di app.js aggiornata per forzare il caricamento della correzione.

### Verifiche ancora da eseguire
1. Controllo automatico sintassi e dati sul branch `fix/categorie-standard-interesse-generale-f3f4`.
2. Verifica della tabella in tutti i livelli territoriali e gestione dei codici composti.
3. Pubblicazione su main e controllo del deployment Pages.


## Rettifica F3+F4 pubblicata e rapporto QA esposto nell'interfaccia (17/11/2026)

- PR #15 integrata: https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/pull/15; merge commit `f007f1b82212d3d2db005c7a2bf84a4ff0e0f8f6`.
- Corretto il gruppo di interesse generale: F1 1,5 m²/ab; F2 1 m²/ab; F3+F4 15 m²/ab. I valori storici 1,47 / 1,46 / 15,76 m²/ab e i valori post-adeguamento 1,06 / 1,63 / 15,65 sono distinti dai minimi normativi.
- Il parser esclude i codici combinati che includono altre categorie (es. F1-S2) dal confronto automatico; i codici F3/F4 combinati esclusivamente tra loro sono ricondotti al gruppo F34.
- Workflow verifica app #44100092440: SUCCESS; deployment Pages #44100090110: SUCCESS.
- È stato predisposto il branch `feat/mostra-qa-prg-standard` per aggiungere il rapporto QA topologico persistente e mostrare nella pagina Standard urbanistici il numero di geometrie invalide, coincidenze esatte e coppie sovrapposte. Rapporto: `data/geo/qa_prg_standard_2004.json`.
- I risultati QA esposti sono: 0 geometrie invalide, 4 coincidenze esatte, 16 coppie sovrapposte oltre 1 m². Sono diagnostiche e non autorizzano correzioni automatiche.
- Prossimo step: verificare il branch e integrare il pannello QA, poi passare alla revisione semantica dei 4 duplicati e delle sovrapposizioni.


## Stato finale ciclo correttivo F3/F4 e pubblicazione rapporto QA (17/11/2026)

- PR #15 integrata con commit `f007f1b82212d3d2db005c7a2bf84a4ff0e0f8f6`: rettifica il gruppo F3+F4 a 15 m²/ab e distingue i valori storici dai minimi normativi.
- PR #16 integrata con commit `edeb72e66e28401f76cd70061e961711ea6ee5d4`: aggiunge il rapporto persistente `data/geo/qa_prg_standard_2004.json` e mostra il riepilogo QA nella pagina Standard urbanistici.
- Il rapporto QA è una fotografia dell'audit del 17/11/2026: 1.628 poligoni, 0 geometrie invalide, 4 coincidenze esatte, 16 coppie sovrapposte oltre 1 m². Include ID e codici dei poligoni interessati; non modifica la geometria sorgente.
- Workflow verifica app #44100381799: SUCCESS. Deployment Pages #44100380369: SUCCESS.
- La pagina standard dichiara esplicitamente le anomalie geometriche e la necessità di verifica su NTA/tavole. Il rendering visivo non è stato verificato via browser automatizzato; il sito è stato pubblicato correttamente.
- Il codice F1-S2 e altre codifiche composte che includono categorie estranee al gruppo F1/F2/F3+F4 non vengono attribuite automaticamente ai rapporti normativi. F3 e F4 sono accorpate nel gruppo F34 ai fini del confronto del parametro da 15 m²/ab.

### Prossima attività
Avviare la verifica semantica delle geometrie duplicate e sovrapposte, con priorità a IC3/IC4 (ID 899/948), S2/F1 (ID 4652/3083), S2/F1-S2 (ID 4653/3084), V3/F11 (ID 4630/3260), e confrontare le tavole P2A ufficiali con gli attributi del layer derivato. Nessuna correzione va applicata senza riscontro documentale.


## Correzione classificazione F3+F4 e trasparenza QA (17/11/2026)

### Chiarimento normativo
La Relazione generale comunale PRG2.0 2025 (pp. 78-81) riporta per le attrezzature di interesse generale i parametri F1 1,5 m²/ab, F2 1 m²/ab e F3+F4 15 m²/ab. Il parametro di 15 m²/ab va quindi riferito alla famiglia congiunta F3+F4, non a F4 isolatamente. Le precedenti note di continuità che citavano solo F4 sono da leggere come rettificate da questo chiarimento.
Fonte: https://www.comune.palermo.it/js/server/uploads/trasparenza_all/_25112015084706.pdf (Relazione generale PRG2.0 2025); risultati di ricerca del documento ufficiale e relativa tabella riepilogativa.

### Correzione tecnica
- Il parser dei codici ora riconosce F3, F4 e F34 e li aggrega nella sola famiglia analitica F3+F4 (F34).
- F1 e F2 restano famiglie autonome.
- I codici misti con ulteriori destinazioni (ad esempio F1-S2 o F1F3F15) non vengono ripartiti arbitrariamente.
- La pagina Standard urbanistici espone l'esito QA: 0 geometrie invalide, 4 duplicati esatti, 16 coppie con sovrapposizione >1 m². È esplicitato che le sovrapposizioni sono segnalazioni da verificare e che non sono state eliminate geometrie.
- Registro fonti aggiornato a versione 1.5.
- Le modifiche richiedono test automatico, deployment Pages e verifica visiva della tabella.


## Ripristino visibilità cartografia Standard urbanistici (17/11/2026)

- Individuata la causa della mappa non visibile: il contenitore `.school-map` non aveva una regola CSS di altezza, mentre il codice inizializza Leaflet sul nodo `#standardSchoolMap`.
- Aggiunta altezza esplicita di 560 px desktop e 470 px mobile, altezza minima, sfondo e stacking context per i controlli Leaflet.
- Aggiornata la query string CSS in index.html per invalidare la cache.
- La mappa conserva sedi scolastiche, raggi di influenza, poligoni PRG S/IC/V/P/F, zonizzazione integrale dataset 320 e vincoli areali/lineari come layer attivabili.
- Da verificare dopo il deployment il rendering visivo su desktop e smartphone; la correzione CSS è verificata a livello di sorgente, non ancora con test visivo browser.


## Analisi del verde secondo il PRG 2004 (17 novembre 2026)

- Aggiunta la sezione **Verde urbano** con cartografia tematica e quadro quantitativo delle destinazioni E1, E2, VS, V1-V5 e F4.
- Nuovo layer derivato da 679 geometrie filtrate dal dataset comunale 320 e dal layer tematico PRG standard 2004: `data/geo/verde_prg.geojson`; riepilogo: `data/verde_prg_summary.json`.
- Superfici geometriche sferiche approssimate: E1 2.280,07 ha (107 poligoni); E2 5.840,02 ha (10); VS 627,11 ha (166); V3 157,20 ha (241); V4 59,04 ha (23); F4 228,06 ha (4). V1 13,86 ha, V2 70,33 ha, V5 21,08 ha. 26 geometrie V con codici misti/non univoci per 29,04 ha.
- Le superfici non vanno sommate in un totale: perimetri di parchi e destinazioni interne possono sovrapporsi. I codici misti non vengono ripartiti.
- Distinzione normativa: NTA PRG 2004 artt. 16-18 per E1/E2, art. 21 per verde storico/privato/pubblico, art. 23 per parchi urbani, art. 24 per servizi V1-V5 e art. 19 per F4. Il vecchio schema V1-V4 del PRG 1962 non viene applicato alla classificazione 2004.
- Il PRG non fornisce un layer autonomo che certifichi proprietà privata: VS e registro del verde storico non sono una prova di proprietà. Superficie privata indicata N.D. fino a verifica catastale e patrimoniale. Le zone A1 non sono conteggiate integralmente come verde.
- CI e Pages da eseguire; controllo visivo Leaflet ancora necessario dopo il deploy.


## Aggiornamento cartografia verde – completamento legenda e QA conteggi – 17 novembre 2026

La pagina **Verde urbano** espone nella legenda cartografica tutte le classi tematiche del PRG 2004 presenti nel layer: V1 gioco, V2 campi sportivi, V3 verde pubblico, V4 parchi attrezzati, V5 impianti sportivi, E1 agricolo, E2 collinare/naturalistico, VS storico/pertinenziale, F4 parchi urbani/territoriali e codici misti. La KPI include anche il verde privato come N.D.

La mappa mantiene le geometrie spaziali delle classi effettivamente disponibili. Il verde privato non viene disegnato come poligono: il PRG non certifica la titolarità e non è disponibile un layer catastale/proprietario. Il layer VS non è equiparato automaticamente a proprietà privata. In fase di caricamento il browser confronta i conteggi delle classi cartografate con il riepilogo quantitativo e segnala eventuali discrepanze.

Riferimenti: Comune di Palermo, dataset 320, Variante Generale PRG DCC 7/2004; data/verde_prg_summary.json e data/geo/verde_prg.geojson. Le superfici sono geometriche di piano e non misurano copertura vegetale, attuazione o accessibilità.
