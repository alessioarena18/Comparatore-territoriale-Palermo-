/* Layer storico comunale 2013: confronto indipendente, mai sommato alle superfici PRG. */
(()=>{
 const originalInit=window.initGreenMap;
 if(typeof originalInit!=='function')return;
 window.initGreenMap=async function(...args){
  await originalInit.apply(this,args);
  const map=greenMapInstance;
  if(!map||map.__verdeComune2013Loaded||!window.L)return;
  const status=document.getElementById('greenMapStatus');
  try{
   const response=await fetch('data/geo/verde_comunale_2013.geojson?v=20261117',{cache:'no-cache'});
   if(!response.ok)throw new Error('Layer storico non ancora pubblicato (HTTP '+response.status+')');
   const data=await response.json();
   if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)throw new Error('GeoJSON storico vuoto o non valido');
   const s=selected();let boundary=null;
   if(s.section)boundary=GEO.sections?.features?.find(f=>String(f.properties?.SEZ21_ID)===String(s.section));
   else if(s.asc3)boundary=GEO.asc3?.features?.find(f=>String(f.properties?.COM_ASC3)===String(s.asc3));
   else if(s.quart)boundary=findAsc2FeatureForQuartiere(DATA.territories.quartieri.find(q=>q.id===s.quart));
   else if(s.asc2)boundary=GEO.asc2?.features?.find(f=>String(f.properties?.COM_ASC2)===String(s.asc2));
   else if(s.circ){const code=String(s.circ).replace(/\D/g,'');boundary=GEO.asc1?.features?.find(f=>String(f.properties?.COD_ASC1)===code);}
   const filtered=!!(s.section||s.asc3||s.quart||s.asc2||s.circ),features=[];let errors=0;
   if(filtered&&!boundary?.geometry)throw new Error('Confine ISTAT non disponibile: layer storico non ritagliato per evitare attribuzioni errate');
   if(filtered&&(!window.turf||typeof turf.intersect!=='function'))throw new Error('Turf.js non disponibile per il ritaglio del layer storico');
   const bounds=filtered?turf.bbox(boundary):null;
   for(let i=0;i<data.features.length;i++){
    const feature=data.features[i];if(!feature?.geometry)continue;
    if(!filtered){features.push(feature);continue;}
    try{
     const box=turf.bbox(feature);
     if(box[0]>bounds[2]||box[2]<bounds[0]||box[1]>bounds[3]||box[3]<bounds[1])continue;
     const clipped=turf.intersect(turf.featureCollection([feature,boundary]));
     if(clipped){clipped.properties={...(feature.properties||{}),_source_dataset:278,_source_year:2013};features.push(clipped);}
    }catch(_error){errors++;}
    if(i%100===99)await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(!features.length)throw new Error('Nessuna geometria storica nell’ambito selezionato');
   const layer=L.geoJSON({type:'FeatureCollection',features},{style:()=>({color:'#0e7490',fillColor:'#67e8f9',weight:1.5,dashArray:'5 4',fillOpacity:.13}),onEachFeature:(feature,featureLayer)=>{
    const p=feature.properties||{},rows=Object.entries(p).filter(([k,v])=>v!==null&&v!==''&&typeof v!=='object').slice(0,20);
    const body=rows.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(String(v))+'</td></tr>').join('');
    featureLayer.bindPopup('<div class="school-popup"><b>Comune di Palermo · aree verdi censite (2013)</b><br><small>Ricognizione storica indipendente dalla zonizzazione PRG. Non certifica proprietà, accesso o fruibilità.</small><div class="table-wrap"><table>'+body+'</table></div></div>');
   }});
   layer.addTo(map);L.control.layers(null,{'Comune · aree verdi censite 2013 (dataset 278)':layer},{collapsed:false}).addTo(map);
   map.__verdeComune2013Loaded=true;map.__verdeComune2013Layer=layer;
   if(status)status.textContent+=' Layer storico comunale 2013 attivabile separatamente: '+features.length.toLocaleString('it-IT')+' geometrie'+(filtered?' intersecate con l’ambito selezionato':'')+'. Non sommato alle superfici PRG.'+(errors?' Intersezioni non elaborate: '+errors+'.':'');
  }catch(error){if(status)status.textContent+=' Layer storico comunale 2013 non disponibile: '+String(error.message||error)+'. Le superfici PRG restano invariate.';}
 };
})();