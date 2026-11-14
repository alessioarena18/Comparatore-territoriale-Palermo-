const $=s=>document.querySelector(s);
let DATA={meta:{},territories:{circoscrizioni:[],quartieri:[]},demografia:[],sociale:[],socialeMeta:{},socialeAdu:[],scuole:[],standard:[],geojson:null,schoolRegister:{records:[]},schoolSiteVerification:{records:[]}};
let active='overview', charts=[];
let gisMap=null, gisImportedLayers=[], gisLayerControl=null, mapSelection=null, mapSelections=[];
let GEO={asc1:null,asc2:null,asc3:null,sections:null};
let geoSelection={asc2:'',asc3:'',section:''};
const pages={
overview:['QUADRO CONOSCITIVO','Panoramica territoriale','Quadro integrato delle componenti demografiche, scolastiche, urbanistiche e spaziali.'],
demography:['POPOLAZIONE RESIDENTE','Analisi demografica','Distribuzione per sesso, classi d’età e fasce funzionali.'],
social:['STRUTTURA SOCIALE','Analisi sociale','Indicatori di struttura demografica e caratteristiche della popolazione.'],
schools:['SERVIZI TERRITORIALI','Servizi e dotazioni urbane','Distribuzione delle attrezzature collettive, della rete scolastica e delle dotazioni di quartiere.'],
standards:['DOTAZIONI TERRITORIALI','Standard urbanistici','Verifica delle dotazioni territoriali e confronto con i parametri normativi applicabili.'],
gis:['SISTEMA INFORMATIVO TERRITORIALE','Cartografia GIS','Visualizzazione dei confini amministrativi, delle sezioni censuarie e dei servizi.'],
spatial:['GEOGRAFIA E ACCESSIBILITÀ','Analisi spaziale','Prossimità, distanze, accessibilità e aree di influenza.'],
compare:['CONFRONTO TERRITORIALE','Confronti','Comparazione tra circoscrizioni, quartieri e Comune.'],
sources:['DOCUMENTAZIONE','Fonti e metodologia','Tracciabilità delle fonti, degli aggiornamenti e dei criteri di elaborazione.']
};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function selected(){return {circ:$('#circ')?.value||'',quart:$('#quart')?.value||'',asc2:geoSelection.asc2||'',asc3:$('#asc3')?.value||'',section:$('#section')?.value||''};}
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
function applyGisSelectionVisibility(){if(!gisMap)return;gisImportedLayers.forEach(item=>{if(!item.key||!Array.isArray(item.featureLayers))return;item.featureLayers.forEach(featureLayer=>{if(!item.layer.hasLayer(featureLayer))item.layer.addLayer(featureLayer);});});}
function applyGisSelectionVisibility(){if(!gisMap)return;gisImportedLayers.forEach(item=>{if(!item.key||!Array.isArray(item.featureLayers))return;item.featureLayers.forEach(featureLayer=>{if(!item.layer.hasLayer(featureLayer))item.layer.addLayer(featureLayer);});});}
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
function syncGeoSelection(level,code,toggle=false){
 const value=String(code||'');
 if(!value){const order={asc1:0,asc2:1,asc3:2,section:3};mapSelections=mapSelections.filter(x=>order[x.level]<order[level]);mapSelection=mapSelections[mapSelections.length-1]||null;if(level==='asc1')geoSelection={asc2:'',asc3:'',section:''};else if(level==='asc2')geoSelection={asc2:'',asc3:'',section:''};else if(level==='asc3'){geoSelection.asc3='';geoSelection.section='';}else geoSelection.section='';}
 else{
  const key=level+':'+value,index=mapSelections.findIndex(x=>x.key===key);
  if(toggle&&index>=0)mapSelections.splice(index,1);else if(index<0)mapSelections.push({key,level,code:value});
  mapSelection=mapSelections[mapSelections.length-1]||null;
  const linkedActive=mapSelection?findLinkedTerritory(mapSelection.level,mapSelection.code):{};
  const circ=$('#circ'),quart=$('#quart');
  if(circ)circ.value=linkedActive.asc1?'c'+String(GEO.asc1?.features.find(f=>String(f.properties?.COM_ASC1)===linkedActive.asc1)?.properties?.COD_ASC1??''):'';
  if(quart){
   quart.innerHTML='<option value="">Tutti i quartieri</option>';
   DATA.territories.quartieri.filter(q=>!circ?.value||(q.circ_ids||[]).includes(circ.value)).forEach(q=>quart.add(new Option(q.name,q.id)));
   const asc2Feature=linkedActive.asc2?GEO.asc2?.features.find(f=>String(f.properties?.COM_ASC2)===linkedActive.asc2):null;
   if(asc2Feature){const n=normalizeTerritoryName(asc2Feature.properties?.DEN_ASC2||'');let q=DATA.territories.quartieri.find(x=>normalizeTerritoryName(x.name)===n);if(!q&&n==='cruillassgiovanniapostolo')q=DATA.territories.quartieri.find(x=>x.id==='san-giovanni-apostolo');if(q&&!Array.from(quart.options).some(o=>o.value===q.id))quart.add(new Option(q.name,q.id));if(q)quart.value=q.id;}
  }
  geoSelection={asc2:linkedActive.asc2||'',asc3:linkedActive.asc3||'',section:linkedActive.section||''};
 }
 const asc3=$('#asc3'),section=$('#section');if(asc3)asc3.value=geoSelection.asc3;if(section)section.value=geoSelection.section;
 populateGeoSelectors();
 const linkedActive=mapSelection?findLinkedTerritory(mapSelection.level,mapSelection.code):{};
 const vals={gisSelectAsc1:linkedActive.asc1||'',gisSelectAsc2:linkedActive.asc2||'',gisSelectAsc3:linkedActive.asc3||'',gisSelectSection:linkedActive.section||''};
 Object.entries(vals).forEach(([id,v])=>{const el=$('#'+id);if(el)el.value=v;});
 if(active!=='gis')render();updateGisSelectionFeedback();applyGisSelectedStyle();if(mapSelection)focusGisSelection(mapSelection.level,mapSelection.code);
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
 if(s.quart){const q=DATA.territories.quartieri.find(x=>x.id===s.quart),f=GEO.asc2?.features.find(x=>normalizeTerritoryName(x.properties?.DEN_ASC2)===normalizeTerritoryName(q?.name));if(f)wanted.push(['asc2','COM_ASC2',String(f.properties?.COM_ASC2)]);}
 gisImportedLayers.forEach(item=>(item.featureLayers||[]).forEach(layer=>{
  const p=layer.feature?.properties||{},codeKey={asc1:'COM_ASC1',asc2:'COM_ASC2',asc3:'COM_ASC3',sections:'SEZ21_ID'}[item.key];
  const match=wanted.some(([key,field,value])=>key===item.key&&String(p[field]??'')===String(value));
  layer.setStyle?.({weight:match?4:1.2,color:match?'#111827':item.key==='asc1'?'#1769aa':item.key==='asc2'?'#c05a21':item.key==='asc3'?'#27834a':'#8054a6',fillOpacity:match?.32:.035});
  if(match)layer.bringToFront?.();
 }));
}
function focusGeneralSelection(){
 if(!gisMap)return;
 const s=selected();let key,field,value;
 if(s.section){key='sections';field='SEZ21_ID';value=s.section;}
 else if(s.asc3){key='asc3';field='COM_ASC3';value=s.asc3;}
 else if(s.quart){key='asc2';field='COM_ASC2';const q=DATA.territories.quartieri.find(x=>x.id===s.quart);value=GEO.asc2?.features.find(f=>normalizeTerritoryName(f.properties?.DEN_ASC2)===normalizeTerritoryName(q?.name))?.properties?.COM_ASC2;}
 else if(s.circ){key='asc1';field='COM_ASC1';value=GEO.asc1?.features.find(f=>'c'+String(f.properties?.COD_ASC1)===s.circ)?.properties?.COM_ASC1;}
 if(!key||value===undefined||value===null)return;
 const item=gisImportedLayers.find(x=>x.key===key),layer=item?.featureLayers?.find(l=>String(l.feature?.properties?.[field]??'')===String(value));
 const bounds=layer?.getBounds?.();if(bounds?.isValid?.())gisMap.fitBounds(bounds,{padding:[28,28],maxZoom:key==='sections'?17:key==='asc3'?15:key==='asc2'?14:13});
}
function pageShell(){let p=pages[active],s=selected();const ambiti=[],statistiche=[];const fmtGeo=v=>Number(v).toLocaleString('it-IT');const dettaglio=(feature,label)=>{if(!feature)return;const x=feature.properties||{};ambiti.push(label+': '+(x.DEN_ASC1||x.DEN_ASC3||x.SEZ21_ID||''));const valori=[['POP21 · ISTAT 2021',x.POP21],['Famiglie',x.FAM21],['Abitazioni',x.ABI21],['Edifici',x.EDI21]].filter(v=>v[1]!==undefined&&v[1]!==null).map(v=>v[0]+': '+fmtGeo(v[1]));if(valori.length)statistiche.push('<div><strong>'+esc(label)+'</strong><br><span>'+valori.map(esc).join(' · ')+'</span></div>');};if(s.circ){const f=GEO.asc1?.features.find(x=>'c'+String(x.properties?.COD_ASC1)===s.circ);if(f)dettaglio(f,'Circoscrizione');else ambiti.push('Circoscrizione: '+(DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||s.circ));}if(s.quart)ambiti.push('Quartiere: '+(DATA.territories.quartieri.find(x=>x.id===s.quart)?.name||s.quart));if(s.asc2){const f=GEO.asc2?.features.find(x=>String(x.properties?.COM_ASC2)===String(s.asc2));ambiti.push('Quartiere ASC2: '+(f?.properties?.DEN_ASC2||s.asc2));}if(s.asc3){const f=GEO.asc3?.features.find(x=>String(x.properties?.COM_ASC3)===String(s.asc3));if(f)dettaglio(f,'UPL');else ambiti.push('UPL: '+s.asc3);}if(s.section){const f=GEO.sections?.features.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));if(f)dettaglio(f,'Sezione censuaria');else ambiti.push('Sezione censuaria: '+s.section);}const contesto=ambiti.length?'<div class="notice-inline selection-context"><strong>Ambiti territoriali attivi:</strong> '+ambiti.map(esc).join(' · ')+(statistiche.length?'<div class="selection-stats">'+statistiche.join('')+'</div>':'')+'<span>I filtri vengono mantenuti passando da una pagina all’altra. POP21, famiglie, abitazioni ed edifici sono riferiti al Censimento ISTAT 2021 e restano distinti dai dati anagrafici comunali 2022 e dall’IDISE 2023. L’elaborazione si applica solo quando la fonte dispone di una corrispondenza geografica verificata alla scala selezionata.</span></div>':'';return `<p class="page-kicker">${p[0]}</p><h1 class="page-title">${p[1]}</h1><p class="lead">${p[2]}</p>${contesto}`;}
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
 const circoscrizioni=DATA.demografia.filter(x=>x.tipo_territorio==='circoscrizione');
 const normalizza=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const nomeQuartiere=DATA.territories.quartieri.find(x=>x.id===s.quart)?.name;
 const nomeTerritorio=s.quart?nomeQuartiere:null;
 const righe=quartieri.filter(x=>(!s.circ||(x.circoscrizioni_id||[]).includes(s.circ))&&(!s.quart||normalizza(x.nome)===normalizza(nomeQuartiere)));
 const aggregato=s.quart?righe[0]:s.circ?circoscrizioni.find(x=>x.territorio_id===s.circ):null;
 const baseTotale=s.circ||s.quart?aggregato:null;
 const somma=campo=>baseTotale?Number(baseTotale[campo])||0:circoscrizioni.reduce((tot,x)=>tot+(Number(x[campo])||0),0);
 const italiani=somma('italiani');
 const stranieri=somma('stranieri');
 const totale=somma('totale');
 const percentuale=totale?((stranieri/totale)*100).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'0,0';
 const nome=s.quart?righe[0]?.nome||'Quartiere selezionato':s.circ?DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Circoscrizione selezionata':'Comune di Palermo';
 const fmt=n=>Number(n).toLocaleString('it-IT');
 html+=`<div class="card"><h3>Popolazione residente · ${nome}</h3><p class="muted">Dati ufficiali al 31 dicembre 2022 · Fonte: Comune di Palermo</p><div class="grid"><div class="card"><span class="muted">Popolazione totale</span><div class="metric">${fmt(totale)}</div></div><div class="card"><span class="muted">Cittadini italiani</span><div class="metric">${fmt(italiani)}</div></div><div class="card"><span class="muted">Cittadini stranieri</span><div class="metric">${fmt(stranieri)}</div></div><div class="card"><span class="muted">Incidenza stranieri</span><div class="metric">${percentuale}%</div></div></div><p class="muted">La ripartizione per sesso e fasce d’età è in fase di integrazione. Le basi censuarie ISTAT 2021 e i dati anagrafici comunali 2022 hanno date e unità territoriali differenti: l’aggregazione sarà pubblicata solo dopo la verifica della chiave geografica e della compatibilità temporale.</p><p class="muted">Le 609 persone senza fissa dimora (533 italiane e 76 straniere) sono riportate separatamente nella fonte comunale e non vengono attribuite artificialmente ai quartieri o alle circoscrizioni.</p></div>`;
 html+=`<div class="card"><h3>Popolazione per quartiere</h3><div style="overflow-x:auto"><table><thead><tr><th>Quartiere</th><th>Italiani</th><th>Stranieri</th><th>Totale</th><th>% stranieri</th></tr></thead><tbody>${[...righe].sort((a,b)=>b.totale-a.totale).map(x=>`<tr><td>${esc(x.nome)}</td><td>${fmt(x.italiani)}</td><td>${fmt(x.stranieri)}</td><td>${fmt(x.totale)}</td><td>${x.totale?((x.stranieri/x.totale)*100).toLocaleString('it-IT',{maximumFractionDigits:1}):'0'}%</td></tr>`).join('')}</tbody></table></div></div>`;

 
html+=`<div class="grid"><div class="card"><h3>Composizione della popolazione</h3><canvas id="chartComposizione"></canvas></div><div class="card"><h3>Popolazione per quartiere</h3><canvas id="chartQuartieri"></canvas></div></div><div class="card"><h3>Incidenza della popolazione straniera</h3><canvas id="chartIncidenza"></canvas></div>`;
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
  const aree=[...(DATA.sociale||[])].filter(a=>!s.asc3||String(a.cod_asc)===String(s.asc3)).sort((a,b)=>Number(b.idise)-Number(a.idise));
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
  <div class="card social-select"><h3>3 - Confronto degli ambiti territoriali</h3>
    <p class="muted">Seleziona almeno due UPL per confrontare IDISE e indicatori DIS1-DIS9. L’elenco comprende tutte le 55 UPL di Palermo anche quando il selettore generale è impostato su una singola circoscrizione, quartiere o UPL: in questo modo il confronto mantiene il riferimento all’intero Comune.</p>
    <div id="uplSelezione" class="upl-selector">
      ${[...(DATA.sociale||[])].sort((a,b)=>a.nome.localeCompare(b.nome,'it')).map(a=>'<label class="upl-option"><input type="checkbox" class="upl-check" value="'+esc(a.cod_asc)+'"> '+esc(a.nome)+'</label>').join('')}
    </div>
  </div>
  <div class="card"><h3>4 - Indice di disagio socio-economico IDISE 2023</h3>
    <p class="muted">Fonte: ISTAT. 55 UPL di Palermo. Valore comunale di riferimento: 100. Valori più elevati indicano maggiore disagio socio-economico.</p>
    <div class="table-wrap"><table><thead><tr><th>UPL</th><th>IDISE</th><th>Popolazione</th><th>Famiglie</th></tr></thead><tbody>
    ${aree.map(a=>`<tr><td>${esc(a.nome)}</td><td>${numero(a.idise)}</td><td>${numero(a.popolazione)}</td><td>${numero(a.famiglie)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  <div class="card social-compare-section"><h3>5 - Confronto territoriale degli indicatori di disagio</h3>
    <p class="muted">Gli indicatori restano affiancati al confronto per consentire la lettura dei risultati senza perdere il riferimento metodologico.</p>
    <div class="social-compare-layout">
      <aside class="indicator-panel"><h3>Indicatori DIS1-DIS9</h3><div class="indicator-list">
        ${Object.entries(descrizioni).map(([codice,descrizione])=>`<div class="indicator-item"><strong>${codice}</strong><span>${descrizione}</span>${codice==='DIS4'?'<small>Interpretazione inversa: un valore più alto indica maggiore occupazione e quindi minore disagio.</small>':''}</div>`).join('')}
      </div></aside>
      <div id="uplConfronto" class="comparison-panel"><h3>Confronto tra UPL</h3><p class="muted">Seleziona almeno due UPL nel pannello precedente per visualizzare i valori a confronto.</p></div>
    </div>
  </div>`;
}else if(active==='schools'){
 const points=DATA.schoolPoints||[],stats=DATA.schoolStatistics||[],par=DATA.schoolParitarie||[];
 const fmt=n=>Number(n||0).toLocaleString('it-IT');
 const totalStudents=stats.reduce((a,x)=>a+(+x.students||0),0);
 const orders=['Infanzia','Primaria','Secondaria I grado','Secondaria II grado'];
 html+=`<style>
 .school-legend{display:flex;flex-wrap:wrap;gap:12px 20px;margin:12px 0 18px}.school-legend span{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#29445e}.school-legend i{width:12px;height:12px;border-radius:50%;display:inline-block}.school-row-selected{background:#e8f1fb!important;outline:2px solid #2563eb;outline-offset:-2px;cursor:pointer}.school-table tbody tr[data-school-id]{cursor:pointer}.school-table tbody tr[data-school-id]:hover{background:#f1f6fc}.school-popup{min-width:190px;line-height:1.55}.school-order-tag{display:inline-block;border-left:4px solid var(--school-color);padding:3px 7px;background:#f1f5f9;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap}.school-map{height:430px;width:100%;border-radius:10px}.school-controls{display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:12px;margin:12px 0}.school-controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#58708a}.school-controls input,.school-controls select{min-height:38px;border:1px solid #cbd8e6;border-radius:7px;padding:7px;background:#fff;color:#173653}.school-table{max-height:420px;overflow:auto}.school-table table{min-width:740px}.school-note{font-size:12px;color:#60758b;line-height:1.5}.school-verification-tag{display:inline-block;padding:3px 6px;border-radius:5px;background:#eef2f7;color:#334155;font-size:10px;font-weight:700;white-space:nowrap}.school-territory-head{display:flex;align-items:baseline;gap:10px;margin:6px 0}.school-territory-head strong{font-size:24px;color:#173653}.school-territory-head span,.school-territory-breakdown{font-size:12px;color:#58708a}.school-territory-breakdown{display:flex;flex-wrap:wrap;gap:8px 18px;margin:10px 0}.school-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.school-kpis .card{margin:0}@media(max-width:800px){.school-controls,.school-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
 </style>
 <div class="school-kpis">
 <div class="card"><span class="muted">Sedi comunali georeferenziate</span><div class="metric">${fmt(points.length)}</div><small class="muted">Catalogo KML 2021, plessi e sedi</small></div>
 <div class="card"><span class="muted">Plessi statali con dati USR</span><div class="metric">${fmt(stats.length)}</div><small class="muted">Anno scolastico 2025/2026</small></div>
 <div class="card"><span class="muted">Alunni nei plessi censiti</span><div class="metric">${fmt(totalStudents)}</div><small class="muted">Dato USR 2025/2026</small></div>
 <div class="card"><span class="muted">Scuole paritarie in elenco</span><div class="metric">${fmt(par.length)}</div><small class="muted">USR 2025/2026, senza coordinate</small></div>
 <div class="card"><span class="muted">Sedi nel crosswalk documentale</span><div class="metric">${fmt(siteVerification.length)}</div><small class="muted">Crosswalk v13 · 72 con esito, 1 non verificata</small></div>
 </div>
 <div class="card"><h3>Rete scolastica nell’ambito territoriale selezionato</h3><div id="schoolTerritoryMetrics"></div><p class="school-note">Il riepilogo si aggiorna con la selezione condivisa di circoscrizione, quartiere, UPL e sezione censuaria. Le sedi non classificate restano conteggiate come punti cartografici, ma non vengono forzate in un ordine scolastico.</p></div>
 <div class="card"><h3>Distribuzione territoriale delle sedi</h3>
 <p class="school-note">La mappa mostra le 271 sedi del catalogo comunale 2021. I dati USR 2025/2026 e le paritarie sono tenuti in archivi distinti: non vengono assegnati a coordinate o quartieri senza corrispondenza verificata.</p>
 <div class="school-legend" aria-label="Legenda ordini scolastici">${[{k:'NIDO',l:'NIDO',c:'#d97706'},{k:'INFANZIA',l:'INFANZIA',c:'#db2777'},{k:'ELEMENTARI',l:'ELEMENTARI',c:'#16845b'},{k:'MEDIE',l:'MEDIE',c:'#2563eb'},{k:'SUPERIORI',l:'SUPERIORI',c:'#7c3aed'}].map(x=>'<span><i style="background:'+x.c+'"></i>'+x.l+'</span>').join('')}</div>
 <div class="school-controls">
 <label>Tipologia<select id="schoolKind"><option value="">Tutte</option><option value="Asilo nido">Asili nido</option><option value="Plesso">Plessi</option><option value="Sede">Sedi</option></select></label>
 <label>Ordine scolastico<select id="schoolOrder"><option value="">Tutti gli ordini</option><option value="NIDO">NIDO</option><option value="INFANZIA">INFANZIA</option><option value="ELEMENTARI">ELEMENTARI</option><option value="MEDIE">MEDIE</option><option value="SUPERIORI">SUPERIORI</option></select></label>
 <label>Cerca sede<input id="schoolSearch" type="search" placeholder="Nome, istituto, indirizzo"></label>
 </div>
 <div id="schoolMap" class="school-map"></div><p id="schoolMapStatus" class="school-note"></p>
 <div class="school-table"><table><thead><tr><th>Sede</th><th>Ordine scolastico</th><th>Tipologia</th><th>Istituto</th><th>Indirizzo</th><th>Quartiere KML</th><th>Anno</th><th>Verifica documentale</th></tr></thead><tbody id="schoolPointRows"></tbody></table></div>
 </div>
 <div class="card"><h3>Anagrafica dei plessi e dati USR</h3><p class="school-note">401 record di plesso con codice meccanografico. Il registro 2026/27 è collegato per codice esatto dell'istituzione: il codice del plesso resta distinto. Le 73 sedi del crosswalk documentale sono consultabili nella mappa, senza estendere automaticamente gli ordini dell'istituzione al singolo edificio. Il collegamento statistico-cartografico puntuale tra i 401 record USR e i 271 punti comunali non è ancora completo: nessun dato di alunni viene aggregato a quartiere, UPL o sezione censuaria finché il singolo plesso fisico non è identificato in modo univoco.</p>
 <div class="school-kpis">${orders.map(o=>{const x=stats.filter(z=>z.order===o);return '<div class="card"><span class="muted">'+esc(o)+'</span><div class="metric">'+fmt(x.length)+'</div><small class="muted">'+fmt(x.reduce((n,z)=>n+(+z.students||0),0))+' alunni</small></div>';}).join('')}</div>
 <div class="school-controls"><label>Ordine<select id="schoolStatsOrder"><option value="">Tutti</option>${orders.map(o=>'<option>'+esc(o)+'</option>').join('')}</select></label><label>Cerca plesso/istituto<input id="schoolStatsSearch" type="search" placeholder="Denominazione o codice"></label></div>
 <div class="school-table"><table><thead><tr><th>Codice</th><th>Plesso</th><th>Ordine</th><th>Istituto</th><th>Alunni</th><th>Classi/sezioni</th><th>Alunni con disabilità</th><th>Codice istituzione 2026/27</th><th>Istituzione 2026/27</th><th>Indirizzo istituzione</th><th>Esito abbinamento</th></tr></thead><tbody id="schoolStatsRows"></tbody></table></div><p id="schoolStatsStatus" class="school-note"></p></div>
 <div class="card"><h3>Scuole paritarie</h3><p class="school-note">Elenco USR Sicilia 2025/2026. L'archivio disponibile non contiene coordinate né ordine scolastico normalizzato.</p>
 <label class="school-controls">Cerca scuola<input id="schoolParSearch" type="search" placeholder="Nome, codice o indirizzo"></label>
 <div class="school-table"><table><thead><tr><th>Codice</th><th>Denominazione</th><th>Indirizzo</th><th>Gestione</th><th>Anno</th></tr></thead><tbody id="schoolParRows"></tbody></table></div><p id="schoolParStatus" class="school-note"></p></div>
 <div class="card"><h3>Fonti e metodologia</h3><ul><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=328" target="_blank" rel="noopener">Comune di Palermo, catalogo KML scuole</a>, aggiornamento 2021.</li><li><a href="https://www.usr.sicilia.it/open-data/" target="_blank" rel="noopener">USR Sicilia, Open Data</a>, organico di fatto e paritarie 2025/2026.</li></ul><p class="school-note">I dati KML descrivono localizzazioni, quelli USR consistenza scolastica. Non vengono sommati. L'anagrafica 2025/26 è collegata al registro istituzioni 2026/27 per codice esatto. Le sedi con riserve o mancata verifica restano esplicitamente segnalate. La copertura per quartiere e UPL dei dati USR sarà calcolata dopo geocodifica verificata. Non sono ancora disponibili analisi di bacino pedonale.</p></div>`;
}else if(active==='standards'){
 const standard=[['Istruzione','4,50','Asili nido, scuole dell’infanzia e dell’obbligo'],['Attrezzature di interesse comune','2,00','Servizi religiosi, culturali, sociali, assistenziali, sanitari e amministrativi'],['Verde, gioco e sport','9,00','Aree pubbliche attrezzate ed effettivamente fruibili'],['Parcheggi','2,50','Aree per parcheggi, oltre alle sedi viarie']];
 html+=`<div class="card standards-calculator"><h3>Simulatore del fabbisogno di standard</h3><p class="muted">Inserisci la popolazione di riferimento e le superfici effettivamente disponibili. Il calcolo è una simulazione parametrica, non una certificazione urbanistica.</p><div class="calc-input"><label>Popolazione di riferimento<input id="stdPopulation" type="number" min="0" step="1" placeholder="Inserisci numero abitanti"></label></div><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Standard (m²/ab)</th><th>Superficie disponibile (m²)</th><th>Fabbisogno teorico (m²)</th><th>Differenza (m²)</th></tr></thead><tbody>${standard.map((x,i)=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td><input class="std-area" data-index="${i}" type="number" min="0" step="0.01" placeholder="Da inserire" aria-label="Superficie disponibile ${x[0]}"></td><td id="stdNeed${i}">N.D.</td><td id="stdGap${i}">N.D.</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Totale</th><th id="stdTotalNeed">N.D.</th><th id="stdTotalGap">N.D.</th></tr></tfoot></table></div><p id="stdCalcStatus" class="muted comparison-note">Inserisci popolazione e superfici per calcolare fabbisogno e differenziali.</p></div>`;
 html+='<div class="card"><h3>Raggi di influenza delle attrezzature scolastiche</h3><p class="muted">Bacini circolari di prossimità calcolati sulle sedi georeferenziate e classificate. Sono soglie analitiche indicative, non distanze normative né isocrone pedonali: non considerano barriere, pendenze, attraversamenti o rete stradale.</p><div class="school-controls"><label>Ordine scolastico<select id="stdSchoolOrder"><option value="">Tutti gli ordini classificati</option><option value="NIDO">Nidi</option><option value="INFANZIA">Infanzia</option><option value="ELEMENTARI">Primaria</option><option value="MEDIE">Secondaria I grado</option><option value="SUPERIORI">Secondaria II grado</option></select></label><label>Visualizzazione<select id="stdBufferMode"><option value="all">Raggi e sedi</option><option value="buffers">Solo raggi</option><option value="points">Solo sedi</option></select></label></div><div id="standardSchoolMap" class="school-map"></div><p id="standardSchoolStatus" class="school-note"></p><p class="school-note">Raggi adottati: nidi e infanzia 500 m; primaria 800 m; secondaria di I grado 1.000 m; secondaria di II grado 1.500 m. Il valore di 1,5 km è assunto anche come soglia comparativa di prossimità per la primaria in una specifica elaborazione Openpolis, non come prescrizione generale. Le sedi prive di ordine documentato non ricevono un buffer.</p></div>';
 html+=`<div class="grid standards-kpis"><div class="card"><span class="muted">Dotazione complessiva di riferimento</span><div class="metric">18,00 <small>m²/ab</small></div><small class="muted">D.M. 1444/1968, art. 3</small></div><div class="card"><span class="muted">Categorie di standard</span><div class="metric">4</div><small class="muted">Ripartizione ordinaria</small></div><div class="card"><span class="muted">Superfici validate</span><div class="metric">N.D.</div><small class="muted">Da acquisire e verificare</small></div><div class="card"><span class="muted">Verifica di conformità</span><div class="metric">Non calcolabile</div><small class="muted">Mancano superfici georeferenziate</small></div></div><div class="card"><h3>Parametri di riferimento del D.M. 1444/1968</h3><p class="muted">Dotazioni minime di norma per gli insediamenti residenziali. I parametri non descrivono la dotazione effettivamente presente a Palermo.</p><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Parametro</th><th>Contenuto</th></tr></thead><tbody>${standard.map(x=>`<tr><td><b>${x[0]}</b></td><td><b>${x[1]} m²/ab</b></td><td>${x[2]}</td></tr>`).join('')}</tbody><tfoot><tr><th>Totale</th><th>18,00 m²/ab</th><th>Escluse le sedi viarie</th></tr></tfoot></table></div></div><div class="card"><h3>Procedura di verifica territoriale</h3><div class="workflow-grid"><div><b>1. Inventario</b><span>Acquisizione dei poligoni e delle superfici per categoria.</span></div><div><b>2. Validazione</b><span>Controllo di geometrie, destinazioni, fruibilità e aggiornamento.</span></div><div><b>3. Attribuzione</b><span>Associazione delle superfici a quartieri e circoscrizioni tramite overlay GIS.</span></div><div><b>4. Calcolo</b><span>m² per abitante, fabbisogno teorico e differenziale per categoria.</span></div></div><p class="notice-inline">Non viene calcolato alcun deficit o surplus finché non saranno disponibili superfici attendibili e popolazione coerente per territorio e anno.</p></div>`;
 }else if(active==='gis'){
 html+=`<div class="grid gis-kpis"><div class="card"><span class="muted">Circoscrizioni</span><div class="metric">8</div></div><div class="card"><span class="muted">Quartieri</span><div class="metric">25</div></div><div class="card"><span class="muted">Layer validati</span><div class="metric">0</div></div><div class="card"><span class="muted">Sistema di riferimento</span><div class="metric">Da verificare</div></div></div><div class="card"><h3>${active==='gis'?'Cartografia GIS':'Analisi spaziale e accessibilità'}</h3><p class="muted">Mappa di base interattiva. Le basi territoriali ISTAT 2021 comprendono sezioni censuarie e aree subcomunali; i confini comunali e le circoscrizioni del Comune hanno aggiornamenti differenti. I livelli ISTAT 2021 per Palermo comprendono 3.600 sezioni censuarie, 8 circoscrizioni (ASC1) e 55 aree ASC3 / UPL. I codici territoriali risultano agganciati; tre geometrie di sezione presentano auto-intersezioni e restano escluse da qualsiasi certificazione. Il totale censuario POP21 è 635.439 e non va confuso con l’anagrafe comunale 2022. I GeoJSON ISTAT 2021 sono pubblicati nel repository e vengono caricati automaticamente nella mappa. I layer sono preliminari: tre geometrie di sezione presentano auto-intersezioni da verificare in QGIS.</p><div id="map"></div><div class="card gis-import-panel"><h3>Layer cartografici ISTAT 2021</h3><p class="muted">Sono caricati automaticamente dal repository: circoscrizioni ASC1 (8), quartieri ASC2 (25), UPL ASC3 (55) e sezioni censuarie (3.600), in ordine gerarchico. Usa il selettore in alto a destra della mappa per attivare o disattivare ciascun livello. I controlli formali preliminari non sostituiscono la validazione topologica in QGIS; tre geometrie delle sezioni presentano auto-intersezioni già segnalate.</p><p id="gisAutoStatus" class="notice-inline" aria-live="polite">Caricamento dei layer cartografici dal repository…</p><h3>Importazione locale aggiuntiva</h3><p class="muted">Puoi continuare a caricare GeoJSON locali per verifiche o confronti temporanei. I file selezionati vengono letti nel browser e non modificano il repository.</p><label class="gis-file-label">Seleziona uno o più file GeoJSON <input id="gisFile" type="file" multiple accept=".geojson,.json,application/geo+json,application/json"></label><div id="gisReport" class="notice-inline" aria-live="polite">Nessun file caricato. I layer ufficiali restano non validati finché non vengono verificati.</div><p class="muted">Per preparare i layer ufficiali ISTAT 2021 è disponibile uno script Python nel <a href="https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/blob/main/tools/prepara_cartografia_istat.py" target="_blank" rel="noopener">repository GitHub</a>, con istruzioni nel README. Il <a href="data/geo/rapporto_controllo_istat_palermo_2021.json" target="_blank" rel="noopener">rapporto dei controlli preliminari</a> documenta conteggi, codici e anomalie. I file GeoJSON sono pubblicati in data/geo/ e non sono certificati per analisi topologiche.</p></div><div class="map-legend"><span><i class="legend-dot base"></i>Mappa di base</span><span><i class="legend-dot pending"></i>Layer territoriali da integrare</span></div></div><div class="grid"><div class="card"><h3>Fonti cartografiche individuate</h3><ul><li><a href="https://www.istat.it/storage/cartografia/basi_territoriali/2021/R19_21.zip" target="_blank" rel="noopener">ISTAT – download diretto basi territoriali 2021, Sicilia (R19_21.zip)</a><br><small class="muted">Archivio ufficiale delle sezioni censuarie regionali. CRS di origine EPSG:32632. Per la pubblicazione web occorre convertire in EPSG:4326, verificare il codice comunale di Palermo, gli identificativi di sezione, la validità geometrica e la copertura.</small></li><li><a href="https://www.istat.it/wp-content/uploads/2025/04/ASC_21.zip" target="_blank" rel="noopener">ISTAT – download diretto aree subcomunali 2021 (ASC_21.zip)</a><br><small class="muted">Archivio ufficiale aggiornato il 14 maggio 2026. Verificare le tabelle ASC di Palermo e i campi COD_ASCn, COD_ASCn_T, DEN_ASCn e TIPO_ASCn; non confondere i livelli ASC1, ASC2 e ASC3.</small></li><li><a href="https://www.istat.it/notizia/dati-per-sezioni-di-censimento/" target="_blank" rel="noopener">ISTAT – Censimento permanente al 31/12/2023</a><br><small class="muted">Dati per sezioni e aree subcomunali, riferiti alle basi territoriali 2021; aggiornamento del rilascio 9 giugno 2026. Il codice di sezione va verificato prima dell’abbinamento alla geometria. Le sezioni fittizie 888888x (senza tetto e senza fissa dimora) e 999999x (zone in contestazione) vanno mantenute separate dai poligoni ordinari.</small></li><li><a href="https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/" target="_blank" rel="noopener">ISTAT – confini amministrativi a fini statistici aggiornati al 1° gennaio 2026</a><br><small class="muted">Riferimento aggiornato per i confini amministrativi statistici; non sostituisce automaticamente i confini delle circoscrizioni comunali.</small></li><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=265" target="_blank" rel="noopener">Comune di Palermo – perimetrazione circoscrizioni (dataset 265)</a><br><small class="muted">Dato storico 2013, catalogo aggiornato nel 2018. Una segnalazione pubblica ha evidenziato differenze rispetto a ISTAT, assenza del file PRJ e un'anomalia geometrica della I circoscrizione: escluso dalle analisi fino a verifica tecnica.</small></li><li><a href="https://opendata.comune.palermo.it/opendata-dataset.php?dataset=1706" target="_blank" rel="noopener">Comune di Palermo – popolazione 2022 per sezione e classi quinquennali d'età</a><br><small class="muted">Fonte comunale aggiuntiva, mantenuta separata dai dati censuari ISTAT 2023 per differenza di anno e possibile differenza di codifica.</small></li></ul><p class="notice-inline">Stato operativo: fonti individuate, layer geografici non ancora validati e quindi non visualizzati.</p></div><div class="card"><h3>Procedura di integrazione dei layer</h3><ol><li>Scaricare e conservare gli archivi originali ISTAT R19_21.zip e ASC_21.zip, annotando data e versione.</li><li>Estrarre gli shapefile e verificare i metadati, il sistema di riferimento e i campi identificativi.</li><li>Selezionare Palermo tramite codice ISTAT del Comune, mai tramite il solo nome, e verificare la corrispondenza dei codici di sezione e delle aree subcomunali.</li><li>Abbinare i dati censuari 2023 alle geometrie 2021 usando il codice ufficiale della sezione; conservare separatamente le sezioni fittizie 888888x e 999999x, senza attribuire loro un poligono ordinario.</li><li>Controllare geometrie vuote o non valide, duplicati, sovrapposizioni, buchi e copertura territoriale.</li><li>Convertire una copia per il web in GeoJSON EPSG:4326, conservando gli identificativi originali e senza semplificazioni che alterino i confini.</li><li>Confrontare estensione e conteggi con i metadati ISTAT e registrare esito, data e operatore della validazione.</li></ol><p class="notice-inline">Stato attuale: archivi ufficiali individuati, ma non ancora acquisiti e verificati in questa versione del progetto. I layer sono disponibili per consultazione cartografica preliminare; nessuna analisi topologica o statistica derivata viene considerata validata.</p></div><div class="card"><h3>Analisi spaziali previste</h3><ul><li>Verifica topologica e sovrapposizione dei confini</li><li>Associazione delle sezioni censuarie alle unità subcomunali</li><li>Distanze e prossimità ai servizi</li><li>Bacini di influenza e aree raggiungibili</li><li>Mappe coropletiche demografiche e sociali</li></ul></div></div>`;
 }else if(active==='spatial'){
 html+=`<div class="grid spatial-kpis">
  <div class="card"><span class="muted">Unità territoriali disponibili</span><div class="metric">3.688</div><small class="muted">3.600 sezioni + 88 aree subcomunali</small></div>
  <div class="card"><span class="muted">Popolazione censuaria 2021</span><div class="metric">635.439</div><small class="muted">POP21, totale delle sezioni</small></div>
  <div class="card"><span class="muted">Codici territoriali agganciati</span><div class="metric">100%</div><small class="muted">Corrispondenza codici ASC verificata</small></div>
  <div class="card"><span class="muted">Geometrie da verificare</span><div class="metric">3</div><small class="muted">Auto-intersezioni nelle sezioni censuarie</small></div>
 </div>
 <div class="card"><h3>Ambito dell'analisi spaziale</h3><p class="muted">Questa sezione è dedicata all'interpretazione delle relazioni tra popolazione, territorio e servizi. I risultati quantitativi saranno attivati solo dopo l'abbinamento e la validazione dei dataset tematici, evitando di presentare come misure effettive analisi non ancora calcolate.</p>
 <div class="workflow-grid">
  <div><b>1. Distribuzione della popolazione</b><span>Confronto della POP21 tra sezioni censuarie e aggregazioni ASC1 e ASC3. Base disponibile; da completare la restituzione tematica.</span></div>
  <div><b>2. Concentrazione e densità</b><span>Calcolo degli abitanti per km², previa verifica delle superfici geometriche e della coerenza del perimetro territoriale.</span></div>
  <div><b>3. Accessibilità ai servizi</b><span>Distanze, tempi di percorrenza e bacini di influenza per scuole, verde pubblico, impianti sportivi e servizi collettivi. Richiede inventari georeferenziati validati.</span></div>
  <div><b>4. Disuguaglianze territoriali</b><span>Confronto tra distribuzione demografica, dotazioni e indicatori socio-economici, mantenendo distinti anno e unità geografica di ogni fonte.</span></div>
 </div></div>
 <div class="card"><h3>Stato di disponibilità delle analisi</h3><div class="table-wrap"><table><thead><tr><th>Analisi</th><th>Dati necessari</th><th>Stato</th></tr></thead><tbody>
  <tr><td>Distribuzione della popolazione</td><td>POP21 e geometrie ISTAT 2021</td><td><span class="data-status">Base disponibile</span></td></tr>
  <tr><td>Densità abitativa</td><td>POP21, superfici e geometrie validate</td><td><span class="data-status">Da calcolare</span></td></tr>
  <tr><td>Prossimità ai servizi</td><td>Scuole, verde, sport e servizi con coordinate verificate</td><td><span class="data-status">Dati da integrare</span></td></tr>
  <tr><td>Bacini di accessibilità</td><td>Rete stradale/pedonale e localizzazione dei servizi</td><td><span class="data-status">Dati da integrare</span></td></tr>
  <tr><td>Confronto socio-spaziale</td><td>Indicatori sociali e geografici con codici territoriali coerenti</td><td><span class="data-status">Abbinamento da validare</span></td></tr>
 </tbody></table></div><p class="notice-inline">Nota metodologica: il totale POP21 di 635.439 è riferito al censimento 2021 e non è intercambiabile con la popolazione anagrafica comunale 2022 o con i dati censuari 2023.</p></div>
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
 ['Normativa statale','D.M. 1444/1968, art. 3','1968','Standard urbanistici','https://www.edizionieuropee.it/law/html/15/zn38_04_015.html','Parametro normativo, non fonte delle superfici effettivamente presenti.']
 ];
 html+=`<div class="card source-list"><h3>Registro delle fonti ufficiali</h3><p class="muted">La presenza di un dataset nel catalogo non equivale alla sua validazione tecnica. Il registro distingue ente produttore, anno del dato e stato di utilizzo.</p><div class="table-wrap"><table><thead><tr><th>Ente</th><th>Dataset / contenuto</th><th>Riferimento temporale</th><th>Fonte</th><th>Nota metodologica</th></tr></thead><tbody>${fonti.map(f=>`<tr><td>${f[0]}</td><td><strong>${f[1]}</strong></td><td>${f[2]}</td><td><a href="${f[4]}" target="_blank" rel="noopener">${f[3]}</a></td><td>${f[5]}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="grid"><div class="card"><h3>Protocollo di validazione</h3><ol><li>Verifica ente produttore, metadati, licenza e data di riferimento.</li><li>Acquisizione del file originale e conservazione della versione scaricata.</li><li>Controllo di intestazioni, codici, record mancanti, duplicati e totali.</li><li>Verifica del sistema di riferimento, geometrie e copertura territoriale.</li><li>Associazione tra dato statistico e unità geografica mediante codici ufficiali, non per somiglianza dei nomi.</li><li>Confronto con i totali pubblicati dall’ente e registrazione degli scostamenti.</li></ol></div><div class="card"><h3>Regole di comparabilità</h3><ul><li>I dati anagrafici comunali al 31/12/2022 e i dati censuari ISTAT 2023 restano serie distinte.</li><li>Le basi territoriali ISTAT 2021 non sono automaticamente intercambiabili con perimetrazioni comunali precedenti.</li><li>Un quartiere associato a più circoscrizioni non deve essere sommato integralmente a ciascuna di esse.</li><li>Le superfici urbanistiche si conteggiano solo dopo verifica di destinazione, proprietà, accessibilità e fruibilità.</li><li>Ogni indicatore elaborato dichiara formula, unità territoriale, anno e fonte.</li></ul></div></div>
 <div class="card"><h3>Stato di validazione</h3><p><strong>Dati demografici 2022 per quartiere e circoscrizione:</strong> acquisiti e utilizzati con riferimento al 31/12/2022.</p><p><strong>Dati per sezione censuaria e classi d’età:</strong> fonte ufficiale individuata, associazione geografica ancora da completare.</p><p><strong>Cartografia e inventari dei servizi:</strong> fonti individuate, geometrie e aggiornamento da verificare prima di attivare analisi spaziali e conteggi.</p><p class="notice-inline">Nessun valore derivato da fonti non verificate sarà presentato come dato ufficiale o risultato definitivo.</p></div>`;

 }
  const pieCanvasId='sectionTerritoryPie';
 const pieTitle={overview:'Composizione del quadro territoriale',demography:'Composizione della popolazione residente',social:'Distribuzione delle UPL per classi IDISE',schools:'Distribuzione dei punti scolastici per ordine prevalente',standards:'Ripartizione dei parametri minimi di standard',gis:'Articolazione dei livelli territoriali',spatial:'Stato delle analisi spaziali',compare:'Popolazione per circoscrizione',sources:'Fonti documentali per archivio'}[active]||'Analisi territoriale';
 let pieLabels=[],pieValues=[];
 const pieNorm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(active==='overview'){pieLabels=['Circoscrizioni','Quartieri','UPL','Sezioni censuarie'];pieValues=[DATA.territories.circoscrizioni.length,DATA.territories.quartieri.length,GEO.asc3?.features?.length||55,GEO.sections?.features?.length||3600];}
 else if(active==='demography'){const q=DATA.territories.quartieri.find(x=>x.id===s.quart)?.name;const rows=DATA.demografia.filter(x=>x.tipo_territorio==='quartiere'&&(!s.circ||(x.circoscrizioni_id||[]).includes(s.circ))&&(!s.quart||pieNorm(x.nome)===pieNorm(q)));const row=s.quart?rows[0]:s.circ?DATA.demografia.find(x=>x.tipo_territorio==='circoscrizione'&&x.territorio_id===s.circ):null;const sum=k=>row?Number(row[k])||0:rows.reduce((n,x)=>n+(Number(x[k])||0),0);pieLabels=['Italiani','Stranieri'];pieValues=[sum('italiani'),sum('stranieri')];}
 else if(active==='social'){const a=(DATA.sociale||[]).filter(x=>!s.asc3||String(x.cod_asc)===String(s.asc3));pieLabels=['IDISE < 90','IDISE 90-100','IDISE > 100'];pieValues=[a.filter(x=>Number(x.idise)<90).length,a.filter(x=>Number(x.idise)>=90&&Number(x.idise)<=100).length,a.filter(x=>Number(x.idise)>100).length];}
 else if(active==='schools'){const cl=DATA.schoolClassification?.records||[],pt=DATA.schoolPoints||[],byId=new Map(cl.map(x=>[String(x.point_id),x]));const counts={NIDO:0,INFANZIA:0,ELEMENTARI:0,MEDIE:0,SUPERIORI:0,'Non classificati':0};pt.forEach(p=>{const os=byId.get(String(p.id))?.orders||[];const first=os[0]||(p.kind==='Asilo nido'?'NIDO':'Non classificati');counts[first]=(counts[first]||0)+1;});pieLabels=Object.keys(counts);pieValues=Object.values(counts);}
 else if(active==='standards'){pieLabels=['Istruzione','Interesse comune','Verde e sport','Parcheggi'];pieValues=[4.5,2,9,2.5];}
 else if(active==='gis'){pieLabels=['Circoscrizioni ASC1','Quartieri ASC2','UPL ASC3','Sezioni censuarie'];pieValues=[GEO.asc1?.features?.length||8,GEO.asc2?.features?.length||25,GEO.asc3?.features?.length||55,GEO.sections?.features?.length||3600];}
 else if(active==='spatial'){pieLabels=['Base territoriale disponibile','Analisi da completare'];pieValues=[1,3];}
 else if(active==='compare'){const ds=DATA.demografia.filter(x=>x.tipo_territorio==='circoscrizione');const rows=DATA.territories.circoscrizioni.map(c=>({name:c.name,value:Number(ds.find(x=>x.territorio_id===c.id)?.totale)||0}));pieLabels=rows.map(x=>x.name);pieValues=rows.map(x=>x.value);}
 else if(active==='sources'){pieLabels=['Comune di Palermo','ISTAT','USR Sicilia','Cartografia comunale'];pieValues=[4,3,2,1];}
 html+='<div class="card section-pie-card"><h3>'+pieTitle+'</h3><p class="school-note">Il grafico si aggiorna in base alla sezione e ai filtri territoriali. Le quote rappresentano esclusivamente le categorie e i dati indicati, non una stima di copertura.</p><div class="section-pie-wrap"><canvas id="sectionTerritoryPie" aria-label="'+pieTitle+'" role="img"></canvas></div></div>';
 $('#content').innerHTML=html;
 if(active==='schools')initSchools();
 
if(active==='standards'){
 initStandardSchoolMap();
 const pop=document.getElementById('stdPopulation');
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
 const nomeFiltroDemo=sd.quart?nomeQD:null;
 const rd=qd.filter(x=>(!sd.circ||(x.circoscrizioni_id||[]).includes(sd.circ))&&(!sd.quart||normGrafico(x.nome)===normGrafico(nomeQD)));
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
 if(active==='gis') initMap();
$('#territory').textContent=(DATA.territories.quartieri.find(x=>x.id===s.quart)?.name||DATA.territories.circoscrizioni.find(x=>x.id===s.circ)?.name||'Palermo').replace(/(^|[\s-])(\p{L})/gu,(_,sep,letter)=>sep+letter.toLocaleUpperCase('it-IT'));
}
function initMap(){
 let el=$('#map');if(!el||!window.L)return;
 populateGisSelectors();

 if(gisMap){gisMap.remove();gisMap=null;gisImportedLayers=[];gisLayerControl=null;}
 gisMap=L.map(el).setView([38.1157,13.3615],12);
 const autoStatus=$('#gisAutoStatus');
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(gisMap);
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
    const areaName=item.key==='asc1'?props.DEN_ASC1:item.key==='asc2'?props.DEN_ASC2:item.key==='asc3'?props.DEN_ASC3:'';
    if(areaName)featureLayer.bindTooltip(String(areaName).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),{permanent:true,direction:'center',className:'gis-polygon-label',opacity:1});
   }});
   layer.eachLayer(featureLayer=>{featureLayer.on('mouseover',()=>featureLayer.setStyle?.({weight:3,fillOpacity:.16}));featureLayer.on('mouseout',()=>applyGisSelectedStyle());});
   layer.addTo(gisMap);
   gisImportedLayers.push({name:item.name,key:item.key,layer,featureLayers:layer.getLayers()});
   applyGisSelectionVisibility();
   populateGeoSelectors();
   return item.name+': '+data.features.length+' elementi caricati';
  }catch(error){return item.name+': errore di caricamento ('+error.message+')';}
 })).then(results=>{
  updateControl();
  const group=L.featureGroup(gisImportedLayers.map(x=>x.layer));
  if(gisImportedLayers.length){const bounds=group.getBounds();if(bounds.isValid())gisMap.fitBounds(bounds,{padding:[18,18]});}applyGisSelectedStyle();focusGeneralSelection();
  if(autoStatus)autoStatus.textContent=results.join(' · ')+(gisImportedLayers.length?' . Seleziona i livelli dal controllo della mappa.':' . Nessun layer ufficiale caricato.');
 });

 const updateControl=()=>{
  if(gisLayerControl){gisMap.removeControl(gisLayerControl);gisLayerControl=null;}
  const overlays={};
  gisImportedLayers.slice().sort((a,b)=>officialLayers.findIndex(x=>x.key===a.key)-officialLayers.findIndex(x=>x.key===b.key)).forEach((item)=>{overlays[item.name]=item.layer;});
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

function initStandardSchoolMap(){
 const el=$('#standardSchoolMap');if(!el||!window.L)return;
 const pts=DATA.schoolPoints||[],records=DATA.schoolClassification?.records||[];const byId=new Map(records.map(x=>[String(x.point_id),x]));
 const info={NIDO:{label:'Nido',radius:500,color:'#d97706'},INFANZIA:{label:'Infanzia',radius:500,color:'#db2777'},ELEMENTARI:{label:'Primaria',radius:800,color:'#16845b'},MEDIE:{label:'Secondaria I grado',radius:1000,color:'#2563eb'},SUPERIORI:{label:'Secondaria II grado',radius:1500,color:'#7c3aed'}};
 const g=selected(),order=$('#stdSchoolOrder'),mode=$('#stdBufferMode'),status=$('#standardSchoolStatus');
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const aliases={'MEZZOMONREALE-V.LLA TASCA':'Mezzomonreale-Villa Tasca','MONTEGRAPPA- S.ROSALIA':'S. Rosalia-Montegrappa','PALAZZO REALE - M.TE DI PIETA':'Palazzo Reale-Monte di Pietà','RESUTTANO-S. LORENZO':'Resuttana-San Lorenzo'};
 const belongs=p=>{if(g.quart){const target=DATA.territories.quartieri.find(q=>q.id===g.quart)?.name;if(norm(aliases[p.quarter]||p.quarter)!==norm(target))return false;}if(g.circ){const f=GEO.asc1?.features?.find(x=>String(x.properties?.COD_ASC1)===String(g.circ).replace('c',''));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(g.asc2){const f=GEO.asc2?.features?.find(x=>String(x.properties?.COM_ASC2)===String(g.asc2));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(g.asc3){const f=GEO.asc3?.features?.find(x=>String(x.properties?.COM_ASC3)===String(g.asc3));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}if(g.section){const f=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(g.section));if(f&&!pointInGeometry([p.lon,p.lat],f.geometry))return false;}return true;};
 const map=L.map(el).setView([38.1157,13.3615],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
 const buffers=L.layerGroup().addTo(map),markers=L.layerGroup().addTo(map);
 const draw=()=>{buffers.clearLayers();markers.clearLayers();const eligible=pts.filter(belongs).flatMap(p=>{const os=byId.get(String(p.id))?.orders||[];return os.filter(k=>info[k]&&(!order.value||order.value===k)).map(k=>({p,k}));});eligible.forEach(({p,k})=>{const x=info[k],point=[p.lat,p.lon];if(mode.value!=='points')L.circle(point,{radius:x.radius,color:x.color,weight:1.5,fillColor:x.color,fillOpacity:.10}).bindPopup('<b>'+String(p.name).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))+'</b><br>'+x.label+' · raggio indicativo '+x.radius.toLocaleString('it-IT')+' m').addTo(buffers);if(mode.value!=='buffers')L.circleMarker(point,{radius:5,color:x.color,fillColor:x.color,fillOpacity:.95,weight:1.5}).bindPopup('<b>'+String(p.name).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))+'</b><br>'+x.label+'<br>'+String(p.address||'')).addTo(markers);});const unique=new Set(eligible.map(x=>x.p.id)).size;status.textContent=eligible.length+' associazioni sede/ordine visualizzate su '+unique+' punti scolastici. I punti con più ordini possono generare buffer sovrapposti; i 271 punti cartografici non sono tutti classificati.';};
 order.addEventListener('change',draw);mode.addEventListener('change',draw);draw();
 const selectedPoints=pts.filter(belongs);if(selectedPoints.length){const bounds=L.latLngBounds(selectedPoints.map(p=>[p.lat,p.lon]));if(bounds.isValid())map.fitBounds(bounds,{padding:[20,20],maxZoom:13});}
}
async function loadSchoolArchives(){
 const defs=[['schoolPoints','data/scuole_points.json'],['schoolStatistics','data/scuole_statistics.json'],['schoolParitarie','data/scuole_paritarie.json'],['schoolClassification','data/scuole_classificazione.json'],['schoolRegister','data/anagrafica_plessi_2025_26.json'],['schoolSiteVerification','data/verifica_sedi_scolastiche_v13.json']];
 await Promise.all(defs.map(async([k,u])=>{try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);DATA[k]=await r.json();}catch(e){console.warn('Archivio scuole non disponibile',u,e);DATA[k]=[];}}));
 if(active==='schools')render();
}
function initSchools(){
 const pts=DATA.schoolPoints||[],stats=DATA.schoolStatistics||[],pars=DATA.schoolParitarie||[],classification=DATA.schoolClassification?.records||[],register=DATA.schoolRegister?.records||[],siteVerification=DATA.schoolSiteVerification?.records||[];
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
 const filtered=()=>pts.filter(p=>(!kind.value||p.kind===kind.value)&&(!order.value||ordersOf(p).includes(order.value))&&belongs(p)&&(!search.value||norm([p.name,p.institution,p.address].join(' ')).includes(norm(search.value))));
 const territoryPoints=()=>pts.filter(belongs);
 const drawTerritorySummary=()=>{const area=territoryPoints(),classified=area.filter(p=>ordersOf(p).length).length,metrics=$('#schoolTerritoryMetrics');if(!metrics)return;const countByOrder=orderInfo.map(o=>({label:o.label,count:area.filter(p=>ordersOf(p).includes(o.key)).length})).filter(x=>x.count>0);metrics.innerHTML='<div class="school-territory-head"><strong>'+area.length.toLocaleString('it-IT')+'</strong><span>sedi e punti cartografici nell’ambito selezionato</span></div><div class="school-territory-head"><strong>'+classified.toLocaleString('it-IT')+'</strong><span>punti con almeno un ordine scolastico documentato</span></div><div class="school-territory-breakdown">'+(countByOrder.map(x=>'<span>'+esc(x.label)+': <b>'+x.count.toLocaleString('it-IT')+'</b></span>').join('')||'<span>Nessun ordine scolastico documentato nell’ambito selezionato</span>')+'</div><small class="school-note">Le categorie indicano presenze per ordine e possono sovrapporsi nello stesso edificio. Il conteggio non equivale al numero di istituzioni scolastiche né agli alunni iscritti.</small>';};
 let map=null,layer=null;const markersById=new Map();let selectedPointId=null;
 const draw=()=>{
  const list=filtered();drawTerritorySummary();
  rows.innerHTML=list.map(p=>{const v=verificationById.get(String(p.id));const verified=v&&v.status!=='NON_VERIFICATO';const institution=verified&&v.institutionName?v.institutionName:(p.institution||'N.D.');const verificationLabel=v?(v.status==='NON_VERIFICATO'?'NON VERIFICATO':v.status.includes('RISERVA')?'CON RISERVA':v.status.includes('DA_RETTIFICARE')?'DA RETTIFICARE':v.status.startsWith('CONFERMATO')?'CONFERMATO':'DA VERIFICARE'):'NON VERIFICATA';return '<tr data-school-id="'+esc(p.id)+'" tabindex="0" class="'+(p.id===selectedPointId?'school-row-selected':'')+'"><td>'+esc(p.name)+'</td><td><span class="school-order-tag" style="--school-color:'+orderColor(orderOf(p))+'">'+esc(orderLabel(orderOf(p)))+'</span></td><td>'+esc(p.kind)+'</td><td>'+esc(institution)+'</td><td>'+esc(p.address||'N.D.')+'</td><td>'+esc(p.quarter||'N.D.')+'</td><td>'+esc(p.year||'2021')+'</td><td><span class="school-verification-tag" title="'+esc(v?.note||'Nessuna verifica documentale associata')+'">'+esc(verificationLabel)+'</span></td></tr>';}).join('')||'<tr><td colspan="8">Nessuna sede trovata.</td></tr>';
  status.textContent='Sedi mostrate: '+list.length+' su '+pts.length+'. Sedi nel crosswalk documentale: '+siteVerification.length+'; non verificate: '+siteVerification.filter(x=>x.status==='NON_VERIFICATO').length+'. Gli ordini mostrati restano quelli attribuiti al singolo punto, non quelli generali dell’istituzione.';
  if(layer){layer.clearLayers();markersById.clear();list.forEach(p=>{const schoolOrders=ordersOf(p);const col=orderColor(schoolOrders[0]);const marker=L.circleMarker([p.lat,p.lon],{radius:p.id===selectedPointId?11:7,color:p.id===selectedPointId?'#111827':col,fillColor:col,fillOpacity:p.id===selectedPointId?1:.85,weight:p.id===selectedPointId?4:2});const classificationRecord=classificationById.get(String(p.id));const verification=verificationById.get(String(p.id));const verifiedInstitution=verification&&verification.status!=='NON_VERIFICATO'&&verification.institutionName?verification.institutionName:(verification?.status==='NON_VERIFICATO'?'Associazione istituzionale non verificata':(p.institution||'Istituto non indicato'));const orderText=schoolOrders.length?schoolOrders.map(orderLabel).join(' · '):(p.kind==='Asilo nido'?'NIDO':'Classificazione non ancora documentata');const codeText=classificationRecord?.school_codes?.length?'Codici meccanografici: '+classificationRecord.school_codes.join(', '):'';const verificationText=verification?'Verifica documentale: '+verification.status+(verification.note?' · '+verification.note:''):'Verifica documentale non disponibile';const sourceLink=verification?.sourceUrl?'<br><a href="'+esc(verification.sourceUrl)+'" target="_blank" rel="noopener">Fonte della verifica</a>':'';const popup='<div class="school-popup"><strong>'+esc(p.name)+'</strong><br><b>'+esc(orderText)+'</b><br>'+esc(p.kind)+'<br>'+esc(p.address||'Indirizzo non disponibile')+'<br>'+esc(verifiedInstitution)+'<br>'+esc(p.quarter||'Quartiere non indicato')+'<br>'+esc(codeText)+'<br><small>'+esc(verificationText)+'</small>'+sourceLink+'<br><small>Fonte localizzazione: '+esc(p.source||'Comune di Palermo, KML 2021')+'</small>'+(classificationRecord?'<br><small>Classificazione: '+esc(classificationRecord.method)+' · '+esc(classificationRecord.source_year)+'</small>':'')+'</div>';marker.bindPopup(popup);marker.on('click',()=>selectSchool(p.id,false));marker.addTo(layer);markersById.set(String(p.id),marker);});}
 };
 const selectSchool=(id,fromList)=>{const p=pts.find(x=>String(x.id)===String(id));if(!p)return;selectedPointId=String(id);rows.querySelectorAll('tr[data-school-id]').forEach(row=>row.classList.toggle('school-row-selected',row.dataset.schoolId===selectedPointId));const marker=markersById.get(selectedPointId);if(marker){marker.setStyle({radius:11,color:'#111827',fillOpacity:1,weight:4});if(fromList){map.setView([p.lat,p.lon],Math.max(map.getZoom(),15),{animate:true});marker.openPopup();}else marker.openPopup();}rows.querySelector('tr[data-school-id="'+CSS.escape(selectedPointId)+'"]')?.scrollIntoView({block:'nearest',behavior:'smooth'});};
 rows.addEventListener('click',e=>{const row=e.target.closest('tr[data-school-id]');if(row)selectSchool(row.dataset.schoolId,true);});
 rows.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('tr[data-school-id]');if(row){e.preventDefault();selectSchool(row.dataset.schoolId,true);}}});
 if($('#schoolMap')&&window.L){map=L.map('schoolMap').setView([38.1157,13.3615],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);layer=L.layerGroup().addTo(map);draw();setTimeout(()=>map.invalidateSize(),150);}else{$('#schoolMap').innerHTML='<p class="muted">Mappa non disponibile; resta consultabile la tabella.</p>';draw();}
 [kind,order,search].forEach(x=>x?.addEventListener('input',draw));
 const so=$('#schoolStatsOrder'),ss=$('#schoolStatsSearch'),sr=$('#schoolStatsRows'),st=$('#schoolStatsStatus');
 const drawStats=()=>{const a=stats.filter(x=>{const r=registerByCode.get(String(x.code))||{};return (!so.value||x.order===so.value)&&(!ss.value||norm([x.code,x.name,x.institution,r.institutionCode2026,r.institution2026,r.institutionAddress2026].join(' ')).includes(norm(ss.value)));});sr.innerHTML=a.slice(0,300).map(x=>{const r=registerByCode.get(String(x.code))||{};return '<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.order)+'</td><td>'+esc(x.institution)+'</td><td>'+Number(x.students||0).toLocaleString('it-IT')+'</td><td>'+Number(x.classes||0).toLocaleString('it-IT')+'</td><td>'+Number(x.students_disability||0).toLocaleString('it-IT')+'</td><td>'+esc(r.institutionCode2026||'N.D.')+'</td><td>'+esc(r.institution2026||'Non presente nel registro 2026/27')+'</td><td>'+esc(r.institutionAddress2026||'N.D.')+'</td><td>'+esc(r.registryMatch||'Da verificare')+'</td></tr>';}).join('')||'<tr><td colspan="11">Nessun record.</td></tr>';const matches=register.filter(x=>x.registryMatch==='CODICE_COINCIDENTE').length;const documented=register.filter(x=>x.registryMatch==='ASSOCIAZIONE_DOCUMENTALE_CONFERMATA').length;const unresolved=register.length-matches-documented;st.textContent='Record visualizzati: '+Math.min(a.length,300)+' su '+a.length+'. Registro plessi: '+register.length+'; abbinamenti per codice esatto: '+matches+'; raccordi documentali per scuole annesse: '+documented+'; associazioni ancora da verificare: '+unresolved+'. Fonti USR, MIM e siti scolastici ufficiali.';};
 so?.addEventListener('change',drawStats);ss?.addEventListener('input',drawStats);drawStats();
 const ps=$('#schoolParSearch'),pr=$('#schoolParRows'),pt=$('#schoolParStatus');
 const drawPar=()=>{const a=pars.filter(x=>!ps.value||norm([x.code,x.name,x.address].join(' ')).includes(norm(ps.value)));pr.innerHTML=a.slice(0,300).map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.address)+'</td><td>'+esc(x.management)+'</td><td>'+esc(x.year)+'</td></tr>').join('')||'<tr><td colspan="5">Nessun record.</td></tr>';pt.textContent='Record visualizzati: '+Math.min(a.length,300)+' su '+a.length+'. Coordinate non disponibili.';};
 ps?.addEventListener('input',drawPar);drawPar();
}
function fillFilters(){
 const c=$('#circ'),q=$('#quart');DATA.territories.circoscrizioni.forEach(x=>c.add(new Option(x.name,x.id)));DATA.territories.quartieri.forEach(x=>q.add(new Option(x.name,x.id)));
 populateGeoSelectors();
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
  const f=GEO.asc2?.features.find(x=>normalizeTerritoryName(x.properties?.DEN_ASC2)===normalizeTerritoryName(q?.name));
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
const sectionMain=$('#section');if(sectionMain&&sectionMain.options.length)sectionMain.options[0].textContent='Nessuna';
load();
