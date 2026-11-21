/* Layer cartografici per inventario documentale e candidati del catalogo verde. */
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function'||!window.L)return;
 let capturedMap=null;
 const layersById=new Map();
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function markListSelection(id){
  document.querySelectorAll('.green-map-select.is-selected').forEach(b=>b.classList.remove('is-selected'));
  const btn=document.querySelector('.green-map-select[data-green-site-id="'+CSS.escape(id)+'"]');
  if(btn){btn.classList.add('is-selected');btn.scrollIntoView({behavior:'smooth',block:'nearest'});}
 }
 function focusSite(id){
  const entry=layersById.get(String(id));if(!entry||!entry.map)return;
  const {map,marker,layer}=entry;
  if(!map.hasLayer(layer))layer.addTo(map);
  map.setView(marker.getLatLng(),Math.max(map.getZoom(),16),{animate:true});
  marker.openPopup();markListSelection(id);
 }
 document.addEventListener('click',e=>{
  const btn=e.target.closest('.green-map-select');if(!btn)return;
  e.preventDefault();focusSite(btn.dataset.greenSiteId);
 });
 window.initGreenMap=async function(...args){
  const originalMap=L.map;capturedMap=null;
  L.map=function(...mapArgs){capturedMap=originalMap.apply(this,mapArgs);return capturedMap;};
  try{await original.apply(this,args);}finally{L.map=originalMap;}
  if(!capturedMap||!capturedMap.getContainer())return;
  const map=capturedMap;
  if(map._greenDocumentedSitesLayer){map.removeLayer(map._greenDocumentedSitesLayer);map._greenDocumentedSitesLayer=null;}
  if(map._greenCandidateSitesLayer){map.removeLayer(map._greenCandidateSitesLayer);map._greenCandidateSitesLayer=null;}
  if(map._greenSitesLayerControl){map.removeControl(map._greenSitesLayerControl);map._greenSitesLayerControl=null;}
  layersById.clear();
  async function loadLayer(url,color,label){
   const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error('HTTP '+r.status);
   const data=await r.json();
   const layer=L.geoJSON(data,{pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:8,color,weight:2,fillColor:color,fillOpacity:.95}),onEachFeature:(f,l)=>{
    const p=f.properties||{},id=String(p.id||'');
    l.bindPopup('<strong>'+esc(p.name)+'</strong><br>ID: '+esc(id)+'<br><em>Localizzazione indicativa, non perimetro. Coordinate da validare; il punto non certifica proprietà, manutenzione o accessibilità.</em>');
    l.bindTooltip(esc(p.name),{sticky:true});
    l.on('click',()=>markListSelection(id));
    layersById.set(id,{map,marker:l,layer});
   }});
   layer.addTo(map);return layer;
  }
  try{
   const documented=await loadLayer('data/green/public-sites-map-points.geojson?v=20261121-first-map','#047857','documented');
   map._greenDocumentedSitesLayer=documented;
   const candidates=await loadLayer('data/green/catalog-candidate-map-points.geojson?v=20261121-candidates1','#d97706','candidate');
   map._greenCandidateSitesLayer=candidates;
   map._greenSitesLayerControl=L.control.layers(null,{'Inventario documentale · 9 siti (punti indicativi)':documented,'Catalogo comunale · 21 candidati da verificare (punti indicativi)':candidates},{collapsed:false}).addTo(map);
   const host=document.getElementById('greenCurrentInventoryProtocol');
   if(host&&!host.querySelector('#greenMapPointNotice')){const n=document.createElement('p');n.id='greenMapPointNotice';n.className='school-note';n.innerHTML='<strong>Selezione cartografica:</strong> i siti documentati e i candidati del catalogo sono disponibili come layer distinti. I punti sono localizzazioni preliminari, non perimetri; le coordinate sono da validare. Puoi selezionare un marker sulla mappa oppure usare il pulsante “Mostra sulla mappa” nelle liste.';host.prepend(n);}
  }catch(e){console.warn('Layer inventario verde non disponibile',e);}
 };
})();