/* Inventario del verde attuale: quadro delle fonti e protocollo di verifica.
   Non crea geometrie né attribuisce proprietà/accessibilità in assenza di fonte documentale. */
(()=>{
 const original=window.initGreenMap;
 if(typeof original!=='function') return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sources=[
  {id:'COM-278',name:'Comune di Palermo · Perimetrazione area verde',year:'2013',role:'Ricognizione geometrica storica',status:'storica',url:'https://opendata.comune.palermo.it/opendata-dataset.php?dataset=278',note:'2.089 geometrie già elaborate nel progetto. Non certifica lo stato attuale, la proprietà o la fruibilità.'},
  {id:'COM-24',name:'Comune di Palermo · Verde urbano per tipologia',year:'2010',role:'Quadro statistico aggregato',status:'storica',url:'https://opendata.comune.palermo.it/opendata-dataset.php?dataset=24',note:'Dato tabellare storico, non utilizzabile come inventario georeferenziato attuale.'},
  {id:'GEO-SIAC',name:'GeoCatalogo e Anagrafe del territorio',year:'da verificare',role:'Canale istituzionale per dati spaziali',status:'da verificare',url:'https://geoportal.comune.palermo.it/',note:'Verificare disponibilità, data di aggiornamento, metadati e condizioni di accesso dei singoli layer.'},
  {id:'REG-VERDE',name:'Regolamento comunale del verde pubblico e privato',year:'2008',role:'Quadro regolamentare e criteri',status:'normativa',url:'https://www.comune.palermo.it/documento_pubblico/regolamento-del-verde-pubblico-e-privato-della-citt-di-palermo/',note:'Riferimento per gestione e tutela, non sostituisce il riscontro sul singolo bene.'},
  {id:'PRG-2004',name:'Variante Generale PRG · DCC 7/2004',year:'2004',role:'Previsione urbanistica',status:'piano',url:'https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320',note:'Resta separata dall’inventario dello stato di fatto.'}
 ];
 const fields=[
  ['identificativo','ID univoco del poligono/area','obbligatorio'],
  ['denominazione','Nome ufficiale o toponimo','se disponibile'],
  ['geometria','Poligono georeferenziato e CRS dichiarato','obbligatorio'],
  ['tipologia','Pubblico, privato, agricolo, attrezzato, naturale/collinare','da classificare'],
  ['titolarita','Proprietà comunale, altro ente, privata, ignota','fonte documentale'],
  ['gestore','Ufficio/ente/concessionario responsabile','fonte documentale'],
  ['attuazione','Esistente, parzialmente attuato, previsto, non attuato','riscontro territoriale'],
  ['accessibilita','Libero, orari, limitato, non accessibile, ignoto','verifica sul posto/atto'],
  ['manutenzione','Regolare, carente, degradata, non rilevata','data e fonte del sopralluogo'],
  ['data_verifica','Data dell’ultimo riscontro','obbligatorio'],
  ['fonte_e_affidabilita','Atto, dataset, sopralluogo, segnalazione; livello di attendibilità','obbligatorio']
 ];
 window.initGreenMap=async function(...args){
  await original.apply(this,args);
  const map=document.getElementById('greenMap');
  if(!map)return;
  let host=document.getElementById('greenCurrentInventoryProtocol');
  if(host)return;
  host=document.createElement('section');
  host.id='greenCurrentInventoryProtocol';
  host.className='card';
  const sourceRows=sources.map(s=>'<tr><td><strong>'+esc(s.id)+'</strong></td><td><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.name)+'</a></td><td>'+esc(s.year)+'</td><td>'+esc(s.role)+'</td><td><span class="badge">'+esc(s.status)+'</span><br><small>'+esc(s.note)+'</small></td></tr>').join('');
  const fieldRows=fields.map(f=>'<tr><td><strong>'+esc(f[0])+'</strong></td><td>'+esc(f[1])+'</td><td>'+esc(f[2])+'</td></tr>').join('');
  host.innerHTML='<h3>Inventario georeferenziato · stato attuale del verde</h3>'+
   '<p class="school-note"><strong>Stato della ricognizione:</strong> il dataset comunale 278 è una base storica 2013, non un censimento aggiornato. Al momento non è documentato, nelle fonti pubbliche individuate, un layer comunale aggiornato che certifichi contemporaneamente perimetri, proprietà, gestione, accessibilità e manutenzione. Questi attributi restano quindi “da verificare” e non vengono dedotti dalla sola geometria.</p>'+
   '<h4>Registro delle fonti</h4><div class="table-wrap"><table><thead><tr><th>Codice</th><th>Fonte</th><th>Anno</th><th>Utilizzo</th><th>Stato e limiti</th></tr></thead><tbody>'+sourceRows+'</tbody></table></div>'+
   '<h4>Tracciato informativo previsto per ogni area</h4><div class="table-wrap"><table><thead><tr><th>Campo</th><th>Contenuto</th><th>Regola di validazione</th></tr></thead><tbody>'+fieldRows+'</tbody></table></div>'+
   '<p class="muted">Regola di qualità: nessun attributo di proprietà, gestione, accessibilità o manutenzione viene valorizzato per supposizione. Ogni record dovrà riportare fonte, data di verifica e livello di affidabilità. Le aree private e agricole non saranno conteggiate come verde pubblico fruibile.</p>';
  const anchor=document.getElementById('greenComparisonReport')||document.getElementById('greenMapStatus')||map;
  anchor.insertAdjacentElement('afterend',host);
 };
})();