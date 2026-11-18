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
  const map=greenMapInstance;
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
   const gl=typeof layer.getMaplibreMap==='function'?layer.getMaplibreMap():null;
   if(gl){
    const fillId='municipal-green-cadastral-fill',lineId='municipal-green-cadastral-outline';
    const popupFields=[
     ['CATEGORIA','Categoria'],['TIPO','Tipo'],['SUBTIPO','Classificazione verde'],
     ['INDIRIZZO','Indirizzo'],['NUMERO_CIVICO','Numero civico'],
     ['FOGLIO','Foglio catastale'],['PLLA','Particella'],['SUB','Subalterno'],
     ['UPL_nome','UPL'],['Quartiere','Quartiere'],['circoscrizione','Circoscrizione']
    ];
    const showValue=v=>v===null||v===undefined||String(v).trim()===''?'Non disponibile':esc(v);
    const onFeatureClick=e=>{
     const feature=e.features&&e.features[0];if(!feature)return;
     const p=feature.properties||{};
     const rows=popupFields.filter(([key])=>p[key]!==undefined&&p[key]!==null&&String(p[key]).trim()!=='')
      .map(([key,label])=>'<tr><th>'+label+'</th><td>'+showValue(p[key])+'</td></tr>').join('');
     const html='<div class="municipal-green-popup"><strong>'+showValue(p.SUBTIPO||p.TIPO||'Bene comunale classificato a verde')+'</strong><table>'+rows+'</table><p><small>Fonte: inventario del patrimonio comunale georeferenziato 2024, elaborazione OpenDataSicilia. La classificazione patrimoniale/catastale non dimostra da sola copertura vegetale attuale, accessibilità pubblica, attrezzatura o stato manutentivo.</small></p></div>';
     new maplibregl.Popup({maxWidth:'340px'}).setLngLat(e.lngLat).setHTML(html).addTo(gl);
    };
    gl.on('click',fillId,onFeatureClick);
    gl.on('mouseenter',fillId,()=>{gl.getCanvas().style.cursor='pointer';});
    gl.on('mouseleave',fillId,()=>{gl.getCanvas().style.cursor='';});
    gl.on('error',event=>{
     const message=event?.error?.message||'errore di caricamento delle tessere';
     if(status&&!map.__municipalGreenPmtilesErrorShown){
      map.__municipalGreenPmtilesErrorShown=true;
      status.textContent+=' Attenzione: il servizio cartografico catastale ha segnalato un errore: '+message+'. Il layer resta selezionabile ma potrebbe non essere visualizzato.';
     }
    });
   }else if(status){
    status.textContent+=' Il layer è stato aggiunto, ma l’API MapLibre non espone il gestore della mappa per le schede informative.';
   }
   if(status)status.textContent+=' Overlay catastale del patrimonio comunale 2024 caricato. Seleziona un poligono per consultare i riferimenti catastali e territoriali. Le geometrie identificano beni comunali classificati a verde, non certificano la copertura vegetale né la fruibilità.';
  }catch(error){
   if(status)status.textContent+=' Overlay catastale comunale non disponibile: '+String(error.message||error)+'. Restano consultabili le fonti e i registri documentali.';
  }
 };
})();