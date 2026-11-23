/* Metabolismo urbano · integrazione dati territoriali reali
 * Aggregazione per centroide UPL: indicatori esplorativi, non superficie GIS clipped.
 * Copernicus Urban Atlas e OSM sono fonti indipendenti e non vengono sommate.
 */
(()=>{
 'use strict';
 const state={data:null,promise:null,map:null,layerControl:null,renderTimer:null};
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:1});
 const fmtArea=n=>Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:0});
 const fetchJson=async path=>{const r=await fetch(path,{cache:'force-cache'});if(!r.ok)throw new Error(path+' · HTTP '+r.status);return r.json();};
 const load=()=>state.promise||(state.promise=Promise.all([
  fetchJson('data/geo/circoscrizioni_palermo_2021.geojson'),
  fetchJson('data/geo/aree_subcomunali_liv2_palermo_2021.geojson'),
  fetchJson('data/geo/aree_subcomunali_liv3_palermo_2021.geojson'),
  fetchJson('data/geo/copernicus_verde_accessibile_2021.geojson'),
  fetchJson('data/geo/osm_verde_accessibile_2025.geojson')
 ]).then(([circs,quarts,upls,cop,osm])=>{
  if(!window.turf)throw new Error('Turf.js non disponibile');
  const UPL=(upls.features||[]).map(f=>{
   const p=f.properties||{},pt=turf.pointOnFeature(f);
   const quart=(quarts.features||[]).find(q=>turf.booleanPointInPolygon(pt,q));
   const circ=(circs.features||[]).find(c=>turf.booleanPointInPolygon(pt,c));
   return {feature:f,code:String(p.COM_ASC3??p.COD_ASC3??''),name:String(p.DEN_ASC3??p.COM_ASC3??''),population:Number(p.POP21)||0,area:Number(p.SHAPE_Area)||turf.area(f),quartCode:String(quart?.properties?.COM_ASC2??''),quartName:String(quart?.properties?.DEN_ASC2??''),circCode:String(circ?.properties?.COM_ASC1??''),circName:String(circ?.properties?.DEN_ASC1??'')};
  });
  const datasets={copernicus:{label:'Copernicus Urban Atlas 2021',features:cop.features||[],areaField:'area_sqm',source:'Palermo 3-30-300 · elaborazione da Urban Atlas 2021'},osm:{label:'OpenStreetMap 2025',features:osm.features||[],areaField:'area_sqm',source:'Palermo 3-30-300 · elaborazione OSM'}};
  Object.values(datasets).forEach(ds=>{
   ds.totalArea=(ds.features||[]).reduce((sum,f)=>sum+(Number(f.properties?.[ds.areaField])||turf.area(f)),0);
   ds.byUpl=new Map(UPL.map(u=>[u.code,{area:0,count:0}]));
   ds.features.forEach(f=>{
    if(!f.geometry)return;
    let point;try{point=turf.pointOnFeature(f);}catch{point=turf.centroid(f);}
    const territory=UPL.find(u=>turf.booleanPointInPolygon(point,u.feature));
    if(!territory)return;
    const rec=ds.byUpl.get(territory.code);if(rec){rec.area+=Number(f.properties?.[ds.areaField])||turf.area(f);rec.count++;}
   });
  });
  state.data={circs,quarts,upls,UPL,datasets};return state.data;
 }).catch(error=>{state.promise=null;throw error;}));
 const selectedTerritory=()=>{
  if(!state.data)return {label:'Palermo · Comune',upl:state.data?.UPL||[],feature:null,level:'Comune'};
  const {circs,quarts,upls,UPL}=state.data;
  let section='',uplValue=document.getElementById('asc3')?.value||'',quartValue=document.getElementById('quart')?.value||'',circValue=document.getElementById('circ')?.value||'';
  try{section=document.getElementById('section')?.value||'';}catch{}
  if(section){const f=(window.GEO?.sections?.features||[]).find(x=>String(x.properties?.SEZ21_ID)===String(section));uplValue=String(f?.properties?.COM_ASC3||'');}
  if(uplValue){const f=upls.features.find(x=>String(x.properties?.COM_ASC3??x.properties?.COD_ASC3)===uplValue);const code=String(f?.properties?.COM_ASC3??f?.properties?.COD_ASC3??uplValue);return {label:f?.properties?.DEN_ASC3||code,upl:UPL.filter(u=>u.code===code),feature:f,level:'UPL'};}
  const geoAsc2=typeof geoSelection!=='undefined'?String(geoSelection.asc2||''):'';
  if(geoAsc2){const f=quarts.features.find(x=>String(x.properties?.COM_ASC2)===geoAsc2);return {label:f?.properties?.DEN_ASC2||'Quartiere',upl:UPL.filter(u=>u.quartCode===geoAsc2),feature:f,level:'Quartiere'};}
  if(quartValue){const q=(window.DATA?.territories?.quartieri||[]).find(x=>x.id===quartValue);const f=quarts.features.find(x=>normalize(x.properties?.DEN_ASC2)===normalize(q?.name));return {label:f?.properties?.DEN_ASC2||q?.name||'Quartiere',upl:UPL.filter(u=>f&&u.quartCode===String(f.properties.COM_ASC2)),feature:f,level:'Quartiere'};}
  if(circValue){const n=Number(String(circValue).replace(/[^0-9]/g,''));const f=circs.features.find(x=>Number(x.properties?.COD_ASC1??x.properties?.COM_ASC1)===n);const code=String(f?.properties?.COM_ASC1||'');return {label:f?.properties?.DEN_ASC1||('Circoscrizione '+n),upl:UPL.filter(u=>u.circCode===code),feature:f,level:'Circoscrizione'};}
  return {label:'Palermo · Comune',upl:UPL,feature:null,level:'Comune'};
 };
 const aggregate=(territory,ds)=>{
  const rows=territory.upl,area=rows.reduce((s,u)=>s+u.area,0),pop=rows.reduce((s,u)=>s+u.population,0),green=rows.reduce((s,u)=>s+(ds.byUpl.get(u.code)?.area||0),0),count=rows.reduce((s,u)=>s+(ds.byUpl.get(u.code)?.count||0),0);
  return {area,pop,green,count,pct:area?green/area*100:0,percapita:pop?green/pop:0};
 };
 const render=async panel=>{
  const currentSource=panel.querySelector('#metabolismSource')?.value||'copernicus';
  panel.innerHTML='<div class="metabolism-data-head"><div><h3>Analisi territoriale · dati reali disponibili</h3><p>Verde pubblico/accessibile, confronto tra fonti e indicatori derivati. I dati sono aggregati in modo esplorativo per UPL.</p></div><span class="metabolism-chip">Dati elaborati</span></div><div class="metabolism-loading">Caricamento e aggregazione dei dataset territoriali…</div>';
  const d=await load(),sel=selectedTerritory(),ds=d.datasets[currentSource]||d.datasets.copernicus,metrics=aggregate(sel,ds);
  const cop=aggregate(sel,d.datasets.copernicus),osm=aggregate(sel,d.datasets.osm);
  const scopeRows=sel.upl.length?sel.upl:d.UPL;
  const ranked=scopeRows.map(u=>{const g=ds.byUpl.get(u.code)?.area||0;return {name:u.name,code:u.code,area:g,pop:u.population,percapita:u.population?g/u.population:0,pct:u.area?g/u.area*100:0};}).sort((a,b)=>b.percapita-a.percapita).slice(0,10);
  const sourceCards=(a,b)=>'<div class="metabolism-source-comparison"><div><small>Copernicus UA 2021</small><strong>'+fmtArea(a.green)+' m²</strong><span>'+fmt(a.percapita)+' m²/ab · '+fmt(a.pct)+'%</span></div><div><small>OSM 2025</small><strong>'+fmtArea(b.green)+' m²</strong><span>'+fmt(b.percapita)+' m²/ab · '+fmt(b.pct)+'%</span></div></div>';
  const datasetSummary=ds=>{const assigned=[...ds.byUpl.values()].reduce((n,x)=>n+x.count,0),assignedArea=[...ds.byUpl.values()].reduce((n,x)=>n+x.area,0);return '<p class="metabolism-source-totals"><strong>Dataset comunale:</strong> '+ds.features.length+' poligoni · '+(ds.totalArea/1e6).toFixed(2).replace('.',',')+' km² (somma degli attributi area_sqm). <strong>Attribuiti alle UPL:</strong> '+assigned+' poligoni · '+(assignedArea/1e6).toFixed(2).replace('.',',')+' km². '+(assigned!==ds.features.length?'Attenzione: alcuni poligoni non sono attribuiti alle UPL.':'Copertura del conteggio completa.')+'</p>';};
  panel.innerHTML='<div class="metabolism-data-head"><div><h3>Analisi territoriale · dati reali disponibili</h3><p>Verde pubblico/accessibile, confronto tra fonti e indicatori derivati.</p></div><span class="metabolism-chip">Dati elaborati</span></div>'+
   '<div class="metabolism-data-controls"><label>Fonte di confronto<select id="metabolismSource"><option value="copernicus">Copernicus Urban Atlas 2021</option><option value="osm">OpenStreetMap 2025</option></select></label><span class="metabolism-scope">Ambito: <strong>'+safe(sel.label)+'</strong> · '+sel.upl.length+' UPL</span></div>'+
   '<div class="metabolism-real-kpis"><div><small>Verde accessibile · fonte selezionata</small><strong>'+fmtArea(metrics.green)+' m²</strong><span>'+metrics.count+' poligoni assegnati</span></div><div><small>Verde per abitante</small><strong>'+fmt(metrics.percapita)+' m²/ab</strong><span>Popolazione ISTAT 2021 · '+fmtArea(metrics.pop)+' residenti</span></div><div><small>Incidenza sul territorio</small><strong>'+fmt(metrics.pct)+'%</strong><span>Area territoriale di riferimento</span></div></div>'+
   '<div class="metabolism-source-summary"><h4>Confronto tra fonti indipendenti</h4>'+sourceCards(cop,osm)+datasetSummary(d.datasets.copernicus)+datasetSummary(d.datasets.osm)+'<p class="muted">I due dataset non vengono sommati: differiscono per origine, classificazione e copertura. I risultati sono indicativi, attribuiti alle UPL per centroide, non mediante clipping delle geometrie; eventuali sovrapposizioni interne ai poligoni fonte possono incidere sul totale.</p></div>'+
   '<div class="metabolism-map-and-ranking"><div class="metabolism-map-card"><h4>Cartografia del verde accessibile</h4><div id="metabolismMap" class="metabolism-map"></div><p class="muted">Attiva i layer dal controllo cartografico. La selezione territoriale è evidenziata.</p></div><div class="metabolism-ranking"><h4>UPL · confronto per verde per abitante</h4><div class="metabolism-ranking-bars">'+ranked.map(r=>'<div class="metabolism-rank-row"><span title="'+safe(r.name)+'">'+safe(r.name)+'</span><div><i style="width:'+Math.min(100,(r.percapita/(ranked[0]?.percapita||1))*100)+'%"></i></div><b>'+fmt(r.percapita)+'</b></div>').join('')+'</div><p class="muted">Ranking esplorativo, con attribuzione per centroide e basato sulla fonte selezionata.</p></div></div>'+
   '<div class="metabolism-method-grid"><div><h4>Metodo e limiti</h4><ul><li>Superficie verde da campo area_sqm del dataset; fallback a Turf area.</li><li>Attribuzione del poligono all’UPL contenente il punto-on-feature.</li><li>UPL aggregata per circoscrizione/quartiere/Comune mediante appartenenza geometrica.</li><li>Verde per abitante usa POP21 delle geometrie ISTAT 2021.</li><li>Non certifica apertura, proprietà, manutenzione o fruibilità reale.</li><li>Non misura copertura arborea, biodiversità o permeabilità.</li></ul></div><div><h4>Fonti e attribuzione</h4><ul><li><a href="https://sigfreedo.github.io/palermo-3-30-300/dati.html" target="_blank" rel="noopener">Palermo 3-30-300 · dataset e metodologia</a></li><li><a href="data/metabolism/metadata.json" target="_blank" rel="noopener">Catalogo dati, formule e limiti del modulo</a></li><li><a href="https://land.copernicus.eu/en/products/urban-atlas" target="_blank" rel="noopener">Copernicus Urban Atlas</a> · 2021</li><li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · ODbL</li><li><a href="https://www.isprambiente.gov.it/it/servizi/accesso-ai-dati-ambientali" target="_blank" rel="noopener">ISPRA · dati ambientali</a></li><li><a href="https://www.snpambiente.it/wp-content/uploads/2023/07/230703-DVI_2022_Summary_City_in_transition.pdf" target="_blank" rel="noopener">SNPA · Palermo Resilience</a></li></ul></div></div>'+
   '<div class="metabolism-intervention"><h4>Scenario di intervento · effetti quantitativi semplici</h4><p>Simulazione di superficie, non previsione idrologica o microclimatica.</p><div class="metabolism-intervention-controls"><label>Nuova superficie verde <output id="metAddGreenOutput">2.000 m²</output><input id="metAddGreen" type="range" min="0" max="20000" step="250" value="2000"></label><label>De-impermeabilizzazione <output id="metAddPermeableOutput">1.000 m²</output><input id="metAddPermeable" type="range" min="0" max="20000" step="250" value="1000"></label><label>Rain garden / ritenzione <output id="metRainOutput">500 m²</output><input id="metRain" type="range" min="0" max="10000" step="100" value="500"></label><label>Pioggia di scenario <output id="metRainMmOutput">30 mm</output><input id="metRainMm" type="range" min="0" max="100" step="5" value="30"></label></div><div class="metabolism-intervention-results"><div><small>Incremento verde per abitante</small><strong id="metAddGreenPerCapita">—</strong></div><div><small>Incremento permeabilità territoriale</small><strong id="metAddPermeablePct">—</strong></div><div><small>Volume pioggia su rain garden</small><strong id="metRainVolume">—</strong></div></div><p class="muted">Volume teorico di precipitazione incidente sull’area selezionata: non equivale a volume trattenuto o infiltrato. Per stimare la ritenzione servono coefficienti del suolo, dimensionamento e dati idrologici.</p></div>';
  panel.querySelector('#metabolismSource').value=currentSource;
  panel.querySelector('#metabolismSource').addEventListener('change',e=>render(panel).catch(showError));
  panel.querySelectorAll('#metAddGreen,#metAddPermeable,#metRain,#metRainMm').forEach(el=>el.addEventListener('input',()=>updateScenario(panel,sel)));
  updateScenario(panel,sel);
  initMap(panel,d,sel);
 };
 const updateScenario=(panel,sel)=>{
  const green=Number(panel.querySelector('#metAddGreen')?.value||0),permeable=Number(panel.querySelector('#metAddPermeable')?.value||0),rainArea=Number(panel.querySelector('#metRain')?.value||0),mm=Number(panel.querySelector('#metRainMm')?.value||0),pop=sel.upl.reduce((s,u)=>s+u.population,0),area=sel.upl.reduce((s,u)=>s+u.area,0);
  panel.querySelector('#metAddGreenOutput').textContent=fmtArea(green)+' m²';panel.querySelector('#metAddPermeableOutput').textContent=fmtArea(permeable)+' m²';panel.querySelector('#metRainOutput').textContent=fmtArea(rainArea)+' m²';panel.querySelector('#metRainMmOutput').textContent=mm+' mm';
  panel.querySelector('#metAddGreenPerCapita').textContent=pop?(green/pop).toFixed(2).replace('.',',')+' m²/ab':'—';
  panel.querySelector('#metAddPermeablePct').textContent=area?(permeable/area*100).toFixed(2).replace('.',',')+'%':'—';
  panel.querySelector('#metRainVolume').textContent=(rainArea*mm/1000).toFixed(2).replace('.',',')+' m³';
 };
 const showError=error=>{
  const host=document.querySelector('#metabolismRealData .metabolism-loading');if(host)host.textContent='Dati territoriali non caricati: '+(error?.message||error)+'. I valori non vengono simulati.';
 };
 const initMap=(panel,d,sel)=>{
  const mapHost=panel.querySelector('#metabolismMap');if(!mapHost||!window.L)return;
  if(state.map){try{state.map.remove();}catch{}state.map=null;}
  const map=L.map(mapHost,{scrollWheelZoom:false}).setView([38.115,13.35],12);
  state.map=map;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const boundary=sel.feature?L.geoJSON(sel.feature,{style:{color:'#173653',weight:3,fillColor:'#4c86a8',fillOpacity:.12}}):L.geoJSON({type:'FeatureCollection',features:sel.upl.map(x=>x.feature)},{style:{color:'#8ba0b2',weight:1,fillOpacity:.02}});
  boundary.addTo(map);
  const makeGreen=(ds,color)=>L.geoJSON({type:'FeatureCollection',features:ds.features.filter(f=>{if(!sel.feature)return true;try{return turf.booleanPointInPolygon(turf.pointOnFeature(f),sel.feature);}catch{return false;}})},{style:{color,weight:1,fillColor:color,fillOpacity:.3},onEachFeature:(f,l)=>{const p=f.properties||{};l.bindPopup('<strong>'+safe(p.name||'Area verde')+'</strong><br>'+safe(p.size_label||'Classificazione non disponibile')+'<br>'+fmtArea(p.area_sqm||0)+' m² · '+ds.label);}});
  const cop=makeGreen(d.datasets.copernicus,'#167a53'),osm=makeGreen(d.datasets.osm,'#b86c27');
  L.control.layers({'Territorio selezionato':boundary},{'Copernicus · verde accessibile 2021':cop,'OSM · verde mappato 2025':osm},{collapsed:true}).addTo(map);
  const target=sel.feature||{type:'FeatureCollection',features:sel.upl.map(x=>x.feature)};
  try{map.fitBounds(L.geoJSON(target).getBounds(),{padding:[18,18],maxZoom:15});}catch{}
 };
 const attach=()=>{
  const content=document.getElementById('content');if(!content)return;
  if(!content.querySelector('.metabolism-intro')){if(state.map){try{state.map.remove();}catch{}state.map=null;}return;}
  if(content.querySelector('#metabolismRealData'))return;
  const panel=document.createElement('section');panel.id='metabolismRealData';panel.className='card metabolism-real-data';panel.dataset.enhanced='true';
  const simulator=content.querySelector('.metabolism-simulator');if(simulator)simulator.insertAdjacentElement('afterend',panel);else content.appendChild(panel);
  render(panel).catch(error=>{panel.innerHTML='<div class="metabolism-loading">'+safe(error?.message||error)+' · dataset non disponibile.</div>';});
 };
 const observer=new MutationObserver(()=>{clearTimeout(state.renderTimer);state.renderTimer=setTimeout(attach,80);});
 observer.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
 const refreshTerritory=()=>{const panel=document.getElementById('metabolismRealData');if(panel)render(panel).catch(showError);else attach();};
 document.addEventListener('change',e=>{if(['circ','quart','asc3','section'].includes(e.target?.id)){setTimeout(refreshTerritory,150);}});
 document.addEventListener('click',e=>{if(e.target.closest('[data-page="metabolism"]'))setTimeout(attach,150);});
})();
