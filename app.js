const $=s=>document.querySelector(s);
let DATA={meta:{},territories:{circoscrizioni:[],quartieri:[]},demografia:[],scuole:[],standard:[],geojson:null};
let active='overview', charts=[];
const pages={
overview:['QUADRO CONOSCITIVO','Panoramica territoriale','Quadro integrato delle componenti demografiche, scolastiche, urbanistiche e spaziali.'],
demography:['POPOLAZIONE RESIDENTE','Analisi demografica','Distribuzione per sesso, classi d’età e fasce funzionali.'],
social:['STRUTTURA SOCIALE','Analisi sociale','Indicatori di struttura demografica e caratteristiche della popolazione.'],
schools:['ISTRUZIONE','Rete scolastica','Localizzazione, tipologia, distribuzione e bacini di influenza degli istituti.'],
standards:['DOTAZIONI TERRITORIALI','Standard urbanistici','Verifica delle dotazioni territoriali e confronto con i parametri normativi applicabili.'],
gis:['SISTEMA INFORMATIVO TERRITORIALE','Cartografia GIS','Visualizzazione dei confini amministrativi, delle sezioni censuarie e dei servizi.'],
spatial:['GEOGRAFIA E ACCESSIBILITÀ','Analisi spaziale','Prossimità, distanze, accessibilità e aree di influenza.'],
compare:['CONFRONTO TERRITORIALE','Confronti','Comparazione tra circoscrizioni, quartieri e Comune.'],
sources:['DOCUMENTAZIONE','Fonti e metodologia','Tracciabilità delle fonti, degli aggiornamenti e dei criteri di elaborazione.']
};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function selected(){return {circ:$('#circ').value,quart:$('#quart').value};}
function pageShell(){let p=pages[active];return `<p class="page-kicker">${p[0]}</p><h1 class="page-title">${p[1]}</h1><p class="lead">${p[2]}</p>`;}
function empty(title,desc){return `<div class="notice"><h3>${title}</h3><p>${desc}</p></div>`;}
function render(){
 charts.forEach(c=>c.destroy());charts=[];
 let html=pageShell(),s=selected();
 const hasDemo=DATA.demografia.length>0, hasSchools=DATA.scuole.length>0, hasStandards=DATA.standard.length>0;
 if(active==='overview'){
 html+=empty('Base informativa in configurazione','La piattaforma è predisposta per acquisire fonti ufficiali. Gli indicatori territoriali saranno attivati dopo la validazione delle corrispondenze geografiche.');
 html+=`<div class="grid"><div class="card"><h3>Circoscrizioni censite</h3><div class="metric">${DATA.territories.circoscrizioni.length||'—'}</div><span class="muted">Elenco territoriale validato</span></div><div class="card"><h3>Quartieri censiti</h3><div class="metric">${DATA.territories.quartieri.length||'—'}</div><span class="muted">Elenco territoriale validato</span></div><div class="card"><h3>Dataset demografici</h3><div class="metric">${hasDemo?'Disponibili':'In attesa'}</div><span class="muted">Nessun valore stimato</span></div><div class="card"><h3>Ultimo aggiornamento</h3><div class="metric">${esc(DATA.meta.updated||'—')}</div><span class="muted">Data registrata nel pacchetto dati</span></div></div>`;

}else if(active==='demography'){
 const quartieri=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere');

const normalizza=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const nomeQuartiere=DATA.territories.quartieri.find(x=>x.id===s.quart)?.name;
const righe=s.quart?quartieri.filter(x=>normalizza(x.nome)===normalizza(nomeQuartiere)):s.circ?quartieri.filter(x=>(x.circoscrizioni_id||[]).includes(s.circ)):quartieri;

 const somma=campo=>righe.reduce((tot,x)=>tot+(Number(x[campo])||0),0);
 const italiani=somma('italiani');
 const stranieri=somma('stranieri');
 const totale=somma('totale');
 const percentuale=totale?((stranieri/totale)*100).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'0,0';
 const nome=s.quart?righe[0]?.nome||'Quartiere selezionato':s.circ?DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Circoscrizione selezionata':'Comune di Palermo';
 const fmt=n=>Number(n).toLocaleString('it-IT');
 html+=`<div class="card"><h3>Popolazione residente · ${nome}</h3><p class="muted">Dati ufficiali al 31 dicembre 2022</p><div class="grid"><div class="card"><span class="muted">Popolazione totale</span><div class="metric">${fmt(totale)}</div></div><div class="card"><span class="muted">Cittadini italiani</span><div class="metric">${fmt(italiani)}</div></div><div class="card"><span class="muted">Cittadini stranieri</span><div class="metric">${fmt(stranieri)}</div></div><div class="card"><span class="muted">Incidenza stranieri</span><div class="metric">${percentuale}%</div></div></div></div>`;
 html+=`<div class="card"><h3>Popolazione per quartiere</h3><div style="overflow-x:auto"><table><thead><tr><th>Quartiere</th><th>Italiani</th><th>Stranieri</th><th>Totale</th><th>% stranieri</th></tr></thead><tbody>${[...righe].sort((a,b)=>b.totale-a.totale).map(x=>`<tr><td>${esc(x.nome)}</td><td>${fmt(x.italiani)}</td><td>${fmt(x.stranieri)}</td><td>${fmt(x.totale)}</td><td>${x.totale?((x.stranieri/x.totale)*100).toLocaleString('it-IT',{maximumFractionDigits:1}):'0'}%</td></tr>`).join('')}</tbody></table></div></div>`;
}else if(active==='social'||active==='compare'){
 html+=empty('Analisi in fase di sviluppo','La sezione sarà attivata successivamente con gli indicatori demografici e il confronto territoriale.');
 html+=`<div class="grid"><div class="card"><h3>Distribuzione per età</h3><div class="empty">In attesa dell’integrazione dei dati censuari per fascia d’età.</div></div><div class="card"><h3>Indicatori demografici</h3><div class="empty">Indici di vecchiaia, dipendenza e struttura della popolazione da elaborare.</div></div></div>`;

 }else if(active==='schools'){
 html+=empty(hasSchools?'Dati scolastici acquisiti: validazione necessaria':'Inventario scolastico non ancora caricato','Il modulo prevede istituzioni statali e paritarie, ordine e grado, indirizzo, coordinate, bacini di prossimità e anno scolastico di riferimento.');
 }else if(active==='standards'){
 html+=empty(hasStandards?'Dotazioni caricate: verifica metodologica necessaria':'Quadro delle dotazioni in attesa dei dati urbanistici','Per calcolare gli standard occorrono superfici, destinazioni, popolazione di riferimento e disciplina urbanistica applicabile. I risultati saranno distinti per tipologia e unità di misura.');
 }else if(active==='gis'||active==='spatial'){
 html+=`<div class="card"><h3>Mappa territoriale di Palermo</h3><div id="map"></div><p class="muted">I perimetri saranno visualizzati dopo l'inserimento dei GeoJSON ufficiali e la verifica del sistema di riferimento.</p></div>`;
 }else if(active==='sources'){
 html+=`<div class="card source-list"><h3>Fonti ufficiali previste</h3><ul><li><a href="https://www.istat.it/notizia/dati-per-sezioni-di-censimento/" target="_blank" rel="noopener">ISTAT – dati censuari per sezione e aree subcomunali</a></li><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1706" target="_blank" rel="noopener">Comune di Palermo – popolazione 2022 per sezione e fasce d'età</a></li><li><a href="https://www.usr.sicilia.it/open-data/" target="_blank" rel="noopener">USR Sicilia – open data delle istituzioni scolastiche</a></li></ul><h3>Regole di qualità</h3><p>Ogni tabella deve riportare fonte, data, livello geografico, anno di riferimento, licenza e note di comparabilità. Nessuna stima viene presentata come dato ufficiale.</p></div>`;
 }
 $('#content').innerHTML=html;
 if(active==='gis'||active==='spatial') initMap();
$('#territory').textContent=(DATA.territories.quartieri.find(x=>x.id===s.quart)?.name||DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Palermo').replace(/(^|[\s-])(\p{L})/gu,(_,sep,letter)=>sep+letter.toLocaleUpperCase('it-IT'));
}
function initMap(){let el=$('#map');if(!el||!window.L)return;let map=L.map(el).setView([38.1157,13.3615],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);if(DATA.geojson)L.geoJSON(DATA.geojson).addTo(map);}
function fillFilters(){
 const c=$('#circ'),q=$('#quart');DATA.territories.circoscrizioni.forEach(x=>c.add(new Option(x.name,x.id)));DATA.territories.quartieri.forEach(x=>q.add(new Option(x.name,x.id)));
}
async function load(){try{let r=await fetch('data/territoriale.json',{cache:'no-store'});if(!r.ok)throw new Error('territoriale');DATA=await r.json();let d=await fetch('data/demografia.json',{cache:'no-store'});if(d.ok){let dem=await d.json();DATA.demografia=dem.popolazione_territoriale||[];DATA.demografiaMeta=dem.meta||{};DATA.demografiaNonAttribuita=dem.popolazione_non_attribuita||[];}$('#status').textContent=DATA.demografia.length?'Dati territoriali e demografici caricati · anno 2022':'Dati territoriali caricati · archivio demografico non disponibile';fillFilters();}catch(e){$('#status').textContent='Struttura pronta · dati non caricati';}render();} 
$('#nav').addEventListener('click',e=>{let b=e.target.closest('[data-page]');if(!b)return;active=b.dataset.page;document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));render();});
$('#circ').addEventListener('change',()=>{const id=$('#circ').value,q=$('#quart');q.innerHTML='<option value="">Tutti i quartieri</option>';DATA.territories.quartieri.filter(x=>!id||(x.circ_ids||[]).includes(id)).forEach(x=>q.add(new Option(x.name,x.id)));render();});
$('#quart').addEventListener('change',render);
load();
