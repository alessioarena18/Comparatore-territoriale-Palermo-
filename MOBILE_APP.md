# Palermo Territorial Lab · App iOS e Android

## Architettura

L'app nativa usa Capacitor 8 e riutilizza l'applicazione web esistente come interfaccia. Non viene riscritto il motore territoriale: `app.js`, i moduli tematici, i dataset JSON/GeoJSON, le geometrie ISTAT, le analisi e gli stili vengono inclusi nel bundle locale.

- Identificativo applicazione: `it.palermoterritorial.lab`
- Nome visualizzato: `Palermo Territorial Lab`
- Web bundle: `dist/`
- Piattaforme: Android e iOS
- Repository sorgente: il branch `main` resta la versione web di riferimento.

## Preparazione

Requisiti: Node.js 22 LTS, npm, Android Studio + Android SDK per Android, macOS + Xcode per iOS.

```bash
npm install
npm run mobile:prepare
npx cap add android
npx cap add ios
npm run mobile:sync
```

Per aggiornare le app native dopo una modifica ai file web:

```bash
npm run mobile:sync
```

Aprire i progetti nativi:

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

## Strategia di conservazione

Il bundle viene generato copiando i file web e gli archivi territoriali nel pacchetto locale. I dati e le geometrie non vengono trasformati né ricalcolati. La procedura esclude soltanto strumenti di sviluppo, metadati Git e documentazione non necessaria all'esecuzione.

La mappa di base OpenStreetMap, le ortofoto e le risorse CDN richiedono connettività. Gli archivi locali inclusi nel pacchetto restano disponibili senza rete; non si dichiara una modalità cartografica completamente offline finché non viene predistribuita e collaudata una base cartografica offline con licenze e attribuzioni adeguate.

## Build automatizzate

I workflow in `.github/workflows/mobile-build.yml` generano:
- APK Android di debug per test su dispositivi.
- Build iOS per simulatore, senza firma di distribuzione.

Questi artefatti sono build di test, non versioni pubblicabili sugli store.

## Pubblicazione sugli store

Per Google Play servono un account Google Play Console, dati legali e privacy, scheda store, firma dell'app e un Android App Bundle firmato.

Per Apple App Store servono un account Apple Developer, identificativo Bundle ID definitivo, certificati/provisioning, firma e scheda App Store Connect.

Le credenziali e le firme devono essere configurate dal titolare degli account. Non vanno inserite nel repository.

## Verifiche prima della distribuzione

1. Confronto dei valori e dei conteggi tra web e app.
2. Verifica dei filtri Comune/circoscrizione/quartiere/UPL/sezione.
3. Verifica delle 13 sezioni e dei grafici.
4. Verifica delle mappe Leaflet, dei layer PRG, delle ortofoto e delle attribuzioni.
5. Verifica di stampa/esportazione, orientamento, tastiera e safe area.
6. Test su iPhone reale, Android reale, rotazione e connessione assente/intermittente.
7. Test accessibilità, privacy, prestazioni e crash.

## Regola di progetto

Nessun intervento sul packaging mobile deve modificare dataset, indicatori, formule, fonti, geometrie, classificazioni o logiche del comparatore web.


## Identità visiva nativa

La pipeline genera icona e schermata di avvio coerenti con la palette petrolio, avorio e ocra di Territorial Lab. Le immagini vengono create da sorgenti SVG versionabili e poi convertite nei formati richiesti da Capacitor Assets. Per aggiornare: `npm run mobile:assets`. La generazione usa le dimensioni consigliate dalla documentazione Capacitor: icona 1024×1024 e splash 2732×2732.

## Interfaccia mobile

Il branch mobile mantiene la stessa struttura informativa del comparatore e aggiunge un livello CSS specifico per il runtime Capacitor:
- navigazione orizzontale touch con voce attiva evidenziata;
- filtri territoriali disposti su due colonne, con selettori a larghezza piena;
- intestazione e navigazione compatibili con le safe area;
- mappe Leaflet/MapLibre con altezze e controlli adeguati al viewport mobile;
- tabelle e confronti con scorrimento orizzontale indipendente;
- pulsanti e controlli con dimensioni touch;
- adattamento a orientamento landscape e schermi compatti.

Le regole sono isolate dalla classe `capacitor-native` e non modificano il DOM applicativo, i valori dei filtri, i dataset o le funzioni di calcolo.

## Stato delle verifiche

La pipeline automatizzata esegue la generazione delle icone/splash e una build separata per ciascuna piattaforma. La build di debug Android e quella iOS Simulator risultano completate con successo nel run [46154447987](https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/runs/46154447987). Le build non equivalgono ancora a un collaudo funzionale su dispositivi fisici né a pacchetti firmati per gli store.

Per Capacitor 8 l'ambiente di sviluppo richiede Node.js 22 o superiore, Xcode 26 o superiore per iOS e Android Studio con Android SDK per Android. Riferimento: [Capacitor Environment Setup](https://capacitorjs.com/docs/getting-started/environment-setup).
