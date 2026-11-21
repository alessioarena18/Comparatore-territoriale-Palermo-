/* Scheda metodologica e workflow per Tree Cover Density Copernicus 10 m.
   Non visualizza un raster finché il GeoTIFF ufficiale non è acquisito e validato.
*/
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function')return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.initGreenMap=async function(...args){
  await original.apply(this,args);
  const map=document.getElementById('greenMap');
  if(!map)return;
  let host=document.getElementById('treeCoverDensitySourceCard');
  if(!host){
   host=document.createElement('section');
   host.id='treeCoverDensitySourceCard';
   host.className='card';
   (document.getElementById('osmAccessibleGreenNote')||document.getElementById('copernicusAccessibleGreenNote')||document.getElementById('greenCurrentInventoryProtocol')||document.getElementById('greenMapStatus')||map).insertAdjacentElement('afterend',host);
  }
  if(host.dataset.loaded==='true')return;
  host.innerHTML='<h3>Copertura arborea · Copernicus Tree Cover Density 10 m</h3><p class="muted">Caricamento scheda fonte e metodologia…</p>';
  try{
   const response=await fetch('data/green/tree-cover-density-source.json?v=20261118-1',{cache:'no-cache'});
   if(!response.ok)throw new Error('Scheda fonte non disponibile (HTTP '+response.status+')');
   const data=await response.json();
   const sources=(data.sources||[]).map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a></li>').join('');
   const limits=(data.interpretation||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
   host.innerHTML='<h3>Copertura arborea · Copernicus Tree Cover Density 10 m</h3>'+
    '<div class="school-note"><strong>Stato dell’integrazione:</strong> '+esc(data.status)+'. La scheda e il workflow di calcolo sono pronti; non vengono esposti valori territoriali finché il raster ufficiale non è stato acquisito e controllato.</div>'+
    '<div class="grid green-kpis"><div class="card"><span class="muted">Anno di riferimento</span><div class="metric">'+esc(data.reference_year_selected)+'</div></div><div class="card"><span class="muted">Risoluzione</span><div class="metric">'+esc(data.resolution_m)+' m</div></div><div class="card"><span class="muted">Unità di misura</span><div class="metric">0–100%</div></div><div class="card"><span class="muted">Confidenza</span><div class="metric">Da verificare</div></div></div>'+
    '<p><strong>Che cosa misura:</strong> la percentuale di proiezione verticale delle chiome arboree in ogni pixel. Valori: '+esc(data.values)+'. Formato previsto: '+esc(data.format)+', CRS di riferimento '+esc(data.crs)+'.</p>'+
    '<h4>Fonti ufficiali e documentazione</h4><ul>'+sources+'</ul>'+
    '<h4>Regole di interpretazione</h4><ul>'+limits+'</ul>'+
    '<h4>Elaborazione territoriale predisposta</h4><p>È stato aggiunto uno script riproducibile per calcolare, per circoscrizioni, quartieri o UPL: copertura media percentuale, superficie equivalente di chioma, superficie con copertura arborea e soglie del 10% e 30%. I calcoli escludono NoData e utilizzano i pixel il cui centro ricade nel poligono. Il layer di confidenza sarà verificato insieme al raster prima di pubblicare le statistiche.</p>'+
    '<p><a href="https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/actions/workflows/acquisisci-tcd-2024.yml" target="_blank" rel="noopener">Apri il workflow GitHub per acquisire TCD 2024</a> · <a href="https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/blob/main/tools/discover_tree_cover_density_tiles.py" target="_blank" rel="noopener">Script per individuare i tile STAC di Palermo</a> · <a href="https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/blob/main/tools/process_tree_cover_density.py" target="_blank" rel="noopener">Apri lo script di elaborazione TCD</a> · <a href="https://github.com/alessioarena18/Comparatore-territoriale-Palermo-/blob/main/data/green/tree-cover-density-source.json" target="_blank" rel="noopener">Scheda tecnica JSON</a></p>'+
    '<p class="muted">Il workflow manuale può produrre un report STAC e, se necessario, scaricare i raster come artifact temporaneo. Per gli asset protetti occorre configurare nei Secrets GitHub CDSE_USERNAME e CDSE_PASSWORD; facoltativamente CDSE_TOTP_SECRET per l’autenticazione a due fattori. Il workflow rinnova automaticamente i token. Il raster 2024 non è ancora incluso nel repository: l’accesso al catalogo STAC è pubblico, mentre il download dei file richiede l’uso dei servizi Copernicus Data Space e delle relative modalità di autenticazione. Nessun valore è stato stimato o inventato in sostituzione del raster.</p>';
   host.dataset.loaded='true';
  }catch(error){
   console.warn('Scheda Tree Cover Density non disponibile',error);
   host.innerHTML='<h3>Copertura arborea · Copernicus Tree Cover Density</h3><p class="school-note">Scheda metodologica non caricabile: '+esc(error.message||error)+'. Il livello non viene simulato.</p>';
  }
 };
})();
