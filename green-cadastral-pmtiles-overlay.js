/* Overlay catastale del patrimonio comunale classificato a verde.
   Fonte esterna indipendente: OpenDataSicilia / elaborazione su inventario comunale 2024
   e particelle catastali S.I.T.R./Agenzia Entrate. Non certifica uso verde effettivo.
*/
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function')return;
 const PMTILES_URL='https://palermohub.github.io/PRG2004/immobili/immobili_comunali_2024.pmtiles';
 const SOURCE_LAYER='immobili_comunali_2024';
 const GREEN_TYPES=[
  'Verde Pubblico','Agricolo','Villa/Giardino','Fondo','Parco','Riserva','Parco Giochi'
 ];
 const COLORS=[
  'Verde Pubblico','#166534',
  'Agricolo','#a3a635',
  'Villa/Giardino','#15803d',
  'Fondo','#a16207',
  'Parco','#0f766e',
  'Riserva','#047857',
  'Parco Giochi','#65a30d',
  '#94a3b8'
 ];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.initGreenMap=async function(...args){
  await original.apply(this,args);
  const map=window.greenMapInstance;
  const status=document.getElementById('greenMapStatus');
  if(!map||!window.L||!window.maplibregl||typeof L.maplibreGL!=='function'||!window.pmtiles)return;
  if(map.__municipalGreenCadastralLayer)return;
  try{
   if(!map.__municipalGreenPmtilesProtocol){
    const protocol=new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles',protocol.tile);
    map.__municipalGreenPmtilesProtocol=protocol;
   }
   const filter=['any',...GREEN_TYPES.map(t=>['==',['get','SUBTIPO'],t])];
   const style={
    version:8,
    sources:{municipalGreen:{
     type:'vector',
     url:'pmtiles://'+PMTILES_URL
    }},
    layers:[{
     id:'municipal-green-cadastral-fill',
     type:'fill',
     source:'municipalGreen',
     'source-layer':SOURCE_LAYER,
     filter,
     paint:{
      'fill-color':['match',['get','SUBTIPO'],...COLORS],
      'fill-opacity':0.42
     }
    },{
     id:'municipal-green-cadastral-outline',
     type:'line',
     source:'municipalGreen',
     'source-layer':SOURCE_LAYER,
     filter,
     paint:{
      'line-color':'#14532d',
      'line-width':1,
      'line-opacity':0.75
     }
    }]
   };
   const pane=map.getPane('municipalGreenCadastralPane')||map.createPane('municipalGreenCadastralPane');
   pane.style.zIndex=330;
   const layer=L.maplibreGL({style,interactive:true,pane:'municipalGreenCadastralPane'});
   layer.addTo(map);
   map.__municipalGreenCadastralLayer=layer;
   L.control.layers(null,{'Patrimonio comunale 2024 · categorie verdi (dato catastale)':layer},{collapsed:true}).addTo(map);
   if(status)status.textContent+=' Overlay catastale del patrimonio comunale 2024 caricato. Le geometrie identificano beni comunali classificati a verde, non certificano la copertura vegetale né la fruibilità.';
  }catch(error){
   if(status)status.textContent+=' Overlay catastale comunale non disponibile: '+String(error.message||error)+'. Restano consultabili le fonti e i registri documentali.';
  }
 };
})();