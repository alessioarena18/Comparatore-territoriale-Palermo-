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
  const label=s.section?'Sezione censuaria '+s.section+' · dato aggregato alla UPL '+(row?.nome||code):(row?.nome||'Ambito selezionato')+' · '+level;
  return {label,row};
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
   const response=await fetch('data/verde_confronto_278_prg.json?v=20261122-groupqa',{cache:'no-store'});
   if(!response.ok)throw new Error('Rapporto non ancora disponibile (HTTP '+response.status+')');
   const data=await response.json();
   if(data.status!=='completed'||!data.global)throw new Error('Rapporto non validato');
   const picked=selectedTerritory(data),g=picked.row;
   if(!g)throw new Error('Nessuna corrispondenza geografica verificata per il filtro attivo');
   const tableRows=[
    ['Inventario comunale 2013',g.inventario_2013||g.verde_comunale_2013],
    ['Destinazioni verdi e territoriali PRG 2004',g.classi_verdi_prg||g.verde_prg_classificato],
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
   const classMetrics=data.class_metrics||{},territorialCoverage=data.territorial_coverage||{};
   const groupMetrics=data.group_metrics||{};
   const groupMetricsNote='<p class="school-note"><strong>Famiglie non sommabili:</strong> il gruppo “candidati standard V1-V4” è un sottoinsieme delle classi urbane, non una categoria aggiuntiva. La sovrapposizione geometrica urbano/naturale rilevata è '+area({m2:groupMetrics.sovrapposizione_urbano_naturale?.m2,ha:groupMetrics.sovrapposizione_urbano_naturale?.ha})+'. Il totale comunale resta l’unione geometrica, non la somma delle righe.</p>';
   const classMetricsNote=classMetrics.eccedenza_non_additiva_classi_prg?
    '<p class="school-note"><strong>Non sommabilità delle superfici per classe:</strong> la somma delle unioni per singola classe è '+area(classMetrics.somma_unioni_per_classe_prg)+'; l’unione geometrica complessiva è '+area(classMetrics.unione_geometrica_prg)+'. L’eccedenza non additiva è '+area(classMetrics.eccedenza_non_additiva_classi_prg)+' ('+fmt(classMetrics.eccedenza_pct_somma_classi)+'%). Le classi possono sovrapporsi: non sommare le righe della tabella per ottenere il totale.</p>':'';
   const coverageNote=territorialCoverage.verde_prg_fuori_unione_circoscrizioni?
    '<p class="school-note"><strong>Controllo della copertura territoriale:</strong> '+area(territorialCoverage.verde_prg_fuori_unione_circoscrizioni)+' di PRG verde non ricade nell’unione cartografica delle circoscrizioni 2021 ed è escluso dai totali comunali. È mantenuto come residuo da verificare. Il totale grezzo del layer PRG è '+area(territorialCoverage.verde_prg_unione_totale)+', di cui '+area(territorialCoverage.verde_prg_dentro_unione_circoscrizioni)+' ricade nella copertura comunale. Differenza tra somma delle intersezioni per circoscrizione e unione interna: '+fmt(territorialCoverage.differenza_somma_circoscrizioni_vs_unione_inside)+' m².</p>':'';
   const pct='<p class="school-note">Quota dell’inventario 2013 intersecata con le destinazioni verdi e territoriali PRG considerate: <strong>'+fmt(g.quota_inventario_2013_intersecata_pct)+'%</strong>. Quota delle destinazioni verdi e territoriali PRG intersecata con l’inventario 2013: <strong>'+fmt(g.quota_prg_intersecata_inventario_2013_pct)+'%</strong>.</p>';
   const groupDefs=[['Classi urbane PRG (esclusi E1/E2)',g.classi_urbane_prg],['Candidati standard V1–V4',g.candidati_standard_v1_v4],['Aree agricole e collinari E1/E2',g.aree_agricole_collinari_e1_e2]];
   const groupTable='<h4>Confronto per famiglie urbanistiche</h4><div class="table-wrap"><table><thead><tr><th>Famiglia</th><th>Superficie PRG</th><th>Intersezione inventario</th><th>Quota inventario intersecata</th><th>Quota PRG censita nel 2013</th></tr></thead><tbody>'+groupDefs.map(([label,x])=>'<tr><td>'+label+'</td><td>'+area(x?.superficie_prg)+'</td><td>'+area(x?.intersezione_inventario_2013)+'</td><td>'+fmt(x?.quota_inventario_2013_intersecata_pct)+'%</td><td>'+fmt(x?.quota_prg_intersecata_inventario_2013_pct)+'%</td></tr>').join('')+'</tbody></table></div>';
   host.innerHTML='<h3>Confronto tra verde censito e previsioni PRG</h3><div class="grid green-kpis"><div class="card"><strong>PRG 2004 · previsione urbanistica</strong><p class="muted">Destinazioni e classi di piano. Non certificano attuazione, proprietà o fruibilità attuale.</p></div><div class="card"><strong>Inventario comunale 2013 · ricognizione storica</strong><p class="muted">Geometrie censite. Non costituiscono un inventario nominativo aggiornato dei parchi né uno stato manutentivo.</p></div><div class="card"><strong>Copertura arborea · dato satellitare</strong><p class="muted">Misura chiome vegetali. Non equivale a verde pubblico, accessibile o attrezzato; il raster 2024 è ancora da acquisire.</p></div></div><p class="muted">Ambito: <strong>'+esc(picked.label)+'</strong>. Le superfici sono misurate con overlay in EPSG:32633 e unione geometrica per evitare doppi conteggi interni alle due fonti.</p><p class="school-note"><strong>Come leggere l’intersezione:</strong> indica la porzione geometrica comune tra le due cartografie, non una verifica sul campo dell’effettiva presenza di verde, della realizzazione dell’opera, della proprietà o dell’accessibilità. Le percentuali sono riferite alle superfici cartografiche delle rispettive fonti e non costituiscono un indice di qualità o di dotazione normativa.</p><div class="grid green-kpis">'+metric('Inventario comunale 2013',g.inventario_2013||g.verde_comunale_2013)+metric('Destinazioni verdi e territoriali PRG 2004',g.classi_verdi_prg||g.verde_prg_classificato)+metric('Intersezione',g.intersezione)+'</div><div class="table-wrap"><table><thead><tr><th>Indicatore</th><th>Superficie</th></tr></thead><tbody>'+tableRows.map(r=>'<tr><td>'+r[0]+'</td><td><strong>'+area(r[1])+'</strong></td></tr>').join('')+'</tbody></table></div>'+pct+groupTable+details+coverageNote+groupMetricsNote+classMetricsNote+'<p class="school-note"><strong>Nota sulla classe MISTO:</strong> è una categoria residuale dell’elaborazione, assegnata quando una geometria con codice ZTO che inizia per V non rientra nella mappatura specifica. Non è una categoria urbanistica esplicita e non va interpretata come tipologia verificata.</p><h4>Confronto per classe PRG</h4><div class="table-wrap"><table><thead><tr><th>Classe</th><th>Geometrie PRG</th><th>Superficie PRG entro circoscrizioni</th><th>Intersezione inventario</th><th>PRG non censito nel 2013</th></tr></thead><tbody>'+(data.per_classe_prg||[]).map(x=>'<tr><td>'+esc(x.classe_prg)+'</td><td>'+x.geometrie_prg+'</td><td>'+area(x.superficie_prg)+'</td><td>'+area(x.intersezione_inventario_2013)+'</td><td>'+area(x.superficie_prg_non_censita_nel_2013)+'</td></tr>').join('')+'</tbody></table></div><p class="school-note"><strong>Interpretazione corretta:</strong> “fuori dalle classi verdi PRG” non significa assenza di vegetazione; “PRG non censito nel 2013” non significa assenza di verde oggi. L’inventario 278 è riferito al 2013 e non certifica proprietà, accessibilità o fruibilità. Le classi PRG sono destinazioni di piano 2004 e non certificano l’attuazione né recepiscono automaticamente le varianti successive. Nessuna di queste superfici viene sommata al bilancio degli standard.</p><p class="muted">Fonte inventario: Comune di Palermo, dataset 278 (ricognizione 2013). Fonte PRG: dataset 320, Variante Generale DCC 7/2004. Elaborazione: overlay geometrico e aggregazione territoriale su basi ISTAT 2021.</p>';
  }catch(error){
   host.innerHTML='<h3>Confronto tra verde censito e previsioni PRG</h3><p class="school-note">Rapporto territoriale non ancora disponibile: '+esc(error.message)+'. La mappa PRG e il layer storico restano consultabili separatamente. Non vengono mostrati valori stimati.</p>';
  }
 };
})();