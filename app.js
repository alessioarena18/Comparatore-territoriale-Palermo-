const $=s=>document.querySelector(s);
let DATA={meta:{},territories:{circoscrizioni:[],quartieri:[]},demografia:[],sociale:[],socialeMeta:{},socialeAdu:[],scuole:[],standard:[],geojson:null,schoolRegister:{records:[]},schoolSiteVerification:{records:[]},schoolCensus:{records:[]}};
let active='overview', charts=[];
let gisMap=null, gisImportedLayers=[], gisLayerControl=null, mapSelection=null, mapSelections=[];
let greenMapInstance=null,greenMapData=null,greenSummaryData=null;
let GEO={asc1:null,asc2:null,asc3:null,sections:null};
let geoSelection={asc2:'',asc3:'',section:''};
const pages={
overview:['QUADRO CONOSCITIVO','Panoramica territoriale','Quadro integrato delle componenti demografiche, scolastiche, urbanistiche e spaziali.'],
demography:['POPOLAZIONE RESIDENTE','Analisi demografica','Distribuzione per sesso, classi d’età e fasce funzionali.'],
social:['STRUTTURA SOCIALE','Analisi sociale','Indicatori di struttura demografica e caratteristiche della popolazione.'],
schools:['SERVIZI TERRITORIALI','Servizi e dotazioni urbane','Distribuzione delle attrezzature collettive, della rete scolastica e delle dotazioni di quartiere.'],
standards:['DOTAZIONI TERRITORIALI','Standard urbanistici','Verifica delle dotazioni territoriali e confronto con i parametri normativi applicabili.'],
green:['INFRASTRUTTURA VERDE','Verde urbano e sistema ecologico','Lettura delle aree verdi, agricole, storiche e collinari secondo le destinazioni del PRG 2004.'], 
gis:['SISTEMA INFORMATIVO TERRITORIALE','Cartografia GIS','Visualizzazione dei confini amministrativi, delle sezioni censuarie e dei servizi.'],
spatial:['GEOGRAFIA E ACCESSIBILITÀ','Analisi spaziale','Prossimità, distanze, accessibilità e aree di influenza.'],
compare:['CONFRONTO TERRITORIALE','Confronti','Comparazione tra circoscrizioni, quartieri e Comune.'],
sources:['DOCUMENTAZIONE','Fonti e metodologia','Tracciabilità delle fonti, degli aggiornamenti e dei criteri di elaborazione.']
};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function selected(){return {circ:$('#circ')?.value||'',quart:$('#quart')?.value||'',asc2:geoSelection.asc2||'',asc3:$('#asc3')?.value||'',section:$('#section')?.value||''};}

let standardTerritorialStatsCache={source:'',categories:['S','IC','V','P','F','F1','F2','F34'],standardCodes:['F1','F2','F34'],levels:{},errors:0,intersections:0,unionOperations:0};
let standardTerritorialPrg=null;
let standardTerritorialJobs={};
function standardBounds(feature){
 const c=feature?.geometry?.coordinates;if(!c)return null;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const walk=a=>{if(Array.isArray(a)&&typeof a[0]==='number'&&typeof a[1]==='number'){minX=Math.min(minX,a[0]);minY=Math.min(minY,a[1]);maxX=Math.max(maxX,a[0]);maxY=Math.max(maxY,a[1]);}else if(Array.isArray(a))a.forEach(walk);};
 walk(c);return Number.isFinite(minX)?[minX,minY,maxX,maxY]:null;
}
function standardBboxOverlaps(a,b){return a&&b&&a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
const standardYield=()=>new Promise(resolve=>setTimeout(resolve,0));
async function computeStandardTerritorialStats(prg,levelKey){
 if(!window.turf||typeof turf.intersect!=='function'||typeof turf.union!=='function')throw new Error('Libreria geometrica Turf.js non disponibile o incompleta');
 if(standardTerritorialStatsCache.levels[levelKey])return standardTerritorialStatsCache;
 if(standardTerritorialJobs[levelKey])return standardTerritorialJobs[levelKey];
 const job=(async()=>{
  const definitions=[
   {key:'asc1',label:'Circoscrizioni',code:'COD_ASC1',name:'DEN_ASC1'},
   {key:'asc2',label:'Quartieri',code:'COM_ASC2',name:'DEN_ASC2'},
   {key:'asc3',label:'UPL',code:'COM_ASC3',name:'DEN_ASC3'},
   {key:'sections',label:'Sezioni censuarie',code:'SEZ21_ID',name:'SEZ21'}
  ];
  const def=definitions.find(x=>x.key===levelKey);
  if(!def)throw new Error('Livello territoriale non riconosciuto');
  const collection=GEO[def.key];
  if(!collection?.features?.length)throw new Error('Geometrie territoriali non disponibili per il livello selezionato');
  const categories=['S','IC','V','P','F','F1','F2','F34'];
  const groups=prg.features.filter(f=>f.geometry&&categories.slice(0,5).includes(f.properties?.PRG_GROUP));
  const prepared=groups.map(f=>{
   const code=String(f.properties?.PRG_CODE||'').toUpperCase();
   const tokens=code.split(/[^A-Z0-9]+/).filter(Boolean);
   const fTokens=tokens.filter(token=>['F1','F2','F3','F4','F34'].includes(token));
   const otherTokens=tokens.filter(token=>!['F1','F2','F3','F4','F34'].includes(token));
   const fCategory=otherTokens.length===0&&fTokens.length>0
    ?(fTokens.every(token=>token==='F3'||token==='F4'||token==='F34')?'F34':fTokens.length===1?fTokens[0]:'')
    :'';
   return {feature:f,bbox:standardBounds(f),category:f.properties.PRG_GROUP,fCategory};
  });
  const territories=collection.features.map(f=>({feature:f,bbox:standardBounds(f),code:String(f.properties?.[def.code]??''),name:String(f.properties?.[def.name]??f.properties?.[def.code]??'Territorio'),population:Number(f.properties?.POP21)||0,area:Number(f.properties?.Shape_Area??f.properties?.SHAPE_Area)||0})).filter(x=>x.bbox);
  const rows=territories.map(t=>({code:t.code,name:t.name,population:t.population,territoryAreaM2:t.area,areas:{S:0,IC:0,V:0,P:0,F:0,F1:0,F2:0,F34:0},features:{S:0,IC:0,V:0,P:0,F:0,F1:0,F2:0,F34:0},parts:{S:[],IC:[],V:[],P:[],F:[],F1:[],F2:[],F34:[]}}));
  const output={label:def.label,rows,errors:0,intersections:0,unionOperations:0};
  for(let n=0;n<prepared.length;n++){
   const item=prepared[n];if(!item.bbox)continue;
   for(let i=0;i<territories.length;i++){
    if(!standardBboxOverlaps(item.bbox,territories[i].bbox))continue;
    try{
     const intersection=turf.intersect(turf.featureCollection([item.feature,territories[i].feature]));
     if(!intersection)continue;
     const area=turf.area(intersection);
     if(!Number.isFinite(area)||area<0.5)continue;
     const row=rows[i];
     row.parts[item.category].push(intersection);
     row.features[item.category]++;
     if(item.category==='F'&&item.fCategory){row.parts[item.fCategory].push(intersection);row.features[item.fCategory]++;}
     output.intersections++;
    }catch(error){output.errors++;}
   }
   if(n%12===11)await standardYield();
  }
  for(let ri=0;ri<rows.length;ri++){
   const row=rows[ri];
   for(const category of categories){
    const parts=row.parts[category];
    if(!parts.length){row.areas[category]=0;continue;}
    try{
     const merged=parts.length===1?parts[0]:turf.union(turf.featureCollection(parts));
     if(!merged)throw new Error('Unione geometrica vuota');
     row.areas[category]=turf.area(merged);
     if(parts.length>1)output.unionOperations++;
    }catch(error){row.areas[category]=null;row.unionErrors=(row.unionErrors||0)+1;output.errors++;}
   }
   delete row.parts;
   if(ri%8===7)await standardYield();
  }
  standardTerritorialStatsCache.levels[levelKey]=output;
  standardTerritorialStatsCache.source=prg.source||'Variante Generale PRG, DCC 7/2004';
  standardTerritorialStatsCache.errors+=output.errors;
  standardTerritorialStatsCache.intersections+=output.intersections;
  standardTerritorialStatsCache.unionOperations+=output.unionOperations;
  return standardTerritorialStatsCache;
 })();
 standardTerritorialJobs[levelKey]=job;
 try{return await job;}finally{delete standardTerritorialJobs[levelKey];}
}
function renderStandardTerritorialStats(){
 const host=$('#standardTerritorialStats');if(!host)return;
 const level=$('#standardTerritorialLevel')?.value||'asc1',stats=standardTerritorialStatsCache;
 const data=stats.levels[level];
 if(!data){host.innerHTML='<p class="muted">Seleziona il livello territoriale. Il calcolo viene avviato solo per il livello richiesto e procede senza bloccare l’interfaccia.</p>';return;}
 const fmtHa=n=>Number.isFinite(n)?(n/10000).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' ha':'N.D.';
 const fmtM2=n=>Number.isFinite(n)?n.toLocaleString('it-IT',{maximumFractionDigits:2}):'N.D.';
 const standards={S:4.5,IC:2,V:9,P:2.5,F1:1.5,F2:1,F34:15};
 const localCodes=['S','IC','V','P'],generalCodes=['F1','F2','F34'];
 const rows=data.rows.map(r=>{
  const per=key=>r.population>0&&Number.isFinite(r.areas[key])?r.areas[key]/r.population:null;
  const ratio=key=>{const value=per(key),target=standards[key];return value===null?'N.D.':(value/target*100).toLocaleString('it-IT',{maximumFractionDigits:0})+'%';};
  const cell=key=>fmtHa(r.areas[key])+'<br><small>'+(per(key)===null?'N.D.':fmtM2(per(key))+' m²/ab')+'</small>';
  const ratios=localCodes.concat(generalCodes).map(ratio);
  return '<tr><td>'+esc(r.name)+'</td><td>'+fmtM2(r.population)+'</td><td>'+fmtHa(r.territoryAreaM2)+'</td><td>'+cell('S')+'</td><td>'+cell('IC')+'</td><td>'+cell('V')+'</td><td>'+cell('P')+'</td><td>'+cell('F')+'</td><td>'+cell('F1')+'</td><td>'+cell('F2')+'</td><td>'+cell('F34')+'</td><td>'+ratios.join(' · ')+'</td></tr>';
 }).join('');
 const totals=data.rows.reduce((acc,r)=>{
  acc.population+=r.population;acc.territoryAreaM2+=r.territoryAreaM2;
  ['S','IC','V','P','F','F1','F2','F34'].forEach(k=>{if(Number.isFinite(r.areas[k]))acc.areas[k]+=r.areas[k];else acc.errors++;});
  return acc;
 },{population:0,territoryAreaM2:0,areas:{S:0,IC:0,V:0,P:0,F:0,F1:0,F2:0,F34:0},errors:0});
 const ratioText=localCodes.concat(generalCodes).map(k=>standards[k].toLocaleString('it-IT',{maximumFractionDigits:1})).join(' · ');
 host.innerHTML='<p class="muted">Intersezioni geometriche PRG × '+esc(data.label)+'. '+data.rows.length+' unità territoriali elaborate; '+data.intersections.toLocaleString('it-IT')+' intersezioni non nulle; '+data.unionOperations.toLocaleString('it-IT')+' unioni geometriche eseguite; '+data.errors+' errori di intersezione/unione.</p><div class="table-wrap"><table><thead><tr><th>Unità territoriale</th><th>Pop. ISTAT 2021</th><th>Superficie unità</th><th>S · Istruzione</th><th>IC · Interesse comune</th><th>V · Verde</th><th>P · Parcheggi</th><th>F · Totale generale</th><th>F1 · Istruzione sup.</th><th>F2 · Sanità</th><th>F3+F4 · Sport e parchi urbani/territoriali</th><th>Confronto % standard S/IC/V/P/F1/F2/F3+F4</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><th>Totale</th><th>'+fmtM2(totals.population)+'</th><th>'+fmtHa(totals.territoryAreaM2)+'</th><th>'+fmtHa(totals.areas.S)+'</th><th>'+fmtHa(totals.areas.IC)+'</th><th>'+fmtHa(totals.areas.V)+'</th><th>'+fmtHa(totals.areas.P)+'</th><th>'+fmtHa(totals.areas.F)+'</th><th>'+fmtHa(totals.areas.F1)+'</th><th>'+fmtHa(totals.areas.F2)+'</th><th>'+fmtHa(totals.areas.F34)+'</th><th>Riferimenti m²/ab: '+ratioText+'</th></tr></tfoot></table></div><p class="muted">I rapporti percentuali confrontano le superfici geometriche del PRG con i parametri di riferimento: standard locali ex artt. 3, 4 e 6 D.M. 1444/1968 (S 4,5; IC 2; V 9; P 2,5 m²/ab) e attrezzature di interesse generale richiamate dall’art. 4, comma 5 (F1 1,5; F2 1; F3+F4 15 m²/ab). F è mostrata come aggregato descrittivo e non entra in alcun rapporto. Le superfici sono calcolate come unione geometrica per categoria e unità territoriale, per evitare doppi conteggi interni alla stessa categoria; le sovrapposizioni tra categorie differenti restano distinte. Le codifiche combinate non vengono ripartite arbitrariamente: F1, F2 e il gruppo F3+F4 sono riconosciuti solo quando il codice contiene esattamente il token corrispondente. Il confronto non certifica attuazione, proprietà pubblica, accessibilità, fruibilità, capienza o disponibilità reale. Le categorie e i parametri devono essere letti con NTA, tavole e atti vigenti.</p>';
}
async function loadStandardTerritorialLevel(level){
 const host=$('#standardTerritorialStats');if(!host||!standardTerritorialPrg)return;
 if(standardTerritorialStatsCache.levels[level]){renderStandardTerritorialStats();return;}
 host.innerHTML='<p class="muted">Elaborazione del livello '+esc(level)+' in corso. L’interfaccia resta disponibile; attendere il completamento del calcolo.</p>';
 try{
  await computeStandardTerritorialStats(standardTerritorialPrg,level);
  if($('#standardTerritorialLevel')?.value===level)renderStandardTerritorialStats();
  const note=$('#standardPrgStatus');if(note&&!note.textContent.includes('Analisi territoriale:'))note.textContent+=' | Analisi territoriale calcolata su richiesta per il livello selezionato.';
 }catch(error){host.innerHTML='<p class="school-note">Analisi territoriale non disponibile: '+esc(error.message||error)+'</p>';}
}
async function loadStandardTerritorialStats(prg){
 standardTerritorialPrg=prg;
 await loadStandardTerritorialLevel($('#standardTerritorialLevel')?.value||'asc1');
}

let publicFacilitiesPromise=null;
function classifyPublicFacility(tags={}){
 const a=tags.amenity||'',l=tags.leisure||'',o=tags.office||'',tour=tags.tourism||'';
 if(a==='parking')return 'P';
 if(a==='hospital'||a==='university'||a==='college'||a==='stadium'||tour==='university')return 'F';
 if(a==='place_of_worship'||a==='community_centre'||a==='townhall'||a==='library'||a==='theatre'||a==='post_office'||a==='police'||a==='fire_station'||a==='social_facility'||a==='clinic'||a==='doctors'||a==='nursing_home'||a==='marketplace'||o==='government')return 'IC';
 if(l==='park'||l==='playground'||l==='garden'||l==='sports_centre'||l==='pitch'||l==='stadium')return 'V';
 return '';
}
function loadPublicFacilities(){
 if(publicFacilitiesPromise)return publicFacilitiesPromise;
 const query='[out:json][timeout:25];(nwr["amenity"~"place_of_worship|community_centre|townhall|library|theatre|post_office|police|fire_station|social_facility|clinic|doctors|nursing_home|marketplace|parking|hospital|university|college|stadium"](38.00,13.20,38.25,13.50);nwr["leisure"~"park|playground|garden|sports_centre|pitch|stadium"](38.00,13.20,38.25,13.50);nwr["office"="government"](38.00,13.20,38.25,13.50););out center tags;';
 const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];
 publicFacilitiesPromise=(async()=>{
  let lastError=null;
  for(const endpoint of endpoints){
   try{
    const response=await fetch(endpoint+'?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(28000)});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    if(!Array.isArray(data.elements))throw new Error('Risposta OSM non valida');
    return data.elements.map(e=>{const tags=e.tags||{},category=classifyPublicFacility(tags);let lat=e.lat,lon=e.lon;if((!Number.isFinite(lat)||!Number.isFinite(lon))&&e.center){lat=e.center.lat;lon=e.center.lon;}return {id:String(e.type||'')+'/'+String(e.id||''),category,lat,lon,name:tags.name||tags['name:it']||tags.amenity||tags.leisure||tags.office||'Attrezzatura senza denominazione',subtype:tags.amenity||tags.leisure||tags.office||tags.tourism||'',address:[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' '),tags,source:'OpenStreetMap'};}).filter(x=>x.category&&Number.isFinite(x.lat)&&Number.isFinite(x.lon));
   }catch(error){lastError=error;}
  }
  throw lastError||new Error('Servizio cartografico non disponibile');
 })();
 return publicFacilitiesPromise;
}

function pointInRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];const cross=((yi>point[1])!==(yj>point[1]))&&(point[0]<(xj-xi)*(point[1]-yi)/(yj-yi||1e-15)+xi);if(cross)inside=!inside;}return inside;}
function pointInGeometry(point,geometry){if(!geometry)return false;const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];return polygons.some(poly=>poly.length&&pointInRing(point,poly[0])&&!poly.slice(1).some(hole=>pointInRing(point,hole)));}
function geometryBounds(geometry){const coords=[];const walk=a=>{if(Array.isArray(a)&&typeof a[0]==='number'&&typeof a[1]==='number')coords.push(a);else if(Array.isArray(a))a.forEach(walk);};if(geometry)walk(geometry.coordinates);if(!coords.length)return null;return [Math.min(...coords.map(p=>p[0])),Math.min(...coords.map(p=>p[1])),Math.max(...coords.map(p=>p[0])),Math.max(...coords.map(p=>p[1]))];}
function findCircParent(feature,level){const codeKey=level==='asc2'?'COM_ASC2':level==='asc3'?'COM_ASC3':'SEZ21_ID',code=String(feature?.properties?.[codeKey]??'');if(!code||!GEO.asc1||!feature?.geometry)return '';GEO.parentCache=GEO.parentCache||{};const cacheKey=level+':'+code;if(Object.prototype.hasOwnProperty.call(GEO.parentCache,cacheKey))return GEO.parentCache[cacheKey];const bounds=geometryBounds(feature.geometry);if(!bounds)return GEO.parentCache[cacheKey]='';const [minX,minY,maxX,maxY]=bounds,parents=GEO.asc1.features,steps=12,center=steps/2;for(let radius=0;radius<=center;radius++){for(let iy=Math.max(0,center-radius);iy<=Math.min(steps,center+radius);iy++){for(let ix=Math.max(0,center-radius);ix<=Math.min(steps,center+radius);ix++){if(radius&&Math.abs(ix-center)!==radius&&Math.abs(iy-center)!==radius)continue;const point=[minX+(maxX-minX)*ix/steps,minY+(maxY-minY)*iy/steps];if(!pointInGeometry(point,feature.geometry))continue;for(const parent of parents){const parentCode=String(parent.properties?.COD_ASC1??'');if(parentCode&&pointInGeometry(point,parent.geometry))return GEO.parentCache[cacheKey]=parentCode;}}}}return GEO.parentCache[cacheKey]='';}
function featureBelongsToCirc(feature,level,circId){if(!circId)return true;const parent=findCircParent(feature,level);return parent?('c'+parent===circId):false;}
function populateGeoSelectors(){
 const circ=$('#circ')?.value||'',asc2=geoSelection.asc2||'',asc3=geoSelection.asc3||'';
 const f2=GEO.asc2?.features.find(f=>String(f.properties?.COM_ASC2??'')===String(asc2)),f3=GEO.asc3?.features.find(f=>String(f.properties?.COM_ASC3??'')===String(asc3));
 [['asc3','asc3','DEN_ASC3','COM_ASC3'],['section','sections','SEZ21_ID','SEZ21_ID']].forEach(([id,key,label,code])=>{
  const el=$('#'+id),fc=GEO[key];if(!el||!fc)return;let features=fc.features;
  if(key==='asc3')features=features.filter(f=>f2?findParentFeature(f,'asc3','asc2')===f2:(!circ||featureBelongsToCirc(f,'asc3',circ)));
  if(key==='sections'){if(circ)features=features.filter(f=>featureBelongsToCirc(f,'section',circ));}
  const current=geoSelection[id]||'';if(current&&!features.some(f=>String(f.properties?.[code]??'')===String(current)))geoSelection[id]='';
  el.innerHTML='<option value="">'+(id==='section'?'Nessuna':'Tutte')+'</option>'+features.map(f=>{const p=f.properties||{},v=String(p[code]??'');return '<option value="'+esc(v)+'">'+esc(p[label]??v)+'</option>';}).join('');
  el.value=geoSelection[id]||'';
 });
 populateGisSelectors();
}
function applyGisSelectionVisibility(){
 if(!gisMap)return;
 const s=selected(),aliases={'MEZZOMONREALE-V.LLA TASCA':'Mezzomonreale-Villa Tasca','MONTEGRAPPA- S.ROSALIA':'S. Rosalia-Montegrappa','PALAZZO REALE - M.TE DI PIETA':'Palazzo Reale-Monte di Pietà','RESUTTANO-S. LORENZO':'Resuttana-San Lorenzo'};
 const norm=normalizeTerritoryName;
 gisImportedLayers.forEach(item=>{
  if(!item.key||!Array.isArray(item.featureLayers))return;
  if(item.key!=='schools'){
   item.featureLayers.forEach(layer=>{if(!item.layer.hasLayer(layer))item.layer.addLayer(layer);});
   return;
  }
  item.featureLayers.forEach(marker=>{
   const p=marker._schoolPoint||{},point=[p.lon,p.lat];let visible=true;
   if(s.quart){
    const f=GEO.asc2?.features.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2||quartiereAsc2Code(DATA.territories.quartieri.find(q=>q.id===s.quart))));
    visible=!!f&&pointInGeometry(point,f.geometry);
   }
   if(visible&&s.circ){const f=GEO.asc1?.features.find(x=>'c'+String(x.properties?.COD_ASC1)===s.circ);visible=!!f&&pointInGeometry(point,f.geometry);}
   if(visible&&s.asc2){const f=GEO.asc2?.features.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2));visible=!!f&&pointInGeometry(point,f.geometry);}
   if(visible&&s.asc3){const f=GEO.asc3?.features.find(x=>String(x.properties?.COM_ASC3)===String(s.asc3));visible=!!f&&pointInGeometry(point,f.geometry);}
   if(visible&&s.section){const f=GEO.sections?.features.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));visible=!!f&&pointInGeometry(point,f.geometry);}
   if(visible&&!item.layer.hasLayer(marker))item.layer.addLayer(marker);
   else if(!visible&&item.layer.hasLayer(marker))item.layer.removeLayer(marker);
  });
 });
}
function populateGisSelectors(){
 const circ=$('#circ')?.value||'',f2=GEO.asc2?.features.find(f=>String(f.properties?.COM_ASC2??'')===String(geoSelection.asc2||'')),f3=GEO.asc3?.features.find(f=>String(f.properties?.COM_ASC3??'')===String(geoSelection.asc3||''));
 const defs=[['gisSelectAsc1','asc1','DEN_ASC1','COM_ASC1'],['gisSelectAsc2','asc2','DEN_ASC2','COM_ASC2'],['gisSelectAsc3','asc3','DEN_ASC3','COM_ASC3'],['gisSelectSection','sections','SEZ21_ID','SEZ21_ID']];
 defs.forEach(([id,key,label,code])=>{const el=$('#'+id),fc=GEO[key];if(!el||!fc)return;let features=fc.features;
  if(key==='asc2'&&circ)features=features.filter(f=>featureBelongsToCirc(f,'asc2',circ));
  if(key==='asc3')features=features.filter(f=>f2?findParentFeature(f,'asc3','asc2')===f2:(!circ||featureBelongsToCirc(f,'asc3',circ)));
  if(key==='sections'){if(circ)features=features.filter(f=>featureBelongsToCirc(f,'section',circ));}
  const current=key==='asc1'?(GEO.asc1?.features.find(f=>'c'+String(f.properties?.COD_ASC1)===circ)?.properties?.COM_ASC1||''):geoSelection[key==='sections'?'section':key];
  const first=key==='sections'?'Nessuna':key==='asc1'?'Tutte le circoscrizioni':key==='asc2'?'Tutti i quartieri':'Tutte le UPL';
  el.innerHTML='<option value="">'+first+'</option>'+features.map(f=>{const p=f.properties||{},v=String(p[code]??'');return '<option value="'+esc(v)+'">'+esc(p[label]??v)+'</option>';}).join('');
  el.value=features.some(f=>String(f.properties?.[code]??'')===String(current||''))?String(current||''):'';
 });applyGisSelectionVisibility();
}
function normalizeTerritoryName(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
const QUARTIERE_ASC2_ALIASES={
 'san-giovanni-apostolo':'cruillassgiovanniapostolo',
 'resuttana-san-lorenzo':'resuttanaslorenzo'
};
function findAsc2FeatureForQuartiere(quartiere){
 const name=typeof quartiere==='string'?quartiere:(quartiere?.name||'');
 const id=typeof quartiere==='object'?(quartiere?.id||''):'';
 const normalized=normalizeTerritoryName(name);
 const exact=GEO.asc2?.features?.find(f=>normalizeTerritoryName(f.properties?.DEN_ASC2)===normalized);
 if(exact)return exact;
 const alias=QUARTIERE_ASC2_ALIASES[id];
 return alias?GEO.asc2?.features?.find(f=>normalizeTerritoryName(f.properties?.DEN_ASC2)===alias)||null:null;
}
function quartiereAsc2Code(quartiere){
 const feature=findAsc2FeatureForQuartiere(quartiere);
 return feature?String(feature.properties?.COM_ASC2??''):'';
}
function standardPopulationContext(selection){
 const s=selection||selected();
 if(s.section)return {value:null,source:'Dato non disponibile per la singola sezione censuaria'};
 if(s.asc3){const feature=GEO.asc3?.features?.find(x=>String(x.properties?.COM_ASC3)===String(s.asc3));const value=Number(feature?.properties?.POP21);return {value:Number.isFinite(value)&&value>0?value:null,source:'ISTAT 2021, popolazione residente POP21 dell’UPL'};}
 if(s.quart){const row=(DATA.demografia||[]).find(x=>x.tipo_territorio==='quartiere'&&String(x.territorio_id)===String(s.quart));const value=Number(row?.totale);return {value:Number.isFinite(value)&&value>0?value:null,source:'Comune di Palermo, popolazione residente al 31/12/2022, quartiere'};}
 if(s.asc2){const q=(DATA.territories?.quartieri||[]).find(x=>quartiereAsc2Code(x)===String(s.asc2));const row=q?(DATA.demografia||[]).find(x=>x.tipo_territorio==='quartiere'&&String(x.territorio_id)===String(q.id)):null;const value=Number(row?.totale);return {value:Number.isFinite(value)&&value>0?value:null,source:q?'Comune di Palermo, popolazione residente al 31/12/2022, quartiere associato alla geometria ASC2':'Popolazione non disponibile per il codice ASC2 selezionato'};}
 if(s.circ){const row=(DATA.demografia||[]).find(x=>x.tipo_territorio==='circoscrizione'&&String(x.territorio_id)===String(s.circ));const value=Number(row?.totale);return {value:Number.isFinite(value)&&value>0?value:null,source:'Comune di Palermo, popolazione residente al 31/12/2022, circoscrizione'};}
 const rows=(DATA.demografia||[]).filter(x=>x.tipo_territorio==='circoscrizione');
 const value=rows.reduce((sum,x)=>sum+(Number(x.totale)||0),0);
 return {value:value>0?value:null,source:'Comune di Palermo, somma delle 8 circoscrizioni, 31/12/2022'};
}
function filteredSchoolPoints(selection){
 const s=selection||selected(),points=DATA.schoolPoints||[];
 return points.filter(p=>{
  const point=[Number(p.lon),Number(p.lat)];
  if(!Number.isFinite(point[0])||!Number.isFinite(point[1]))return false;
  if(s.section){const f=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));if(!f||!pointInGeometry(point,f.geometry))return false;}
  if(s.asc3){const f=GEO.asc3?.features?.find(x=>String(x.properties?.COM_ASC3)===String(s.asc3));if(!f||!pointInGeometry(point,f.geometry))return false;}
  if(s.asc2){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2));if(!f||!pointInGeometry(point,f.geometry))return false;}
  if(s.quart&&!s.asc2){const q=DATA.territories?.quartieri?.find(x=>x.id===s.quart),f=findAsc2FeatureForQuartiere(q);if(f){if(!pointInGeometry(point,f.geometry))return false;}else if(normalizeTerritoryName(p.quarter)!==normalizeTerritoryName(q?.name))return false;}
  if(s.circ){const f=GEO.asc1?.features?.find(x=>'c'+String(x.properties?.COD_ASC1)===String(s.circ));if(!f||!pointInGeometry(point,f.geometry))return false;}
  return true;
 });
}
function findParentFeature(feature,childLevel,parentLevel){
 const parentData=GEO[parentLevel];if(!feature?.geometry||!parentData?.features?.length)return null;
 const bounds=geometryBounds(feature.geometry);if(!bounds)return null;
 const [minX,minY,maxX,maxY]=bounds,counts=new Map(),steps=28;
 for(let iy=0;iy<=steps;iy++)for(let ix=0;ix<=steps;ix++){const point=[minX+(maxX-minX)*ix/steps,minY+(maxY-minY)*iy/steps];if(!pointInGeometry(point,feature.geometry))continue;const parent=parentData.features.find(f=>pointInGeometry(point,f.geometry));if(parent)counts.set(parent,(counts.get(parent)||0)+1);}
 return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
}
function findLinkedTerritory(level,code){
 const sourceKey=level==='section'?'sections':level,sourceCode={asc1:'COM_ASC1',asc2:'COM_ASC2',asc3:'COM_ASC3',section:'SEZ21_ID'}[level];
 const feature=GEO[sourceKey]?.features.find(f=>String(f.properties?.[sourceCode]??'')===String(code));if(!feature)return {};
 const linked={};if(level==='asc1'){linked.asc1=String(code);return linked;}
 let asc2=null,asc3=null;
 if(level==='asc2')asc2=feature;
 if(level==='asc3'){asc3=feature;asc2=findParentFeature(feature,'asc3','asc2');}
 if(level==='section'){linked.section=String(code);asc3=findParentFeature(feature,'section','asc3');if(asc3)asc2=findParentFeature(asc3,'asc3','asc2');if(!asc2)asc2=findParentFeature(feature,'section','asc2');}
 if(asc2){linked.asc2=String(asc2.properties?.COM_ASC2??'');const c=findParentFeature(asc2,'asc2','asc1');if(c)linked.asc1=String(c.properties?.COM_ASC1??'');}
 if(asc3)linked.asc3=String(asc3.properties?.COM_ASC3??'');
 if(level==='asc2')linked.asc2=String(code);if(level==='asc3')linked.asc3=String(code);
 return linked;
}
function syncGeoSelection(level,code){
 const value=String(code||''),validLevel=['asc1','asc2','asc3','section'].includes(level);
 if(!validLevel)return;
 const linked=value?findLinkedTerritory(level,value):{},circSelect=$('#circ'),quartSelect=$('#quart');
 let circId='';
 if(linked.asc1){const f=GEO.asc1?.features.find(x=>String(x.properties?.COM_ASC1)===String(linked.asc1));if(f)circId='c'+String(f.properties?.COD_ASC1);}
 if(circSelect)circSelect.value=circId;
 if(quartSelect){
  quartSelect.innerHTML='<option value="">Tutti i quartieri</option>';
  DATA.territories.quartieri.filter(q=>!circId||(q.circ_ids||[]).includes(circId)).forEach(q=>quartSelect.add(new Option(q.name,q.id)));
  let q=null;
  if(linked.asc2){const f=GEO.asc2?.features.find(x=>String(x.properties?.COM_ASC2)===String(linked.asc2));if(f){const n=normalizeTerritoryName(f.properties?.DEN_ASC2||'');q=DATA.territories.quartieri.find(x=>normalizeTerritoryName(x.name)===n);if(!q&&n==='cruillassgiovanniapostolo')q=DATA.territories.quartieri.find(x=>x.id==='san-giovanni-apostolo');if(!q&&n==='resuttanaslorenzo')q=DATA.territories.quartieri.find(x=>x.id==='resuttana-san-lorenzo');}}
  if(q&&!Array.from(quartSelect.options).some(o=>o.value===q.id))quartSelect.add(new Option(q.name,q.id));
  quartSelect.value=q?.id||'';
 }
 geoSelection={asc2:linked.asc2||'',asc3:level==='asc3'||level==='section'?(linked.asc3||''):'',section:level==='section'?value:''};
 const upl=$('#asc3'),section=$('#section');if(upl)upl.value=geoSelection.asc3;if(section)section.value=geoSelection.section;
 mapSelections=value?[{key:level+':'+value,level,code:value}]:[];mapSelection=mapSelections[0]||null;
 populateGeoSelectors();
 const vals={gisSelectAsc1:linked.asc1||'',gisSelectAsc2:linked.asc2||'',gisSelectAsc3:geoSelection.asc3,gisSelectSection:geoSelection.section};
 Object.entries(vals).forEach(([id,v])=>{const el=$('#'+id);if(el)el.value=v;});
 render();updateGisSelectionFeedback();applyGisSelectedStyle();if(mapSelection)focusGisSelection(mapSelection.level,mapSelection.code);
}
function updateGisSelectionFeedback(){
 const labels=mapSelections.map(item=>{
  const key=item.level==='section'?'sections':item.level;
  const fields={asc1:['Circoscrizione','DEN_ASC1'],asc2:['Quartiere ASC2','DEN_ASC2'],asc3:['UPL','DEN_ASC3'],sections:['Sezione censuaria','SEZ21_ID']};
  const [label,field]=fields[key]||['Ambito',''];
  const codeKey={asc1:'COM_ASC1',asc2:'COM_ASC2',asc3:'COM_ASC3',sections:'SEZ21_ID'}[key];
  const feature=GEO[key]?.features.find(f=>String(f.properties?.[codeKey]??'')===item.code);
  return label+': '+(feature?.properties?.[field]||item.code);
 });
 const status=$('#gisSelectionStatus');
 if(status)status.textContent=labels.length?labels.length+' poligon'+(labels.length===1?'o selezionato: ':'i selezionati: ')+labels.join(' · '):'Nessun poligono selezionato.';
}
function focusGisSelection(level,code){
 if(!gisMap||!code)return;
 const key=level==='section'?'sections':level;
 const codeKey={asc1:'COM_ASC1',asc2:'COM_ASC2',asc3:'COM_ASC3',sections:'SEZ21_ID'}[key];
 const item=gisImportedLayers.find(x=>x.key===key);
 const featureLayer=item?.featureLayers?.find(layer=>String(layer.feature?.properties?.[codeKey]??'')===String(code));
 if(!featureLayer)return;
 const bounds=featureLayer.getBounds?.();
 if(bounds?.isValid?.()){
  const maxZoom=key==='sections'?17:key==='asc3'?15:key==='asc2'?14:13;
  gisMap.fitBounds(bounds,{padding:[28,28],maxZoom});
 }
}
function applyGisSelectedStyle(){
 const s=selected(),wanted=[];
 if(s.section)wanted.push(['sections','SEZ21_ID',s.section]);
 if(s.asc3)wanted.push(['asc3','COM_ASC3',s.asc3]);
 if(s.circ){const f=GEO.asc1?.features.find(x=>'c'+String(x.properties?.COD_ASC1)===s.circ);if(f)wanted.push(['asc1','COM_ASC1',String(f.properties?.COM_ASC1)]);}
 if(s.quart){const f=findAsc2FeatureForQuartiere(DATA.territories.quartieri.find(x=>x.id===s.quart));if(f)wanted.push(['asc2','COM_ASC2',String(f.properties?.COM_ASC2)]);}
 gisImportedLayers.forEach(item=>{
  if(item.key==='schools')return;
  (item.featureLayers||[]).forEach(layer=>{
   const p=layer.feature?.properties||{},codeKey={asc1:'COM_ASC1',asc2:'COM_ASC2',asc3:'COM_ASC3',sections:'SEZ21_ID'}[item.key];
   const match=wanted.some(([key,field,value])=>key===item.key&&String(p[field]??'')===String(value));
   layer.setStyle?.({weight:match?4:1.2,color:match?'#111827':item.key==='asc1'?'#1769aa':item.key==='asc2'?'#c05a21':item.key==='asc3'?'#27834a':'#8054a6',fillOpacity:match?.32:.035});
   if(match)layer.bringToFront?.();
  });
 });
}
function focusGeneralSelection(){
 if(!gisMap)return;
 const s=selected();let key,field,value;
 if(s.section){key='sections';field='SEZ21_ID';value=s.section;}
 else if(s.asc3){key='asc3';field='COM_ASC3';value=s.asc3;}
 else if(s.quart){key='asc2';field='COM_ASC2';value=quartiereAsc2Code(DATA.territories.quartieri.find(x=>x.id===s.quart));}
 else if(s.circ){key='asc1';field='COM_ASC1';value=GEO.asc1?.features.find(f=>'c'+String(f.properties?.COD_ASC1)===s.circ)?.properties?.COM_ASC1;}
 if(!key||value===undefined||value===null)return;
 const item=gisImportedLayers.find(x=>x.key===key),layer=item?.featureLayers?.find(l=>String(l.feature?.properties?.[field]??'')===String(value));
 const bounds=layer?.getBounds?.();if(bounds?.isValid?.())gisMap.fitBounds(bounds,{padding:[28,28],maxZoom:key==='sections'?17:key==='asc3'?15:key==='asc2'?14:13});
}
function pageShell(){let p=pages[active],s=selected();const ambiti=[],statistiche=[];const fmtGeo=v=>Number(v).toLocaleString('it-IT');const fmtArea=v=>{const m2=Number(v);return Number.isFinite(m2)&&m2>0?(m2/1000000).toLocaleString('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3})+' km²':'N.D.';};const dettaglio=(feature,label)=>{if(!feature)return;const x=feature.properties||{};ambiti.push(label+': '+(x.DEN_ASC1||x.DEN_ASC2||x.DEN_ASC3||x.SEZ21_ID||''));const valori=[['Estensione territoriale',fmtArea(x.SHAPE_Area??x.Shape_Area)],['POP21 · ISTAT 2021',x.POP21],['Famiglie',x.FAM21],['Abitazioni',x.ABI21],['Edifici',x.EDI21]].filter(v=>v[1]!==undefined&&v[1]!==null).map(v=>v[0]+': '+(v[0]==='Estensione territoriale'?v[1]:fmtGeo(v[1])));if(valori.length)statistiche.push('<div><strong>'+esc(label)+'</strong><br><span>'+valori.map(esc).join(' · ')+'</span></div>');};if(s.circ){const f=GEO.asc1?.features.find(x=>'c'+String(x.properties?.COD_ASC1)===s.circ);if(f)dettaglio(f,'Circoscrizione');else ambiti.push('Circoscrizione: '+(DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||s.circ));}if(s.quart){const q=DATA.territories.quartieri.find(x=>x.id===s.quart);const feature=findAsc2FeatureForQuartiere(q);if(feature)dettaglio(feature,'Quartiere');else ambiti.push('Quartiere: '+(q?.name||s.quart)+' · estensione non disponibile nel layer ISTAT');}if(s.asc2){const f=GEO.asc2?.features.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2));ambiti.push('Quartiere ASC2: '+(f?.properties?.DEN_ASC2||s.asc2));}if(s.asc3){const f=GEO.asc3?.features.find(x=>String(x.properties?.COM_ASC3)===String(s.asc3));if(f)dettaglio(f,'UPL');else ambiti.push('UPL: '+s.asc3);}if(s.section){const f=GEO.sections?.features.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));if(f)dettaglio(f,'Sezione censuaria');else ambiti.push('Sezione censuaria: '+s.section);}const contesto=ambiti.length?'<div class="notice-inline selection-context"><strong>Ambiti territoriali attivi:</strong> '+ambiti.map(esc).join(' · ')+(statistiche.length?'<div class="selection-stats">'+statistiche.join('')+'</div>':'')+'<span>I filtri vengono mantenuti passando da una pagina all’altra. POP21, famiglie, abitazioni ed edifici sono riferiti al Censimento ISTAT 2021 e restano distinti dai dati anagrafici comunali 2022 e dall’IDISE 2023. L’elaborazione si applica solo quando la fonte dispone di una corrispondenza geografica verificata alla scala selezionata.</span></div>':'';return `<p class="page-kicker">${p[0]}</p><h1 class="page-title">${p[1]}</h1><p class="lead">${p[2]}</p>${contesto}`;}
function empty(title,desc){return `<div class="notice"><h3>${title}</h3><p>${desc}</p></div>`;}
function render(){
 charts.forEach(c=>c.destroy());charts=[];
 let html=pageShell(),s=selected();
 const hasDemo=DATA.demografia.length>0, hasSchools=DATA.scuole.length>0, hasStandards=DATA.standard.length>0;
 if(active==='overview'){
 const overviewPopulation=standardPopulationContext(s),overviewPoints=filteredSchoolPoints(s);
 const fmt=n=>Number(n??0).toLocaleString('it-IT');
 const overviewClass=DATA.schoolClassification?.records||[],overviewClassById=new Map(overviewClass.map(x=>[String(x.point_id),x]));
 const overviewCounts={NIDO:0,INFANZIA:0,ELEMENTARI:0,MEDIE:0,SUPERIORI:0,'Non classificati':0};
 overviewPoints.forEach(p=>{const k=(overviewClassById.get(String(p.id))?.orders||[])[0]||'Non classificati';overviewCounts[overviewCounts[k]!==undefined?k:'Non classificati']++;});
 const censusMeta=DATA.schoolCensus?.meta||{},censusTotal=Number(censusMeta.records_total)||305,statusCounts=censusMeta.status_counts||{},documented=Number(statusCounts.DOCUMENTATO)||0,docPct=censusTotal?documented/censusTotal*100:0;
 const idiseRows=(DATA.sociale||[]).filter(x=>!s.asc3||String(x.cod_asc)===String(s.asc3)),idiseSelected=s.asc3?idiseRows[0]:null,idiseValue=idiseSelected?Number(idiseSelected.idise):null;
 const populationLabel=overviewPopulation.value===null?'N.D.':fmt(overviewPopulation.value),territoryLevel=s.section?'Sezione censuaria':s.asc3?'UPL':s.quart?'Quartiere':s.circ?'Circoscrizione':'Intero Comune';
 html+=`<div class="notice-inline overview-context"><strong>Quadro territoriale:</strong> ${esc(territoryLevel)}. ${esc(overviewPopulation.source)}. I dati non disponibili alla scala selezionata sono indicati come N.D. e non vengono stimati.</div>`;
 html+=`<div class="grid overview-kpis">
 <div class="card"><span class="muted">Popolazione di riferimento</span><div class="metric">${populationLabel}</div><small class="muted">${esc(overviewPopulation.source)}</small></div>
 <div class="card"><span class="muted">Circoscrizioni</span><div class="metric">${DATA.territories.circoscrizioni.length}</div><small class="muted">Unità amministrative comunali</small></div>
 <div class="card"><span class="muted">Quartieri</span><div class="metric">${DATA.territories.quartieri.length}</div><small class="muted">Articolazione territoriale comunale</small></div>
 <div class="card"><span class="muted">UPL con archivio IDISE</span><div class="metric">${(DATA.sociale||[]).length}</div><small class="muted">ISTAT 2023 · livello ASC3</small></div>
 <div class="card"><span class="muted">Punti scolastici visibili</span><div class="metric">${fmt(overviewPoints.length)}</div><small class="muted">Sedi fisiche georeferenziate, non numero di istituti</small></div>
 <div class="card"><span class="muted">Schede del censimento</span><div class="metric">${fmt(censusTotal)}</div><small class="muted">Archivio documentale V81</small></div></div>`;
 html+=`<div class="grid overview-panels"><div class="card"><h3>Dotazione scolastica georeferenziata</h3><p class="muted">Distribuzione dei ${fmt(overviewPoints.length)} punti fisici nel territorio selezionato, secondo la classificazione disponibile.</p><div class="section-pie-wrap"><canvas id="overviewSchoolChart"></canvas></div><div class="school-legend">${Object.entries(overviewCounts).map(([k,v])=>'<span><i style="background:'+({NIDO:'#d97706',INFANZIA:'#db2777',ELEMENTARI:'#16845b',MEDIE:'#2563eb',SUPERIORI:'#7c3aed','Non classificati':'#64748b'}[k])+'"></i>'+esc(k)+': '+fmt(v)+'</span>').join('')}</div></div>
 <div class="card"><h3>Quadro sociale e stato del censimento</h3><div class="overview-stat"><span>UPL selezionata</span><strong>${s.asc3?esc(idiseSelected?.nome||s.asc3):'55 UPL nel Comune'}</strong></div><div class="overview-stat"><span>IDISE ${s.asc3?'dell’UPL selezionata':'di riferimento'}</span><strong>${s.asc3&&Number.isFinite(idiseValue)?idiseValue.toLocaleString('it-IT',{maximumFractionDigits:2}):'Consultare Analisi sociale'}</strong></div><div class="overview-stat"><span>Schede documentate</span><strong>${fmt(documented)} / ${fmt(censusTotal)} (${docPct.toLocaleString('it-IT',{maximumFractionDigits:1})}%)</strong></div><div class="overview-stat"><span>Coordinate nell’archivio scolastico</span><strong>${fmt(censusMeta.coordinate_count||0)} schede</strong></div><div class="overview-stat"><span>Raggi d’influenza abilitati</span><strong>${fmt(censusMeta.buffer_eligible_count||3)} sedi</strong></div><p class="school-note">IDISE è disponibile alla scala UPL e non viene esteso automaticamente a quartieri, circoscrizioni o sezioni censuarie. Il conteggio dei punti riguarda sedi fisiche, non istituti scolastici.</p></div></div>`;
 html+=`<div class="card overview-method"><h3>Come leggere il quadro</h3><div class="workflow-grid"><div><b>Demografia</b><span>Comune di Palermo, popolazione residente al 31/12/2022. Per le UPL si utilizza il riferimento ISTAT IDISE 2023.</span></div><div><b>Analisi sociale</b><span>IDISE 2023 e indicatori DIS1-DIS9, disponibili per 55 UPL.</span></div><div><b>Servizi e dotazioni</b><span>292 punti scolastici fisici georeferenziati; i punti privi di classificazione restano separati.</span></div><div><b>Cartografia</b><span>Geometrie ISTAT 2021. Tre geometrie censuarie richiedono verifica topologica in QGIS.</span></div></div></div>`;
}else if(active==='demography'){
 const quartieri=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere');
 const circoscrizioni=DATA.demografia.filter(x=>x.tipo_territorio==='circoscrizione');
 const normalizza=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const nomeQuartiere=DATA.territories.quartieri.find(x=>x.id===s.quart)?.name;
 const unsupportedResolution=!!(s.asc3||s.section);
 const righe=unsupportedResolution?[]:quartieri.filter(x=>(!s.circ||((x.circoscrizioni_id||[]).includes(s.circ)&&(s.quart||(x.circoscrizioni_id||[]).length===1)))&&(!s.quart||normalizza(x.nome)===normalizza(nomeQuartiere)));
 const aggregato=s.quart?righe[0]:s.circ?circoscrizioni.find(x=>x.territorio_id===s.circ):null;
 const baseTotale=s.circ||s.quart?aggregato:null;
 const somma=campo=>unsupportedResolution?null:baseTotale?Number(baseTotale[campo])||0:circoscrizioni.reduce((tot,x)=>tot+(Number(x[campo])||0),0);
 const italiani=somma('italiani');
 const stranieri=somma('stranieri');
 const totale=somma('totale');
 const percentuale=totale===null?'N.D.':totale?((stranieri/totale)*100).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'0,0';
 const nome=unsupportedResolution?(s.section?'Sezione censuaria selezionata':'UPL selezionata'):s.quart?righe[0]?.nome||'Quartiere selezionato':s.circ?DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Circoscrizione selezionata':'Comune di Palermo';
 const fmt=n=>n===null?'N.D.':Number(n).toLocaleString('it-IT');
 if(unsupportedResolution)html+='<div class="notice-inline">I dati demografici disponibili sono aggregati per circoscrizione e quartiere. Non sono attribuiti a UPL o sezioni censuarie perché manca una corrispondenza geografica verificata.</div>';
 const quartieriConfinanti=s.circ&&!s.quart?quartieri.filter(x=>(x.circoscrizioni_id||[]).includes(s.circ)&&(x.circoscrizioni_id||[]).length>1):[];
 if(quartieriConfinanti.length)html+='<div class="notice-inline">'+quartieriConfinanti.map(x=>esc(x.nome)).join(', ')+' interessa più circoscrizioni. Il dato demografico è disponibile solo per il quartiere intero e non viene attribuito integralmente alla circoscrizione selezionata; per questo è escluso dalla tabella e dai grafici dei quartieri. Il totale della circoscrizione resta quello ufficiale comunale.</div>';
 html+=`<div class="card"><h3>Popolazione residente · ${nome}</h3><p class="muted">Dati ufficiali al 31 dicembre 2022 · Fonte: Comune di Palermo</p><div class="grid"><div class="card"><span class="muted">Popolazione totale</span><div class="metric">${fmt(totale)}</div></div><div class="card"><span class="muted">Cittadini italiani</span><div class="metric">${fmt(italiani)}</div></div><div class="card"><span class="muted">Cittadini stranieri</span><div class="metric">${fmt(stranieri)}</div></div><div class="card"><span class="muted">Incidenza stranieri</span><div class="metric">${percentuale}%</div></div></div><p class="muted">La ripartizione per sesso e fasce d’età è in fase di integrazione. Le basi censuarie ISTAT 2021 e i dati anagrafici comunali 2022 hanno date e unità territoriali differenti: l’aggregazione sarà pubblicata solo dopo la verifica della chiave geografica e della compatibilità temporale.</p><p class="muted">Le 609 persone senza fissa dimora (533 italiane e 76 straniere) sono riportate separatamente nella fonte comunale e non vengono attribuite artificialmente ai quartieri o alle circoscrizioni.</p></div>`;
 html+=`<div class="card"><h3>Popolazione per quartiere</h3><div style="overflow-x:auto"><table><thead><tr><th>Quartiere</th><th>Italiani</th><th>Stranieri</th><th>Totale</th><th>% stranieri</th></tr></thead><tbody>${[...righe].sort((a,b)=>b.totale-a.totale).map(x=>`<tr><td>${esc(x.nome)}</td><td>${fmt(x.italiani)}</td><td>${fmt(x.stranieri)}</td><td>${fmt(x.totale)}</td><td>${x.totale?((x.stranieri/x.totale)*100).toLocaleString('it-IT',{maximumFractionDigits:1}):'0'}%</td></tr>`).join('')}</tbody></table></div></div>`;

 
html+=`<div class="grid"><div class="card"><h3>Composizione della popolazione</h3><canvas id="chartComposizione"></canvas></div><div class="card"><h3>Popolazione per quartiere</h3><div style="height:${Math.max(520,righe.length*27)}px;position:relative"><canvas id="chartQuartieri"></canvas></div></div></div><div class="card"><h3>Incidenza della popolazione straniera</h3><canvas id="chartIncidenza"></canvas></div>`;
}else if(active==='compare'){
const datiCirc=DATA.demografia.filter(x=>x.tipo_territorio==='circoscrizione');
const confronto=DATA.territories.circoscrizioni.map(c=>{
const dato=datiCirc.find(x=>x.territorio_id===c.id);
const italiani=Number(dato?.italiani)||0;
const stranieri=Number(dato?.stranieri)||0;
const totale=Number(dato?.totale)||0;
return {...c,italiani,stranieri,totale,percentuale:totale?stranieri/totale*100:0};
});
const fmtC=n=>Number(n).toLocaleString('it-IT');
html+=`<div class="card"><h3>Confronto demografico tra le 8 circoscrizioni</h3><p class="muted">Dati ufficiali al 31 dicembre 2022</p><div style="overflow-x:auto"><table><thead><tr><th>Circoscrizione</th><th>Italiani</th><th>Stranieri</th><th>Totale residenti</th><th>Incidenza stranieri</th></tr></thead><tbody>${confronto.map(c=>`<tr><td>${c.name}</td><td>${fmtC(c.italiani)}</td><td>${fmtC(c.stranieri)}</td><td><strong>${fmtC(c.totale)}</strong></td><td>${c.percentuale.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}%</td></tr>`).join('')}</tbody></table></div></div>`;
html+=`<div class="grid"><div class="card"><h3>Popolazione residente per circoscrizione</h3><canvas id="chartCircoscrizioni"></canvas></div><div class="card"><h3>Incidenza stranieri per circoscrizione</h3><canvas id="chartStranieriCircoscrizioni"></canvas></div></div>`;
}
if(active==='social'){
  const aree=(s.section?[]:[...(DATA.sociale||[])].filter(a=>!s.asc3||String(a.cod_asc)===String(s.asc3))).sort((a,b)=>Number(b.idise)-Number(a.idise));
  const media=aree.length?aree.reduce((s,x)=>s+Number(x.idise||0),0)/aree.length:null;
  const massimo=aree[0], minimo=[...aree].sort((a,b)=>Number(a.idise)-Number(b.idise))[0];
  const numero=n=>n===null||n===undefined?'N.D.':Number(n).toLocaleString('it-IT',{maximumFractionDigits:2});
  if(s.section)html+='<div class="notice-inline">L’indice IDISE è disponibile per le 55 UPL, non per le singole sezioni censuarie. Per evitare attribuzioni improprie, i valori IDISE non vengono mostrati per la sezione selezionata.</div>';
  const descrizioni={
    DIS1:'Incidenza di persone di 70 anni e oltre che vivono sole e non possiedono una casa di proprietà sul totale dei residenti in famiglia di 70 anni e oltre.',
    DIS2:'Incidenza di persone che vivono in famiglie in cui nessun componente è occupato o percepisce una pensione da lavoro, sul totale della popolazione residente in famiglia.',
    DIS3:'Incidenza di persone che vivono in famiglie con reddito disponibile equivalente inferiore al 60% della mediana nazionale, sul totale della popolazione residente in famiglia.',
    DIS4:'Tasso di occupazione: persone occupate di 25-64 anni sul totale della popolazione residente in famiglia della stessa fascia d’età.',
    DIS5:'Incidenza di persone di 0-64 anni che vivono in famiglie con bassa intensità lavorativa (rapporto tra settimane lavorate e settimane teoricamente disponibili inferiore a 0,20).',
    DIS6:'Incidenza di occupati di 25-64 anni con occupazione non stabile sul totale dei residenti in famiglia di 25-64 anni con un segnale di lavoro nell’anno.',
    DIS7:'Incidenza di persone di 25-64 anni con livello di istruzione non superiore alla scuola secondaria di primo grado sul totale dei residenti in famiglia della stessa fascia d’età.',
    DIS8:'Incidenza di giovani di 15-29 anni non occupati e non iscritti ad alcun corso di studi sul totale dei residenti in famiglia della stessa fascia d’età (NEET).',
    DIS9:'Rapporto percentuale tra studenti della scuola secondaria di I e II grado che abbandonano o non superano l’anno e studenti con segnali di frequenza nell’anno scolastico di riferimento.'
  };
  html+='<div class="notice-inline"><strong>Unità di misura:</strong> DIS1-DIS9 sono tutti indicatori percentuali (%), non conteggi assoluti. Il valore indica la quota della popolazione del denominatore specifico definito da ISTAT. I valori sono riportati in punti percentuali: ad esempio 14,8 significa 14,8 persone ogni 100 del gruppo di riferimento. <strong>Eccezione interpretativa: DIS4</strong> è il tasso di occupazione, quindi un valore più alto indica maggiore occupazione e, in questa dimensione, minore disagio. Gli altri DIS hanno polarità concorde al disagio: valori più alti indicano maggiore criticità. Fonte: <a href="https://www.istat.it/wp-content/uploads/2025/12/Nota-Metodologica-idise-2023.pdf" target="_blank" rel="noopener">Nota metodologica ISTAT IDISE 2023</a>.</div>';
  html+=`<div class="grid social-kpis">
    <div class="card"><span class="muted">UPL analizzate</span><div class="metric">${aree.length}</div></div>
    <div class="card"><span class="muted">IDISE medio delle UPL</span><div class="metric">${numero(media)}</div></div>
    <div class="card"><span class="muted">Maggiore disagio</span><h3>${massimo?esc(massimo.nome):'N.D.'}</h3><div class="metric">${massimo?numero(massimo.idise):'N.D.'}</div></div>
    <div class="card"><span class="muted">Minore disagio</span><h3>${minimo?esc(minimo.nome):'N.D.'}</h3><div class="metric">${minimo?numero(minimo.idise):'N.D.'}</div></div>
  </div>
  <div class="card social-select"><h3>3 - Confronto degli ambiti territoriali</h3>
    <p class="muted">Seleziona almeno due UPL per confrontare IDISE e indicatori DIS1-DIS9. L’elenco comprende tutte le 55 UPL di Palermo anche quando il selettore generale è impostato su una singola circoscrizione, quartiere o UPL: in questo modo il confronto mantiene il riferimento all’intero Comune.</p>
    <div id="uplSelezione" class="upl-selector">
      ${[...(DATA.sociale||[])].sort((a,b)=>a.nome.localeCompare(b.nome,'it')).map(a=>'<label class="upl-option"><input type="checkbox" class="upl-check" value="'+esc(a.cod_asc)+'"> '+esc(a.nome)+'</label>').join('')}
    </div>
  </div>
  <div class="card"><h3>4 - Indice di disagio socio-economico IDISE 2023</h3>
    <p class="muted">Fonte: ISTAT, anno 2023. L’IDISE è un indice composito AMPI+, non una percentuale: il riferimento medio comunale è 100. I valori sono confrontabili tra UPL dello stesso Comune e dello stesso anno; valori superiori a 100 indicano un disagio sopra il riferimento comunale, valori inferiori un disagio sotto il riferimento.</p>
    <div class="table-wrap"><table><thead><tr><th>UPL</th><th>IDISE</th><th>Popolazione</th><th>Famiglie</th></tr></thead><tbody>
    ${aree.map(a=>`<tr><td>${esc(a.nome)}</td><td>${numero(a.idise)}</td><td>${numero(a.popolazione)}</td><td>${numero(a.famiglie)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  <div class="card social-compare-section"><h3>5 - Confronto territoriale degli indicatori di disagio</h3>
    <p class="muted">Tutti i valori DIS sono espressi in percentuale (%). La percentuale non usa un denominatore unico: ciascun indicatore si riferisce alla fascia d’età o al gruppo indicato nella descrizione a sinistra. Non si tratta di punti percentuali di IDISE.</p>
    <div class="social-compare-layout">
      <aside class="indicator-panel"><h3>Indicatori DIS1-DIS9</h3><div class="indicator-list">
        ${Object.entries(descrizioni).map(([codice,descrizione])=>`<div class="indicator-item"><strong>${codice} · %</strong><span>${descrizione}</span>${codice==='DIS4'?'<small>Polarità inversa: un valore più alto indica maggiore occupazione e quindi minore disagio.</small>':'<small>Polarità: un valore più alto indica maggiore incidenza del fenomeno di disagio descritto.</small>'}</div>`).join('')}
      </div></aside>
      <div id="uplConfronto" class="comparison-panel"><h3>Confronto tra UPL</h3><p class="muted">Seleziona almeno due UPL nel pannello precedente per visualizzare i valori a confronto.</p></div>
    </div>
  </div>`;
}else if(active==='schools'){
 const points=DATA.schoolPoints||[],stats=DATA.schoolStatistics||[],par=DATA.schoolParitarie||[],siteVerification=DATA.schoolSiteVerification?.records||[];
 const fmt=n=>Number(n||0).toLocaleString('it-IT');
 const totalStudents=stats.reduce((a,x)=>a+(+x.students||0),0);
 const orders=['Infanzia','Primaria','Secondaria I grado','Secondaria II grado'];
 html+=`<style>
 .school-legend{display:flex;flex-wrap:wrap;gap:12px 20px;margin:12px 0 18px}.school-legend span{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#29445e}.school-legend i{width:12px;height:12px;border-radius:50%;display:inline-block}.school-row-selected{background:#e8f1fb!important;outline:2px solid #2563eb;outline-offset:-2px;cursor:pointer}.school-table tbody tr[data-school-id]{cursor:pointer}.school-table tbody tr[data-school-id]:hover{background:#f1f6fc}.school-popup{min-width:190px;line-height:1.55}.school-order-tag{display:inline-block;border-left:4px solid var(--school-color);padding:3px 7px;background:#f1f5f9;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap}.school-map{height:430px;width:100%;border-radius:10px}.school-controls{display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:12px;margin:12px 0}.school-controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#58708a}.school-controls input,.school-controls select{min-height:38px;border:1px solid #cbd8e6;border-radius:7px;padding:7px;background:#fff;color:#173653}.school-table{max-height:420px;overflow:auto}.school-table table{min-width:740px}.school-note{font-size:12px;color:#60758b;line-height:1.5}.school-open-map{border:1px solid #bfd0e0;background:#f5f9fc;color:#173653;border-radius:5px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer}.school-verification-tag{display:inline-block;padding:3px 6px;border-radius:5px;background:#eef2f7;color:#334155;font-size:10px;font-weight:700;white-space:nowrap}.school-territory-head{display:flex;align-items:baseline;gap:10px;margin:6px 0}.school-territory-head strong{font-size:24px;color:#173653}.school-territory-head span,.school-territory-breakdown{font-size:12px;color:#58708a}.school-territory-breakdown{display:flex;flex-wrap:wrap;gap:8px 18px;margin:10px 0}.school-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.school-kpis .card{margin:0}@media(max-width:800px){.school-controls,.school-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
 </style>
 <div class="school-kpis">
 <div class="card"><span class="muted">Sedi comunali georeferenziate</span><div class="metric">${fmt(points.length)}</div><small class="muted">Catalogo KML 2021, plessi e sedi</small></div>
 <div class="card"><span class="muted">Plessi statali con dati USR</span><div class="metric">${fmt(stats.length)}</div><small class="muted">Anno scolastico 2025/2026</small></div>
 <div class="card"><span class="muted">Alunni nei plessi censiti</span><div class="metric">${fmt(totalStudents)}</div><small class="muted">Dato USR 2025/2026</small></div>
 <div class="card"><span class="muted">Scuole paritarie in elenco</span><div class="metric">${fmt(par.length)}</div><small class="muted">USR 2025/2026, senza coordinate</small></div>
 <div class="card"><span class="muted">Sedi nel crosswalk documentale</span><div class="metric">${fmt(siteVerification.length)}</div><small class="muted">Crosswalk V14 · ${siteVerification.filter(x=>x.status!=='NON_VERIFICATO').length} con esito su ${siteVerification.length}</small></div>
 </div>
 <div class="card" style="margin-top:16px;border-left:4px solid #16845b"><h3>Verifica documentale dei punti scolastici · V81</h3><p class="school-note">La ricognizione è stata estesa a tutti i 305 record del censimento V81. La classificazione è basata su riscontri documentali e distingue sedi correnti, punti storici, indirizzi non riconciliati e strutture da rivalidare.</p><div class="school-kpis" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><div class="card"><span class="muted">Documentati</span><div class="metric" style="color:#16845b">${fmt(DATA.schoolCensus?.meta?.status_counts?.DOCUMENTATO||0)}</div><small class="muted">${((DATA.schoolCensus?.meta?.status_counts?.DOCUMENTATO||0)/(DATA.schoolCensus?.meta?.records_total||305)*100).toLocaleString('it-IT',{maximumFractionDigits:1})}% del catalogo</small></div><div class="card"><span class="muted">Riserva / rettifica</span><div class="metric">${fmt(DATA.schoolCensus?.meta?.status_counts?.RISERVA_O_RETTIFICA||0)}</div><small class="muted">Nessun buffer automatico</small></div><div class="card"><span class="muted">Da rivalidare</span><div class="metric" style="color:#b7791f">${fmt(DATA.schoolCensus?.meta?.status_counts?.CONFERMATO_DA_RIVALIDARE||0)}</div><small class="muted">Stato operativo da confermare</small></div></div><p class="school-note">Censimento V81: ${fmt(DATA.schoolCensus?.meta?.records_total||305)} schede complessive, di cui ${fmt(DATA.schoolCensus?.meta?.coordinate_count||0)} con coordinate cartografiche. <a href="data/censimento_scolastico_v81.json" target="_blank" rel="noopener">Apri archivio completo V81 (JSON)</a>. <a href="data/rapporto_riconciliazione_v80_v81.json" target="_blank" rel="noopener">Apri rapporto di riconciliazione V80-V81</a>. Idonee ai raggi secondo il criterio esplicito V81: ${fmt(DATA.schoolCensus?.meta?.buffer_eligible_count||0)}. I casi condizionati restano esclusi finché non vengono validate coordinate e accessi. Criterio di pubblicazione: i raggi d’influenza possono essere associati soltanto a plessi identificati e coordinate/ingressi sufficientemente affidabili. Un campus con più ordini resta un unico punto fisico; i servizi integrativi 0-3 non vengono conteggiati automaticamente come nidi comunali.</p></div>
 <div class="card"><h3>Rete scolastica nell’ambito territoriale selezionato</h3><div id="schoolTerritoryMetrics"></div><p class="school-note">Il riepilogo si aggiorna con la selezione condivisa di circoscrizione, quartiere, UPL e sezione censuaria. Le sedi non classificate restano conteggiate come punti cartografici, ma non vengono forzate in un ordine scolastico.</p></div>
 <div class="card"><h3>Distribuzione territoriale delle sedi</h3>
 <p class="school-note">Il grafico a torta usa una sola categoria prevalente per punto e non somma le compresenze tra ordini. I punti senza classificazione documentale restano nella voce “Non classificati”; non vengono assegnati all’infanzia o ai nidi per deduzione dalla sola tipologia del record.</p><p class="school-note">La mappa visualizza 292 punti fisici georeferenziati. Il censimento V81 conserva 305 schede: 294 hanno coordinate registrate e 11 restano senza coordinate verificate; 13 schede non hanno un punto fisico dedicato nella mappa. Il crosswalk documentale V14 contiene 81 schede: 80 con esito e una non verificata. Il metadato del file è stato riallineato al numero effettivo dei record. Le schede riportano esito, nota e fonte; i record in riserva o da rivalidare restano visibili ma non sono trattati come sedi operative certe. I dati USR 2025/2026 e le paritarie restano in archivi distinti.</p>
 <div class="school-legend" aria-label="Legenda ordini scolastici">${[{k:'NIDO',l:'NIDO',c:'#d97706'},{k:'INFANZIA',l:'INFANZIA',c:'#db2777'},{k:'ELEMENTARI',l:'ELEMENTARI',c:'#16845b'},{k:'MEDIE',l:'MEDIE',c:'#2563eb'},{k:'SUPERIORI',l:'SUPERIORI',c:'#7c3aed'}].map(x=>'<span><i style="background:'+x.c+'"></i>'+x.l+'</span>').join('')}</div>
 <div class="school-controls">
 <label>Tipologia<select id="schoolKind"><option value="">Tutte</option><option value="Asilo nido">Asili nido</option><option value="Plesso">Plessi</option><option value="Sede">Sedi</option></select></label>
 <label>Ordine scolastico<select id="schoolOrder"><option value="">Tutti gli ordini</option><option value="NIDO">NIDO</option><option value="INFANZIA">INFANZIA</option><option value="ELEMENTARI">ELEMENTARI</option><option value="MEDIE">MEDIE</option><option value="SUPERIORI">SUPERIORI</option></select></label>
 <label>Stato censimento<select id="schoolVerificationFilter"><option value="">Tutti gli esiti V81</option><option value="DOCUMENTATO">Documentato</option><option value="RISERVA_O_RETTIFICA">Riserva / rettifica</option><option value="CONFERMATO_DA_RIVALIDARE">Da rivalidare</option></select></label>\n <label>Raggi d’influenza<select id="schoolBufferFilter"><option value="">Tutte le sedi</option><option value="eligible">Solo idonee</option><option value="excluded">Non abilitate</option></select></label>\n <label>Cerca sede<input id="schoolSearch" type="search" placeholder="Nome, istituto, codice, indirizzo"></label>
 </div>
 <div id="schoolMap" class="school-map"></div><p id="schoolMapStatus" class="school-note"></p>
 <div class="school-table"><table><thead><tr><th>Sede</th><th>Ordine scolastico</th><th>Tipologia</th><th>Istituto</th><th>Indirizzo</th><th>Quartiere</th><th>Stato V81</th><th>Controllo spaziale</th><th>Ordine verificato</th><th>Codice plesso</th><th>Raggi</th><th>Verifica documentale</th></tr></thead><tbody id="schoolPointRows"></tbody></table></div><div id="schoolUnlocated"></div>
 </div>
 <div class="card"><h3>Anagrafica dei plessi e dati USR</h3><p class="school-note">401 record USR 2025/26 con codice meccanografico di plesso. Il raccordo con il registro 2026/27 resta distinto dal collegamento con gli edifici. Lotti documentali completati: 113 codici di plesso collegati a 82 punti comunali; per gli altri 288 record il collegamento fisico resta da verificare. La tabella indica i collegamenti certi e consente di richiamare la sede nella mappa, se inclusa nei filtri correnti. Non si aggregano alunni a quartiere, UPL o sezione finché la copertura dei plessi non è completa e controllata.</p>
 <div class="school-kpis">${orders.map(o=>{const x=stats.filter(z=>z.order===o);return '<div class="card"><span class="muted">'+esc(o)+'</span><div class="metric">'+fmt(x.length)+'</div><small class="muted">'+fmt(x.reduce((n,z)=>n+(+z.students||0),0))+' alunni</small></div>';}).join('')}</div>
 <div class="school-controls"><label>Ordine<select id="schoolStatsOrder"><option value="">Tutti</option>${orders.map(o=>'<option>'+esc(o)+'</option>').join('')}</select></label><label>Cerca plesso/istituto<input id="schoolStatsSearch" type="search" placeholder="Denominazione o codice"></label></div>
 <div class="school-table"><table><thead><tr><th>Codice</th><th>Plesso</th><th>Ordine</th><th>Istituto</th><th>Alunni</th><th>Classi/sezioni</th><th>Alunni con disabilità</th><th>Codice istituzione 2026/27</th><th>Istituzione 2026/27</th><th>Indirizzo istituzione</th><th>Esito abbinamento</th><th>Sede cartografica</th></tr></thead><tbody id="schoolStatsRows"></tbody></table></div><p id="schoolStatsStatus" class="school-note"></p></div>
 <div class="card"><h3>Scuole paritarie</h3><p class="school-note">Elenco USR Sicilia 2025/2026. L'archivio disponibile non contiene coordinate né ordine scolastico normalizzato.</p>
 <label class="school-controls">Cerca scuola<input id="schoolParSearch" type="search" placeholder="Nome, codice o indirizzo"></label>
 <div class="school-table"><table><thead><tr><th>Codice</th><th>Denominazione</th><th>Indirizzo</th><th>Gestione</th><th>Anno</th></tr></thead><tbody id="schoolParRows"></tbody></table></div><p id="schoolParStatus" class="school-note"></p></div>
 <div class="card"><h3>Fonti e metodologia</h3><ul><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=328" target="_blank" rel="noopener">Comune di Palermo, catalogo KML scuole</a>, aggiornamento 2021.</li><li><a href="https://www.usr.sicilia.it/open-data/" target="_blank" rel="noopener">USR Sicilia, Open Data</a>, organico di fatto e paritarie 2025/2026.</li></ul><p class="school-note"><a href="data/rapporto_qa_release_20261116.json" target="_blank" rel="noopener">Apri rapporto QA tecnico V82-QA1</a>. Il controllo point-in-polygon aggiornato ha verificato 292 punti fisici: 291 ricadono contemporaneamente nei tre livelli amministrativi ISTAT 2021; un punto (Belpasso) è esterno e resta segnalato senza riposizionamento. Le ortofoto sono consultabili tramite il <a href="https://geoportal.comune.palermo.it/" target="_blank" rel="noopener">Geoportale del Comune</a> e la <a href="https://map.sitr.regione.sicilia.it/gis/rest/services/ortofoto/ortofoto_2022_20cm_sicilia/ImageServer" target="_blank" rel="noopener">ortofoto SITR 2022 a 20 cm</a>.</p><p class="school-note">I dati KML descrivono localizzazioni, quelli USR consistenza scolastica. Non vengono sommati. L'anagrafica 2025/26 è collegata al registro istituzioni 2026/27 per codice esatto. Le sedi con riserve o mancata verifica restano esplicitamente segnalate. La copertura per quartiere e UPL dei dati USR sarà calcolata dopo geocodifica verificata. Non sono ancora disponibili analisi di bacino pedonale.</p></div>`;
}else if(active==='standards'){
 const stdPopulationContext=standardPopulationContext(s);
 const stdSchoolPoints=filteredSchoolPoints(s),stdSchoolClasses=new Map((DATA.schoolClassification?.records||[]).map(x=>[String(x.point_id),x])),stdSchoolCensus=new Map((DATA.schoolCensus?.records||[]).map(x=>[String(x.id),x]));

 const stdUplFeature=s.asc3?(GEO.asc3?.features||[]).find(f=>String(f.properties?.COM_ASC3)===String(s.asc3)):null;
 if(stdUplFeature){const sp=stdUplFeature.properties||{},areaM2=Number(sp.SHAPE_Area);html+=`<div class="card"><h3>Inquadramento territoriale dell’UPL</h3><div class="grid standards-kpis"><div class="card"><span class="muted">Popolazione residente · ISTAT 2021</span><div class="metric">${fmt(Number(sp.POP21)||0)}</div></div><div class="card"><span class="muted">Superficie territoriale</span><div class="metric">${Number.isFinite(areaM2)?(areaM2/1000000).toLocaleString('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3}):'N.D.'} <small>km²</small></div></div><div class="card"><span class="muted">Densità territoriale</span><div class="metric">${Number.isFinite(areaM2)&&areaM2>0?fmt((Number(sp.POP21)||0)/(areaM2/1000000)):'N.D.'} <small>ab/km²</small></div></div></div><p class="muted">Fonte: geometria UPL ASC3, ISTAT 2021. La superficie territoriale non coincide con la superficie delle dotazioni urbanistiche. Le aree effettivamente disponibili devono essere misurate separatamente e verificate per destinazione, proprietà e fruibilità.</p></div>`;}
 const standard=[['Istruzione','4,50','Asili nido, scuole dell’infanzia e dell’obbligo'],['Attrezzature di interesse comune','2,00','Servizi religiosi, culturali, sociali, assistenziali, sanitari e amministrativi'],['Verde, gioco e sport','9,00','Aree pubbliche attrezzate ed effettivamente fruibili'],['Parcheggi','2,50','Aree per parcheggi, oltre alle sedi viarie']];
 const standardDetail=[
  {macro:'Istruzione · standard S',items:['S1 – Asilo nido','S2 – Scuola dell’obbligo (scuola dell’infanzia, primaria e secondaria di primo grado)']},
  {macro:'Attrezzature di interesse comune',items:[
   'IC1 – Chiese e centri religiosi',
   'IC2 – Edifici per il tempo libero',
   'IC3 – Edifici per la pubblica amministrazione',
   'IC4 – Centri culturali',
   'IC5 – Centri sociali e sanitari, presidi sanitari e medicina di base',
   'IC6 – Consultori',
   'IC7 – Uffici postali, Carabinieri e forze dell’ordine',
   'IC8 – Teatri',
   'IC9 – Case di riposo e servizi residenziali',
   'IC10 – Biblioteche',
   'IC11 – Centri di formazione',
   'IC12 – Mercatini e mercati rionali',
   'IC13 – Attrezzature per l’igiene ambientale',
   'IC14 – Canile municipale e servizi dedicati'
  ]},
  {macro:'Verde, gioco e sport',items:['Verde pubblico attrezzato','Parchi urbani e territoriali','Giardini e aree verdi di quartiere','Aree per il gioco dei bambini','Impianti e attrezzature sportive']},
  {macro:'Parcheggi · classificazione P',items:['PI – Parcheggi di interscambio','PO – Parcheggi operativi','PR – Parcheggi residenziali']}
 ];
 const generalInterest=[
  'F1 – Istituti di istruzione secondaria superiore',
  'F2 – Ospedali, luoghi di cura, presidi sanitari e medicina di base',
  'F3 – Attrezzature sportive',
  'F4 – Parchi urbani e territoriali',
  'F5 – Mercati generali',
  'F6 – Macelli',
  'F7 – Servizi giudiziari e penitenziari',
  'F8 – Cimiteri',
  'F9 – Fiera espositiva',
  'F10 – Caserme e aree militari',
  'F11 – Università',
  'F12 – Attrezzature museali, culturali ed espositive',
  'F13 – Impianti tecnologici',
  'F14 – Attrezzature assistenziali',
  'F15 – Uffici e sedi direzionali sovracomunali',
  'F16 – Aree ferroviarie e portuali',
  'F17 – Aeroporto',
  'F18 – Discariche per rifiuti solidi urbani e speciali',
  'F19 – Luna Park',
  'F20 – Aree circensi',
  'F21 – Autostazione',
  'F22 – Deposito tranviario',
  'F23 – Laboratorio di astrofisica spaziale',
  'F24 – Istituto Universitario Zootecnico'
 ];
 html+='<div class="card"><h3>Bilancio territoriale delle previsioni PRG</h3><p class="muted">Misurazione delle superfici delle zone di piano intersecate con le unità statistiche ISTAT 2021. La lettura distingue previsione urbanistica e dotazione effettivamente realizzata.</p><label>Unità di analisi<select id="standardTerritorialLevel"><option value="asc1">Circoscrizioni ASC1</option><option value="asc2">Quartieri ASC2</option><option value="asc3">UPL ASC3</option><option value="sections">Sezioni censuarie ISTAT 2021</option></select></label><div id="standardTerritorialStats"><p class="muted">In attesa del caricamento delle geometrie PRG e territoriali.</p></div></div>';
 html+='<div class="card"><h3>Catalogo delle categorie e delle tipologie di attrezzature</h3><p class="muted">Classificazione operativa delle dotazioni da censire. Le voci sono articolazioni descrittive delle quattro categorie normative: non costituiscono quote minime autonome e non sostituiscono la verifica della destinazione urbanistica, della proprietà pubblica e dell’effettiva fruibilità.</p><div class="grid standards-kpis">'+standardDetail.map(group=>'<div class="card"><h3>'+group.macro+'</h3><ul>'+group.items.map(item=>'<li>'+item+'</li>').join('')+'</ul></div>').join('')+'</div><div class="card"><h3>Attrezzature pubbliche di interesse generale · Zone F</h3><p class="muted">Classificazione distinta dalle quattro categorie che compongono la dotazione minima ordinaria di 18 m²/abitante. Le zone F del PRG individuano attrezzature e impianti di interesse generale; non vanno sommate automaticamente al conteggio degli standard dell’art. 3 del D.M. 1444/1968.</p><div class="grid standards-kpis"><div class="card"><ul>'+generalInterest.map(item=>'<li>'+item+'</li>').join('')+'</ul></div></div><p class="notice-inline">Fonte: NTA PRG Palermo, artt. 19 e 24. La destinazione F1–F24 va letta sulle tavole P2a e verificata rispetto alle eventuali prescrizioni specifiche.</p></div><p class="notice-inline">Per le attrezzature di interesse comune il catalogo espone le tipologie IC1–IC14 della classificazione del PRG di Palermo. Le denominazioni sono riportate come chiave di censimento; la corrispondenza con le categorie del PRG vigente e con gli elaborati più recenti va verificata puntualmente. Il parametro di riferimento per la categoria resta 2,00 m²/abitante, non 2,00 m² per ciascuna tipologia. Le attrezzature scolastiche sono approfondite nella mappa dei raggi di influenza. Nessuna superficie viene conteggiata senza geometria, destinazione, proprietà e fruibilità verificate.</p></div>';
 html+=`<div class="card standards-calculator"><h3>Simulatore del fabbisogno di standard</h3><p class="muted">Inserisci la popolazione di riferimento e le superfici effettivamente disponibili. Il calcolo è una simulazione parametrica, non una certificazione urbanistica.</p><div class="calc-input"><label>Popolazione di riferimento<input id="stdPopulation" type="number" min="0" step="1" placeholder="Inserisci numero abitanti"></label><p class="muted comparison-note">Valore iniziale: ${stdPopulationContext.source}. Puoi modificarlo per simulazioni alternative.</p></div><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Standard (m²/ab)</th><th>Superficie disponibile (m²)</th><th>Fabbisogno teorico (m²)</th><th>Differenza (m²)</th></tr></thead><tbody>${standard.map((x,i)=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td><input class="std-area" data-index="${i}" type="number" min="0" step="0.01" placeholder="Da inserire" aria-label="Superficie disponibile ${x[0]}"></td><td id="stdNeed${i}">N.D.</td><td id="stdGap${i}">N.D.</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Totale</th><th id="stdTotalNeed">N.D.</th><th id="stdTotalGap">N.D.</th></tr></tfoot></table></div><p id="stdCalcStatus" class="muted comparison-note">Inserisci popolazione e superfici per calcolare fabbisogno e differenziali.</p></div>`;
 html+='<div class="card"><h3>Mappa delle attrezzature pubbliche e delle sedi scolastiche</h3><p class="muted">La mappa sovrappone le sedi scolastiche georeferenziate ai luoghi e servizi pubblicamente mappati in OpenStreetMap, organizzati secondo una corrispondenza funzionale preliminare con le categorie S, IC, V, P e F dell’art. 24 e delle tavole P2A/P2B del PRG. I punti OSM non attestano proprietà pubblica, destinazione urbanistica o conformità al PRG: ogni corrispondenza è da verificare sulle tavole ufficiali e sulle NTA. I poligoni della zonizzazione PRG 2004 sono integrati nei layer S, IC, V, P e F; il GeoJSON è una rielaborazione della perimetrazione comunale (dataset 320) per la visualizzazione web. Fonte primaria: <a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320" target="_blank" rel="noopener">Comune di Palermo · dataset 320</a>; rielaborazione: <a href="https://github.com/gbvitrano/prg_pa_2004" target="_blank" rel="noopener">gbvitrano/prg_pa_2004</a>, CC BY 4.0 IT. Il dataset comunale 321 relativo ai vincoli è integrato nella pagina Standard urbanistici come livelli areali e lineari separati, riferiti alla Variante Generale DCC 7/2004 e da confrontare con eventuali atti e varianti successive: <a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321" target="_blank" rel="noopener">consulta la fonte ufficiale</a>. I bacini scolastici sono calcolati sulle sedi georeferenziate e classificate. Sono soglie analitiche indicative, non distanze normative né isocrone pedonali: non considerano barriere, pendenze, attraversamenti o rete stradale.</p><div class="school-controls"><label>Ordine scolastico<select id="stdSchoolOrder"><option value="">Tutti gli ordini classificati</option><option value="NIDO">Nidi</option><option value="INFANZIA">Infanzia</option><option value="ELEMENTARI">Primaria</option><option value="MEDIE">Secondaria I grado</option><option value="SUPERIORI">Secondaria II grado</option></select></label><label>Visualizzazione<select id="stdBufferMode"><option value="all">Raggi e sedi</option><option value="buffers">Solo raggi</option><option value="points">Solo sedi</option></select></label></div><div class="map-legend school-map-legend"><span><i class="legend-dot" style="background:#d97706"></i>IC · Interesse comune (OSM)</span><span><i class="legend-dot" style="background:#16845b"></i>V · Verde e sport (OSM)</span><span><i class="legend-dot" style="background:#475569"></i>P · Parcheggi (OSM)</span><span><i class="legend-dot" style="background:#7c3aed"></i>F · Interesse generale (OSM)</span><span><i class="legend-dot" style="background:#d97706"></i>Nido</span><span><i class="legend-dot" style="background:#db2777"></i>Infanzia</span><span><i class="legend-dot" style="background:#16845b"></i>Primaria</span><span><i class="legend-dot" style="background:#2563eb"></i>Secondaria I grado</span><span><i class="legend-dot" style="background:#7c3aed"></i>Secondaria II grado</span></div><div id="standardSchoolMap" class="school-map"></div><p id="standardSchoolStatus" class="school-note"></p><p id="standardPrgStatus" class="school-note">Caricamento della zonizzazione PRG…</p><p id="standardPrgQaStatus" class="school-note">Controllo geometrico automatico del layer tematico: 0 geometrie invalide, 4 duplicati esatti e 16 coppie con sovrapposizione superiore a 1 m² (QA 17/11/2026). Le sovrapposizioni sono segnalazioni da verificare sulle tavole e sulle NTA, non errori urbanistici automaticamente accertati. Non sono state eliminate geometrie.</p><div id="standardPrgStats"></div><p class="school-note">Fonte delle sedi: censimento scolastico del progetto, archivi istituzionali e georeferenziazione degli indirizzi. Sono rappresentate tutte le sedi censite disponibili; i punti con classificazione o affidabilità non completa restano visibili e distinguibili. Raggi adottati: nidi e infanzia 500 m; primaria 800 m; secondaria di I grado 1.000 m; secondaria di II grado 1.500 m. Il valore di 1,5 km è assunto anche come soglia comparativa di prossimità per la primaria in una specifica elaborazione Openpolis, non come prescrizione generale. Le sedi prive di ordine documentato non ricevono un buffer.</p></div>';
 html+=`<div class="card"><h3>Fonte urbanistica di riferimento</h3><p>Per la lettura delle zone territoriali omogenee, delle attrezzature, dei servizi, delle aree per l’istruzione, del verde e dei parcheggi si assume come fonte primaria la <b>Variante Generale al PRG, D.C.C. 7/2004</b>, con particolare riferimento alle tavole di zonizzazione P2A e P2B, alle Norme Tecniche di Attuazione e agli elaborati di servizi e attrezzature.</p><p><a href="https://repository.comune.palermo.it/amministrazione-trasparente.php?grp=3&amp;lev=4&amp;id=111" target="_blank" rel="noopener">Comune di Palermo · Variante Generale al PRG, DCC 7/2004</a> · <a href="https://geocatalog.comune.palermo.it/geonetwork/srv/api/records/96d68279-f346-45b9-99f9-b2f08d827f52" target="_blank" rel="noopener">Geocatalogo comunale · zonizzazione PRG e vincoli in formato SHP</a>.</p><p class="muted">Il Comune pubblica la perimetrazione della zonizzazione PRG in formato SHP (dataset 320, aggiornamento 10/01/2018, licenza CC BY 4.0; <a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320" target="_blank" rel="noopener">scheda e download ufficiale</a>). La mappa include 1.628 poligoni di zonizzazione e le relative superfici geometriche calcolate. Le geometrie derivano dal dataset comunale 320 e dalla rielaborazione pubblicata da gbvitrano/prg_pa_2004, rilasciata con licenza CC BY 4.0 IT (<a href="https://github.com/gbvitrano/prg_pa_2004" target="_blank" rel="noopener">repository della rielaborazione</a>). La classificazione mantiene i codici originali, compresi quelli combinati. I punti OpenStreetMap sono un livello complementare distinto e non sostituiscono la zonizzazione poligonale PRG. Le tavole PRG sono la fonte per zone omogenee e attrezzature; le basi ISTAT 2021 restano la fonte dei confini statistici e dei dati demografici.</p></div><div class="grid standards-kpis"><div class="card"><span class="muted">Dotazione complessiva di riferimento</span><div class="metric">18,00 <small>m²/ab</small></div><small class="muted">D.M. 1444/1968, art. 3</small></div><div class="card"><span class="muted">Categorie di standard</span><div class="metric">4</div><small class="muted">Ripartizione ordinaria</small></div><div class="card"><span class="muted">Superfici validate</span><div class="metric">N.D.</div><small class="muted">Da acquisire e verificare</small></div><div class="card"><span class="muted">Verifica di conformità</span><div class="metric">Non calcolabile</div><small class="muted">Mancano superfici georeferenziate</small></div></div><div class="card"><h3>Parametri di riferimento del D.M. 1444/1968</h3><p class="muted">Dotazioni minime di norma per gli insediamenti residenziali. I parametri non descrivono la dotazione effettivamente presente a Palermo.</p><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Parametro</th><th>Contenuto</th></tr></thead><tbody>${standard.map(x=>`<tr><td><b>${x[0]}</b></td><td><b>${x[1]} m²/ab</b></td><td>${x[2]}</td></tr>`).join('')}</tbody><tfoot><tr><th>Totale</th><th>18,00 m²/ab</th><th>Escluse le sedi viarie</th></tr></tfoot></table></div></div><div class="card"><h3>Procedura di verifica territoriale</h3><div class="workflow-grid"><div><b>1. Inventario</b><span>Acquisizione dei poligoni e delle superfici per categoria.</span></div><div><b>2. Validazione</b><span>Controllo di geometrie, destinazioni, fruibilità e aggiornamento.</span></div><div><b>3. Attribuzione</b><span>Associazione delle superfici a quartieri e circoscrizioni tramite overlay GIS.</span></div><div><b>4. Calcolo</b><span>m² per abitante, fabbisogno teorico e differenziale per categoria.</span></div></div><p class="notice-inline">Non viene calcolato alcun deficit o surplus finché non saranno disponibili superfici attendibili e popolazione coerente per territorio e anno.</p></div>`;

  html+=`<div class="card"><h3>Raccordo tra PRG, verde e standard urbanistici</h3><p>Il parametro nazionale di riferimento per gli insediamenti residenziali è quello dell’art. 3 del D.M. 1444/1968: <strong>9 m²/abitante</strong> per spazi pubblici attrezzati a parco, gioco e sport, all’interno della dotazione complessiva ordinaria di 18 m²/abitante. In Sicilia, l’art. 21 della L.R. 71/1978 prevede inoltre, per gli strumenti attuativi delle zone residenziali di nuova formazione, almeno <strong>3 m²/abitante aggiuntivi</strong> per verde pubblico, escludendo le aree per attrezzature sportive: è una prescrizione riferita a quegli ambiti attuativi, non un incremento da applicare automaticamente al bilancio dell’intero Comune. Il dato non equivale alla somma indiscriminata di tutte le superfici con vegetazione o destinazione agricola.</p><div class="table-wrap"><table><thead><tr><th>Codice PRG</th><th>Significato NTA</th><th>Trattamento nel bilancio standard</th></tr></thead><tbody><tr><td>V3</td><td>Spazi pubblici a verde</td><td><strong>Candidato diretto</strong>, da verificare per attuazione, disponibilità e fruibilità pubblica.</td></tr><tr><td>V4</td><td>Aree attrezzate a parco</td><td><strong>Candidato diretto</strong>, da verificare per effettiva realizzazione e accessibilità.</td></tr><tr><td>V1</td><td>Campi gioco bambini</td><td>Possibile componente gioco, da conteggiare solo se area pubblica o riservata all’uso collettivo e concretamente fruibile.</td></tr><tr><td>V2</td><td>Campi sportivi</td><td>Possibile componente sport, senza assimilare automaticamente l’intera superficie a verde permeabile.</td></tr><tr><td>V5</td><td>Impianti sportivi</td><td>Attrezzatura sportiva distinta; non è automaticamente superficie verde.</td></tr><tr><td>F4</td><td>Parchi urbani e territoriali</td><td>Non conteggiare l’intero perimetro: l’art. 23 ammette al suo interno aree agricole, servizi, attrezzature e residenza. Estrarre solo le superfici effettivamente pertinenti e non già conteggiate.</td></tr><tr><td>E1 / E2</td><td>Aree agricole e collinari</td><td><strong>Escluse dal conteggio automatico</strong>. L’art. 16 ammette anche fruizione sociale e pubblica del verde, ma la destinazione agricola o naturalistica non prova da sola l’uso pubblico.</td></tr><tr><td>VS / A1</td><td>Verde storico, privato e pubblico / pertinenze storiche</td><td><strong>Da verificare caso per caso</strong>. L’art. 21 non certifica la proprietà; servono titolarità, convenzioni, accesso e destinazione effettiva.</td></tr></tbody></table></div><p class="notice-inline">Regola di calcolo adottata: il bilancio standard resta N.D. finché non sono verificate proprietà o titolo d’uso pubblico, attuazione, accessibilità, superficie utile netta e assenza di sovrapposizioni. Il layer PRG misura la previsione urbanistica, non la dotazione effettivamente disponibile.</p><p class="muted">Riferimenti: NTA PRG 2004, artt. 16–18, 21, 23 e 24; tavole prescrittive P2a/P2b; D.M. 1444/1968, art. 3; L.R. Sicilia 71/1978, art. 21 (quota aggiuntiva per piani attuativi di nuova formazione). <a href="https://trasparenza.comune.palermo.it/media/palermo/file_archive/utente2/Strument%20Urbanistici%20Generali/Piano%20Regolatore%20Generale/Norme%20tecniche%20di%20attuazione/NORME%20TECNICHE%20DI%20ATTUAZIONE%20-%20ADEGUATE%20AL%20D.DIR.%20558%3A02%2C%20DI%20RETTIFICA%20DEL%20DIR%20124%3ADRU%3A02%20DI%20APPROVAZIONE%20-%20ADEGUATE%20ALLA%20ERRATA%20CORRIGE.pdf" target="_blank" rel="noopener">NTA ufficiali del PRG</a> · <a href="https://www.gazzettaufficiale.it/eli/id/1968/04/16/1288Q004/sg" target="_blank" rel="noopener">D.M. 1444/1968</a> · <a href="https://www.gazzettaufficiale.it/atto/regioni/caricaArticolo?art.codiceRedazionale=092R0821&amp;art.dataPubblicazioneGazzetta=1993-01-09&amp;art.idArticolo=21&amp;art.idGruppo=6&amp;art.idSottoArticolo=1&amp;art.progressivo=0&amp;art.versione=1" target="_blank" rel="noopener">L.R. Sicilia 71/1978, art. 21</a>.</p></div>`;
 }else if(active==='green'){
 html+=`<div class="card"><h3>Quadro quantitativo delle destinazioni verdi</h3><p class="muted">Le superfici sono calcolate sulle geometrie del PRG 2004. Le categorie sono tenute separate: non costituiscono un totale sommabile e non attestano proprietà, attuazione o fruibilità.</p><div id="greenKpis" class="grid green-kpis"><p class="muted">Caricamento delle superfici PRG…</p></div></div>
 <div class="card"><h3>Bilancio territoriale del verde per circoscrizione e quartiere</h3><p class="muted">L’analisi interseca i poligoni PRG con i perimetri ISTAT 2021 e li confronta con la popolazione residente: 2022 per circoscrizioni e quartieri, 2021 (POP21) per UPL. È un indicatore di previsione urbanistica, non una certificazione della dotazione pubblica effettivamente fruibile.</p><div id="greenBalance"></div></div>\n <div class="card"><h3>Cartografia tematica del verde e delle aree agricole</h3><p class="muted">Layer derivati dalla zonizzazione comunale dataset 320. Il controllo livelli consente di isolare V1–V5, E1, E2, VS, F4 e codici misti. I filtri territoriali in testata ritagliano i poligoni sul perimetro ISTAT selezionato e ricalcolano conteggi e superfici; senza selezione è mostrato l’intero Comune. Non rappresenta lo stato vegetazionale o l’accessibilità effettiva. Il verde privato è indicato come N.D. perché il PRG non fornisce un layer proprietario autonomo.</p><div class="map-legend green-map-legend"><span><i style="background:#22c55e"></i>V3 · Verde pubblico</span><span><i style="background:#eab308"></i>V1 · Campi gioco</span><span><i style="background:#fb923c"></i>V2 · Campi sportivi</span><span><i style="background:#4ade80"></i>V4 · Parchi attrezzati</span><span><i style="background:#f59e0b"></i>V5 · Impianti sportivi</span><span><i style="background:#c5d36a"></i>E1 · Agricolo</span><span><i style="background:#166534"></i>E2 · Collinare/naturalistico</span><span><i style="background:#5eead4"></i>VS · Verde storico/pertinenziale</span><span><i style="background:#60a5fa"></i>F4 · Parchi urbani/territoriali</span><span><i style="background:#94a3b8"></i>Codici misti</span><span><i style="background:#c4b5fd"></i>Privato · N.D., non georeferenziato</span></div><div id="greenMap" class="green-map"></div><p id="greenMapStatus" class="school-note">Caricamento della cartografia…</p><h4>Parchi pubblici e progetti integrativi</h4><div class="table-wrap"><table><thead><tr><th>Area</th><th>Classificazione</th><th>Estensione e stato</th><th>Trattamento analitico</th></tr></thead><tbody><tr><td><strong>Parco Uditore</strong></td><td>Verde pubblico esistente</td><td>Circa 9 ha; spazio aperto alla fruizione pubblica</td><td>Localizzato in mappa. Superficie non sommata ai poligoni PRG in assenza di perimetro GIS verificato.</td></tr><tr><td><strong>Parco Villa Turrisi</strong></td><td>Parco urbano in progetto, con nuclei pubblici</td><td>Ambito di circa 25 ha, prevalentemente privato; primo giardino pubblico oggetto di progetto comunale</td><td>Localizzato in mappa come progetto. Non conteggiato come 25 ha di verde pubblico fruibile.</td></tr></tbody></table></div><p class="muted">I simboli puntuali indicano la localizzazione, non il perimetro. Le superfici e i confini dei parchi saranno integrati nel bilancio solo dopo acquisizione e verifica di geometrie ufficiali e titoli di disponibilità pubblica. Fonti: <a href="https://docs.comune.palermo.it/verde-pubblico-dettaglio.php?id=278" target="_blank" rel="noopener">Comune di Palermo, Parco Uditore</a> · <a href="https://repository.comune.palermo.it/pnrr/pnrr-palermo-progetto-scheda.php?id=49" target="_blank" rel="noopener">Comune di Palermo, progetto Villa Turrisi</a> · <a href="https://www.parcovillaturrisi.org/il-parco/" target="_blank" rel="noopener">Associazione Parco Villa Turrisi</a>.</p></div>
 <div class="card"><h3>Verifica di attuazione, proprietà e fruibilità</h3>
<p>Le classi dell'Allegato B del Regolamento comunale (D.C.C. 355/2008) riguardano le aree V3 del PRG. La classificazione distingue giardini esistenti (rosse), aree da realizzare (verdi) e aree di non immediata attuazione (blu). Non è una classificazione estendibile automaticamente a V1, V2, V4, V5, E1, E2, VS o F4.</p>
<h4>Aree rosse · giardini esistenti e verde storico</h4><div class="table-wrap"><table><thead><tr><th>Codice</th><th>Descrizione Allegato B</th><th>Interpretazione per il bilancio</th></tr></thead><tbody>
<tr><td>R1</td><td>Giardini pubblici storici</td><td>Verde pubblico storico esistente; verificare perimetro e accesso attuale</td></tr>
<tr><td>R2.1</td><td>Verde storico pubblico o privato con caratteristiche dimensionali, botaniche o d'impianto conservate</td><td>Non assimilabile automaticamente a verde pubblico fruibile</td></tr>
<tr><td>R2.2</td><td>Verde storico pubblico o privato che ha perduto le caratteristiche originarie</td><td>Verificare proprietà e consistenza vegetata residua</td></tr>
<tr><td>R3.1</td><td>Giardini pubblici realizzati in buone condizioni</td><td>Giardino pubblico esistente</td></tr>
<tr><td>R3.2</td><td>Giardini pubblici realizzati in condizioni mediocri</td><td>Esistente, con manutenzione straordinaria per garantire la fruibilità</td></tr>
<tr><td>R3.3</td><td>Giardini pubblici realizzati in pessime condizioni</td><td>Esistente, con criticità manutentive e di fruibilità</td></tr>
<tr><td>R4</td><td>Giardini privati o di proprietà IACP già realizzati</td><td>Non conteggiare come pubblico accessibile senza titolo o convenzione</td></tr>
<tr><td>R5</td><td>Area mista con zona comunale libera e inutilizzata e giardino pubblico in buono stato</td><td>Separare la parte già realizzata da quella da completare</td></tr>
</tbody></table></div>
<h4>Aree verdi · giardini da realizzare</h4><div class="table-wrap"><table><thead><tr><th>Codice</th><th>Descrizione Allegato B</th><th>Verifica necessaria</th></tr></thead><tbody>
<tr><td>G1</td><td>Comunali, senza manufatti, non utilizzate</td><td>Priorità attuativa elevata</td></tr>
<tr><td>G2.1</td><td>Private o parzialmente private, senza manufatti, non utilizzate</td><td>Proprietà, cessione o acquisizione</td></tr>
<tr><td>G2.2</td><td>Private o parzialmente private, senza manufatti, non utilizzate o parzialmente utilizzate</td><td>Proprietà e usi in atto</td></tr>
<tr><td>G2.3</td><td>Private o parzialmente private, con manufatti, non utilizzate</td><td>Manufatti e fattibilità di rimozione</td></tr>
<tr><td>G2.4</td><td>Private o parzialmente private, con manufatti, utilizzate o parzialmente utilizzate</td><td>Proprietà, usi e fattibilità attuativa</td></tr>
<tr><td>G3</td><td>Area mista privata senza manufatti e inutilizzata con giardino pubblico da riprogettare</td><td>Separare parte pubblica esistente e parte da realizzare</td></tr>
<tr><td>G4.1</td><td>IACP o convenzionabili, senza manufatti, non utilizzate</td><td>Titolo e convenzione</td></tr>
<tr><td>G4.2</td><td>IACP o convenzionabili, senza manufatti, utilizzate</td><td>Uso e convenzione</td></tr>
<tr><td>G4.3</td><td>IACP o convenzionabili, con manufatti, utilizzate</td><td>Manufatti, uso e convenzione</td></tr>
</tbody></table></div>
<h4>Aree blu · attuazione non immediata</h4><div class="table-wrap"><table><thead><tr><th>Codice</th><th>Descrizione Allegato B</th><th>Implicazione</th></tr></thead><tbody>
<tr><td>B1</td><td>Difficoltose</td><td>Studio di fattibilità e analisi costi-benefici</td></tr>
<tr><td>B2</td><td>Molto difficoltose</td><td>Valutare variante e aree alternative</td></tr>
<tr><td>B3</td><td>Non realizzabili</td><td>Individuare aree sostitutive per mantenere lo standard</td></tr>
<tr><td>B4</td><td>Da realizzare per stralci</td><td>Programmare fasi funzionali e priorità</td></tr>
</tbody></table></div>
<p class="school-note"><strong>Stato della digitalizzazione:</strong> l'inventario georeferenziato delle classi Allegato B non è ancora disponibile nel progetto (0 geometrie puntuali validate). Le tavole originali sono scansioni raster per circoscrizione, non layer GIS. Non è corretto assegnare i simboli a poligoni V3 senza georeferenziazione e verifica. È stato predisposto un archivio strutturato per registrare le geometrie e i relativi attributi.</p>
<p><a href="https://www.comune.palermo.it/wp-content/uploads/2024/11/regolamento%20del%20verde%20pubblico%20e%20privato%20della%20citt%C3%A0%20di%20palermo.pdf" target="_blank" rel="noopener">Regolamento comunale, Allegato B, pp. 76-84</a> · <a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=278" target="_blank" rel="noopener">Dataset 278, perimetrazione storica delle aree verdi (2013, catalogo aggiornato 2021)</a> · <a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320" target="_blank" rel="noopener">Dataset 320, zonizzazione PRG</a> · <a href="https://repository.comune.palermo.it/bilancio-sociale.php?anno=2023&indice=2" target="_blank" rel="noopener">Bilancio sociale 2023, Sistema Informativo Comunale Ambientale (SIAC)</a>.</p><p class="school-note">Il Bilancio sociale 2023 documenta l’avvio del SIAC e le componenti previste per atlante dei suoli, flora e vegetazione e censimento del patrimonio arbustivo e dei giardini storici. Non equivale alla disponibilità pubblica di un layer aggiornato: occorre acquisire un export GIS dal servizio comunale.</p>
</div>
 <div class="grid"><div class="card"><h3>Confronto delle superfici per destinazione</h3><p class="muted">Ettari per categoria PRG. Le voci con codici misti e il verde privato non vengono ripartiti arbitrariamente.</p><div class="green-chart-wrap"><canvas id="greenAreaChart"></canvas></div></div><div class="card"><h3>Verde privato e verde storico</h3><p>Le NTA del PRG 2004 trattano all’art. 21 le aree a verde storico, privato e pubblico. Il registro comunale del verde storico comprende giardini ornamentali, parchi, fondi agricoli e pertinenze di ville e complessi storici.</p><p><strong>Il codice VS non certifica né proprietà privata né proprietà pubblica.</strong> L’art. 21 delle NTA disciplina unitariamente le aree a verde storico, privato e pubblico: i 166 poligoni VS identificano una disciplina/tipologia urbanistica, non il regime proprietario. La titolarità e l’eventuale uso pubblico vanno verificati con catasto, atti, convenzioni e soggetto gestore. Alcune aree A1 compaiono nell’elenco storico, ma non è corretto conteggiare tutta la zona A1 come verde.</p><p class="muted">Per questa ragione la superficie del verde privato è indicata come N.D. e non stimata.</p><p><a href="https://trasparenza.comune.palermo.it/page/10624/piano-regolatore-generale-dcc-72024.html" target="_blank" rel="noopener">NTA e allegati PRG 2004</a> · <a href="https://trasparenza.comune.palermo.it/media/palermo/file_archive/utente2/Strument%20Urbanistici%20Generali/Piano%20Regolatore%20Generale/Norme%20tecniche%20di%20attuazione%20Scheda%20Norma/%20ELENCO%20VERDE%20STORICO%20VARIANTE%20PRG.pdf" target="_blank" rel="noopener">Elenco comunale del verde storico</a></p></div></div>
 <div class="card"><h3>Inventario delle destinazioni PRG</h3><div id="greenStatsTable" class="table-wrap"><p class="muted">In attesa dei dati quantitativi.</p></div></div>
 <div class="card"><h3>Interpretazione urbanistica e limiti</h3><div class="workflow-grid"><div><b>Verde pubblico · V3</b><span>Spazi pubblici a verde individuati dal piano. La destinazione non prova che l’area sia già realizzata, accessibile o gestita come giardino.</span></div><div><b>Verde attrezzato · V4</b><span>Aree attrezzate a parco. Da tenere distinte da campi gioco V1, campi sportivi V2 e impianti sportivi V5.</span></div><div><b>Verde agricolo · E1</b><span>Territori prevalentemente pianeggianti, anche residuali o compromessi da insediamenti, caratterizzati da colture agricole.</span></div><div><b>Verde collinare · E2</b><span>Aree prevalentemente collinari con vegetazione spontanea, macchia, gariga, boschi e riforestazione. Le NTA includono Monte Pellegrino, Monte Gallo, Grotta Conza e Grotta Molara.</span></div><div><b>Parchi urbani · F4</b><span>Grandi ambiti paesaggistici che possono includere aree agricole, servizi, attrezzature e residenza. Il perimetro del parco non coincide con una superficie integralmente a verde.</span></div><div><b>Destinazioni miste</b><span>26 geometrie riportano codici combinati o non univoci. Sono visualizzate come miste, senza attribuzione forzata a una singola categoria.</span></div></div><p class="notice-inline">Le superfici sono calcolate dai poligoni WGS84 e arrotondate a 0,01 m². Non sommare le categorie: i perimetri dei parchi e le destinazioni interne possono sovrapporsi. L’art. 23 NTA chiarisce che il perimetro F4 può comprendere colture agricole, servizi, attrezzature e residenza: non coincide con una superficie tutta a verde. Attenzione: nel testo NTA pubblicato il comma 3 dell’art. 18 contiene un richiamo finale a E1 nelle more degli adempimenti; la classificazione cartografica E2 resta distinta e non viene riclassificata automaticamente sulla base di quel richiamo, da verificare con eventuali errata corrige e atti applicativi. Per il quadro autorizzativo puntuale prevalgono NTA, tavole prescrittive P2a/P2b e varianti successive efficaci.</p></div>`;
}else if(active==='gis'){
 html+=`<div class="card gis-selection-panel"><h3>Cartografia delle sezioni territoriali</h3><p class="muted">Cartografia amministrativa e statistica di Palermo: circoscrizioni ASC1, quartieri ASC2, UPL ASC3 e sezioni di censimento ISTAT 2021. Attiva o disattiva i livelli dal controllo della mappa e seleziona i poligoni per applicare i filtri al comparatore.</p><div class="gis-selection-grid"><label>Circoscrizione ASC1<select id="gisSelectAsc1"><option value="">Tutte le circoscrizioni</option></select></label><label>Quartiere ASC2<select id="gisSelectAsc2"><option value="">Tutti i quartieri</option></select></label><label>UPL ASC3<select id="gisSelectAsc3"><option value="">Tutte le UPL</option></select></label><label>Sezione censuaria<select id="gisSelectSection"><option value="">Nessuna</option></select></label></div><p id="gisSelectionStatus" class="notice-inline" aria-live="polite">Nessun ambito selezionato.</p><p id="gisSelectorStatus" class="muted" aria-live="polite">Caricamento degli archivi territoriali ISTAT 2021…</p></div><div id="map" class="gis-map"></div><p id="gisAutoStatus" class="school-note"></p>`;
}else if(active==='spatial'){
 const normSpatial=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),parentCache=new Map(),parentOf=f=>{const code=String(f.properties?.COM_ASC3||'');if(!parentCache.has(code))parentCache.set(code,findParentFeature(f,'asc3','asc2'));return parentCache.get(code);};
 const asc3Features=(GEO.asc3?.features||[]).filter(f=>{const p=f.properties||{};if(s.asc3&&String(p.COM_ASC3)!==String(s.asc3))return false;if(s.circ&&!featureBelongsToCirc(f,'asc3',s.circ))return false;if(s.asc2){const parent=parentOf(f);if(!parent||String(parent.properties?.COM_ASC2)!==String(s.asc2))return false;}if(s.quart){const parent=findParentFeature(f,'asc3','asc2'),quartCode=s.asc2||quartiereAsc2Code(DATA.territories.quartieri.find(x=>x.id===s.quart));if(!parent||String(parent.properties?.COM_ASC2)!==String(quartCode))return false;}if(s.section){const sec=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));if(!sec||String(sec.properties?.COM_ASC3)!==String(p.COM_ASC3))return false;}return true;}).map(f=>({name:f.properties?.DEN_ASC3||'UPL senza denominazione',code:f.properties?.COM_ASC3,pop:Number(f.properties?.POP21)||0,families:Number(f.properties?.FAM21)||0,area:Number(f.properties?.SHAPE_Area)||0}));
 const asc3Sorted=[...asc3Features].sort((a,b)=>b.pop-a.pop),spatialTotal=asc3Features.reduce((n,x)=>n+x.pop,0),spatialTop=asc3Sorted.slice(0,10),fmtSpatial=n=>Number(n).toLocaleString('it-IT',{maximumFractionDigits:0});
 html+=`<div class="grid spatial-kpis">
  <div class="card"><span class="muted">Unità territoriali disponibili</span><div class="metric">3.688</div><small class="muted">3.600 sezioni + 88 aree subcomunali</small></div>
  <div class="card"><span class="muted">Popolazione censuaria 2021</span><div class="metric">635.439</div><small class="muted">POP21, totale delle sezioni</small></div>
  <div class="card"><span class="muted">Codici territoriali agganciati</span><div class="metric">100%</div><small class="muted">Corrispondenza codici ASC verificata</small></div>
  <div class="card"><span class="muted">Geometrie da verificare</span><div class="metric">3</div><small class="muted">Auto-intersezioni nelle sezioni censuarie</small></div>
 </div>
 <div class="card"><h3>Ambito dell'analisi spaziale</h3><p class="muted">Questa sezione è dedicata all'interpretazione delle relazioni tra popolazione, territorio e servizi. I risultati quantitativi saranno attivati solo dopo l'abbinamento e la validazione dei dataset tematici, evitando di presentare come misure effettive analisi non ancora calcolate.</p>
 <div class="workflow-grid">
  <div><b>1. Distribuzione della popolazione</b><span>Tabella e grafici della POP21 per UPL ASC3, aggiornati in base ai filtri territoriali; la selezione di una sezione restituisce l’UPL di appartenenza.</span></div>
  <div><b>2. Concentrazione e densità</b><span>Densità preliminare per UPL calcolata come POP21 / SHAPE_Area. Il valore resta subordinato alla verifica topologica delle geometrie e delle superfici.</span></div>
  <div><b>3. Accessibilità ai servizi</b><span>Distanze, tempi di percorrenza e bacini di influenza per scuole, verde pubblico, impianti sportivi e servizi collettivi. Richiede inventari georeferenziati validati.</span></div>
  <div><b>4. Disuguaglianze territoriali</b><span>Confronto tra distribuzione demografica, dotazioni e indicatori socio-economici, mantenendo distinti anno e unità geografica di ogni fonte.</span></div>
 </div></div>
 <div class="card"><h3>Stato di disponibilità delle analisi</h3><div class="table-wrap"><table><thead><tr><th>Analisi</th><th>Dati necessari</th><th>Stato</th></tr></thead><tbody>
  <tr><td>Distribuzione della popolazione</td><td>POP21 e geometrie ISTAT 2021</td><td><span class="data-status">Base disponibile</span></td></tr>
  <tr><td>Densità abitativa</td><td>POP21 e SHAPE_Area delle geometrie ASC3</td><td><span class="data-status">Calcolata in via preliminare per UPL</span></td></tr>
  <tr><td>Prossimità ai servizi</td><td>Scuole, verde, sport e servizi con coordinate verificate</td><td><span class="data-status">Dati da integrare</span></td></tr>
  <tr><td>Bacini di accessibilità</td><td>Rete stradale/pedonale e localizzazione dei servizi</td><td><span class="data-status">Dati da integrare</span></td></tr>
  <tr><td>Confronto socio-spaziale</td><td>Indicatori sociali e geografici con codici territoriali coerenti</td><td><span class="data-status">Abbinamento da validare</span></td></tr>
 </tbody></table></div><p class="notice-inline">Nota metodologica: il totale POP21 di 635.439 è riferito al censimento 2021 e non è intercambiabile con la popolazione anagrafica comunale 2022 o con i dati censuari 2023.</p></div>
 <div class="card"><h3>Distribuzione della popolazione per UPL · POP21</h3><p class="muted">Aggregazione dei valori POP21 contenuti nelle geometrie ASC3 ISTAT 2021. Il risultato segue i filtri territoriali disponibili; in presenza del filtro su una sezione censuaria viene mostrata l’UPL di appartenenza, non una stima della popolazione della singola sezione.</p><div class="card"><h3>Prime dieci UPL per popolazione</h3><canvas id="spatialUplChart"></canvas></div><div class="table-wrap"><table><thead><tr><th>UPL</th><th>Codice</th><th>Popolazione POP21</th><th>Famiglie</th><th>Superficie (m²)</th><th>Densità (ab./km²)</th></tr></thead><tbody>${spatialTop.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.code)}</td><td>${fmtSpatial(x.pop)}</td><td>${fmtSpatial(x.families)}</td><td>${fmtSpatial(x.area)}</td><td>${x.area>0?fmtSpatial(x.pop/(x.area/1000000)):'N.D.'}</td></tr>`).join('')}</tbody></table></div><p class="notice-inline">UPL considerate: ${asc3Features.length}. Popolazione POP21 nell’ambito selezionato: ${fmtSpatial(spatialTotal)}. La densità è calcolata su SHAPE_Area in m² delle geometrie ASC3; non è un indicatore anagrafico 2022. Le superfici e i confini restano soggetti ai controlli topologici indicati nel rapporto QA.</p></div>
 <div class="grid"><div class="card"><h3>Metodi di analisi previsti</h3><ul><li>Aggregazione spaziale per circoscrizione, quartiere e sezione censuaria</li><li>Calcolo di densità e indicatori normalizzati per superficie</li><li>Buffer e aree di influenza intorno ai servizi</li><li>Analisi di prossimità e accessibilità sulla rete</li><li>Confronto tra dotazioni urbane e popolazione residente</li></ul></div><div class="card"><h3>Requisiti prima della pubblicazione dei risultati</h3><ol><li>Verifica topologica dei tre poligoni anomali e controllo dei confini.</li><li>Conferma del sistema di riferimento e delle unità di misura.</li><li>Validazione di coordinate, completezza e aggiornamento dei servizi.</li><li>Allineamento dei codici geografici e degli anni di riferimento.</li><li>Documentazione delle formule, dei parametri e delle limitazioni.</li></ol><p class="notice-inline">Le elaborazioni non ancora eseguite sono indicate come da calcolare o da integrare. Non vengono mostrati valori stimati.</p></div></div>
 `;
 }else if(active==='sources'){
 const fonti=[
 ['Comune di Palermo','Popolazione residente per quartiere e cittadinanza','2022 · 31/12','Dataset 1693','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1693','Dato anagrafico già utilizzato; licenza CC BY-SA 4.0.'],
 ['Comune di Palermo','Popolazione residente per circoscrizione e cittadinanza','2022 · 31/12','Dataset 1694','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1694','Aggregazione ufficiale; non ricostruire sommando quartieri sovrapposti.'],
 ['Comune di Palermo','Popolazione per sezione censuaria e cittadinanza','2022 · 31/12','Dataset 1691','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1691','Da associare alle geometrie solo dopo verifica dei codici delle sezioni.'],
 ['Comune di Palermo','Popolazione per sezione censuaria e fasce quinquennali d’età','2022 · 31/12','Dataset 1706','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1706','Fonte anagrafica; aggregazione geografica ancora da completare.'],
 ['ISTAT','Censimento permanente 2023 per sezioni e aree subcomunali','2023 · 31/12','Download ZIP capoluoghi metropolitani','https://esploradati.istat.it/databrowser/DWL/PERMPOP/SUBCOM/Comuni_2023.zip','Archivio ufficiale diretto. Verificare copertura Palermo, tracciato, codici e quadratura prima dell’importazione.'],
 ['ISTAT','Basi territoriali 2021 – sezioni censuarie Sicilia','2021','Download SHP Sicilia','https://www.istat.it/storage/cartografia/basi_territoriali/2021/R19_21.zip','Archivio regionale ufficiale, CRS EPSG:32632. Da estrarre e validare per codici comunali, geometrie e copertura Palermo.'], ['ISTAT','Aree subcomunali 2021 – municipi e circoscrizioni','2021 · file sostituito 14/05/2026','Download SHP / XLS','https://www.istat.it/wp-content/uploads/2025/04/ASC_21.zip','Fonte geografica ufficiale per le partizioni subcomunali; verificare denominazioni e corrispondenza con l’assetto comunale.'],
 ['Comune di Palermo','Perimetrazione delle circoscrizioni comunali','2013 · catalogo aggiornato 2018','Dataset 265 · SHP','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=265','Fonte ufficiale, ma da verificare rispetto all’assetto amministrativo corrente.'],
 ['Comune di Palermo','Scuole comunali','2015–2020 · catalogo aggiornato 2021','Dataset 328 · KML','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=328','Inventario storico da verificare rispetto all’offerta attuale.'],
 ['Comune di Palermo','Perimetrazione aree verdi','Da verificare','Dataset 278 · SHP','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=278','Non usare per conteggi o superfici prima della verifica di data e geometrie.'],
 ['Comune di Palermo','Perimetrazione zonizzazione PRG · dataset 320','Variante Generale · DCC 7/2004; catalogo 10/01/2018','Dataset 320 · SHP → GeoJSON','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320','Acquisito e convertito il 17/11/2026: 5.879 geometrie pubblicate su 5.880 record sorgente; una feature priva di geometria è esclusa e conteggiata nei metadati. QA strutturale e geografica preliminare superata; non certifica topologia o vigenza.'],
 ['Comune di Palermo','Verde urbano, agricolo, storico e collinare · PRG 2004','Variante Generale DCC 7/2004 · dataset 320 · NTA artt. 16-23 e 24','679 geometrie · layer tematico','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320','Layer analitico derivato: E1, E2, VS, V1-V5 e F4. Le superfici sono geodetiche e non certificate come fruibili o pubbliche. Il verde privato non è quantificato in assenza di prova patrimoniale; codici misti e sovrapposizioni restano separati.'],
 ['Comune di Palermo','Vincoli della Variante Generale PRG · dataset 321','Catalogo 06/09/2021 · DCC 7/2004','Dataset 321 · SHP → GeoJSON','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321','Acquisito e convertito il 17/11/2026: 662 geometrie areali e 100 lineari dopo la separazione delle componenti; QA preliminare superata. Riferimento storico della Variante Generale, da confrontare con atti e varianti successive.'],
 ['Comune di Palermo','Piano Regolatore Generale · NTA e presa d’atto','DCC 7/2004 · portale aggiornato 30/09/2025','Norme tecniche e atti','https://trasparenza.comune.palermo.it/page/10624/piano-regolatore-generale-dcc-72024.html','Riferimento documentale per la lettura dei codici ZTO e delle destinazioni. La simbologia del comparatore non sostituisce la consultazione delle NTA.'],
 ['Comune di Palermo','Variante parziale · via Giotto 22','Delibera Commissario ad acta n. 142 del 22/07/2025','Variante parziale','https://www.sitr.regione.sicilia.it/comune-di-palermo-variante-urbanistica-parziale-al-vigente-p-r-g/','La documentazione SITR riporta la trasmissione della variante approvata al sistema regionale; verificare l’ambito catastale e gli atti allegati prima di applicarla a un’analisi locale.'],
 ['Comune di Palermo','Variante parziale · via Giuseppe Sunseri','Delibera Commissario ad acta n. 380 del 24/11/2025','Variante parziale','https://www.comune.palermo.it/novita/avviso-e-delibera-commissario-ad-acta-n-380-del-24112025/','Procedimento pubblicato con elaborati di progetto e termine per osservazioni; non estendere la modifica all’intera zonizzazione comunale.'],
 ['Comune di Palermo','Variante parziale · via Tommaso Natale','Delibera Commissario ad acta n. 136 del 13/04/2026','Variante parziale','https://www.comune.palermo.it/novita/avviso-e-delibera-commissario-ad-acta-n-136-del-13042026/','Atto adottato con i poteri del Consiglio Comunale e pubblicato nel luglio 2026; verificare gli esiti successivi e l’efficacia.'],
 ['Comune di Palermo','Variante parziale · via Gioacchino Belli','Delibera Commissario ad acta n. 287 del 17/06/2026','Variante parziale','https://www.comune.palermo.it/novita/variante-urbanistica-parziale-al-vigente-prg-2/','Atto adottato con i poteri del Consiglio Comunale e pubblicato l’11/09/2026; verificare gli esiti del procedimento e l’efficacia.'],
 ['Normativa statale','D.M. 1444/1968, art. 3','1968','Standard urbanistici','https://www.edizionieuropee.it/law/html/15/zn38_04_015.html','Parametro normativo, non fonte delle superfici effettivamente presenti.']
 ];
 html+=`<div class="card source-list"><h3>Registro delle fonti ufficiali</h3><p class="muted">La presenza di un dataset nel catalogo non equivale alla sua validazione tecnica. Il registro distingue ente produttore, anno del dato e stato di utilizzo.</p><div class="table-wrap"><table><thead><tr><th>Ente</th><th>Dataset / contenuto</th><th>Riferimento temporale</th><th>Fonte</th><th>Nota metodologica</th></tr></thead><tbody>${fonti.map(f=>`<tr><td>${f[0]}</td><td><strong>${f[1]}</strong></td><td>${f[2]}</td><td><a href="${f[4]}" target="_blank" rel="noopener">${f[3]}</a></td><td>${f[5]}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="grid"><div class="card"><h3>Protocollo di validazione</h3><ol><li>Verifica ente produttore, metadati, licenza e data di riferimento.</li><li>Acquisizione del file originale e conservazione della versione scaricata.</li><li>Controllo di intestazioni, codici, record mancanti, duplicati e totali.</li><li>Verifica del sistema di riferimento, geometrie e copertura territoriale.</li><li>Associazione tra dato statistico e unità geografica mediante codici ufficiali, non per somiglianza dei nomi.</li><li>Confronto con i totali pubblicati dall’ente e registrazione degli scostamenti.</li></ol></div><div class="card"><h3>Regole di comparabilità</h3><ul><li>I dati anagrafici comunali al 31/12/2022 e i dati censuari ISTAT 2023 restano serie distinte.</li><li>Le basi territoriali ISTAT 2021 non sono automaticamente intercambiabili con perimetrazioni comunali precedenti.</li><li>Un quartiere associato a più circoscrizioni non deve essere sommato integralmente a ciascuna di esse.</li><li>Le superfici urbanistiche si conteggiano solo dopo verifica di destinazione, proprietà, accessibilità e fruibilità.</li><li>Ogni indicatore elaborato dichiara formula, unità territoriale, anno e fonte.</li></ul></div></div>
 <div class="card"><h3>Stato di validazione</h3><p><strong>Dati demografici 2022 per quartiere e circoscrizione:</strong> acquisiti e utilizzati con riferimento al 31/12/2022.</p><p><strong>Dati per sezione censuaria e classi d’età:</strong> fonte ufficiale individuata, associazione geografica ancora da completare.</p><p><strong>Cartografia PRG:</strong> dataset comunali 320 e 321 acquisiti, convertiti e sottoposti a QA strutturale e geografica preliminare il 17/11/2026. La zonizzazione integrale e i vincoli della Variante Generale 2004 sono disponibili nella mappa Standard urbanistici; il controllo QA non certifica topologia, proprietà, attuazione o vigenza urbanistica.</p><p><strong>Varianti parziali successive:</strong> il registro documenta atti 2025–2026 riferiti a singoli ambiti. Gli atti adottati, approvati o trasmessi devono essere verificati caso per caso, senza applicarli automaticamente all’intero territorio comunale.</p><p><strong>Altri inventari dei servizi:</strong> geometrie, copertura e aggiornamento restano soggetti a verifica prima di attivare conteggi e analisi spaziali.</p><p class="notice-inline">Nessun valore derivato da fonti non verificate sarà presentato come dato ufficiale o risultato definitivo.</p></div>`;

 }
  const pieCanvasId='sectionTerritoryPie';
 const pieTitle={overview:'Composizione del quadro territoriale',green:'Superfici verdi e agricole per destinazione PRG',demography:'Composizione della popolazione residente',social:'Distribuzione delle UPL per classi IDISE',schools:'Distribuzione dei punti scolastici per ordine prevalente',standards:'Ripartizione dei parametri minimi di standard',gis:'Articolazione dei livelli territoriali',spatial:'Distribuzione della popolazione censuaria 2021 per UPL',compare:'Popolazione per circoscrizione',sources:'Fonti documentali per archivio'}[active]||'Analisi territoriale';
 let pieLabels=[],pieValues=[];
 const pieNorm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(active==='overview'){pieLabels=['Circoscrizioni','Quartieri','UPL','Sezioni censuarie'];pieValues=[DATA.territories.circoscrizioni.length,DATA.territories.quartieri.length,GEO.asc3?.features?.length||55,GEO.sections?.features?.length||3600];}
 else if(active==='demography'){if(s.asc3||s.section){pieLabels=['Dati non disponibili alla risoluzione selezionata'];pieValues=[0];}else {const q=DATA.territories.quartieri.find(x=>x.id===s.quart)?.name;const rows=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere'&&(!s.circ||(x.circoscrizioni_id||[]).includes(s.circ))&&(!s.quart||pieNorm(x.nome)===pieNorm(q)));const row=s.quart?rows[0]:s.circ?DATA.demografia.find(x=>x.tipo_territorio==='circoscrizione'&&x.territorio_id===s.circ):null;const sum=k=>row?Number(row[k])||0:rows.reduce((n,x)=>n+(Number(x[k])||0),0);pieLabels=['Italiani','Stranieri'];pieValues=[sum('italiani'),sum('stranieri')];}}
 else if(active==='social'){if(s.section){pieLabels=['Dati IDISE non disponibili per sezione'];pieValues=[0];}else {const a=(DATA.sociale||[]).filter(x=>{if(s.asc3&&String(x.cod_asc)!==String(s.asc3))return false;const f=GEO.asc3?.features?.find(z=>String(z.properties?.COM_ASC3)===String(x.cod_asc));if(s.circ&&(!f||!featureBelongsToCirc(f,'asc3',s.circ)))return false;if(s.quart){const q=DATA.territories.quartieri.find(z=>z.id===s.quart)?.name,f2=f?findParentFeature(f,'asc3','asc2'):null;if(!f2||pieNorm(f2.properties?.DEN_ASC2)!==pieNorm(q))return false;}return true;});pieLabels=['IDISE < 90','IDISE 90-100','IDISE > 100'];pieValues=[a.filter(x=>Number(x.idise)<90).length,a.filter(x=>Number(x.idise)>=90&&Number(x.idise)<=100).length,a.filter(x=>Number(x.idise)>100).length];}}
 else if(active==='schools'){const cl=DATA.schoolClassification?.records||[],pt=DATA.schoolPoints||[],byId=new Map(cl.map(x=>[String(x.point_id),x]));const counts={NIDO:0,INFANZIA:0,ELEMENTARI:0,MEDIE:0,SUPERIORI:0,'Non classificati':0};const aliases={'MEZZOMONREALE-V.LLA TASCA':'Mezzomonreale-Villa Tasca','MONTEGRAPPA- S.ROSALIA':'S. Rosalia-Montegrappa','PALAZZO REALE - M.TE DI PIETA':'Palazzo Reale-Monte di Pietà','RESUTTANO-S. LORENZO':'Resuttana-San Lorenzo'};const eligible=pt.filter(p=>{if(s.quart){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2||quartiereAsc2Code(DATA.territories.quartieri.find(q=>q.id===s.quart))));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(s.circ){const f=GEO.asc1?.features?.find(x=>String(x.properties?.COD_ASC1)===String(s.circ).replace('c',''));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(s.asc2){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(s.asc3){const f=GEO.asc3?.features?.find(x=>String(x.properties?.COM_ASC3)===String(s.asc3));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(s.section){const f=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}return true;});eligible.forEach(p=>{const os=byId.get(String(p.id))?.orders||[];const first=os[0]||'Non classificati';counts[first]=(counts[first]||0)+1;});pieLabels=Object.keys(counts);pieValues=Object.values(counts);}
 else if(active==='standards'){const context=standardPopulationContext(s);pieLabels=['Istruzione','Attrezzature di interesse comune','Verde, gioco e sport','Parcheggi'];pieValues=context.value?[4.5,2,9,2.5].map(v=>v*context.value):[4.5,2,9,2.5];}
 else if(active==='gis'){pieLabels=['Circoscrizioni ASC1','Quartieri ASC2','UPL ASC3','Sezioni censuarie'];pieValues=[GEO.asc1?.features?.length||8,GEO.asc2?.features?.length||25,GEO.asc3?.features?.length||55,GEO.sections?.features?.length||3600];}
 else if(active==='spatial'){const top=asc3Sorted.slice(0,8),other=asc3Sorted.slice(8).reduce((n,x)=>n+x.pop,0);pieLabels=top.map(x=>x.name);pieValues=top.map(x=>x.pop);if(other>0){pieLabels.push('Altre UPL');pieValues.push(other);}}
 else if(active==='compare'){const ds=DATA.demografia.filter(x=>x.tipo_territorio==='circoscrizione');const rows=DATA.territories.circoscrizioni.map(c=>({name:c.name,value:Number(ds.find(x=>x.territorio_id===c.id)?.totale)||0}));pieLabels=rows.map(x=>x.name);pieValues=rows.map(x=>x.value);}
 else if(active==='sources'){pieLabels=['Record demografici','UPL archiviate','Punti scolastici','Sezioni censuarie'];pieValues=[DATA.demografia.length,(DATA.sociale||[]).length,(DATA.schoolPoints||[]).length,GEO.sections?.features?.length||0];}
 if(active!=='green')html+='<div class="card section-pie-card"><h3>'+pieTitle+'</h3><p class="school-note">'+(active==='spatial'?'Quote della popolazione censuaria POP21 delle prime otto UPL selezionate; la quota residua è aggregata in “Altre UPL”. Fonte: basi territoriali ISTAT 2021. I filtri territoriali sono applicati nei limiti dei codici e delle geometrie disponibili.':'Il grafico si aggiorna con gli ambiti selezionati nei limiti della risoluzione geografica disponibile per ciascun archivio. Se la fonte non contiene dati al livello richiesto, il grafico viene omesso anziché stimare valori.')+'</p><div class="section-pie-wrap"><canvas id="sectionTerritoryPie" aria-label="'+pieTitle+'" role="img"></canvas></div></div>';
 html=html.replace(/(?:\\[object Object\\]\\s*,?\\s*){2,}/g,'').replace(/\\[object Object\\]/g,'');
 $('#content').innerHTML=html;
 if(active==='schools'){initSchools();}
 if(active==='green'){initGreenMap();}
 
if(active==='standards'){
 initStandardSchoolMap();
 const pop=document.getElementById('stdPopulation');
 if(pop&&stdPopulationContext.value!==null)pop.value=String(stdPopulationContext.value);
 const parametri=[4.5,2,9,2.5];
 const fmt=n=>Number(n).toLocaleString('it-IT',{maximumFractionDigits:2});
 function calcolaStandard(){
  const popolazione=Number(pop.value),valida=pop.value!==''&&Number.isFinite(popolazione)&&popolazione>0;
  let totaleF=0,totaleD=0;
  parametri.forEach((parametro,i)=>{
   const campo=document.querySelector('.std-area[data-index="'+i+'"]'),disponibile=Number(campo.value);
   const valido=campo.value!==''&&Number.isFinite(disponibile)&&disponibile>=0,fabbisogno=popolazione*parametro;
   document.getElementById('stdNeed'+i).textContent=valida?fmt(fabbisogno):'N.D.';
   document.getElementById('stdGap'+i).textContent=valida&&valido?fmt(disponibile-fabbisogno):'N.D.';
   totaleF+=fabbisogno;if(valido)totaleD+=disponibile;
  });
  const tutte=[...document.querySelectorAll('.std-area')].every(x=>x.value!==''&&Number.isFinite(Number(x.value))&&Number(x.value)>=0);
  document.getElementById('stdTotalNeed').textContent=valida?fmt(totaleF):'N.D.';
  document.getElementById('stdTotalGap').textContent=valida&&tutte?fmt(totaleD-totaleF):'N.D.';
  document.getElementById('stdCalcStatus').textContent=valida&&tutte?'Simulazione completata. Differenza positiva: superficie inserita superiore al fabbisogno teorico; negativa: superficie inferiore.':'Completa popolazione e tutte le superfici per ottenere il differenziale complessivo. Le celle N.D. indicano dati mancanti.';
 }
 pop?.addEventListener('input',calcolaStandard);
 document.querySelectorAll('.std-area').forEach(x=>x.addEventListener('input',calcolaStandard));
 calcolaStandard();
}
if(active==='social'){
  const box=document.getElementById('uplConfronto');
  const indicatori=['DIS1','DIS2','DIS3','DIS4','DIS5','DIS6','DIS7','DIS8','DIS9'];
  function aggiornaConfronto(){
    const codici=[...document.querySelectorAll('.upl-check:checked')].map(x=>x.value);
    const selezionate=DATA.sociale.filter(x=>codici.includes(x.cod_asc));
    if(selezionate.length<2){box.innerHTML='<h3>Confronto tra UPL</h3><p class="muted">Seleziona almeno due UPL per visualizzare i valori a confronto.</p>';return;}
    const numero=v=>v===null||v===undefined||v===''?'N.D.':Number(v).toLocaleString('it-IT',{maximumFractionDigits:2});
    const righe=[['IDISE',a=>a.idise],['Popolazione',a=>a.popolazione],['Famiglie',a=>a.famiglie],['Superficie (km²)',a=>a.superficie_km2],...indicatori.map(k=>[k,a=>a.dis?.[k]])];
    box.innerHTML='<h3>Confronto tra '+selezionate.length+' UPL</h3><div class="table-wrap comparison-table"><table><thead><tr><th>Indicatore</th>'+selezionate.map(a=>'<th>'+esc(a.nome)+'</th>').join('')+'</tr></thead><tbody>'+righe.map(([nome,fn])=>'<tr><th>'+nome+'</th>'+selezionate.map(a=>'<td>'+numero(fn(a))+(indicatori.includes(nome)?' %':'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="muted comparison-note">DIS1-DIS9 sono percentuali (%). Il denominatore varia in base all’indicatore ed è specificato nella scheda descrittiva. DIS4 ha polarità inversa rispetto al disagio. IDISE è invece un indice composito con riferimento comunale pari a 100.</p>';
  }
  document.querySelectorAll('.upl-check').forEach(c=>c.addEventListener('change',aggiornaConfronto));
  aggiornaConfronto();
}
if(active==='demography'&&window.Chart){
 const sd=selected();
 const normGrafico=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const qd=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere');
 const nomeQD=DATA.territories.quartieri.find(x=>x.id===sd.quart)?.name;
 const nomeFiltroDemo=sd.quart?nomeQD:null;
 const rd=(sd.asc3||sd.section)?[]:qd.filter(x=>(!sd.circ||((x.circoscrizioni_id||[]).includes(sd.circ)&&(sd.quart||(x.circoscrizioni_id||[]).length===1)))&&(!sd.quart||normGrafico(x.nome)===normGrafico(nomeQD)));
 const sommaD=k=>rd.reduce((a,x)=>a+(Number(x[k])||0),0);
 const fmtD=n=>Number(n).toLocaleString('it-IT');
 const canvasD=id=>document.getElementById(id);
 if(canvasD('chartComposizione')){
  const composizioneDemo=sd.quart?qd.find(x=>x.territorio_id===sd.quart):sd.circ?DATA.demografia.find(x=>x.tipo_territorio==='circoscrizione'&&x.territorio_id===sd.circ):null;
   const composizioneValori=composizioneDemo?[Number(composizioneDemo.italiani)||0,Number(composizioneDemo.stranieri)||0]:[sommaD('italiani'),sommaD('stranieri')];
   charts.push(new Chart(canvasD('chartComposizione'),{type:'doughnut',data:{labels:['Italiani','Stranieri'],datasets:[{data:composizioneValori}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}}));
 }
 const topD=[...rd].sort((a,b)=>b.totale-a.totale); // Tutti i quartieri disponibili nel filtro corrente, fino a 25 nel quadro comunale.
 if(canvasD('chartQuartieri')){
  charts.push(new Chart(canvasD('chartQuartieri'),{type:'bar',data:{labels:topD.map(x=>x.nome),datasets:[{label:'Residenti',data:topD.map(x=>x.totale)}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true},y:{ticks:{autoSkip:false, font:{size:10}}}}}}));
 }
 if(canvasD('chartIncidenza')){
  const incD=[...rd].sort((a,b)=>(b.stranieri/b.totale)-(a.stranieri/a.totale)).map(x=>({nome:x.nome,valore:x.totale?x.stranieri/x.totale*100:0}));
  charts.push(new Chart(canvasD('chartIncidenza'),{type:'bar',data:{labels:incD.map(x=>x.nome),datasets:[{label:'Stranieri (%)',data:incD.map(x=>Number(x.valore.toFixed(2))),backgroundColor:'#dc2626',borderColor:'#991b1b',borderWidth:1}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v+'%'}}}}}));
 }
}
if(active==='spatial'&&window.Chart){const rows=asc3Sorted.slice(0,10),bar=document.getElementById('spatialUplChart');if(bar)charts.push(new Chart(bar,{type:'bar',data:{labels:rows.map(x=>x.name),datasets:[{label:'Popolazione POP21',data:rows.map(x=>x.pop)}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}}));}
if(active==='compare'&&window.Chart){
const datiCirc=DATA.demografia.filter(x=>x.tipo_territorio==='circoscrizione');
const confronto=DATA.territories.circoscrizioni.map(c=>{
const dato=datiCirc.find(x=>x.territorio_id===c.id);
const italiani=Number(dato?.italiani)||0;
const stranieri=Number(dato?.stranieri)||0;
const totale=Number(dato?.totale)||0;
return {...c,italiani,stranieri,totale,percentuale:totale?stranieri/totale*100:0};
});
if(document.getElementById('chartCircoscrizioni')){
charts.push(new Chart(document.getElementById('chartCircoscrizioni'),{type:'bar',data:{labels:confronto.map(x=>x.name),datasets:[{label:'Residenti',data:confronto.map(x=>x.totale)}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}}));
}
if(document.getElementById('chartStranieriCircoscrizioni')){
charts.push(new Chart(document.getElementById('chartStranieriCircoscrizioni'),{type:'bar',data:{labels:confronto.map(x=>x.name),datasets:[{label:'Stranieri (%)',data:confronto.map(x=>Number(x.percentuale.toFixed(2)))}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{callback:v=>v+'%'}}}}}));
}
}

 if(window.Chart&&document.getElementById('sectionTerritoryPie')&&pieValues.some(v=>Number(v)>0)){
  charts.push(new Chart(document.getElementById('sectionTerritoryPie'),{type:'pie',data:{labels:pieLabels,datasets:[{data:pieValues}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>ctx.label+': '+Number(ctx.raw||0).toLocaleString('it-IT')}}}}}));
 }
 if(active==='overview'&&window.Chart&&document.getElementById('overviewSchoolChart')){
  const cl=DATA.schoolClassification?.records||[],pt=filteredSchoolPoints(s),byId=new Map(cl.map(x=>[String(x.point_id),x])),orderKeys=['NIDO','INFANZIA','ELEMENTARI','MEDIE','SUPERIORI','Non classificati'],orderColors=['#d97706','#db2777','#16845b','#2563eb','#7c3aed','#64748b'],counts=Object.fromEntries(orderKeys.map(k=>[k,0]));
  pt.forEach(p=>{const k=(byId.get(String(p.id))?.orders||[])[0]||'Non classificati';counts[counts[k]!==undefined?k:'Non classificati']++;});
  charts.push(new Chart(document.getElementById('overviewSchoolChart'),{type:'doughnut',data:{labels:orderKeys,datasets:[{data:orderKeys.map(k=>counts[k]),backgroundColor:orderColors,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}}));
 }
 if(active==='gis') initMap();
$('#territory').textContent=(DATA.territories.quartieri.find(x=>x.id===s.quart)?.name||DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Palermo').replace(/(^|[\s-])(\p{L})/gu,(_,sep,letter)=>sep+letter.toLocaleUpperCase('it-IT'));
}
async function initTerritorialSelectors(){
 const defs=[['asc1','data/geo/circoscrizioni_palermo_2021.geojson'],['asc2','data/geo/aree_subcomunali_liv2_palermo_2021.geojson'],['asc3','data/geo/aree_subcomunali_liv3_palermo_2021.geojson'],['sections','data/geo/sezioni_palermo_2021.geojson']];
 const status=$('#gisSelectorStatus');
 await Promise.all(defs.map(async([key,url])=>{if(GEO[key])return;try{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('GeoJSON non valido');GEO[key]=data;}catch(error){console.warn('Layer territoriale non disponibile',url,error);}}));
 populateGeoSelectors();
 const missing=defs.filter(([key])=>!GEO[key]).map(([key])=>key);
 if(status)status.textContent=missing.length?'Alcuni archivi non sono disponibili: '+missing.join(', '):'Archivi territoriali ISTAT 2021 caricati. Usa i selettori per applicare l’ambito di analisi.';
 updateGisSelectionFeedback();
}
function initMap(mapId='map'){
 let el=$('#'+mapId);if(!el||!window.L)return;
 populateGisSelectors();

 if(gisMap){gisMap.remove();gisMap=null;gisImportedLayers=[];gisLayerControl=null;}
 gisMap=L.map(el).setView([38.1157,13.3615],12);
 const autoStatus=$('#'+(mapId==='map'?'gisAutoStatus':'servicesTerritoryStatus'));
 addPalermoBaseLayers(gisMap);
 const fileInput=$('#gisFile'),report=$('#gisReport');
 const palette=['#1769aa','#c05a21','#27834a','#8054a6'];
 const accepted=[];
 const officialLayers=[
  {key:'asc1',name:'Circoscrizioni ISTAT 2021 · ASC1 (8)',file:'data/geo/circoscrizioni_palermo_2021.geojson',color:'#1769aa'},
  {key:'asc2',name:'Aree subcomunali ISTAT 2021 · ASC2 (25)',file:'data/geo/aree_subcomunali_liv2_palermo_2021.geojson',color:'#c05a21'},
  {key:'asc3',name:'Aree subcomunali · ASC3 (55)',file:'data/geo/aree_subcomunali_liv3_palermo_2021.geojson',color:'#27834a'},
  {key:'sections',name:'Sezioni censuarie ISTAT 2021 (3.600)',file:'data/geo/sezioni_palermo_2021.geojson',color:'#8054a6'}
 ];
 Promise.all(officialLayers.map(async item=>{
  try{
   let data=GEO[item.key];
   if(!data){const response=await fetch(item.file,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);data=await response.json();}
   if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('GeoJSON non valido');
   GEO[item.key]=data;
   const layer=L.geoJSON(data,{style:()=>({color:item.color,weight:1.2,fillOpacity:.035}),onEachFeature:(feature,featureLayer)=>{
    const props=feature.properties||{};
    const label=props.DEN_ASC1||props.DEN_ASC2||props.DEN_ASC3||props.SEZ21||props.SEZ21_ID||'';
    const details=[['Popolazione censuaria 2021',props.POP21],['Famiglie',props.FAM21],['Abitazioni',props.ABI21],['Edifici',props.EDI21]].filter(x=>x[1]!==undefined&&x[1]!==null).map(x=>'<br><small>'+x[0]+': '+Number(x[1]).toLocaleString('it-IT')+'</small>').join('');
    if(label!=='' )featureLayer.bindPopup('<strong>'+String(label).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</strong>'+details+'<br><small>Fai clic sul poligono per applicare la selezione.</small>');
    featureLayer.on('click',()=>{const mapLevel=item.key==='sections'?'section':item.key,codeKey={asc1:'COM_ASC1',asc2:'COM_ASC2',asc3:'COM_ASC3',sections:'SEZ21_ID'}[item.key],code=props[codeKey];if(code!==undefined&&code!==null)syncGeoSelection(mapLevel,String(code));});
    const areaName=item.key==='asc1'?props.DEN_ASC1:item.key==='asc2'?props.DEN_ASC2:item.key==='asc3'?props.DEN_ASC3:'';
    if(areaName)featureLayer.bindTooltip(String(areaName).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),{permanent:true,direction:'center',className:'gis-polygon-label',opacity:1});
   }});
   layer.eachLayer(featureLayer=>{featureLayer.on('mouseover',()=>featureLayer.setStyle?.({weight:3,fillOpacity:.16}));featureLayer.on('mouseout',()=>applyGisSelectedStyle());});
   if(item.key==='asc1')layer.addTo(gisMap);
   gisImportedLayers.push({name:item.name,key:item.key,layer,featureLayers:layer.getLayers()});
   applyGisSelectionVisibility();
   populateGeoSelectors();
   return item.name+': '+data.features.length+' elementi caricati';
  }catch(error){return item.name+': errore di caricamento ('+error.message+')';}
 })).then(async results=>{
  if(mapId==='map'){
   try{
    const [pointResponse,censusResponse,classificationResponse]=await Promise.all([
     fetch('data/scuole_points.json',{cache:'no-store'}),
     fetch('data/censimento_scolastico_v81.json',{cache:'no-store'}),
     fetch('data/scuole_classificazione.json',{cache:'no-store'})
    ]);
    if(!pointResponse.ok||!censusResponse.ok||!classificationResponse.ok)throw new Error('Archivi scolastici non disponibili');
    const [schoolPoints,schoolCensus,schoolClassification]=await Promise.all([pointResponse.json(),censusResponse.json(),classificationResponse.json()]);
    const censusById=new Map((schoolCensus.records||[]).map(x=>[String(x.id),x]));
    const orderById=new Map((schoolClassification.records||[]).map(x=>[String(x.point_id),x.orders||[]]));
    const schoolLayer=L.layerGroup(),schoolFeatureLayers=[];
    const influenceLayers={
     infant:L.layerGroup(),
     primary:L.layerGroup(),
     secondary:L.layerGroup()
    };
    const orderColors={NIDO:'#d97706',INFANZIA:'#db2777',ELEMENTARI:'#16845b',MEDIE:'#2563eb',SUPERIORI:'#7c3aed'};
    const radii=[
     {key:'infant',orders:['NIDO','INFANZIA'],radius:300,label:'Nidi e infanzia',color:'#db2777'},
     {key:'primary',orders:['ELEMENTARI'],radius:500,label:'Primaria',color:'#16845b'},
     {key:'secondary',orders:['MEDIE'],radius:1000,label:'Secondaria',color:'#2563eb'}
    ];
    schoolPoints.forEach(point=>{
     const lat=Number(point.lat),lon=Number(point.lon);
     if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
     const record=censusById.get(String(point.id)),orders=orderById.get(String(point.id))||[];
     const out=point.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES';
     const color=out?'#dc2626':(orderColors[orders[0]]||'#64748b');
     const marker=L.circleMarker([lat,lon],{radius:5,color,fillColor:color,fillOpacity:.95,weight:1.5});
     const orderLabel=orders.join(' · ')||'Ordine non classificato';
     marker.bindPopup('<div class="school-popup"><b>'+esc(point.name)+'</b><br>'+esc(orderLabel)+'<br>'+esc(point.institution||'')+'<br>'+esc(point.address||'')+'<br><b>Stato V81:</b> '+esc(record?.classe_affidabilita_finale||'Non disponibile')+(out?'<br><b style="color:#dc2626">Fuori dai perimetri ISTAT 2021</b>':'')+'<br><b>Raggi:</b> '+(record?.bufferEligible===true?'abilitato':'non abilitato')+'</div>');
     marker._schoolPoint=point;schoolFeatureLayers.push(marker);marker.addTo(schoolLayer);
     if(record?.bufferEligible===true){
      radii.forEach(def=>{
       if(!def.orders.some(order=>orders.includes(order)))return;
       const circle=L.circle([lat,lon],{radius:def.radius,color:def.color,weight:2,opacity:.85,fillColor:def.color,fillOpacity:.10});
       circle.bindPopup('<div class="school-popup"><b>'+esc(point.name)+'</b><br>'+esc(def.label)+'<br>Raggio indicativo: '+def.radius.toLocaleString('it-IT')+' m<br><small>Buffer geometrico in linea d’aria, non bacino ufficiale né percorso pedonale.</small></div>');
       circle.bindTooltip(esc(point.name)+' · '+def.radius.toLocaleString('it-IT')+' m');
       circle.addTo(influenceLayers[def.key]);
      });
     }
    });
    schoolLayer.addTo(gisMap);
    gisImportedLayers.push({name:'Sedi scolastiche georeferenziate · '+schoolFeatureLayers.length+' punti',key:'schools',layer:schoolLayer,featureLayers:schoolFeatureLayers});
    const bufferNames={infant:'Raggi d’influenza · Nidi e infanzia · 300 m',primary:'Raggi d’influenza · Primaria · 500 m',secondary:'Raggi d’influenza · Secondaria · 1.000 m'};
    Object.entries(influenceLayers).forEach(([key,layer])=>{
     layer.addTo(gisMap);
     gisImportedLayers.push({name:bufferNames[key],key:'school-buffer-'+key,layer,featureLayers:layer.getLayers()});
    });
    results.push('Sedi scolastiche: '+schoolFeatureLayers.length+' punti caricati');
    results.push('Raggi d’influenza: '+Object.values(influenceLayers).reduce((n,layer)=>n+layer.getLayers().length,0)+' geometrie sui soli punti abilitati V81');
   }catch(error){results.push('Sedi scolastiche e raggi: errore di caricamento ('+error.message+')');}
  }
  if(mapId==='servicesTerritoryMap'){
   const serviceCategoryStyles={IC:{color:'#d97706',label:'Interesse comune'},V:{color:'#16845b',label:'Verde e sport'},P:{color:'#475569',label:'Parcheggi'},F:{color:'#7c3aed',label:'Interesse generale'}};
   loadPublicFacilities().then(facilities=>{
    const groups={IC:L.layerGroup(),V:L.layerGroup(),P:L.layerGroup(),F:L.layerGroup()};
    facilities.forEach(item=>{
     const style=serviceCategoryStyles[item.category];if(!style)return;
     const marker=L.circleMarker([item.lat,item.lon],{radius:6,color:style.color,fillColor:style.color,fillOpacity:.88,weight:1.5});
     marker.bindPopup('<div class="school-popup"><b>'+esc(item.name)+'</b><br>'+esc(style.label)+'<br>'+esc(item.subtype||'')+(item.address?'<br>'+esc(item.address):'')+'<br><small>Fonte: OpenStreetMap. Punto di servizio da verificare per titolarità pubblica e corrispondenza PRG.</small></div>');
     marker.addTo(groups[item.category]);
    });
    Object.entries(groups).forEach(([key,group])=>{
     gisImportedLayers.push({name:'Servizi e dotazioni · '+serviceCategoryStyles[key].label+' (OSM)',key:'service-'+key,layer:group,featureLayers:group.getLayers()});
    });
    updateControl();
    const panel=$('#servicesTerritoryLayers');
    if(panel)panel.querySelectorAll('[data-service-layer]').forEach(input=>{
     const item=gisImportedLayers.find(x=>x.key===input.dataset.serviceLayer);
     if(!item)return;
     if(input.checked)item.layer.addTo(gisMap);
     input.onchange=()=>{if(input.checked)item.layer.addTo(gisMap);else gisMap.removeLayer(item.layer);};
    });
    const auto=$('#servicesTerritoryStatus');if(auto)auto.textContent+=' · '+facilities.length+' servizi pubblici mappati da OSM, distinti per categoria.';
   }).catch(error=>{const auto=$('#servicesTerritoryStatus');if(auto)auto.textContent+=' · Archivio servizi OSM non disponibile: '+String(error.message||error);});
  }
  if(mapId==='servicesTerritoryMap'){
   const points=DATA.schoolPoints||[];
   const classes=DATA.schoolClassification?.records||[];
   const census=DATA.schoolCensus?.records||[];
   const classById=new Map(classes.map(x=>[String(x.point_id),x]));
   const censusById=new Map(census.map(x=>[String(x.id),x]));
   const colors={NIDO:'#d97706',INFANZIA:'#db2777',ELEMENTARI:'#16845b',MEDIE:'#2563eb',SUPERIORI:'#7c3aed'};
   const schoolLayer=L.layerGroup();
   const influenceLayers={infant:L.layerGroup(),primary:L.layerGroup(),secondary:L.layerGroup()};
   const radiusDefs=[
    {key:'infant',orders:['NIDO','INFANZIA'],radius:300,label:'Nidi e infanzia',color:'#db2777'},
    {key:'primary',orders:['ELEMENTARI'],radius:500,label:'Primaria',color:'#16845b'},
    {key:'secondary',orders:['MEDIE'],radius:1000,label:'Secondaria',color:'#2563eb'}
   ];
   let schoolCount=0;
   points.forEach(point=>{
    const lat=Number(point.lat),lon=Number(point.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    schoolCount++;
    const classification=classById.get(String(point.id))||{};
    const record=censusById.get(String(point.id))||{};
    const orders=Array.isArray(classification.orders)?classification.orders:[];
    const order=orders[0]||'';
    const outside=point.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES';
    const color=outside?'#dc2626':(colors[order]||'#64748b');
    const marker=L.circleMarker([lat,lon],{radius:5,color,fillColor:color,fillOpacity:.9,weight:1.5});
    const safe=value=>esc(value===undefined||value===null||value===''?'N.D.':String(value));
    marker.bindPopup('<div class="school-popup"><strong>'+safe(point.name)+'</strong><br>'+safe(orders.join(' · ')||'Ordine non classificato')+'<br>'+safe(point.institution)+'<br>'+safe(point.address)+'<br><b>Stato V81:</b> '+safe(record.classe_affidabilita_finale)+'<br><b>Raggi d’influenza:</b> '+(record.bufferEligible===true?'abilitato':'non abilitato')+(outside?'<br><b style="color:#dc2626">Fuori dai perimetri ISTAT 2021</b>':'')+'</div>');
    marker.addTo(schoolLayer);
    if(record.bufferEligible===true){
     radiusDefs.forEach(def=>{
      if(!def.orders.some(x=>orders.includes(x)))return;
      const circle=L.circle([lat,lon],{radius:def.radius,color:def.color,weight:2,opacity:.85,fillColor:def.color,fillOpacity:.10});
      circle.bindPopup('<div class="school-popup"><strong>'+safe(point.name)+'</strong><br>'+def.label+' · raggio indicativo '+def.radius.toLocaleString('it-IT')+' m<br><small>Buffer geometrico in linea d’aria, non bacino ufficiale né percorso pedonale.</small></div>');
      circle.bindTooltip(safe(point.name)+' · '+def.radius.toLocaleString('it-IT')+' m');
      circle.addTo(influenceLayers[def.key]);
     });
    }
   });
   schoolLayer.addTo(gisMap);
   gisImportedLayers.push({name:'Sedi scolastiche georeferenziate V81 · '+schoolCount,key:'schools',layer:schoolLayer,featureLayers:schoolLayer.getLayers()});
   const radiusNames={infant:'Raggi d’influenza · Nidi e infanzia · 300 m',primary:'Raggi d’influenza · Primaria · 500 m',secondary:'Raggi d’influenza · Secondaria · 1.000 m'};
   Object.entries(influenceLayers).forEach(([key,layer])=>{
    layer.addTo(gisMap);
    gisImportedLayers.push({name:radiusNames[key],key:'school-buffer-'+key,layer,featureLayers:layer.getLayers()});
   });
   results.push('Sedi scolastiche: '+schoolCount+' punti caricati');
   results.push('Raggi d’influenza: '+Object.values(influenceLayers).reduce((n,layer)=>n+layer.getLayers().length,0)+' geometrie abilitate V81');
  }
  if(mapId==='map'){
   try{
    const response=await fetch('data/geo/sedi_circoscrizionali.geojson',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const offices=await response.json();
    const officeLayer=L.geoJSON(offices,{
     pointToLayer:(feature,latlng)=>L.marker(latlng,{icon:L.divIcon({className:'circ-office-marker',html:'<span>'+String(feature.properties?.number||'')+'</span>',iconSize:[30,30],iconAnchor:[15,15]})}),
     onEachFeature:(feature,layer)=>{
      const p=feature.properties||{};
      layer.bindPopup('<div class="school-popup"><strong>'+esc(p.name||'Sede circoscrizionale')+'</strong><br>'+esc(p.address||'')+'<br><small>Coordinate: '+Number(feature.geometry.coordinates[1]).toFixed(6)+', '+Number(feature.geometry.coordinates[0]).toFixed(6)+'</small><br><a href="'+esc(p.source_url||'https://www.comune.palermo.it/circoscrizione-consiglio.php')+'" target="_blank" rel="noopener">Scheda ufficiale del Comune</a></div>');
      layer.bindTooltip(String(p.number||'')+' · '+String(p.short_name||'Circoscrizione'),{direction:'top',offset:[0,-14]});
     }
    });
    officeLayer.addTo(gisMap);
    gisImportedLayers.push({name:'Sedi amministrative delle 8 circoscrizioni · Comune di Palermo',key:'circ_offices',layer:officeLayer,featureLayers:officeLayer.getLayers()});
    results.push('Sedi amministrative circoscrizionali: '+officeLayer.getLayers().length+' punti caricati');
   }catch(error){results.push('Sedi circoscrizionali: errore di caricamento ('+error.message+')');}
  }
  updateControl();
  if(mapId==='servicesTerritoryMap'){
   const panel=$('#servicesTerritoryLayers');
   const byKey=new Map(gisImportedLayers.map(item=>[item.key,item]));
   panel?.querySelectorAll('[data-service-layer]').forEach(input=>{
    const item=byKey.get(input.dataset.serviceLayer);if(!item)return;
    if(input.checked&&!gisMap.hasLayer(item.layer))item.layer.addTo(gisMap);
    if(!input.checked&&gisMap.hasLayer(item.layer))gisMap.removeLayer(item.layer);
    input.onchange=()=>{if(input.checked)item.layer.addTo(gisMap);else gisMap.removeLayer(item.layer);};
   });
  }
  const group=L.featureGroup(gisImportedLayers.map(x=>x.layer));
  if(gisImportedLayers.length){const bounds=group.getBounds();if(bounds.isValid())gisMap.fitBounds(bounds,{padding:[18,18]});}
  applyGisSelectedStyle();focusGeneralSelection();
  setTimeout(()=>gisMap&&gisMap.invalidateSize(true),180);
  if(autoStatus)autoStatus.textContent=results.join(' · ')+(gisImportedLayers.length?' · Usa i selettori sopra la mappa per attivare i livelli.':' · Nessun layer ufficiale caricato.');
 });

 const updateControl=()=>{
  if(gisLayerControl){gisMap.removeControl(gisLayerControl);gisLayerControl=null;}
  const overlays={};
  gisImportedLayers.slice().sort((a,b)=>{const ai=officialLayers.findIndex(x=>x.key===a.key),bi=officialLayers.findIndex(x=>x.key===b.key);return (ai<0?999:ai)-(bi<0?999:bi);}).forEach((item)=>{overlays[item.name]=item.layer;});
  if(gisImportedLayers.length)gisLayerControl=L.control.layers(null,overlays,{collapsed:false}).addTo(gisMap);
 };
 const reset=()=>{
  gisImportedLayers.forEach(item=>{if(gisMap.hasLayer(item.layer))gisMap.removeLayer(item.layer);});
  gisImportedLayers=[];accepted.length=0;
  if(gisLayerControl){gisMap.removeControl(gisLayerControl);gisLayerControl=null;}
  if(fileInput)fileInput.value='';
  if(report)report.textContent='Layer rimossi. Nessun dato cartografico locale attivo.';
  const dl=$('#gisReportDownload');if(dl)dl.remove();
  gisMap.setView([38.1157,13.3615],12);
 };
 if(fileInput&&report){
  fileInput.addEventListener('change',()=>{
   const files=Array.from(fileInput.files||[]);
   if(!files.length)return;
   report.textContent='Lettura e controllo preliminare di '+files.length+' file…';
   accepted.length=0;
   let pending=files.length;
   const finish=()=>{
    pending--;
    if(pending!==0)return;
    report.textContent=accepted.map(x=>x.report).join('\n\n')+
     (accepted.length?'\n\nLayer caricati nella mappa. Usa il selettore in alto a destra per mostrare o nascondere ciascun livello.':'\n\nNessun layer visualizzato: i controlli preliminari hanno rilevato anomalie o i file non sono leggibili.');
    if(gisImportedLayers.length){
     updateControl();
     const group=L.featureGroup(gisImportedLayers.map(x=>x.layer));
     const bounds=group.getBounds();if(bounds.isValid())gisMap.fitBounds(bounds,{padding:[18,18]});
    }
    let dl=$('#gisReportDownload');
    if(!dl){dl=document.createElement('button');dl.id='gisReportDownload';dl.type='button';dl.className='secondary-button';dl.textContent='Scarica rapporto di controllo';report.insertAdjacentElement('afterend',dl);}
    dl.onclick=()=>{
     const blob=new Blob([report.textContent],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);
     const link=document.createElement('a');link.href=url;link.download='rapporto-controllo-cartografia-palermo.txt';link.click();URL.revokeObjectURL(url);
    };
   };
   files.forEach((file,index)=>{
    const reader=new FileReader();
    reader.onload=()=>{
     try{
      const data=JSON.parse(reader.result);
      if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Il file deve contenere una FeatureCollection GeoJSON.');
      let empty=0,invalid=0,positions=0,outside=0,badRings=0,unknownGeometry=0,missingProperties=0;
      const ids=new Set();let duplicateIds=0;
      const scanCoordinates=value=>{
       if(!Array.isArray(value))return;
       if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number'){
        positions++;
        if(!value.every(n=>typeof n==='number'&&Number.isFinite(n)))invalid++;
        else if(value[0]<13.0||value[0]>13.8||value[1]<37.9||value[1]>38.4)outside++;
        return;
       }
       value.forEach(scanCoordinates);
      };
      const checkRings=rings=>{
       if(!Array.isArray(rings)||!rings.length){badRings++;return;}
       rings.forEach(r=>{
        if(!Array.isArray(r)||r.length<4){badRings++;return;}
        const first=r[0],last=r[r.length-1];
        if(!Array.isArray(first)||!Array.isArray(last)||first[0]!==last[0]||first[1]!==last[1])badRings++;
       });
      };
      const scanGeometry=g=>{
       if(!g||typeof g!=='object'){empty++;return;}
       if(g.type==='GeometryCollection'){
        if(!Array.isArray(g.geometries)||!g.geometries.length){empty++;return;}
        g.geometries.forEach(scanGeometry);return;
       }
       if(!['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon'].includes(g.type)){unknownGeometry++;return;}
       if(!Array.isArray(g.coordinates)||!g.coordinates.length){empty++;return;}
       if(g.type==='Polygon')checkRings(g.coordinates);
       if(g.type==='MultiPolygon')g.coordinates.forEach(checkRings);
       scanCoordinates(g.coordinates);
      };
      data.features.forEach(feature=>{
       if(!feature||feature.type!=='Feature'||!feature.geometry){empty++;return;}
       if(!feature.properties||typeof feature.properties!=='object')missingProperties++;
       if(feature.id!==undefined){const key=String(feature.id);if(ids.has(key))duplicateIds++;ids.add(key);}
       scanGeometry(feature.geometry);
      });
      const problems=empty+invalid+outside+badRings+unknownGeometry+duplicateIds;
      const plausible=positions>0&&problems===0;
      const crs=data.crs?.properties?.name||'non dichiarato (GeoJSON standard: WGS 84 / CRS84)';
      const reportText=[
       'CONTROLLO PRELIMINARE GEOJSON',
       'File: '+file.name,
       'Feature: '+data.features.length,
       'Coordinate esaminate: '+positions,
       'Geometrie mancanti o vuote: '+empty,
       'Coordinate non valide: '+invalid,
       'Coordinate fuori dall’area indicativa di Palermo: '+outside,
       'Anelli poligonali non chiusi o con meno di 4 vertici: '+badRings,
       'Tipi geometrici non riconosciuti: '+unknownGeometry,
       'Feature senza proprietà: '+missingProperties,
       'Identificativi duplicati: '+duplicateIds,
       'CRS dichiarato: '+crs,
       'CRS: non verificato automaticamente; controllare EPSG:4326 in QGIS.',
       'ESITO: '+(plausible?'controlli formali preliminari superati. Non equivale a validazione topologica, verifica del CRS o certificazione della fonte.':'controlli preliminari non superati. Layer non visualizzato.')
      ].join('\n');
      if(plausible){
       const layer=L.geoJSON(data,{style:()=>({color:palette[index%palette.length],weight:1.5,fillOpacity:.10}),pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:4,color:palette[index%palette.length],fillOpacity:.7})});
       layer.addTo(gisMap);
       gisImportedLayers.push({name:file.name,layer});
      }
      accepted[index]={report:reportText};
     }catch(err){
      accepted[index]={report:'FILE NON LEGGIBILE\nFile: '+file.name+'\nErrore: '+err.message};
     }
     finish();
    };
    reader.onerror=()=>{accepted[index]={report:'ERRORE DI LETTURA\nFile: '+file.name};finish();};
    reader.readAsText(file);
   });
  });
  const resetButton=document.createElement('button');resetButton.type='button';resetButton.className='secondary-button';resetButton.textContent='Rimuovi tutti i layer';
  resetButton.addEventListener('click',reset);
  report.insertAdjacentElement('afterend',resetButton);
 }
}

function addPalermoBaseLayers(map){
 const streets=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'});
 const ortho=L.tileLayer('https://map.sitr.regione.sicilia.it/gis/rest/services/ortofoto/ortofoto_2022_20cm_sicilia/ImageServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'&copy; Regione Siciliana · SITR · Ortofoto 2022 (20 cm)'});
 streets.addTo(map);
 L.control.layers({'OpenStreetMap':streets,'Ortofoto Regione Siciliana 2022 · 20 cm':ortho},null,{collapsed:true}).addTo(map);
}

function initStandardSchoolMap(){
 const levelSelect=$('#standardTerritorialLevel');if(levelSelect)levelSelect.onchange=()=>loadStandardTerritorialLevel(levelSelect.value);
 const el=$('#standardSchoolMap');if(!el||!window.L)return;
 const pts=DATA.schoolPoints||[],records=DATA.schoolClassification?.records||[],census=DATA.schoolCensus?.records||[],verification=DATA.schoolSiteVerification?.records||[];
 const byId=new Map(records.map(x=>[String(x.point_id),x])),censusById=new Map(census.map(x=>[String(x.id),x])),verificationById=new Map(verification.map(x=>[String(x.pointId),x]));
 const info={NIDO:{label:'Nido · S1',radius:500,color:'#d97706'},INFANZIA:{label:'Infanzia · S2',radius:500,color:'#db2777'},ELEMENTARI:{label:'Primaria · S2',radius:800,color:'#16845b'},MEDIE:{label:'Secondaria I grado · S2',radius:1000,color:'#2563eb'},SUPERIORI:{label:'Secondaria II grado · F1',radius:1500,color:'#7c3aed'}};
 const g=selected(),order=$('#stdSchoolOrder'),mode=$('#stdBufferMode'),status=$('#standardSchoolStatus');
 const bounds=[38.00,13.20,38.25,13.50];
 const belongs=p=>{
  if(g.quart){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(g.asc2||quartiereAsc2Code(DATA.territories.quartieri.find(q=>q.id===g.quart))));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.circ){const f=GEO.asc1?.features?.find(x=>String(x.properties?.COD_ASC1)===String(g.circ).replace('c',''));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.asc2){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(g.asc2));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.asc3){const f=GEO.asc3?.features?.find(x=>String(x.properties?.COM_ASC3)===String(g.asc3));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.section){const f=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(g.section));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  return true;
 };
 const map=L.map(el).setView([38.1157,13.3615],11);
 const buffers=L.layerGroup().addTo(map),markers=L.layerGroup().addTo(map);
 const prgGroups={
  IC:L.layerGroup(),V:L.layerGroup(),P:L.layerGroup(),F:L.layerGroup()
 };
 const prgStyles={IC:{color:'#d97706',label:'IC · Interesse comune'},V:{color:'#16845b',label:'V · Verde e sport'},P:{color:'#475569',label:'P · Parcheggi'},F:{color:'#7c3aed',label:'F · Interesse generale'}};
 const prgZoneGroups={S:L.layerGroup(),IC:L.layerGroup(),V:L.layerGroup(),P:L.layerGroup(),F:L.layerGroup()};
 const prgConstraintGroups={areali:L.layerGroup(),lineari:L.layerGroup()};
 const prgOfficialZoning=L.layerGroup();
 const prgZoneStyles={S:{color:'#2563eb',label:'S · Istruzione'},IC:{color:'#d97706',label:'IC · Interesse comune'},V:{color:'#16845b',label:'V · Verde pubblico'},P:{color:'#475569',label:'P · Parcheggi'},F:{color:'#7c3aed',label:'F · Interesse generale'}};
 const prgSummary={};
 const loadPrgZones=async()=>{
  try{
   const response=await fetch('data/geo/prg_standard_2004.geojson?v=20261117',{cache:'force-cache'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const fc=await response.json();
   if(fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||!fc.features.length)throw new Error('GeoJSON vuoto o non valido');
   Object.values(prgZoneGroups).forEach(x=>x.clearLayers());
   fc.features.forEach(feature=>{
    const p=feature.properties||{},group=p.PRG_GROUP,style=prgZoneStyles[group];if(!style||!feature.geometry)return;
    const layer=L.geoJSON(feature,{style:{color:style.color,weight:1.15,fillColor:style.color,fillOpacity:.19},onEachFeature:(f,l)=>{
     const q=f.properties||{};
     l.bindPopup('<div class="school-popup"><b>'+esc(q.PRG_CODE||style.label)+'</b><br>'+esc(q.PRG_DESCRIPTION||style.label)+'<br><b>Categoria:</b> '+esc(style.label)+'<br><b>Superficie geometrica:</b> '+Number(q.AREA_M2||0).toLocaleString('it-IT',{maximumFractionDigits:0})+' m²<br><b>ID PRG:</b> '+esc(q.PRG_ID||'')+'<br><small>Variante Generale PRG, DCC 7/2004. Superficie geometrica calcolata sulla geometria pubblicata; da leggere con NTA, tavole e prescrizioni.</small></div>');
    }}).addTo(prgZoneGroups[group]);
    const g=prgSummary[group]||(prgSummary[group]={features:0,area_m2:0,codes:{}});
    g.features++;g.area_m2+=Number(p.AREA_M2)||0;g.codes[p.PRG_CODE]=(g.codes[p.PRG_CODE]||0)+1;
   });
   loadStandardTerritorialStats(fc);
   const order=['S','IC','V','P','F'];
   const stats=order.map(k=>{const g=prgSummary[k];return g?prgZoneStyles[k].label+': '+Number(g.features).toLocaleString('it-IT')+' poligoni, '+(g.area_m2/10000).toLocaleString('it-IT',{maximumFractionDigits:2})+' ha':'';}).filter(Boolean);
   if(!map.hasLayer(prgZoneGroups.S))prgZoneGroups.S.addTo(map);
   const panel=$('#standardPrgStats');
   if(panel)panel.innerHTML='<div class="grid standards-kpis">'+order.map(k=>{const g=prgSummary[k];return g?'<div class="card"><span class="muted">'+esc(prgZoneStyles[k].label)+'</span><div class="metric">'+(g.area_m2/10000).toLocaleString('it-IT',{maximumFractionDigits:2})+' <small>ha</small></div><small class="muted">'+g.features+' poligoni PRG</small></div>':'';}).join('')+'</div><p class="muted">Superfici geometriche lorde dei poligoni per gruppo; i codici combinati e le sovrapposizioni sono mantenuti come negli elaborati sorgente. Non sommare automaticamente le categorie né confondere F con gli standard ordinari dell’art. 3 del D.M. 1444/1968.</p>';
   const prgStatus=$('#standardPrgStatus');
   if(prgStatus)prgStatus.textContent='Layer tematico PRG 2004 caricato: '+Number(fc.features.length).toLocaleString('it-IT')+' poligoni, rielaborazione comunitaria derivata dal dataset comunale 320, classificata nei gruppi S/IC/V/P/F. Le statistiche aggregate usano questo layer tematico; la zonizzazione integrale ufficiale (5.879 geometrie) è disponibile come overlay separato di consultazione e non viene sommata automaticamente alle statistiche. I vincoli del dataset 321 sono layer distinti. Le superfici geometriche non attestano attuazione, proprietà o disponibilità effettiva.';
   try{
    const qaResponse=await fetch('data/geo/qa_prg_standard_2004.json?v=20261117-topology',{cache:'no-cache'});
    if(!qaResponse.ok)throw new Error('HTTP '+qaResponse.status);
    const qa=await qaResponse.json();
    if(prgStatus)prgStatus.textContent+=' QA geometrico: '+qa.invalid_geometry_count+' geometrie invalide, '+qa.duplicate_geometry_count+' coincidenze esatte e '+qa.overlap_pair_count_over_1m2+' coppie sovrapposte oltre 1 m². Le anomalie sono diagnostiche e richiedono verifica sulle tavole/NTA; non sono state corrette automaticamente.';
   }catch(qaError){
    if(prgStatus)prgStatus.textContent+=' Rapporto QA topologico non disponibile: '+String(qaError.message||qaError);
   }
  }catch(err){
   const prgStatus=$('#standardPrgStatus');if(prgStatus)prgStatus.textContent='Errore nel caricamento della zonizzazione PRG: '+String(err.message||err);
  }
 };

 const loadPrgOfficialZoning=async()=>{
  const statusNode=$('#standardPrgStatus');
  try{
   const response=await fetch('data/geo/prg/prg_320_vg_zonizzazione.geojson?v=20261117-official',{cache:'no-cache'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const fc=await response.json();
   if(fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||!fc.features.length)throw new Error('GeoJSON vuoto/non valido');
   const palette={S:'#2563eb',IC:'#d97706',V:'#16845b',P:'#475569',F:'#7c3aed',M:'#64748b',ALT:'#94a3b8'};
   const category=code=>{
    const z=String(code||'').toUpperCase();
    const found=[];
    if(/S\d/.test(z))found.push('S');
    if(/IC\d/.test(z))found.push('IC');
    if(/V\d|^V$|^VS/.test(z))found.push('V');
    if(/F\d/.test(z))found.push('F');
    if(z==='PARCHEGGI')found.push('P');
    return found.length===1?found[0]:found.length>1?'M':'ALT';
   };
   const layer=L.geoJSON(fc,{style:feature=>{
    const group=category(feature.properties?.ZTO),color=palette[group];
    return {color,fillColor:color,weight:.75,opacity:.8,fillOpacity:.12};
   },onEachFeature:(feature,featureLayer)=>{
    const p=feature.properties||{},z=String(p.ZTO||'Non classificata'),group=category(z);
    const names={S:'Istruzione (S)',IC:'Interesse comune (IC)',V:'Verde/attrezzature sportive (V)',P:'Parcheggi',F:'Interesse generale (F)',M:'Codice combinato, da leggere nelle NTA',ALT:'Altra zonizzazione'};
    const rows=Object.entries(p).filter(([k,v])=>v!==null&&v!==''&&typeof v!=='object').slice(0,16);
    const body=rows.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(String(v))+'</td></tr>').join('');
    featureLayer.bindPopup('<div class="school-popup"><b>PRG · '+esc(z)+'</b><br>'+esc(names[group])+'<div class="table-wrap"><table>'+body+'</table></div><small>Fonte: Comune di Palermo, dataset 320, Variante Generale PRG (DCC 7/2004). La classificazione cartografica non sostituisce NTA, tavole e atti successivi. Le zone F non sono automaticamente standard ex art. 3 D.M. 1444/1968.</small></div>');
   }});
   if(!layer.getLayers().length)throw new Error('Nessuna geometria');
   prgOfficialZoning.clearLayers();prgOfficialZoning.addLayer(layer);
   if(statusNode)statusNode.textContent+=' Zonizzazione integrale dataset 320 disponibile: '+fc.features.length.toLocaleString('it-IT')+' geometrie, attivabile dal controllo mappa; i codici combinati sono distinti e non riclassificati automaticamente.';
  }catch(err){if(statusNode)statusNode.textContent+=' Zonizzazione integrale dataset 320 non caricata: '+String(err.message||err);}
 };
 const loadPrgConstraints=async()=>{
  const specs=[
   {key:'areali',file:'data/geo/prg/prg_vincoli_areali.geojson',label:'Vincoli areali · Variante Generale 2004',color:'#0f766e',fill:'#5eead4',weight:1.2},
   {key:'lineari',file:'data/geo/prg/prg_vincoli_lineari.geojson',label:'Vincoli lineari · Variante Generale 2004',color:'#be123c',fill:'#fb7185',weight:2.5},
   
  ];
  const loaded=[],errors=[];
  for(const spec of specs){
   try{
    const response=await fetch(spec.file+'?v=20261117-vincoli',{cache:'no-cache'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const fc=await response.json();
    if(fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||!fc.features.length)throw new Error('GeoJSON vuoto/non valido');
    const layer=L.geoJSON(fc,{style:()=>({color:spec.color,fillColor:spec.fill,weight:spec.weight,fillOpacity:spec.key==='areali'?.18:0.12,dashArray:spec.key==='lineari'?'6 4':null}),pointToLayer:(feature,ll)=>L.circleMarker(ll,{radius:5,color:spec.color,fillColor:spec.fill,fillOpacity:.9,weight:1.5}),onEachFeature:(feature,featureLayer)=>{
     const p=feature.properties||{},rows=Object.entries(p).filter(([k,v])=>v!==null&&v!==''&&typeof v!=='object').slice(0,20);
     const body=rows.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(String(v))+'</td></tr>').join('');
     featureLayer.bindPopup('<div class="school-popup"><b>'+esc(spec.label)+'</b><div class="table-wrap"><table>'+body+'</table></div><small>Fonte: Comune di Palermo, dataset 321, Variante Generale PRG con presa d’atto DCC 7/2004. Verificare eventuali varianti e prescrizioni successive.</small></div>');
    }});
    if(!layer.getLayers().length)throw new Error('Nessuna geometria');
    prgConstraintGroups[spec.key].clearLayers();prgConstraintGroups[spec.key].addLayer(layer);
    loaded.push(spec.label+' ('+fc.features.length+' geometrie)');
   }catch(err){errors.push(spec.label+': '+String(err.message||err));}
  }
  const statusNode=$('#standardPrgStatus');
  if(statusNode){
   const note=loaded.length?' Vincoli caricati separatamente: '+loaded.join('; ')+'.':' Dataset 321 non disponibile: i vincoli non vengono simulati.';
   statusNode.textContent+=note+(errors.length?' Avvisi di caricamento: '+errors.join(' | '):'');
  }
 };

 let amenitiesCount=0,amenitiesStatus='Caricamento delle attrezzature pubbliche da OpenStreetMap…';
 const classify=e=>{
  const t=e.tags||{},a=t.amenity||'',l=t.leisure||'',o=t.office||'',tour=t.tourism||'',sport=t.sport||'';
  if(a==='parking')return 'P';
  if(a==='hospital'||a==='university'||a==='college'||a==='stadium'||tour==='university')return 'F';
  if(a==='place_of_worship'||a==='community_centre'||a==='townhall'||a==='library'||a==='theatre'||a==='post_office'||a==='police'||a==='fire_station'||a==='social_facility'||a==='clinic'||a==='doctors'||a==='nursing_home'||a==='marketplace'||o==='government')return 'IC';
  if(l==='park'||l==='playground'||l==='garden'||l==='sports_centre'||l==='pitch'||l==='stadium'||(sport&&l==='sports_centre'))return 'V';
  return '';
 };
 const coords=e=>{if(Number.isFinite(e.lat)&&Number.isFinite(e.lon))return [e.lat,e.lon];if(e.center&&Number.isFinite(e.center.lat)&&Number.isFinite(e.center.lon))return [e.center.lat,e.center.lon];return null;};
 const addAmenities=elements=>{
  window.__stdAmenities=elements;
  Object.values(prgGroups).forEach(x=>x.clearLayers());let count=0;
  elements.forEach(e=>{
   const category=classify(e),ll=coords(e);if(!category||!ll)return;
   const point={lat:ll[0],lon:ll[1]};if(!belongs(point))return;
   const tags=e.tags||{},name=tags.name||tags['name:it']||tags.amenity||tags.leisure||tags.office||'Attrezzatura senza denominazione';
   const subtype=tags.amenity||tags.leisure||tags.office||tags.tourism||'';
   const marker=L.circleMarker(ll,{radius:6,color:prgStyles[category].color,fillColor:prgStyles[category].color,fillOpacity:.88,weight:1.5});
   marker.bindPopup('<div class="school-popup"><b>'+esc(name)+'</b><br>'+esc(prgStyles[category].label)+'<br>Tipologia OSM: '+esc(subtype)+(tags['addr:street']?'<br>'+esc(tags['addr:street']+' '+(tags['addr:housenumber']||'')):'')+'<br><small>Localizzazione OpenStreetMap. Corrispondenza funzionale provvisoria con il PRG, non attestazione della zona urbanistica, della proprietà pubblica o della conformità.</small></div>');
   marker.addTo(prgGroups[category]);count++;
  });
  amenitiesCount=count;
  status.textContent=status.textContent.split(' | ')[0]+' | '+amenitiesCount+' luoghi/servizi OSM visibili. Corrispondenza PRG solo funzionale e provvisoria: verificare destinazione P2A/P2B, titolarità e uso.';
 };
 const loadAmenities=async()=>{
  try{
   const facilities=await loadPublicFacilities();
   const elements=facilities.map(x=>({id:x.id,lat:x.lat,lon:x.lon,tags:{...x.tags,name:x.name,amenity:x.tags.amenity,leisure:x.tags.leisure,office:x.tags.office,tourism:x.tags.tourism,'addr:street':x.tags['addr:street'],'addr:housenumber':x.tags['addr:housenumber']}}));
   addAmenities(elements);
   amenitiesStatus='Archivio condiviso OpenStreetMap caricato: '+amenitiesCount+' luoghi/servizi visibili nel territorio selezionato.';
   const prgStatus=$('#standardPrgStatus');if(prgStatus)prgStatus.textContent+=' | Archivio dei servizi condiviso con Servizi e Dotazioni.';
  }catch(err){
   amenitiesStatus='Archivio dei servizi non disponibile ('+String(err.message||err)+'). Le sedi scolastiche e la zonizzazione PRG restano consultabili.';
   status.textContent=amenitiesStatus;
  }
 };
 const draw=()=>{
  buffers.clearLayers();markers.clearLayers();
  const visible=pts.filter(p=>belongs(p)&&(!order.value||(byId.get(String(p.id))?.orders||[]).includes(order.value)));
  const eligible=visible.flatMap(p=>{const v=censusById.get(String(p.id));if(!v||v.bufferEligible!==true)return [];const os=(byId.get(String(p.id))?.orders||[]).filter(k=>info[k]&&(!order.value||order.value===k));if(!os.length)return [];const k=order.value?os[0]:os.reduce((best,next)=>info[next].radius>info[best].radius?next:best,os[0]);const point=Number.isFinite(v.latitudine)&&Number.isFinite(v.longitudine)?[v.latitudine,v.longitudine]:[p.lat,p.lon];return [{p,k,point}];});
  if(mode.value!=='points')eligible.forEach(({p,k,point})=>{const x=info[k];L.circle(point,{radius:x.radius,color:x.color,weight:1.5,fillColor:x.color,fillOpacity:.10}).bindPopup('<b>'+esc(p.name)+'</b><br>'+x.label+' · raggio indicativo '+x.radius.toLocaleString('it-IT')+' m').addTo(buffers);});
  if(mode.value!=='buffers')visible.forEach(p=>{const os=(byId.get(String(p.id))?.orders||[]).filter(k=>info[k]);const k=os[0]||'';const color=p.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES'?'#dc2626':(info[k]?.color||'#64748b');const v=censusById.get(String(p.id)),verificationRecord=verificationById.get(String(p.id));const state=v?.classe_affidabilita_finale||'Stato non classificato';const orderLabel=os.map(x=>info[x].label).join(', ')||'Ordine non classificato';const marker=L.circleMarker([p.lat,p.lon],{radius:6,color,fillColor:color,fillOpacity:.9,weight:1.5});marker.bindPopup('<div class="school-popup"><b>'+esc(p.name)+'</b><br>'+esc(orderLabel)+'<br>'+esc(p.address||'')+(p.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES'?'<br><b style="color:#dc2626">FUORI DAI PERIMETRI ISTAT 2021</b>':'')+'<br><b>Verifica:</b> '+esc(state)+'<br><b>Esito documentale:</b> '+esc(verificationRecord?.status||v?.stato_verifica_documentale||'Non disponibile')+(v?.bufferEligible===true?'<br><b>Raggio:</b> abilitato':'<br><b>Raggio:</b> non abilitato')+'<br><b>Classificazione PRG di riferimento:</b> '+(os.some(x=>['NIDO','INFANZIA','ELEMENTARI','MEDIE'].includes(x))?'S1/S2':'Da verificare')+'</div>').addTo(markers);});
  const documented=visible.filter(p=>censusById.get(String(p.id))?.classe_affidabilita_finale==='DOCUMENTATO').length;
  const outside=visible.filter(p=>p.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES').length;
  status.textContent=visible.length+' sedi scolastiche georeferenziate visualizzate su '+pts.length+' punti; '+documented+' con stato DOCUMENTATO. '+eligible.length+' sedi abilitate ai raggi d’influenza. '+outside+' punti fuori dai perimetri ISTAT 2021, evidenziati in rosso. | '+amenitiesStatus;
  if(amenitiesCount){const elements=window.__stdAmenities||[];if(elements.length)addAmenities(elements);}
 };
 const overlays={
  'Sedi scolastiche georeferenziate':markers,
  'Raggi di influenza scolastica · analisi':buffers,
  'PRG 2004 · S1/S2 Istruzione':prgZoneGroups.S,
  'PRG 2004 · IC Interesse comune':prgZoneGroups.IC,
  'PRG 2004 · V Verde pubblico':prgZoneGroups.V,
  'PRG 2004 · P Parcheggi':prgZoneGroups.P,
  'PRG 2004 · F Interesse generale':prgZoneGroups.F,
  'PRG 2004 · Zonizzazione integrale (dataset 320)':prgOfficialZoning,
  'PRG 2004 · Vincoli areali':prgConstraintGroups.areali,
  'PRG 2004 · Vincoli lineari':prgConstraintGroups.lineari,
  'Luoghi/servizi OpenStreetMap · IC':prgGroups.IC,
  'Aree verdi/sport OpenStreetMap · V':prgGroups.V,
  'Parcheggi OpenStreetMap · P':prgGroups.P,
  'Attrezzature OpenStreetMap · F':prgGroups.F
 };
 markers.addTo(map);buffers.addTo(map);
 const baseOSM=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
 const baseOrtho=L.tileLayer('https://map.sitr.regione.sicilia.it/gis/rest/services/ortofoto/ortofoto_2022_20cm_sicilia/ImageServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'Regione Siciliana · SITR'});
 L.control.layers({'OpenStreetMap':baseOSM,'Ortofoto Regione Siciliana 2022':baseOrtho},overlays,{collapsed:false,position:'topright'}).addTo(map);
 order.addEventListener('change',draw);mode.addEventListener('change',draw);draw();
 const selectedPoints=pts.filter(belongs);if(selectedPoints.length){const b=L.latLngBounds(selectedPoints.map(p=>[p.lat,p.lon]));if(b.isValid())map.fitBounds(b,{padding:[20,20],maxZoom:13});}
 window.__standardAmenitiesMap=map;window.__stdAmenities=[];
 loadPrgZones().then(()=>Promise.all([loadPrgConstraints(),loadPrgOfficialZoning()]));loadAmenities().then(()=>{});
 setTimeout(()=>map.invalidateSize(true),180);
}
async function loadSchoolArchives(){
 const defs=[['schoolPoints','data/scuole_points.json'],['schoolStatistics','data/scuole_statistics.json'],['schoolParitarie','data/scuole_paritarie.json'],['schoolClassification','data/scuole_classificazione.json'],['schoolRegister','data/anagrafica_plessi_2025_26.json'],['schoolSiteVerification','data/verifica_sedi_scolastiche_v14.json'],['schoolCensus','data/censimento_scolastico_v81.json']];
 await Promise.all(defs.map(async([k,u])=>{try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);DATA[k]=await r.json();}catch(e){console.warn('Archivio scuole non disponibile',u,e);DATA[k]=[];}}));
 if(active==='overview'||active==='schools'||active==='standards'||active==='services')render();
}
function initSchools(){
 const pts=DATA.schoolPoints||[],stats=DATA.schoolStatistics||[],pars=DATA.schoolParitarie||[],classification=DATA.schoolClassification?.records||[],register=DATA.schoolRegister?.records||[],siteVerification=DATA.schoolSiteVerification?.records||[],schoolCensus=DATA.schoolCensus?.records||[];
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const quarterAliases={'MEZZOMONREALE-V.LLA TASCA':'Mezzomonreale-Villa Tasca','MONTEGRAPPA- S.ROSALIA':'S. Rosalia-Montegrappa','PALAZZO REALE - M.TE DI PIETA':'Palazzo Reale-Monte di Pietà','RESUTTANO-S. LORENZO':'Resuttana-San Lorenzo'};
 const g=selected(),kind=$('#schoolKind'),order=$('#schoolOrder'),search=$('#schoolSearch'),rows=$('#schoolPointRows'),status=$('#schoolMapStatus');
 const orderInfo=[
  {key:'NIDO',label:'NIDO',color:'#d97706'},
  {key:'INFANZIA',label:'INFANZIA',color:'#db2777'},
  {key:'ELEMENTARI',label:'ELEMENTARI',color:'#16845b'},
  {key:'MEDIE',label:'MEDIE',color:'#2563eb'},
  {key:'SUPERIORI',label:'SUPERIORI',color:'#7c3aed'},
  
 ];
 const classificationById=new Map(classification.map(x=>[String(x.point_id),x]));
 const verificationById=new Map(siteVerification.map(x=>[String(x.pointId),x]));
 const censusById=new Map(schoolCensus.map(x=>[String(x.id),x]));
 const registerByCode=new Map(register.map(x=>[String(x.code),x]));
 const ordersOf=p=>classificationById.get(String(p.id))?.orders||[];
 const orderOf=p=>ordersOf(p)[0]||'';
 const orderLabel=k=>orderInfo.find(x=>x.key===k)?.label||'';
 const orderColor=k=>orderInfo.find(x=>x.key===k)?.color||'#64748b';
 const belongs=p=>{
  if(g.quart){const target=DATA.territories.quartieri.find(q=>q.id===g.quart)?.name;const alias=quarterAliases[p.quarter]||p.quarter;if(norm(alias)!==norm(target))return false;}
  if(g.asc2){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(g.asc2));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.circ){const f=GEO.asc1?.features?.find(x=>String(x.properties?.COD_ASC1)==String(g.circ).replace('c',''));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.asc3){const f=GEO.asc3?.features?.find(x=>String(x.properties?.COM_ASC3)===String(g.asc3));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  if(g.section){const f=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(g.section));if(!f||!pointInGeometry([p.lon,p.lat],f.geometry))return false;}
  return true;
 };
 const filtered=()=>pts.filter(p=>{const c=censusById.get(String(p.id));const state=$('#schoolVerificationFilter')?.value||'';const buffer=$('#schoolBufferFilter')?.value||'';return (!kind.value||p.kind===kind.value)&&(!order.value||ordersOf(p).includes(order.value))&&belongs(p)&&(!state||c?.classe_affidabilita_finale===state)&&(!buffer||(buffer==='eligible'?c?.bufferEligible===true:c?.bufferEligible!==true))&&(!search.value||norm([p.name,p.institution,p.address,c?.classe_affidabilita_finale,c?.ordine_scolastico_operativo,c?.codice_meccanografico_plesso_verificato,c?.nota_riconciliazione].join(' ')).includes(norm(search.value)));});
 const territoryPoints=()=>pts.filter(belongs);
 const drawTerritorySummary=()=>{const area=territoryPoints(),classified=area.filter(p=>ordersOf(p).length).length,metrics=$('#schoolTerritoryMetrics');if(!metrics)return;const countByOrder=orderInfo.map(o=>({label:o.label,count:area.filter(p=>ordersOf(p).includes(o.key)).length})).filter(x=>x.count>0);metrics.innerHTML='<div class="school-territory-head"><strong>'+area.length.toLocaleString('it-IT')+'</strong><span>sedi e punti cartografici nell’ambito selezionato</span></div><div class="school-territory-head"><strong>'+classified.toLocaleString('it-IT')+'</strong><span>punti con almeno un ordine scolastico documentato</span></div><div class="school-territory-breakdown">'+(countByOrder.map(x=>'<span>'+esc(x.label)+': <b>'+x.count.toLocaleString('it-IT')+'</b></span>').join('')||'<span>Nessun ordine scolastico documentato nell’ambito selezionato</span>')+'</div><small class="school-note">Le categorie indicano presenze per ordine e possono sovrapporsi nello stesso edificio. Il conteggio non equivale al numero di istituzioni scolastiche né agli alunni iscritti.</small>';};
 let map=null,layer=null;const markersById=new Map();let selectedPointId=null;
 const draw=()=>{
  const list=filtered();drawTerritorySummary();
  rows.innerHTML=list.map(p=>{const v=verificationById.get(String(p.id)),c=censusById.get(String(p.id));const verified=v&&v.status!=='NON_VERIFICATO';const institution=verified&&v.institutionName?v.institutionName:(c?.denominazione_istituzione_candidata||p.institution||'N.D.');const status=c?.classe_affidabilita_finale||'NON PRESENTE';const orderVerified=c?.ordine_scolastico_verificato||'DA CLASSIFICARE';const code=c?.codice_meccanografico_plesso_verificato||'N.D.';const bufferLabel=c?.bufferEligible===true?'IDONEO':'NON ABILITATO';const detail=[c?.nota_riconciliazione,c?.nota_verifica_ordine,v?.note].filter(Boolean).join(' | ');const spatialTag=p.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES'?'FUORI PERIMETRO ISTAT':'INTERNO AI PERIMETRI ISTAT';const addressMatch=p.address_matches?.map(x=>x.name).join(' · ');return '<tr data-school-id="'+esc(p.id)+'" tabindex="0" class="'+(p.id===selectedPointId?'school-row-selected':'')+'"><td>'+esc(p.name)+'</td><td><span class="school-order-tag" style="--school-color:'+orderColor(orderOf(p))+'">'+esc(orderLabel(orderOf(p)))+'</span></td><td>'+esc(p.kind)+'</td><td>'+esc(institution)+'</td><td>'+esc(p.address||'N.D.')+'</td><td>'+esc(p.quarter||'N.D.')+'</td><td>'+esc(status)+'</td><td>'+esc(spatialTag)+'</td><td>'+esc(orderVerified)+'</td><td>'+esc(code)+'</td><td title="'+esc(c?.idoneita_raggi_influenza||'')+'">'+esc(bufferLabel)+'</td><td><span class="school-verification-tag" title="'+esc(detail||'Nessuna nota disponibile')+'">'+esc(v?.status||c?.stato_verifica_documentale||'NON VERIFICATA')+'</span></td></tr>';}).join('')||'<tr><td colspan="12">Nessuna sede trovata.</td></tr>';
  const unlocated=schoolCensus.filter(x=>x.coordinate_presenti!==true&&(!search.value||norm([x.nome_sede_o_plesso,x.indirizzo,x.istituzione,x.classe_affidabilita_finale].join(' ')).includes(norm(search.value))));const unlocatedBox=$('#schoolUnlocated');if(unlocatedBox){unlocatedBox.innerHTML=unlocated.length?'<div class="card" style="margin-top:16px"><h3>Sedi censite senza coordinate · '+unlocated.length+'</h3><p class="school-note">Queste schede restano nel censimento ma non possono essere collocate sulla mappa, filtrate spazialmente o utilizzate per buffer finché non viene verificata una posizione puntuale. La ricerca testuale si applica anche a questo elenco; i filtri territoriali non sono applicabili in assenza di coordinate.</p><div class="school-table"><table><thead><tr><th>Sede</th><th>Indirizzo documentato</th><th>Istituzione</th><th>Stato V81</th><th>Nota di verifica</th><th>Fonte</th></tr></thead><tbody>'+unlocated.map(x=>'<tr><td>'+esc(x.nome_sede_o_plesso||x.id)+'</td><td>'+esc(x.indirizzo||'Non disponibile')+'</td><td>'+esc(x.denominazione_istituzione_candidata||x.istituzione||'N.D.')+'</td><td>'+esc(x.classe_affidabilita_finale||'N.D.')+'</td><td>'+esc(x.nota_riconciliazione||x.nota_verifica_documentale||'Coordinate da acquisire')+'</td><td>'+(x.url_fonte_indirizzo?'<a href="'+esc(x.url_fonte_indirizzo)+'" target="_blank" rel="noopener">Apri fonte</a>':'N.D.')+'</td></tr>').join('')+'</tbody></table></div></div>':'<p class="school-note">Nessuna sede priva di coordinate corrisponde alla ricerca.</p>';} status.textContent='Sedi mostrate: '+list.length+' su '+pts.length+'. '+list.filter(p=>p.spatial_validation?.status==='OUTSIDE_PALERMO_BOUNDARIES').length+' fuori dai perimetri ISTAT 2021 (in rosso). Censimento V81: '+schoolCensus.length+' schede, '+schoolCensus.filter(x=>x.classe_affidabilita_finale==='DOCUMENTATO').length+' documentate, '+schoolCensus.filter(x=>x.classe_affidabilita_finale==='RISERVA_O_RETTIFICA').length+' in riserva/rettifica e '+schoolCensus.filter(x=>x.classe_affidabilita_finale==='CONFERMATO_DA_RIVALIDARE').length+' da rivalidare. Idonee ai raggi: '+schoolCensus.filter(x=>x.bufferEligible===true).length+'. Raggi mostrati solo per i tre punti fisici abilitati dal censimento V81; distanze indicative in linea d’aria: 300 m nidi/infanzia, 500 m primaria, 1.000 m secondaria. Non sono bacini normativi né tempi/percorrenze pedonali.';
  if(layer){layer.clearLayers();markersById.clear();drawInfluenceBuffers(list);list.forEach(p=>{const schoolOrders=ordersOf(p);const spatialStatus=p.spatial_validation?.status;const col=spatialStatus==='OUTSIDE_PALERMO_BOUNDARIES'?'#dc2626':orderColor(schoolOrders[0]);const marker=L.circleMarker([Number(p.lat),Number(p.lon)],{pane:'overlayPane',radius:8,color:'#ffffff',weight:3,opacity:1,fillColor:col,fillOpacity:1,interactive:true});const classificationRecord=classificationById.get(String(p.id));const verification=verificationById.get(String(p.id));const censusRecord=censusById.get(String(p.id));const verifiedInstitution=verification&&verification.status!=='NON_VERIFICATO'&&verification.institutionName?verification.institutionName:(censusRecord?.denominazione_istituzione_candidata||p.institution||'Istituto non indicato');const orderText=censusRecord?.ordine_scolastico_verificato||(schoolOrders.length?schoolOrders.map(orderLabel).join(' · '):(p.kind==='Asilo nido'?'NIDO':'Classificazione non ancora documentata'));const codeText=classificationRecord?.school_codes?.length?'Codici meccanografici: '+classificationRecord.school_codes.join(', '):'';const verificationText='Stato V81: '+(censusRecord?.classe_affidabilita_finale||'non presente')+' · Ordine: '+(censusRecord?.ordine_scolastico_verificato||'da classificare')+' · Idoneità raggio: '+(censusRecord?.idoneita_raggi_influenza||'non valutata')+(censusRecord?.nota_riconciliazione?' · '+censusRecord.nota_riconciliazione:'')+(verification?' · Crosswalk V14: '+verification.status+(verification.note?' · '+verification.note:''):'');const addressMatchText=Array.isArray(p.address_matches)&&p.address_matches.length?'<br><small>Sedi associate: '+esc(p.address_matches.map(x=>x.name+' ('+(String(x.relationship||'').includes('CONFERMATA')?'edificio condiviso documentato':'indirizzo coincidente, da verificare')+')').join(' · '))+'</small>':'';const sourceUrl=(censusRecord?.fonte_verifica_documentale||verification?.sourceUrl||'').split(';')[0].trim();const sourceLink=sourceUrl?'<br><a href="'+esc(sourceUrl)+'" target="_blank" rel="noopener">Fonte della verifica</a>':'';const popup='<div class="school-popup"><strong>'+esc(p.name)+'</strong><br><b>'+esc(orderText)+'</b><br>'+esc(p.kind)+'<br>'+esc(p.address||'Indirizzo non disponibile')+addressMatchText+(spatialStatus==='OUTSIDE_PALERMO_BOUNDARIES'?'<br><b style="color:#dc2626">FUORI DAI PERIMETRI ISTAT 2021</b>':'')+'<br>'+esc(verifiedInstitution)+'<br>'+esc(p.quarter||'Quartiere non indicato')+'<br>'+esc(codeText)+'<br><small>'+esc(verificationText)+'</small>'+sourceLink+'<br><small>Fonte localizzazione: '+esc(p.source||'Comune di Palermo, KML 2021')+'</small>'+(classificationRecord?'<br><small>Classificazione: '+esc(classificationRecord.method)+' · '+esc(classificationRecord.source_year)+'</small>':'')+'</div>';marker.bindPopup(popup);marker.on('click',()=>selectSchool(p.id,false));marker.addTo(layer);markersById.set(String(p.id),marker);});}
 };
 const selectSchool=(id,fromList)=>{const p=pts.find(x=>String(x.id)===String(id));if(!p)return;selectedPointId=String(id);rows.querySelectorAll('tr[data-school-id]').forEach(row=>row.classList.toggle('school-row-selected',row.dataset.schoolId===selectedPointId));const marker=markersById.get(selectedPointId);if(marker){marker.setStyle({radius:11,color:'#111827',fillOpacity:1,weight:4});if(fromList){map.setView([p.lat,p.lon],Math.max(map.getZoom(),15),{animate:true});marker.openPopup();}else marker.openPopup();}rows.querySelector('tr[data-school-id="'+CSS.escape(selectedPointId)+'"]')?.scrollIntoView({block:'nearest',behavior:'smooth'});};
 rows.addEventListener('click',e=>{const row=e.target.closest('tr[data-school-id]');if(row)selectSchool(row.dataset.schoolId,true);});
 rows.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('tr[data-school-id]');if(row){e.preventDefault();selectSchool(row.dataset.schoolId,true);}}});
 if($('#schoolMap')&&window.L){
  map=L.map('schoolMap').setView([38.1157,13.3615],11);
  // Renderer SVG autonomo su pane dedicato, sopra i confini e sotto popup/tooltip.
  addPalermoBaseLayers(map);
  const territoryOverlays={};
  const territoryDefs=[
   {key:'asc1',name:'Circoscrizioni ASC1',color:'#1769aa',checked:true,code:'COD_ASC1',label:'DEN_ASC1'},
   {key:'asc2',name:'Quartieri ASC2',color:'#c05a21',checked:false,code:'COM_ASC2',label:'DEN_ASC2'},
   {key:'asc3',name:'UPL ASC3',color:'#27834a',checked:false,code:'COM_ASC3',label:'DEN_ASC3'},
   {key:'sections',name:'Sezioni censuarie ISTAT 2021',color:'#8054a6',checked:false,code:'SEZ21_ID',label:'SEZ21'}
  ];
  territoryDefs.forEach(def=>{
   const data=GEO[def.key];
   if(!data||!Array.isArray(data.features)||!data.features.length)return;
   const polygons=L.geoJSON(data,{style:()=>({color:def.color,weight:def.key==='sections'?.55:1.35,fillColor:def.color,fillOpacity:def.key==='sections'?.015:.035}),onEachFeature:(feature,featureLayer)=>{
    const props=feature.properties||{},name=props[def.label]||props[def.code]||def.name;
    featureLayer.bindPopup('<strong>'+esc(name)+'</strong><br><small>'+esc(def.name)+' · ISTAT 2021</small>');
    if(def.key!=='sections')featureLayer.bindTooltip(esc(name),{permanent:false,direction:'center',className:'gis-polygon-label'});
    featureLayer.on('click',()=>{const value=props[def.code];if(value!==undefined&&value!==null)syncGeoSelection(def.key==='sections'?'section':def.key,String(value));});
   }});
   territoryOverlays[def.name]=polygons;
   if(def.checked)polygons.addTo(map);
  });
  layer=L.layerGroup().addTo(map);
  territoryOverlays['Sedi scolastiche georeferenziate · '+pts.length+' punti']=layer;
  const influenceSpecs=[
   {key:'early',label:'Nidi e infanzia · 300 m',radius:300,color:'#d97706',match:/NIDO|INFANZIA/},
   {key:'primary',label:'Primaria · 500 m',radius:500,color:'#16845b',match:/PRIMARIA/},
   {key:'secondary',label:'Secondaria · 1.000 m',radius:1000,color:'#2563eb',match:/SECONDARIA/}
  ];
  const influenceLayers=Object.fromEntries(influenceSpecs.map(spec=>{
   const group=L.layerGroup().addTo(map);
   territoryOverlays['Raggi d’influenza · '+spec.label]=group;
   return [spec.key,group];
  }));
  const drawInfluenceBuffers=list=>{
   Object.values(influenceLayers).forEach(group=>group.clearLayers());
   list.forEach(p=>{
    const record=censusById.get(String(p.id));
    if(record?.bufferEligible!==true)return;
    const ordersText=String(record.ordine_scolastico_operativo||record.ordine_scolastico_verificato||'');
    influenceSpecs.forEach(spec=>{
     if(!spec.match.test(ordersText))return;
     const circle=L.circle([Number(p.lat),Number(p.lon)],{radius:spec.radius,color:spec.color,weight:3,opacity:1,fillColor:spec.color,fillOpacity:.22,interactive:true});
     circle.bindPopup('<strong>Raggio d’influenza scolastica</strong><br>'+esc(p.name)+'<br>'+esc(spec.label)+'<br><small>Buffer geometrico circolare, misurato in linea d’aria dal punto georeferenziato. Non rappresenta un bacino ufficiale, un percorso pedonale o una verifica di accessibilità.</small>');
     circle.bindTooltip(esc(p.name)+' · '+spec.radius.toLocaleString('it-IT')+' m');
     circle.addTo(influenceLayers[spec.key]);
    });
   });
  };
  const territoryControl=L.control.layers(null,territoryOverlays,{collapsed:false,position:'topright'}).addTo(map);
  layer.addTo(map);
  Object.values(influenceLayers).forEach(group=>group.addTo(map));
  const serviceCategoryStyles={IC:{color:'#d97706',label:'Interesse comune'},V:{color:'#16845b',label:'Verde e sport'},P:{color:'#475569',label:'Parcheggi'},F:{color:'#7c3aed',label:'Interesse generale'}};
  loadPublicFacilities().then(facilities=>{
   const groups={IC:L.layerGroup(),V:L.layerGroup(),P:L.layerGroup(),F:L.layerGroup()};
   facilities.forEach(item=>{
    const style=serviceCategoryStyles[item.category];if(!style)return;
    const marker=L.circleMarker([item.lat,item.lon],{radius:6,color:style.color,fillColor:style.color,fillOpacity:.88,weight:1.5});
    marker.bindPopup('<div class="school-popup"><b>'+esc(item.name)+'</b><br>'+esc(style.label)+'<br>'+esc(item.subtype||'')+(item.address?'<br>'+esc(item.address):'')+'<br><small>Fonte: OpenStreetMap. Punto di servizio da verificare per titolarità pubblica, stato operativo e corrispondenza PRG.</small></div>');
    marker.addTo(groups[item.category]);
   });
   map.removeControl(territoryControl);
   Object.entries(groups).forEach(([key,group])=>{territoryOverlays['Servizi e dotazioni · '+serviceCategoryStyles[key].label+' (OSM)']=group;});
   L.control.layers(null,territoryOverlays,{collapsed:false,position:'topright'}).addTo(map);
   const note=$('#schoolMapStatus');if(note)note.textContent+=' Archivio condiviso: '+facilities.length+' luoghi e servizi OSM classificati per categoria; verifica di proprietà e destinazione PRG separata.';
  }).catch(error=>{const note=$('#schoolMapStatus');if(note)note.textContent+=' Archivio dei servizi OSM non disponibile: '+String(error.message||error)+'. Il censimento scolastico resta disponibile.';});
  const missingSections=!GEO.sections||!Array.isArray(GEO.sections.features)||!GEO.sections.features.length;
  draw();
  const mapNote=$('#schoolMapStatus');
  const georeferencedCount=pts.filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))).length;
  const eligiblePoints=schoolCensus.filter(x=>x.bufferEligible===true).length;
  const visibleBuffers=Object.values(influenceLayers).reduce((n,group)=>n+group.getLayers().length,0);
  const markerCount=layer?.getLayers().length||0;
  const diagnosticText=' Verifica tecnica: '+georeferencedCount+' coordinate valide; '+markerCount+' marker scolastici nel layer; '+eligiblePoints+' sedi abilitate V81; '+visibleBuffers+' cerchi di influenza creati.';
  const schoolStatus=$('#schoolStatus');if(schoolStatus)schoolStatus.textContent+=diagnosticText;
  if(mapNote)mapNote.textContent+=diagnosticText;
  console.info('[Comparatore] Mappa scuole', {georeferencedCount,markerCount,eligiblePoints,visibleBuffers});
  setTimeout(()=>{map.invalidateSize(true);if(!map.hasLayer(layer))layer.addTo(map);Object.values(influenceLayers).forEach(group=>{if(!map.hasLayer(group))group.addTo(map);});},350);
 }else{$('#schoolMap').innerHTML='<p class="muted">Mappa non disponibile; resta consultabile la tabella.</p>';draw();}
 [kind,order,search,$('#schoolVerificationFilter'),$('#schoolBufferFilter')].forEach(x=>x?.addEventListener('input',draw));
 const so=$('#schoolStatsOrder'),ss=$('#schoolStatsSearch'),sr=$('#schoolStatsRows'),st=$('#schoolStatsStatus');
 const drawStats=()=>{const a=stats.filter(x=>{const r=registerByCode.get(String(x.code))||{};return (!so.value||x.order===so.value)&&(!ss.value||norm([x.code,x.name,x.institution,r.institutionCode2026,r.institution2026,r.institutionAddress2026].join(' ')).includes(norm(ss.value)));});sr.innerHTML=a.slice(0,300).map(x=>{const r=registerByCode.get(String(x.code))||{};return '<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.order)+'</td><td>'+esc(x.institution)+'</td><td>'+Number(x.students||0).toLocaleString('it-IT')+'</td><td>'+Number(x.classes||0).toLocaleString('it-IT')+'</td><td>'+Number(x.students_disability||0).toLocaleString('it-IT')+'</td><td>'+esc(r.institutionCode2026||'N.D.')+'</td><td>'+esc(r.institution2026||'Non presente nel registro 2026/27')+'</td><td>'+esc(r.institutionAddress2026||'N.D.')+'</td><td>'+esc(r.registryMatch||'Da verificare')+'</td><td>'+((r.mapPointIds&&r.mapPointIds.length)?r.mapPointIds.map((id,i)=>'<button type="button" class="school-open-map" data-map-point="'+esc(id)+'">'+(r.mapPointIds.length>1?'Apri corpo '+String.fromCharCode(65+i):'Apri sede')+'</button>').join(' '):(r.mapPointId?'<button type="button" class="school-open-map" data-map-point="'+esc(r.mapPointId)+'">Apri sede</button>':'<span class="muted">Non associata</span>'))+'</td></tr>';}).join('')||'<tr><td colspan="12">Nessun record.</td></tr>';const matches=register.filter(x=>x.registryMatch==='CODICE_COINCIDENTE').length;const documented=register.filter(x=>x.registryMatch==='ASSOCIAZIONE_DOCUMENTALE_CONFERMATA').length;const unresolved=register.length-matches-documented;const linked=register.filter(x=>x.mapPointId||x.mapPointIds?.length).length;const mappedPoints=new Set(register.flatMap(x=>x.mapPointIds?.length?x.mapPointIds:(x.mapPointId?[x.mapPointId]:[]))).size;st.textContent='Record visualizzati: '+Math.min(a.length,300)+' su '+a.length+'. Registro plessi: '+register.length+'; abbinamenti per codice esatto: '+matches+'; raccordi documentali per scuole annesse: '+documented+'; codici di plesso collegati a punti cartografici: '+linked+' su '+register.length+' ('+mappedPoints+' sedi fisiche); associazioni fisiche ancora da verificare: '+(register.length-linked)+'. Fonti USR, MIM e siti scolastici ufficiali.';};
 sr.addEventListener('click',e=>{const b=e.target.closest('[data-map-point]');if(!b)return;const id=b.dataset.mapPoint;if(!markersById.has(String(id))){st.textContent='La sede '+id+' è fuori dai filtri territoriali correnti oppure la mappa non è disponibile. Azzera i filtri geografici per visualizzarla.';return;}selectSchool(id,true);});
 so?.addEventListener('change',drawStats);ss?.addEventListener('input',drawStats);drawStats();
 const ps=$('#schoolParSearch'),pr=$('#schoolParRows'),pt=$('#schoolParStatus');
 const drawPar=()=>{const a=pars.filter(x=>!ps.value||norm([x.code,x.name,x.address].join(' ')).includes(norm(ps.value)));pr.innerHTML=a.slice(0,300).map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.address)+'</td><td>'+esc(x.management)+'</td><td>'+esc(x.year)+'</td></tr>').join('')||'<tr><td colspan="5">Nessun record.</td></tr>';pt.textContent='Record visualizzati: '+Math.min(a.length,300)+' su '+a.length+'. Coordinate non disponibili.';};
 ps?.addEventListener('input',drawPar);drawPar();
}
function fillFilters(){
 const c=$('#circ'),q=$('#quart');DATA.territories.circoscrizioni.forEach(x=>c.add(new Option(x.name,x.id)));DATA.territories.quartieri.forEach(x=>q.add(new Option(x.name,x.id)));
 populateGeoSelectors();
}
async function initGreenBalance(){
 const host=document.getElementById('greenBalance');if(!host)return;
 host.innerHTML='<div class="row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><button type="button" id="greenBalanceCirc" class="secondary-button">Calcola per circoscrizione</button><button type="button" id="greenBalanceQuart" class="secondary-button">Calcola per quartiere</button><button type="button" id="greenBalanceUpl" class="secondary-button">Calcola per UPL</button></div><p id="greenBalanceStatus" class="school-note">Seleziona il livello territoriale. Le superfici saranno calcolate tramite intersezione geometrica tra PRG 2004 e confini ISTAT 2021.</p><div id="greenBalanceTable" class="table-wrap"></div>';
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const fmt=v=>Number(v).toLocaleString('it-IT',{maximumFractionDigits:2});
 const run=async level=>{
  const status=document.getElementById('greenBalanceStatus'),table=document.getElementById('greenBalanceTable');
  if(!window.turf||!greenMapData?.features?.length){status.textContent='Dati PRG o libreria geometrica non disponibili.';return;}
  const circ=level==='circ',upl=level==='upl';
  const territories=circ?(DATA.territories.circoscrizioni||[]):upl?(GEO.asc3?.features||[]):(DATA.territories.quartieri||[]);
  const population=DATA.demografia||[];
  if(!territories.length||!GEO[circ?'asc1':upl?'asc3':'asc2']?.features?.length){status.textContent='Anagrafica territoriale o confini ISTAT non disponibili.';return;}
  const popById=new Map(population.map(p=>[String(p.territorio_id),Number(p.totale)||0]));
  const items=greenMapData.features.filter(f=>f.geometry);
  const cats=['pubblico','attrezzato','gioco','sport','impianti','agricolo','collinare','storico','parco_urbano','misto'];
  const labels={pubblico:'V3 verde pubblico',attrezzato:'V4 parchi attrezzati',gioco:'V1 campi gioco',sport:'V2 campi sportivi',impianti:'V5 impianti sportivi',agricolo:'E1 agricolo',collinare:'E2 collinare/naturalistico',storico:'VS storico/pertinenziale',parco_urbano:'F4 parchi urbani',misto:'Codici misti'};
  const rows=[];
  status.textContent='Elaborazione '+territories.length+' unità territoriali. Operazione geometrica in corso…';
  for(let ti=0;ti<territories.length;ti++){
   const t=territories[ti];
   let boundary=null,pop=0,name=t.name||t.nome||t.id;
   if(upl){boundary=t;name=t.properties?.DEN_ASC3||'UPL '+t.properties?.COD_ASC3_T;pop=Number(t.properties?.POP21)||0;}
   else if(circ){
    const code=String(t.id||'').replace(/\D/g,'');
    boundary=GEO.asc1.features.find(f=>String(f.properties?.COD_ASC1)===code);
    pop=popById.get(String(t.id))||0;
   }else{
    boundary=findAsc2FeatureForQuartiere(t);
    const record=population.find(p=>p.tipo_territorio==='quartiere'&&(p.territorio_id===t.id||norm(p.nome)===norm(name)||norm(p.nome_fonte)===norm(name)));
    pop=Number(record?.totale)||0;
   }
   if(!boundary?.geometry){rows.push({name,pop,areas:{},error:'Confine non trovato'});continue;}
   const bb=turf.bbox(boundary),areas=Object.fromEntries(cats.map(k=>[k,0]));
   for(let fi=0;fi<items.length;fi++){
    const feature=items[fi],p=feature.properties||{},key=p.green_class;
    if(!(key in areas))continue;
    try{
     const fb=turf.bbox(feature);
     if(fb[0]>bb[2]||fb[2]<bb[0]||fb[1]>bb[3]||fb[3]<bb[1])continue;
     const clipped=turf.intersect(turf.featureCollection([feature,boundary]));
     if(clipped)areas[key]+=turf.area(clipped);
    }catch(e){}
   }
   rows.push({name,pop,areas});
   status.textContent='Elaborazione '+(ti+1)+'/'+territories.length+': '+name;
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  const popYear=upl?'2021':'2022';
  const head='<thead><tr><th>Territorio</th><th>Residenti '+popYear+'</th>'+cats.map(k=>'<th>'+labels[k]+' (ha)</th>').join('')+'<th>V1+V2+V3+V4 (m²/ab.)*</th><th>Scarto indicativo da 9 m²/ab.*</th></tr></thead>';
  const body=rows.map(r=>{
   const eligible=(r.areas.pubblico||0)+(r.areas.attrezzato||0)+(r.areas.gioco||0)+(r.areas.sport||0),perCapita=r.pop?eligible/r.pop:NaN,delta=Number.isFinite(perCapita)?perCapita-9:NaN;
   return '<tr><td><strong>'+esc(r.name)+'</strong></td><td>'+fmt(r.pop)+'</td>'+cats.map(k=>'<td>'+fmt((r.areas[k]||0)/10000)+'</td>').join('')+'<td>'+(Number.isFinite(perCapita)?fmt(perCapita):'N.D.')+'</td><td>'+(Number.isFinite(delta)?(delta>=0?'+':'')+fmt(delta):'N.D.')+'</td></tr>';
  }).join('');
  table.innerHTML='<table>'+head+'<tbody>'+body+'</tbody></table><p class="school-note">* Indicatore lordo preliminare basato sulle superfici PRG V1+V2+V3+V4 intersecate e sulla popolazione di riferimento del livello territoriale (2021 per UPL, 2022 per circoscrizioni e quartieri), in quanto gioco, sport e verde sono componenti potenzialmente pertinenti all’art. 3 del D.M. 1444/1968. Non è una verifica normativa né un dato di verde pubblico effettivamente fruibile: mancano verifica di proprietà/uso pubblico, attuazione, accessibilità, sovrapposizioni e superficie utile netta; V2 può includere superfici sportive non permeabili. Il confronto con 9 m²/abitante è solo un indice lordo di piano e non certifica il rispetto dello standard. Le categorie sono separate e non vanno sommate indiscriminatamente. Fonte popolazione: '+(upl?'ISTAT, censimento 2021 (POP21)':'Comune di Palermo, 31/12/2022')+'; perimetri: ISTAT 2021; destinazioni: PRG DCC 7/2004.</p>';
  status.textContent='Elaborazione completata: '+rows.length+' unità territoriali. Dato demografico '+(upl?'ISTAT 2021 (POP21)':circ?'Comune 2022':'Comune 2022')+'.';
 };
 document.getElementById('greenBalanceCirc')?.addEventListener('click',()=>run('circ'));
 document.getElementById('greenBalanceQuart')?.addEventListener('click',()=>run('quart'));
 document.getElementById('greenBalanceUpl')?.addEventListener('click',()=>run('upl'));
}
async function initGreenMap(){
 const el=document.getElementById('greenMap');if(!el||!window.L)return;
 if(greenMapInstance){greenMapInstance.remove();greenMapInstance=null;}
 const status=document.getElementById('greenMapStatus');
 try{
  if(!greenMapData){const r=await fetch('data/geo/verde_prg.geojson',{cache:'no-store'});if(!r.ok)throw new Error('GeoJSON verde HTTP '+r.status);greenMapData=await r.json();}
  if(!greenSummaryData){const r=await fetch('data/verde_prg_summary.json',{cache:'no-store'});if(!r.ok)throw new Error('Riepilogo verde HTTP '+r.status);greenSummaryData=await r.json();}
  const parkResponse=await fetch('data/geo/parchi_urbani_integrativi.geojson',{cache:'no-store'});if(!parkResponse.ok)throw new Error('Inventario parchi integrativi HTTP '+parkResponse.status);const supplementaryParks=await parkResponse.json();
  if(!document.getElementById('greenMap'))return;
  const cats=greenSummaryData.categories||[],s=selected();
  initGreenBalance();
  const territoryName=s.section?'Sezione censuaria '+s.section:
   s.asc3?(GEO.asc3?.features.find(f=>String(f.properties?.COM_ASC3)===String(s.asc3))?.properties?.DEN_ASC3||'UPL '+s.asc3):
   s.quart?(DATA.territories.quartieri.find(q=>q.id===s.quart)?.name||'Quartiere selezionato'):
   s.asc2?(GEO.asc2?.features.find(f=>String(f.properties?.COM_ASC2)===String(s.asc2))?.properties?.DEN_ASC2||'Quartiere '+s.asc2):
   s.circ?(DATA.territories.circoscrizioni.find(c=>c.id===s.circ)?.name||'Circoscrizione selezionata'):'Palermo · intero Comune';
  let boundary=null;
  if(s.section)boundary=GEO.sections?.features.find(f=>String(f.properties?.SEZ21_ID)===String(s.section))||null;
  else if(s.asc3)boundary=GEO.asc3?.features.find(f=>String(f.properties?.COM_ASC3)===String(s.asc3))||null;
  else if(s.quart)boundary=findAsc2FeatureForQuartiere(DATA.territories.quartieri.find(q=>q.id===s.quart));
  else if(s.asc2)boundary=GEO.asc2?.features.find(f=>String(f.properties?.COM_ASC2)===String(s.asc2))||null;
  else if(s.circ){const code=String(s.circ).replace(/\\D/g,'');boundary=GEO.asc1?.features.find(f=>String(f.properties?.COD_ASC1)===code)||null;}
  const filtered=!!(s.section||s.asc3||s.quart||s.asc2||s.circ);
  let mapFeatures=greenMapData.features||[],clipErrors=0;
  if(filtered&&boundary?.geometry){
   if(!window.turf||typeof turf.intersect!=='function')throw new Error('Turf.js non disponibile per il ritaglio territoriale');
   const boundaryBox=turf.bbox(boundary);
   mapFeatures=[];
   for(let i=0;i<(greenMapData.features||[]).length;i++){
    const feature=greenMapData.features[i];if(!feature.geometry)continue;
    try{
     const box=turf.bbox(feature);
     if(box[0]>boundaryBox[2]||box[2]<boundaryBox[0]||box[1]>boundaryBox[3]||box[3]<boundaryBox[1])continue;
     const clipped=turf.intersect(turf.featureCollection([feature,boundary]));
     if(!clipped)continue;
     const area=turf.area(clipped);if(!Number.isFinite(area)||area<0.5)continue;
     clipped.properties={...(feature.properties||{}),AREA_M2:area,AREA_METHOD:'Intersezione con il perimetro territoriale selezionato'};
     mapFeatures.push(clipped);
    }catch(error){clipErrors++;}
    if(i%80===79)await new Promise(resolve=>setTimeout(resolve,0));
   }
  }else if(filtered&&!boundary?.geometry){
   throw new Error('Geometria ufficiale non disponibile per il territorio selezionato: impossibile ritagliare correttamente la cartografia.');
  }
  const mapData={type:'FeatureCollection',features:mapFeatures};
  const fmt=n=>Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const byId=new Map(cats.map(x=>[x.id,{...x}]));
  if(filtered){
   for(const [id,cat] of byId){
    if(id==='privato'){cat.count=null;cat.area_ha=null;continue;}
    const items=mapFeatures.filter(f=>f.properties?.green_class===id);
    cat.count=items.length;
    cat.area_ha=items.reduce((sum,f)=>sum+(Number(f.properties?.AREA_M2)||0),0)/10000;
   }
  }
  const displayCats=[...byId.values()];
  const kpis=['pubblico','privato','attrezzato','agricolo','collinare','storico'].map(id=>byId.get(id)).filter(Boolean);
  const kh=document.getElementById('greenKpis');if(kh)kh.innerHTML=kpis.map(x=>'<div class="card"><span class="muted">'+esc(x.label)+'</span><div class="metric">'+(x.area_ha===null?'N.D.':fmt(x.area_ha)+' <small>ha</small>')+'</div><small class="muted">'+(x.count===null?'Proprietà da verificare':x.count+' geometrie'+(filtered?' intersecate':' PRG'))+'</small></div>').join('');
  const rows=displayCats.map(x=>'<tr><td><strong>'+esc(x.label)+'</strong></td><td>'+esc((x.zto||[]).join(', '))+'</td><td>'+(x.count===null?'N.D.':fmt(x.count))+'</td><td>'+(x.area_ha===null?'N.D.':fmt(x.area_ha)+' ha')+'</td><td>'+(x.note?esc(x.note):'Superficie geometrica'+(filtered?' ritagliata sul territorio selezionato':' PRG'))+'</td></tr>').join('');
  const th=document.getElementById('greenStatsTable');if(th)th.innerHTML='<table><thead><tr><th>Destinazione</th><th>Codice</th><th>Geometrie</th><th>Superficie</th><th>Nota</th></tr></thead><tbody>'+rows+'</tbody></table>';
  const chart=document.getElementById('greenAreaChart');
  if(chart&&window.Chart){
   const chartIds=['pubblico','attrezzato','agricolo','collinare','storico','parco_urbano','gioco','sport','impianti'];
   const chartRows=chartIds.map(id=>byId.get(id)).filter(x=>x&&Number(x.area_ha)>0);
   charts.push(new Chart(chart,{type:'bar',data:{labels:chartRows.map(x=>x.label),datasets:[{label:'Superficie geometrica (ha)',data:chartRows.map(x=>x.area_ha)}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,title:{display:true,text:'Ettari'}}}}}));
  }
  const map=L.map(el).setView([38.1157,13.3615],11),base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'});base.addTo(map);
  const styles={pubblico:{color:'#15803d',fillColor:'#22c55e'},gioco:{color:'#a16207',fillColor:'#eab308'},sport:{color:'#c2410c',fillColor:'#fb923c'},attrezzato:{color:'#16a34a',fillColor:'#4ade80'},impianti:{color:'#b45309',fillColor:'#f59e0b'},agricolo:{color:'#84933c',fillColor:'#c5d36a'},collinare:{color:'#14532d',fillColor:'#166534'},storico:{color:'#0f766e',fillColor:'#5eead4'},parco_urbano:{color:'#1d4ed8',fillColor:'#60a5fa'},misto:{color:'#64748b',fillColor:'#94a3b8'}};
  const names={pubblico:'V3 · Spazi pubblici a verde',gioco:'V1 · Campi gioco per bambini',sport:'V2 · Campi sportivi',attrezzato:'V4 · Aree attrezzate a parco',impianti:'V5 · Impianti sportivi',agricolo:'E1 · Verde agricolo',collinare:'E2 · Verde collinare e naturalistico',storico:'VS · Verde storico e pertinenziale',parco_urbano:'F4 · Parchi urbani e territoriali',misto:'Codici V misti o non univoci'};
  const overlay={};
  Object.keys(names).forEach(key=>{
   const features=mapFeatures.filter(f=>f.properties?.green_class===key);if(!features.length)return;
   const st=styles[key];const layer=L.geoJSON({type:'FeatureCollection',features},{style:()=>({color:st.color,fillColor:st.fillColor,weight:1,opacity:.9,fillOpacity:.28}),onEachFeature:(feature,ly)=>{const p=feature.properties||{};ly.bindPopup('<strong>'+esc(p.green_label||names[key])+'</strong><br>Codice PRG: '+esc(p.ZTO||'N.D.')+'<br>Superficie geometrica'+(filtered?' nell’unità selezionata':'')+': '+(Number.isFinite(Number(p.AREA_M2))?fmt(Number(p.AREA_M2))+' m²':'N.D.')+'<br>ID geometria: '+esc(p.ID||p.PRG_ID||'N.D.'));}});
   overlay[names[key]]=layer;if(['pubblico','attrezzato','agricolo','collinare'].includes(key))layer.addTo(map);
  });
  const parkFeatures=(supplementaryParks.features||[]).filter(f=>{
   if(!filtered||!boundary?.geometry)return true;
   try{return turf.booleanPointInPolygon(f,boundary);}catch(error){return false;}
  });
  const parkLayer=L.geoJSON({type:'FeatureCollection',features:parkFeatures},{
   pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:8,color:feature.properties?.status==='esistente'?'#064e3b':'#1d4ed8',weight:2,fillColor:feature.properties?.status==='esistente'?'#22c55e':'#93c5fd',fillOpacity:.95}),
   onEachFeature:(feature,layer)=>{const p=feature.properties||{};layer.bindPopup('<strong>'+esc(p.name||'Parco')+'</strong><br>Stato: '+esc(p.status_label||p.status||'N.D.')+'<br>'+esc(p.description||'')+(p.area_note?'<br><em>'+esc(p.area_note)+'</em>':'')+(p.source_url?'<br><a href="'+esc(p.source_url)+'" target="_blank" rel="noopener">Fonte</a>':''));}
  });
  if(parkFeatures.length){overlay['Parchi e progetti integrativi (punti)']=parkLayer;parkLayer.addTo(map);}
  L.control.layers({'OpenStreetMap':base},overlay,{collapsed:false}).addTo(map);
  const bounds=L.geoJSON(mapData).getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[18,18]});
  greenMapInstance=map;
  const mapCounts={};mapFeatures.forEach(f=>{const key=f.properties?.green_class||'non_classificato';mapCounts[key]=(mapCounts[key]||0)+1;});
  const mismatches=filtered?[]:cats.filter(x=>x.count!==null&&x.id!=='privato'&&(mapCounts[x.id]||0)!==Number(x.count));
  if(status)status.textContent=mapFeatures.length+' geometrie'+(filtered?' intersecate con '+territoryName:' caricate per Palermo intera')+'. '+(filtered?'Superfici ricalcolate sull’intersezione con il perimetro ISTAT selezionato. ':'')+'Layer PRG: V1, V2, V3, V4, V5, E1, E2, VS, F4 e codici misti. Verde privato: N.D., non cartografato perché manca un layer PRG che certifichi la titolarità. '+(clipErrors?'Intersezioni non elaborate: '+clipErrors+'. ':'')+(mismatches.length?'Attenzione: conteggi mappa/riepilogo da riconciliare per '+mismatches.map(x=>x.id).join(', ')+'.':'Conteggi mappa e riepilogo coerenti.')+' Parchi integrativi: '+parkFeatures.length+' località puntuali visibili; non sono incluse nelle superfici PRG né nel bilancio m²/abitante. Villa Turrisi è rappresentata come progetto/ambito in prevalenza privato, non come parco pubblico integralmente realizzato. Fonte PRG: Comune di Palermo, dataset 320, Variante Generale DCC 7/2004.';
 }catch(error){console.error('Analisi del verde non disponibile',error);if(status)status.textContent='Impossibile caricare la cartografia del verde: '+error.message;}
}
async function loadGeoCatalog(){const defs=[['asc1','data/geo/circoscrizioni_palermo_2021.geojson'],['asc2','data/geo/aree_subcomunali_liv2_palermo_2021.geojson'],['asc3','data/geo/aree_subcomunali_liv3_palermo_2021.geojson'],['sections','data/geo/sezioni_palermo_2021.geojson']];await Promise.all(defs.map(async([key,url])=>{try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j?.type==='FeatureCollection'&&Array.isArray(j.features))GEO[key]=j;}catch(e){console.warn('Layer territoriale non disponibile:',url,e);}}));populateGeoSelectors();}
async function load(){try{let r=await fetch('data/territoriale.json',{cache:'no-store'});if(!r.ok)throw new Error('territoriale');DATA=await r.json(); let d=await fetch('data/demografia.json',{cache:'no-store'});if(d.ok){let dem=await d.json();DATA.demografia=dem.popolazione_territoriale||[];DATA.demografiaMeta=dem.meta||{};DATA.demografiaNonAttribuita=dem.popolazione_non_attribuita||[];}let s=await fetch('data/sociale_palermo_idise_2023.json',{cache:'no-store'});if(s.ok){let soc=await s.json();DATA.sociale=soc.aree||[];DATA.socialeMeta=soc.meta||{};DATA.socialeAdu=soc.adu||[];}$('#status').textContent=DATA.demografia.length?'Dati territoriali e demografici caricati · anno 2022':'Dati territoriali caricati · archivio demografico non disponibile';fillFilters();await loadGeoCatalog();}catch(e){$('#status').textContent='Struttura pronta · dati non caricati';}render();loadSchoolArchives();} 
$('#nav').addEventListener('click',e=>{let b=e.target.closest('[data-page]');if(!b)return;active=b.dataset.page;document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));render();});
function syncMainFilter(id){
 const value=$('#'+id)?.value||'';
 if(id==='circ'){
  const q=$('#quart');if(q){const previous='';q.innerHTML='<option value="">Tutti i quartieri</option>';DATA.territories.quartieri.filter(x=>!value||(x.circ_ids||[]).includes(value)).forEach(x=>q.add(new Option(x.name,x.id)));q.value=previous;}
  geoSelection={asc2:'',asc3:'',section:''};
  if($('#asc3'))$('#asc3').value='';if($('#section'))$('#section').value='';
 }else if(id==='quart'){
  const q=DATA.territories.quartieri.find(x=>x.id===value);
  const f=findAsc2FeatureForQuartiere(q);
  geoSelection.asc2=f?String(f.properties.COM_ASC2):'';geoSelection.asc3='';geoSelection.section='';
  if($('#asc3'))$('#asc3').value='';if($('#section'))$('#section').value='';
 }else if(id==='asc3'){
  geoSelection.asc3=value;geoSelection.section='';if($('#section'))$('#section').value='';
 }else if(id==='section'){
  geoSelection.section=value;
 }
 mapSelection=null;mapSelections=[];
 populateGeoSelectors();
 if(active==='gis'){applyGisSelectedStyle();focusGeneralSelection();}
 else render();
}
$('#circ').addEventListener('change',()=>syncMainFilter('circ'));
$('#quart').addEventListener('change',()=>syncMainFilter('quart'));
['asc3','section'].forEach(id=>$('#'+id)?.addEventListener('change',()=>syncMainFilter(id)));
$('#content').addEventListener('change',e=>{
 const target=e.target.closest('#gisSelectAsc1,#gisSelectAsc2,#gisSelectAsc3,#gisSelectSection');
 if(!target)return;
 const level={gisSelectAsc1:'asc1',gisSelectAsc2:'asc2',gisSelectAsc3:'asc3',gisSelectSection:'section'}[target.id];
 syncGeoSelection(level,target.value);
});
const sectionMain=$('#section');if(sectionMain&&sectionMain.options.length)sectionMain.options[0].textContent='Nessuna';
load();
