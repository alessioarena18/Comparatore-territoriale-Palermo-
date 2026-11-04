# Comparatore territoriale di Palermo

Applicazione web statica responsive, predisposta per GitHub Pages.

## Contenuti
- Panoramica territoriale
- Demografia
- Rete scolastica
- Standard urbanistici
- Cartografia GIS
- Fonti e metodologia

## Pubblicazione
1. Caricare tutti i file e le cartelle di questo archivio nella **radice** del repository GitHub `Comparatore-territoriale-Palermo-`.
2. Aprire **Settings → Pages**.
3. In **Build and deployment**, selezionare **Deploy from a branch**.
4. Selezionare branch `main` e cartella `/ (root)`, quindi salvare.
5. Aprire la scheda **Actions** e avviare manualmente il workflow "Aggiornamento fonti ufficiali" con **Run workflow**. In seguito il workflow è programmato mensilmente.

## Aggiornamento dati
Il workflow scarica il CSV ufficiale del Comune di Palermo:
https://opendata.comune.palermo.it/ws.php?id=2696&fmt=csv

Dataset: popolazione residente al 31/12/2022 per sezione censuaria e fasce quinquennali di età.
Scheda: https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1706

## Limiti espliciti della prima versione
Questa prima base tecnica automatizza lo scaricamento della fonte comunale, ma **non dichiara ancora disponibili statistiche per quartiere o circoscrizione**. Per calcolarle correttamente occorre normalizzare il tracciato CSV e associare le sezioni censuarie alle geometrie ufficiali dei 25 quartieri e delle 8 circoscrizioni.
È inoltre necessario integrare il rilascio ISTAT 2023, l'inventario georiferito delle scuole e i layer delle dotazioni urbanistiche. Fino alla validazione, l'interfaccia mostra chiaramente lo stato di configurazione e non inventa valori.

## Licenze e attribuzione
Rispettare la licenza indicata nella scheda del dataset e mantenere attribuzione al Comune di Palermo. Verificare le condizioni di riutilizzo delle ulteriori fonti ISTAT e cartografiche prima della distribuzione.
Aggiornamento per pubblicazione GitHub Pages
