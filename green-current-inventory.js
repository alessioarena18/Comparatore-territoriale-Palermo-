/* Inventario documentale del verde pubblico: record tracciabili, senza attribuzioni non provate. */
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function') return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sourceRows=[
  ['COM-278','Perimetrazione area verde','2013','Geometrie storiche','https://opendata.comune.palermo.it/opendata-dataset.php?dataset=278','Non certifica lo stato attuale, proprietà o fruibilità.'],
  ['COM-14130-2026','Orari ville e giardini recintati, DD 14130','2026','Accesso, orari, illuminazione e chiusure','https://www.comune.palermo.it/novita/ville-e-giardini-comunali-nuovi-orari-di-apertura-e-chiusura-per-il-periodo-autunnoinverno/','Fonte principale per i nove siti elencati nel registro.'],
  ['COM-3537-2026','Orari primavera-estate, DD 3537','2026','Custodia specifica di alcuni siti','https://www.comune.palermo.it/novita/orari-di-aperture-e-chiusura-delle-ville-giardini-parchi-comunali-periodo-primavera-estate-2026/','Le attribuzioni di custodia devono essere riconfermate per la stagione corrente.'],
  ['COM-UFFICIO-VERDE','Ufficio autonomo gestione verde urbano e rapporti con RESET','aggiornamento consultato 2026','Competenze istituzionali','https://www.comune.palermo.it/amministrazione/unita_organizzativa/ufficio-autonomo-gestione-verde-urbano-agricoltura-urbana-e-rapporti-con-reset-2/','Non costituisce un elenco catastale dei beni.'],
  ['COM-REG-VERDE','Regolamento comunale del verde pubblico e privato','2008','Regole di tutela e fruizione','https://www.comune.palermo.it/wp-content/uploads/2024/11/regolamento%20del%20verde%20pubblico%20e%20privato%20della%20citt%C3%A0%20di%20palermo.pdf','Quadro regolamentare, non verifica dello stato manutentivo.']
 ];
 const fields=[
  ['ID','Identificativo univoco del bene','obbligatorio'],
  ['Geometria','Poligono, sistema di riferimento e fonte','da associare e validare'],
  ['Proprietà','Comune, altro ente, privata, ignota','atto patrimoniale/catastale'],
  ['Gestione e custodia','Ufficio, partecipata, concessionario','atto o convenzione'],
  ['Attuazione','Esistente, parzialmente attuato, previsto','riscontro sul posto'],
  ['Accessibilità','Libera, orari, limitata, non accessibile','atto e verifica sul posto'],
  ['Manutenzione','Regolare, carente, degradata, non rilevata','sopralluogo datato/rapporto'],
  ['Fonte e data','Riferimento documentale e data di verifica','obbligatorio']
 ];
 window.initGreenMap=async function(...args){
  await original.apply(this,args);
  const map=document.getElementById('greenMap');
  if(!map)return;
  let host=document.getElementById('greenCurrentInventoryProtocol');
  if(!host){host=document.createElement('section');host.id='greenCurrentInventoryProtocol';host.className='card';(document.getElementById('greenComparisonReport')||document.getElementById('greenMapStatus')||map).insertAdjacentElement('afterend',host);}
  host.innerHTML='<h3>Inventario del verde pubblico · prima ricognizione documentale</h3><p class="muted">Caricamento del registro comunale documentato…</p>';
  try{
   const response=await fetch('data/green/current-public-sites.json?v=20261118-1',{cache:'no-cache'});
   if(!response.ok)throw new Error('Registro non disponibile (HTTP '+response.status+')');
   const data=await response.json(),records=data.facilities||[];
   const groups={};
   for(const r of records){const key=r.lighting.includes('non documentata')?'Senza illuminazione adeguata documentata':'Con illuminazione adeguata documentata';groups[key]=(groups[key]||0)+1;}
   const stat=(label,value)=>'<div class="card"><span class="muted">'+label+'</span><div class="metric">'+value+'</div></div>';
   const rows=records.map(r=>{
    const hours=r.hours.from+'–'+r.hours.to+' ('+r.hours.period+'); successivamente '+r.hours.after_clock_change.from+'–'+r.hours.after_clock_change.to;
    return '<tr><td><strong>'+esc(r.name)+'</strong><br><small>'+esc(r.id)+'</small></td><td>'+esc(r.type)+'</td><td>'+esc(r.access)+'</td><td>'+esc(hours)+'</td><td>'+esc(r.lighting)+'</td><td>'+esc(r.management)+'</td><td>'+esc(r.ownership)+'</td><td>'+esc(r.maintenance)+'</td><td>'+esc(r.geometry)+'</td></tr>';
   }).join('');
   const sources=(data.metadata.sources||[]).map(s=>'<tr><td><strong>'+esc(s.id)+'</strong></td><td><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a></td><td>'+esc(s.date)+'</td><td>'+esc(s.supports.join(', '))+'</td></tr>').join('');
   const sourceCatalog=sourceRows.map(s=>'<tr><td>'+esc(s[0])+'</td><td><a href="'+esc(s[4])+'" target="_blank" rel="noopener">'+esc(s[1])+'</a></td><td>'+esc(s[2])+'</td><td>'+esc(s[3])+'</td><td>'+esc(s[5])+'</td></tr>').join('');
   const fieldTable=fields.map(f=>'<tr><td><strong>'+esc(f[0])+'</strong></td><td>'+esc(f[1])+'</td><td>'+esc(f[2])+'</td></tr>').join('');
   host.innerHTML='<h3>Inventario del verde pubblico · prima ricognizione documentale</h3>'+
    '<p class="school-note"><strong>Perimetro della verifica:</strong> '+esc(data.metadata.status)+'. Sono stati inseriti solo i siti per i quali un atto comunale recente documenta l’accesso pubblico regolamentato e gli orari. Non si presume la proprietà catastale e non si attribuisce uno stato manutentivo senza una verifica specifica.</p>'+
    '<div class="grid green-kpis">'+stat('Siti con accesso documentato',records.length)+stat('Con illuminazione adeguata',groups['Con illuminazione adeguata documentata']||0)+stat('Senza illuminazione adeguata documentata',groups['Senza illuminazione adeguata documentata']||0)+'</div>'+
    '<h4>Registro dei siti verificati documentalmente</h4><div class="table-wrap"><table><thead><tr><th>Area e ID</th><th>Tipologia</th><th>Accesso</th><th>Orari stagionali pubblicati</th><th>Illuminazione</th><th>Gestione/custodia</th><th>Proprietà</th><th>Manutenzione</th><th>Geometria</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="muted">Gli orari sono riportati secondo la formulazione dell’avviso comunale del 1 ottobre 2026: il provvedimento distingue il periodo dal 1 ottobre al giorno precedente il cambio dell’ora e il periodo successivo. La chiusura può essere anticipata o disposta in caso di allerta meteo/vento, lavori o manutenzioni. È previsto il divieto di accesso nei 30 minuti precedenti la chiusura.</p>'+
    '<h4>Fonti primarie del registro</h4><div class="table-wrap"><table><thead><tr><th>Codice</th><th>Documento</th><th>Data</th><th>Informazioni utilizzate</th></tr></thead><tbody>'+sources+'</tbody></table></div>'+
    '<h4>Fonti complementari e limiti</h4><div class="table-wrap"><table><thead><tr><th>Codice</th><th>Fonte</th><th>Anno</th><th>Utilizzo</th><th>Limite</th></tr></thead><tbody>'+sourceCatalog+'</tbody></table></div>'+
    '<h4>Schema dei campi da completare per l’inventario geografico</h4><div class="table-wrap"><table><thead><tr><th>Campo</th><th>Contenuto</th><th>Validazione richiesta</th></tr></thead><tbody>'+fieldTable+'</tbody></table></div>'+
    '<p class="school-note"><strong>Limiti informativi:</strong> '+esc(data.metadata.limitations.join(' '))+'</p>'+
    '<p class="muted">Il dataset comunale 278 rimane un riferimento geometrico storico separato. Il collegamento tra questi nove siti e i poligoni 2013 sarà effettuato solo dopo verifica del nome, della localizzazione e del perimetro. Nessuna superficie viene ancora conteggiata come verde pubblico fruibile certificato.</p>';
  }catch(error){
   host.innerHTML='<h3>Inventario del verde pubblico</h3><p class="school-note">Registro documentale non caricato: '+esc(error.message)+'. Nessun dato è stato stimato.</p>';
  }
 };
})();