/* Report del confronto geometrico tra inventario comunale 2013 e classi PRG. */
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function')return;
 const fmt=v=>Number(v||0).toLocaleString('it-IT',{maximumFractionDigits:2});
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const area=x=>fmt(x?.ha)+' ha';
 function selectedTerritory(data){
  const s=selected();let level=null,code=null;
  if(s.section){
   const f=GEO.sections?.features?.find(x=>String(x.properties?.SEZ21_ID)===String(s.section));
   if(f){level='upl';code=String(f.properties?.COM_ASC3||'');}
  }else if(s.asc3){level='upl';code=String(s.asc3);}
  else if(s.quart){
   const q=DATA.territories.quartieri.find(x=>x.id===s.quart),f=findAsc2FeatureForQuartiere(q);
   if(f){level='quartieri';code=String(f.properties?.COM_ASC2||'');}
  }else if(s.asc2){level='quartieri';code=String(s.asc2);}
  else if(s.circ){
   const f=GEO.asc1?.features?.find(x=>'c'+String(x.properties?.COD_ASC1)===String(s.circ));
   if(f){level='circoscrizioni';code=String(f.properties?.COD_ASC1||'');}
  }
  if(!level)return {label:'Palermo · intero Comune',row:data.global};
  const row=(data.perimetri_territoriali?.[level]||[]).find(x=>String(x.codice)===code);
  return {label:(row?.nome||'Ambito selezionato')+' · '+level,row};
 }
 window.initGreenMap=async function(...args){
  await original.apply(this,args);
  const map=document.getElementById('greenMap'),status=document.getElementById('greenMapStatus');
  if(!map)return;
  let host=document.getElementById('greenComparisonReport');
  if(!host){
   host=document.createElement('section');host.id='greenComparisonReport';host.className='card';
   const anchor=status||map;
   anchor.insertAdjacentElement('afterend',host);
  }
  host.innerHTML='<h3>Confronto tra verde censito e previsioni PRG</h3><p class="muted">Caricamento del rapporto di intersezione geometrica…</p>';
  try{
   const response=await fetch('data/verde_confronto_278_prg.json?v=20261117',{cache:'no-store'});
   if(!response.ok)throw new Error('Rapporto non ancora disponibile (HTTP '+response.status+')');
   const data=await response.json();
   if(data.status!=='completed'||!data.global)throw new Error('Rapporto non validato');
   const picked=selectedTerritory(data),g=picked.row;
   if(!g)throw new Error('Nessuna corrispondenza geografica verificata per il filtro attivo');
   const tableRows=[
    ['Inventario comunale 2013',g.inventario_2013],
    ['Classi verdi PRG 2004',g.classi_verdi_prg||g.verde_prg_classificato],
    ['Intersezione tra le due fonti',g.intersezione],
    ['Inventario 2013 fuori dalle classi verdi PRG',g.inventario_2013_fuori_prg],
    ['Classi verdi PRG non censite nel 2013',g.prg_non_censito_2013]
   ];
   const global=picked.row===data.global;
   const metric=(label,value)=>'<div class="card"><span class="muted">'+label+'</span><div class="metric">'+area(value)+'</div></div>';
   let details='';
   if(global){
    const byType=Object.entries(data.per_tipo_inventario_2013||{}).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v.features+'</td><td>'+area(v.area_totale)+'</td><td>'+area(v.intersezione_prg_verde)+'</td><td>'+area(v.fuori_dalle_classi_verdi_prg)+'</td></tr>').join('');
    details='<h4>Inventario comunale per tipologia originaria (campo TIPO)</h4><div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Elementi</th><th>Superficie totale</th><th>Intersezione PRG</th><th>Fuori classi verdi PRG</th></tr></thead><tbody>'+byType+'</tbody></table></div>';
   }
   const pct='<p class="school-note">Quota dell’inventario 2013 intersecata con tutte le classi verdi PRG: <strong>'+fmt(g.quota_inventario_2013_intersecata_pct)+'%</strong>. Quota delle classi verdi PRG intersecata con l’inventario 2013: <strong>'+fmt(g.quota_prg_intersecata_inventario_2013_pct)+'%</strong>.</p>';
   const groupDefs=[['Classi urbane PRG (esclusi E1/E2)',g.classi_urbane_prg],['Candidati standard V1–V4',g.candidati_standard_v1_v4],['Aree agricole e collinari E1/E2',g.aree_agricole_collinari_e1_e2]];
   const groupTable='<h4>Confronto per famiglie urbanistiche</h4><div class="table-wrap"><table><thead><tr><th>Famiglia</th><th>Superficie PRG</th><th>Intersezione inventario</th><th>Quota inventario intersecata</th><th>Quota PRG censita nel 2013</th></tr></thead><tbody>'+groupDefs.map(([label,x])=>'<tr><td>'+label+'</td><td>'+area(x?.superficie_prg)+'</td><td>'+area(x?.intersezione_inventario_2013)+'</td><td>'+fmt(x?.quota_inventario_2013_intersecata_pct)+'%</td><td>'+fmt(x?.quota_prg_intersecata_inventario_2013_pct)+'%</td></tr>').join('')+'</tbody></table></div>';
   host.innerHTML='<h3>Confronto tra verde censito e previsioni PRG</h3><p class="muted">Ambito: <strong>'+esc(picked.label)+'</strong>. Le superfici sono misurate con overlay in EPSG:32633 e unione geometrica per evitare doppi conteggi interni alle due fonti.</p><div class="grid green-kpis">'+metric('Inventario comunale 2013',g.inventario_2013)+metric('Classi verdi PRG 2004',g.classi_verdi_prg||g.verde_prg_classificato)+metric('Intersezione',g.intersezione)+'</div><div class="table-wrap"><table><thead><tr><th>Indicatore</th><th>Superficie</th></tr></thead><tbody>'+tableRows.map(r=>'<tr><td>'+r[0]+'</td><td><strong>'+area(r[1])+'</strong></td></tr>').join('')+'</tbody></table></div>'+pct+groupTable+details+'<h4>Confronto per classe PRG</h4><div class="table-wrap"><table><thead><tr><th>Classe</th><th>Geometrie PRG</th><th>Superficie PRG</th><th>Intersezione inventario</th><th>PRG non censito 2013</th></tr></thead><tbody>'+(data.per_classe_prg||[]).map(x=>'<tr><td>'+esc(x.classe_prg)+'</td><td>'+x.geometrie_prg+'</td><td>'+area(x.superficie_prg)+'</td><td>'+area(x.intersezione_inventario_2013)+'</td><td>'+area(x.superficie_prg_non_censita_nel_2013)+'</td></tr>').join('')+'</tbody></table></div><p class="school-note"><strong>Interpretazione corretta:</strong> “fuori dalle classi verdi PRG” non significa assenza di vegetazione; “PRG non censito nel 2013” non significa assenza di verde oggi. L’inventario 278 è riferito al 2013 e non certifica proprietà, accessibilità o fruibilità. Le classi PRG sono destinazioni di piano 2004 e non certificano l’attuazione né recepiscono automaticamente le varianti successive. Nessuna di queste superfici viene sommata al bilancio degli standard.</p><p class="muted">Fonte inventario: Comune di Palermo, dataset 278 (ricognizione 2013). Fonte PRG: dataset 320, Variante Generale DCC 7/2004. Elaborazione: overlay geometrico e aggregazione territoriale su basi ISTAT 2021.</p>';
  }catch(error){
   host.innerHTML='<h3>Confronto tra verde censito e previsioni PRG</h3><p class="school-note">Rapporto territoriale non ancora disponibile: '+esc(error.message)+'. La mappa PRG e il layer storico restano consultabili separatamente. Non vengono mostrati valori stimati.</p>';
  }
 };
})();