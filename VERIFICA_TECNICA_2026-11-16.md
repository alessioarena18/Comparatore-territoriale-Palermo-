# Verifica tecnica del Comparatore territoriale di Palermo
Data: 16 novembre 2026

## Esito sintetico
La verifica statica del repository è stata eseguita su codice applicativo, archivi demografici e sociali, inventario scolastico e layer territoriali. La Panoramica è stata corretta in precedenza e l'utente ne ha confermato il funzionamento.

## Correzioni applicate in questa sessione
- Corretto l'identificativo del quartiere Malaspina-Palagonia in `data/demografia.json`: il codice territoriale ora coincide con quello dell'anagrafica dei 25 quartieri.
- Corretta l'attribuzione demografica dei quartieri che interessano più circoscrizioni. Oreto-Stazione attraversa le circoscrizioni II e III: il dato del quartiere intero non viene più sommato integralmente a entrambe. Nelle viste di circoscrizione il quartiere è escluso dalla tabella e dai grafici dei quartieri, con avviso esplicito. Il totale e il grafico di composizione della circoscrizione utilizzano il dato ufficiale aggregato comunale.
- Aggiornata la versione di cache dello script applicativo in `index.html`.

## Controlli superati
### Codice e risorse
- Sintassi JavaScript verificata con esito positivo.
- Tutti i sei archivi JSON caricati tramite `fetch` nel codice applicativo risultano presenti nel repository.
- I layer GeoJSON ASC1, ASC2 e ASC3 sono leggibili e validi come FeatureCollection: rispettivamente 8, 25 e 55 geometrie, senza geometrie nulle e senza codici duplicati.
- Le tre scale ASC1, ASC2 e ASC3 riportano tutte POP21 pari a 635.439.

### Demografia comunale 2022
- 8 record di circoscrizione e 25 record di quartiere.
- Totale comunale: 642.007 residenti, coerente tra somma delle circoscrizioni e somma dei quartieri.
- Le 8 righe di circoscrizione hanno coerenza interna tra totale, italiani e stranieri.
- Tutti i 25 quartieri sono ora associati a un identificativo presente nell'anagrafica territoriale.
- Oreto-Stazione è associato a due circoscrizioni; la popolazione del quartiere non è ripartita artificialmente tra le due.

### Analisi sociale ISTAT IDISE 2023
- 55 UPL con 55 codici distinti.
- IDISE, popolazione e indicatori DIS1-DIS9 risultano valorizzati per tutte le 55 UPL.
- La somma della popolazione UPL è 629.769; il file fonte indica 630.427 per il Comune e 658 nella sezione fittizia. I valori sono mantenuti distinti.

### Inventario scolastico
- 292 punti fisici georeferenziati, con identificativi univoci e coordinate entro i limiti numerici di latitudine e longitudine.
- 305 schede di censimento; 294 con coordinate e 11 senza coordinate.
- 229 punti classificati per ordine scolastico e 63 non classificati.
- 196 schede con stato DOCUMENTATO, 107 in RISERVA_O_RETTIFICA e 2 CONFERMATO_DA_RIVALIDARE, secondo i metadati V81.
- Tre sedi abilitate ai raggi d'influenza.
- Un punto fisico risulta fuori dai perimetri amministrativi ISTAT 2021 ed è mantenuto in riserva.
- Tutti i 229 identificativi della classificazione corrispondono a punti presenti nell'archivio cartografico.

### Cartografia e standard urbanistici
- Il rapporto preliminare ISTAT 2021 registra 3.600 sezioni censuarie, 8 ASC1, 25 ASC2 e 55 ASC3; i codici ASC1-3 risultano agganciati senza codici non associati.
- Il rapporto segnala tre sezioni con auto-intersezioni: 820530000008, 820530002119 e 820530003803.
- Non risultano superfici effettive degli standard urbanistici validate: il deficit o surplus reale resta non calcolabile. La piattaforma espone i parametri normativi senza presentarli come dotazioni esistenti.

## Attività ancora aperte
1. Eseguire in QGIS la validazione topologica delle tre sezioni censuarie e verificare la copertura dei poligoni.
2. Acquisire e validare le superfici effettive delle dotazioni urbanistiche per categoria, prima di calcolare deficit e surplus.
3. Proseguire la classificazione documentale dei 63 punti scolastici ancora non classificati, senza assegnazioni per semplice somiglianza del nome.
4. Verificare le 11 schede scolastiche prive di coordinate e mantenere separati i record senza geolocalizzazione affidabile.
5. Integrare gli altri servizi territoriali solo con inventari e coordinate documentati; non sono attualmente conteggiati come dotazioni validate.

## Limiti del controllo
I controlli sopra descritti sono verifiche statiche di codice e coerenza dei dati. Non equivalgono a un test manuale completo di tutte le interazioni nel browser né alla certificazione topologica QGIS delle geometrie. Le anomalie e i dati mancanti sono mantenuti espliciti.
