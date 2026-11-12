const $=s=>document.querySelector(s);
let DATA={meta:{},territories:{circoscrizioni:[],quartieri:[]},demografia:[],sociale:[],socialeMeta:{},socialeAdu:[],scuole:[],standard:[],geojson:null};
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
 html+=`<div class="card"><h3>Popolazione residente · ${nome}</h3><p class="muted">Dati ufficiali al 31 dicembre 2022 · Fonte: Comune di Palermo</p><div class="grid"><div class="card"><span class="muted">Popolazione totale</span><div class="metric">${fmt(totale)}</div></div><div class="card"><span class="muted">Cittadini italiani</span><div class="metric">${fmt(italiani)}</div></div><div class="card"><span class="muted">Cittadini stranieri</span><div class="metric">${fmt(stranieri)}</div></div><div class="card"><span class="muted">Incidenza stranieri</span><div class="metric">${percentuale}%</div></div></div><p class="muted">La ripartizione per sesso e fasce d’età è in fase di integrazione: il dataset comunale disponibile è riferito alle sezioni censuarie e richiede una corrispondenza geografica verificata prima dell’aggregazione per quartiere o circoscrizione.</p></div>`;
 html+=`<div class="card"><h3>Popolazione per quartiere</h3><div style="overflow-x:auto"><table><thead><tr><th>Quartiere</th><th>Italiani</th><th>Stranieri</th><th>Totale</th><th>% stranieri</th></tr></thead><tbody>${[...righe].sort((a,b)=>b.totale-a.totale).map(x=>`<tr><td>${esc(x.nome)}</td><td>${fmt(x.italiani)}</td><td>${fmt(x.stranieri)}</td><td>${fmt(x.totale)}</td><td>${x.totale?((x.stranieri/x.totale)*100).toLocaleString('it-IT',{maximumFractionDigits:1}):'0'}%</td></tr>`).join('')}</tbody></table></div></div>`;

 
html+=`<div class="grid"><div class="card"><h3>Composizione della popolazione</h3><canvas id="chartComposizione"></canvas></div><div class="card"><h3>Popolazione per quartiere</h3><canvas id="chartQuartieri"></canvas></div></div><div class="card"><h3>Incidenza della popolazione straniera</h3><canvas id="chartIncidenza"></canvas></div>`;
}else if(active==='compare'){
const qd=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere');
const confronto=DATA.territories.circoscrizioni.map(c=>{
const rr=qd.filter(x=>(x.circoscrizioni_id||[]).includes(c.id));
const italiani=rr.reduce((a,x)=>a+(Number(x.italiani)||0),0);
const stranieri=rr.reduce((a,x)=>a+(Number(x.stranieri)||0),0);
const totale=rr.reduce((a,x)=>a+(Number(x.totale)||0),0);
return {...c,italiani,stranieri,totale,percentuale:totale?stranieri/totale*100:0};
});
const fmtC=n=>Number(n).toLocaleString('it-IT');
html+=`<div class="card"><h3>Confronto demografico tra le 8 circoscrizioni</h3><p class="muted">Dati ufficiali al 31 dicembre 2022</p><div style="overflow-x:auto"><table><thead><tr><th>Circoscrizione</th><th>Italiani</th><th>Stranieri</th><th>Totale residenti</th><th>Incidenza stranieri</th></tr></thead><tbody>${confronto.map(c=>`<tr><td>${c.name}</td><td>${fmtC(c.italiani)}</td><td>${fmtC(c.stranieri)}</td><td><strong>${fmtC(c.totale)}</strong></td><td>${c.percentuale.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}%</td></tr>`).join('')}</tbody></table></div></div>`;
html+=`<div class="grid"><div class="card"><h3>Popolazione residente per circoscrizione</h3><canvas id="chartCircoscrizioni"></canvas></div><div class="card"><h3>Incidenza stranieri per circoscrizione</h3><canvas id="chartStranieriCircoscrizioni"></canvas></div></div>`;
}else if(active==='social'){
  const aree=[...(DATA.sociale||[])].sort((a,b)=>Number(b.idise)-Number(a.idise));
  const media=aree.length?aree.reduce((s,x)=>s+Number(x.idise||0),0)/aree.length:0;
  const massimo=aree[0], minimo=[...aree].sort((a,b)=>Number(a.idise)-Number(b.idise))[0];
  const numero=n=>Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:2});
  const descrizioni={
    DIS1:'Persone di 70 anni e oltre che vivono sole e non sono proprietarie dell’abitazione',
    DIS2:'Persone che vivono in famiglie senza componenti occupati o titolari di pensione da lavoro',
    DIS3:'Persone che vivono in famiglie con basso reddito equivalente',
    DIS4:'Tasso di occupazione della popolazione tra 25 e 64 anni',
    DIS5:'Persone fino a 64 anni che vivono in famiglie a bassa intensità lavorativa',
    DIS6:'Persone tra 25 e 64 anni con occupazione instabile nel corso dell’anno',
    DIS7:'Persone tra 25 e 64 anni con basso livello di istruzione',
    DIS8:'Giovani tra 15 e 29 anni non occupati e non inseriti in percorsi di istruzione o formazione (NEET)',
    DIS9:'Studenti che abbandonano il percorso scolastico o ripetono l’anno'
  };
  html+=`<div class="grid social-kpis">
    <div class="card"><span class="muted">UPL analizzate</span><div class="metric">${aree.length}</div></div>
    <div class="card"><span class="muted">IDISE medio delle UPL</span><div class="metric">${numero(media)}</div></div>
    <div class="card"><span class="muted">Maggiore disagio</span><h3>${massimo?esc(massimo.nome):'N.D.'}</h3><div class="metric">${massimo?numero(massimo.idise):'N.D.'}</div></div>
    <div class="card"><span class="muted">Minore disagio</span><h3>${minimo?esc(minimo.nome):'N.D.'}</h3><div class="metric">${minimo?numero(minimo.idise):'N.D.'}</div></div>
  </div>
  <div class="card social-select"><h3>3 - Seleziona le UPL da confrontare</h3>
    <p class="muted">Seleziona almeno due aree per avviare il confronto.</p>
    <div id="uplSelezione" class="upl-selector">
      ${aree.map(a=>'<label class="upl-option"><input type="checkbox" class="upl-check" value="'+esc(a.cod_asc)+'"> '+esc(a.nome)+'</label>').join('')}
    </div>
  </div>
  <div class="card"><h3>4 - Indice di disagio socio-economico IDISE 2023</h3>
    <p class="muted">Fonte: ISTAT. 55 UPL di Palermo. Valore comunale di riferimento: 100. Valori più elevati indicano maggiore disagio socio-economico.</p>
    <div class="table-wrap"><table><thead><tr><th>UPL</th><th>IDISE</th><th>Popolazione</th><th>Famiglie</th></tr></thead><tbody>
    ${aree.map(a=>`<tr><td>${esc(a.nome)}</td><td>${numero(a.idise)}</td><td>${numero(a.popolazione)}</td><td>${numero(a.famiglie)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  <div class="card social-compare-section"><h3>5 - Indicatori elementari del disagio e confronto tra UPL</h3>
    <p class="muted">Gli indicatori restano affiancati al confronto per consentire la lettura dei risultati senza perdere il riferimento metodologico.</p>
    <div class="social-compare-layout">
      <aside class="indicator-panel"><h3>Indicatori DIS1-DIS9</h3><div class="indicator-list">
        ${Object.entries(descrizioni).map(([codice,descrizione])=>`<div class="indicator-item"><strong>${codice}</strong><span>${descrizione}</span>${codice==='DIS4'?'<small>Interpretazione inversa: un valore più alto indica maggiore occupazione e quindi minore disagio.</small>':''}</div>`).join('')}
      </div></aside>
      <div id="uplConfronto" class="comparison-panel"><h3>Confronto tra UPL</h3><p class="muted">Seleziona almeno due UPL per visualizzare i valori a confronto.</p></div>
    </div>
  </div>`;
}else if(active==='schools'){
 const fontiScuole=[{titolo:'Scuole comunali',ente:'Comune di Palermo',anno:'aggiornamento catalogo 2021',url:'https://opendata.comune.palermo.it/opendata-dataset.php?dataset=328',nota:'Dataset KML: asili nido, scuole dell’infanzia, primarie e secondarie di primo grado.'}];
 html+=`<div class="grid service-kpis"><div class="card"><span class="muted">Plessi georeferenziati</span><div class="metric">${DATA.scuole.length||'N.D.'}</div><small class="muted">Inventario validato non ancora caricato</small></div><div class="card"><span class="muted">Circoscrizioni</span><div class="metric">8</div><small class="muted">Unità territoriali di riferimento</small></div><div class="card"><span class="muted">Categorie in analisi</span><div class="metric">4</div><small class="muted">Istruzione, verde, sport, servizi comuni</small></div><div class="card"><span class="muted">Stato dei dati</span><div class="metric">Da integrare</div><small class="muted">Nessun conteggio non verificato</small></div></div><div class="card"><h3>Rete dei servizi e delle dotazioni</h3><p class="muted">Inventario georeferenziato con tipologia, indirizzo, coordinate, circoscrizione, quartiere, fonte e data di aggiornamento.</p><div class="service-categories"><div><b>Istruzione</b><span>Asili nido, scuole dell’infanzia, primarie, secondarie e istituti superiori</span></div><div><b>Verde pubblico</b><span>Parchi, giardini, ville e aree verdi attrezzate</span></div><div><b>Sport</b><span>Impianti sportivi, palestre e campi pubblici</span></div><div><b>Attrezzature collettive</b><span>Servizi sanitari, sociali, culturali e amministrativi</span></div></div></div><div class="card"><h3>Fonti individuate</h3><div class="table-wrap"><table><thead><tr><th>Dataset</th><th>Ente</th><th>Riferimento</th><th>Stato</th></tr></thead><tbody>${fontiScuole.map(f=>`<tr><td><a href="${f.url}" target="_blank" rel="noopener">${f.titolo}</a><br><small class="muted">${f.nota}</small></td><td>${f.ente}</td><td>${f.anno}</td><td><span class="data-status">Fonte individuata</span></td></tr>`).join('')}</tbody></table></div><p class="muted">Il dataset comunale è in formato KML e risulta aggiornato nel catalogo al 6 settembre 2021: occorre verificarne attualità e completezza prima dell’analisi.</p></div>`;
 }else if(active==='standards'){
 const standard=[['Istruzione','4,50','Asili nido, scuole dell’infanzia e dell’obbligo'],['Attrezzature di interesse comune','2,00','Servizi religiosi, culturali, sociali, assistenziali, sanitari e amministrativi'],['Verde, gioco e sport','9,00','Aree pubbliche attrezzate ed effettivamente fruibili'],['Parcheggi','2,50','Aree per parcheggi, oltre alle sedi viarie']];
 html+=`<div class="grid standards-kpis"><div class="card"><span class="muted">Dotazione complessiva di riferimento</span><div class="metric">18,00 <small>m²/ab</small></div><small class="muted">D.M. 1444/1968, art. 3</small></div><div class="card"><span class="muted">Categorie di standard</span><div class="metric">4</div><small class="muted">Ripartizione ordinaria</small></div><div class="card"><span class="muted">Superfici validate</span><div class="metric">N.D.</div><small class="muted">Da acquisire e verificare</small></div><div class="card"><span class="muted">Verifica di conformità</span><div class="metric">Non calcolabile</div><small class="muted">Mancano superfici georeferenziate</small></div></div><div class="card"><h3>Parametri di riferimento del D.M. 1444/1968</h3><p class="muted">Dotazioni minime di norma per gli insediamenti residenziali. I parametri non descrivono la dotazione effettivamente presente a Palermo.</p><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Parametro</th><th>Contenuto</th></tr></thead><tbody>${standard.map(x=>`<tr><td><b>${x[0]}</b></td><td><b>${x[1]} m²/ab</b></td><td>${x[2]}</td></tr>`).join('')}</tbody><tfoot><tr><th>Totale</th><th>18,00 m²/ab</th><th>Escluse le sedi viarie</th></tr></tfoot></table></div></div><div class="card"><h3>Procedura di verifica territoriale</h3><div class="workflow-grid"><div><b>1. Inventario</b><span>Acquisizione dei poligoni e delle superfici per categoria.</span></div><div><b>2. Validazione</b><span>Controllo di geometrie, destinazioni, fruibilità e aggiornamento.</span></div><div><b>3. Attribuzione</b><span>Associazione delle superfici a quartieri e circoscrizioni tramite overlay GIS.</span></div><div><b>4. Calcolo</b><span>m² per abitante, fabbisogno teorico e differenziale per categoria.</span></div></div><p class="notice-inline">Non viene calcolato alcun deficit o surplus finché non saranno disponibili superfici attendibili e popolazione coerente per territorio e anno.</p></div>`;
 }else if(active==='gis'||active==='spatial'){
 html+=`<div class="grid gis-kpis"><div class="card"><span class="muted">Circoscrizioni</span><div class="metric">8</div></div><div class="card"><span class="muted">Quartieri</span><div class="metric">25</div></div><div class="card"><span class="muted">Layer validati</span><div class="metric">0</div></div><div class="card"><span class="muted">Sistema di riferimento</span><div class="metric">Da verificare</div></div></div><div class="card"><h3>${active==='gis'?'Cartografia GIS':'Analisi spaziale e accessibilità'}</h3><p class="muted">Mappa di base interattiva. Confini amministrativi e layer tematici saranno attivati dopo acquisizione dei GeoJSON e verifica del sistema di riferimento.</p><div id="map"></div><div class="map-legend"><span><i class="legend-dot base"></i>Mappa di base</span><span><i class="legend-dot pending"></i>Layer territoriali da integrare</span></div></div><div class="grid"><div class="card"><h3>Analisi cartografiche previste</h3><ul><li>Confini di circoscrizioni e quartieri</li><li>Sezioni censuarie e unità territoriali ISTAT</li><li>Distribuzione di scuole, verde e servizi</li><li>Mappe coropletiche demografiche e sociali</li></ul></div><div class="card"><h3>Analisi spaziali previste</h3><ul><li>Distanze e prossimità ai servizi</li><li>Bacini di influenza e aree raggiungibili</li><li>Confronto tra dotazione e popolazione</li><li>Aree potenzialmente sottoservite</li></ul></div></div>`;
 }else if(active==='sources'){
 html+=`<div class="card source-list"><h3>Fonti ufficiali previste</h3><ul><li><a href="https://www.istat.it/notizia/dati-per-sezioni-di-censimento/" target="_blank" rel="noopener">ISTAT – dati censuari per sezione e aree subcomunali</a></li><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1706" target="_blank" rel="noopener">Comune di Palermo – popolazione 2022 per sezione e fasce d'età</a></li><li><a href="https://www.usr.sicilia.it/open-data/" target="_blank" rel="noopener">USR Sicilia – open data delle istituzioni scolastiche</a></li><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=328" target="_blank" rel="noopener">Comune di Palermo – scuole comunali (KML)</a></li><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=278" target="_blank" rel="noopener">Comune di Palermo – perimetrazione aree verdi (shapefile)</a></li><li><a href="https://www.edizionieuropee.it/law/html/15/zn38_04_015.html" target="_blank" rel="noopener">D.M. 1444/1968, art. 3 – standard urbanistici</a></li></ul><h3>Regole di qualità</h3><p>Ogni tabella deve riportare fonte, data, livello geografico, anno di riferimento, licenza e note di comparabilità. Nessuna stima viene presentata come dato ufficiale.</p></div>`;
 }
 $('#content').innerHTML=html;
 
if(active==='social'){
  const box=document.getElementById('uplConfronto');
  const indicatori=['DIS1','DIS2','DIS3','DIS4','DIS5','DIS6','DIS7','DIS8','DIS9'];
  function aggiornaConfronto(){
    const codici=[...document.querySelectorAll('.upl-check:checked')].map(x=>x.value);
    const selezionate=DATA.sociale.filter(x=>codici.includes(x.cod_asc));
    if(selezionate.length<2){box.innerHTML='<h3>Confronto tra UPL</h3><p class="muted">Seleziona almeno due UPL per visualizzare i valori a confronto.</p>';return;}
    const numero=v=>v===null||v===undefined||v===''?'N.D.':Number(v).toLocaleString('it-IT',{maximumFractionDigits:2});
    const righe=[['IDISE',a=>a.idise],['Popolazione',a=>a.popolazione],['Famiglie',a=>a.famiglie],['Superficie (km²)',a=>a.superficie_km2],...indicatori.map(k=>[k,a=>a.dis?.[k]])];
    box.innerHTML='<h3>Confronto tra '+selezionate.length+' UPL</h3><div class="table-wrap comparison-table"><table><thead><tr><th>Indicatore</th>'+selezionate.map(a=>'<th>'+esc(a.nome)+'</th>').join('')+'</tr></thead><tbody>'+righe.map(([nome,fn])=>'<tr><th>'+nome+'</th>'+selezionate.map(a=>'<td>'+numero(fn(a))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="muted comparison-note">I valori DIS sono indicatori elementari; per DIS4 la relazione con il disagio è inversa.</p>';
  }
  document.querySelectorAll('.upl-check').forEach(c=>c.addEventListener('change',aggiornaConfronto));
  aggiornaConfronto();
}
if(active==='demography'&&window.Chart){
 const sd=selected();
 const normGrafico=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const qd=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere');
 const nomeQD=DATA.territories.quartieri.find(x=>x.id===sd.quart)?.name;
 const rd=sd.quart?qd.filter(x=>normGrafico(x.nome)===normGrafico(nomeQD)):sd.circ?qd.filter(x=>(x.circoscrizioni_id||[]).includes(sd.circ)):qd;
 const sommaD=k=>rd.reduce((a,x)=>a+(Number(x[k])||0),0);
 const fmtD=n=>Number(n).toLocaleString('it-IT');
 const canvasD=id=>document.getElementById(id);
 if(canvasD('chartComposizione')){
  charts.push(new Chart(canvasD('chartComposizione'),{type:'doughnut',data:{labels:['Italiani','Stranieri'],datasets:[{data:[sommaD('italiani'),sommaD('stranieri')]}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}}));
 }
 const topD=[...rd].sort((a,b)=>b.totale-a.totale).slice(0,10);
 if(canvasD('chartQuartieri')){
  charts.push(new Chart(canvasD('chartQuartieri'),{type:'bar',data:{labels:topD.map(x=>x.nome),datasets:[{label:'Residenti',data:topD.map(x=>x.totale)}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}}));
 }
 if(canvasD('chartIncidenza')){
  const incD=[...rd].sort((a,b)=>(b.stranieri/b.totale)-(a.stranieri/a.totale)).map(x=>({nome:x.nome,valore:x.totale?x.stranieri/x.totale*100:0}));
  charts.push(new Chart(canvasD('chartIncidenza'),{type:'bar',data:{labels:incD.map(x=>x.nome),datasets:[{label:'Stranieri (%)',data:incD.map(x=>Number(x.valore.toFixed(2)))}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v+'%'}}}}}));
 }
}
if(active==='compare'&&window.Chart){
const qd=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere');
const confronto=DATA.territories.circoscrizioni.map(c=>{
const rr=qd.filter(x=>(x.circoscrizioni_id||[]).includes(c.id));
const italiani=rr.reduce((a,x)=>a+(Number(x.italiani)||0),0);
const stranieri=rr.reduce((a,x)=>a+(Number(x.stranieri)||0),0);
const totale=rr.reduce((a,x)=>a+(Number(x.totale)||0),0);
return {...c,italiani,stranieri,totale,percentuale:totale?stranieri/totale*100:0};
});
if(document.getElementById('chartCircoscrizioni')){
charts.push(new Chart(document.getElementById('chartCircoscrizioni'),{type:'bar',data:{labels:confronto.map(x=>x.name),datasets:[{label:'Residenti',data:confronto.map(x=>x.totale)}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}}));
}
if(document.getElementById('chartStranieriCircoscrizioni')){
charts.push(new Chart(document.getElementById('chartStranieriCircoscrizioni'),{type:'bar',data:{labels:confronto.map(x=>x.name),datasets:[{label:'Stranieri (%)',data:confronto.map(x=>Number(x.percentuale.toFixed(2)))}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{callback:v=>v+'%'}}}}}));
}
}

 if(active==='gis'||active==='spatial') initMap();
$('#territory').textContent=(DATA.territories.quartieri.find(x=>x.id===s.quart)?.name||DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Palermo').replace(/(^|[\s-])(\p{L})/gu,(_,sep,letter)=>sep+letter.toLocaleUpperCase('it-IT'));
}
function initMap(){let el=$('#map');if(!el||!window.L)return;let map=L.map(el).setView([38.1157,13.3615],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);if(DATA.geojson)L.geoJSON(DATA.geojson).addTo(map);}
function fillFilters(){
 const c=$('#circ'),q=$('#quart');DATA.territories.circoscrizioni.forEach(x=>c.add(new Option(x.name,x.id)));DATA.territories.quartieri.forEach(x=>q.add(new Option(x.name,x.id)));
}
async function load(){try{let r=await fetch('data/territoriale.json',{cache:'no-store'});if(!r.ok)throw new Error('territoriale');DATA=await r.json(); let d=await fetch('data/demografia.json',{cache:'no-store'});if(d.ok){let dem=await d.json();DATA.demografia=dem.popolazione_territoriale||[];DATA.demografiaMeta=dem.meta||{};DATA.demografiaNonAttribuita=dem.popolazione_non_attribuita||[];}let s=await fetch('data/sociale_palermo_idise_2023.json',{cache:'no-store'});if(s.ok){let soc=await s.json();DATA.sociale=soc.aree||[];DATA.socialeMeta=soc.meta||{};DATA.socialeAdu=soc.adu||[];}$('#status').textContent=DATA.demografia.length?'Dati territoriali e demografici caricati · anno 2022':'Dati territoriali caricati · archivio demografico non disponibile';fillFilters();}catch(e){$('#status').textContent='Struttura pronta · dati non caricati';}render();} 
$('#nav').addEventListener('click',e=>{let b=e.target.closest('[data-page]');if(!b)return;active=b.dataset.page;document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));render();});
$('#circ').addEventListener('change',()=>{const id=$('#circ').value,q=$('#quart');q.innerHTML='<option value="">Tutti i quartieri</option>';DATA.territories.quartieri.filter(x=>!id||(x.circ_ids||[]).includes(id)).forEach(x=>q.add(new Option(x.name,x.id)));render();});
$('#quart').addEventListener('change',render);
load();
