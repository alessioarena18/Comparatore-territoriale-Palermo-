/* Layer indipendente di confronto: verde pubblico accessibile da Copernicus Urban Atlas 2021.
   Dataset derivato e pubblicato da Domenico Schillaci, licenza CC BY 4.0.
   Non sostituisce il PRG, il catasto o la verifica sul campo.
*/
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function')return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.initGreenMap=async function(...args){
  await original.apply(this,args);
  const map=greenMapInstance,status=document.getElementById('greenMapStatus');
  if(!map||!window.L||map.__copernicusAccessibleGreenLayer)return;
  try{
   const response=await fetch('data/geo/copernicus_verde_accessibile_2021.geojson?v=20261118-1',{cache:'no-cache'});
   if(!response.ok)throw new Error('Dataset Copernicus non disponibile (HTTP '+response.status+')');
   const data=await response.json();
   if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Struttura GeoJSON non valida');
   const features=data.features.filter(f=>f?.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type));
   const layer=L.geoJSON({type:'FeatureCollection',features},{
    style:()=>({color:'#075985',weight:1.2,opacity:.9,fillColor:'#38bdf8',fillOpacity:.27}),
    onEachFeature:(feature,featureLayer)=>{
     const p=feature.properties||{};
     const area=Number(p.area_sqm);
     const areaText=Number.isFinite(area)?area.toLocaleString('it-IT',{maximumFractionDigits:0})+' m²':'Non disponibile';
     featureLayer.bindPopup('<strong>Verde pubblico · Copernicus Urban Atlas 2021</strong><br>'+
      'Classe dimensionale: '+esc(p.size_label||'Non classificata')+'<br>'+
      'Superficie dichiarata: '+areaText+'<br>'+
      '<small>Fonte derivata: Palermo 3-30-300, Domenico Schillaci, CC BY 4.0. La classificazione Urban Atlas selezionata indica aree verdi con accesso pubblico previsto; non certifica apertura attuale, proprietà, manutenzione o stato di attuazione.</small>');
    }
   });
   map.__copernicusAccessibleGreenLayer=layer;
   L.control.layers(null,{'Copernicus Urban Atlas 2021 · verde pubblico (129 poligoni)':layer},{collapsed:true}).addTo(map);
   if(status)status.textContent+=' Confronto indipendente Copernicus Urban Atlas 2021: '+features.length+' poligoni caricati, livello separato e disattivato inizialmente. Dataset derivato CC BY 4.0; non sommato alle superfici PRG o catastali.';
  }catch(error){
   console.warn('Layer Copernicus verde non disponibile',error);
   if(status)status.textContent+=' Layer di confronto Copernicus non disponibile: '+String(error.message||error)+'. Le analisi PRG e catastali restano indipendenti.';
  }
 };
})();
