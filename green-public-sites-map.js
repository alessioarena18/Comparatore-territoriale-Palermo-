/* Layer puntuale preliminare: siti recintati del registro documentale, localizzazioni indicative. */
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function'||!window.L)return;
 let capturedMap=null;
 window.initGreenMap=async function(...args){
  const originalMap=L.map;
  capturedMap=null;
  L.map=function(...mapArgs){capturedMap=originalMap.apply(this,mapArgs);return capturedMap;};
  try{await original.apply(this,args);}finally{L.map=originalMap;}
  if(!capturedMap||!capturedMap.getContainer())return;
  const map=capturedMap;
  if(map._greenDocumentedSitesLayer){map.removeLayer(map._greenDocumentedSitesLayer);map._greenDocumentedSitesLayer=null;}
  try{
   const r=await fetch('data/green/public-sites-map-points.geojson?v=20261121-first-map',{cache:'no-cache'});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const data=await r.json();
   const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const layer=L.geoJSON(data,{pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:7,color:'#064e3b',weight:2,fillColor:'#10b981',fillOpacity:.95}),onEachFeature:(f,l)=>{const p=f.properties||{};l.bindPopup('<strong>'+esc(p.name)+'</strong><br>ID: '+esc(p.id)+'<br><em>Localizzazione indicativa, non perimetro. Coordinate da validare; il punto non certifica proprietà, manutenzione o accessibilità.</em>');l.bindTooltip(esc(p.name),{sticky:true});}});
   layer.addTo(map);map._greenDocumentedSitesLayer=layer;
   L.control.layers(null,{'Inventario documentale · 9 siti (punti indicativi)':layer},{collapsed:false}).addTo(map);
   const host=document.getElementById('greenCurrentInventoryProtocol');
   if(host&&!host.querySelector('#greenMapPointNotice')){const n=document.createElement('p');n.id='greenMapPointNotice';n.className='school-note';n.innerHTML='<strong>Localizzazione in mappa:</strong> i nove siti del registro sono rappresentati con punti indicativi. Le coordinate sono preliminari e da validare; i marker non rappresentano perimetri e non certificano proprietà, accessibilità o manutenzione.';host.prepend(n);}
  }catch(e){console.warn('Layer inventario verde non disponibile',e);}
 };
})();