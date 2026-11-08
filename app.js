'use strict';
const el = id => document.getElementById(id);
let extraction = window.TRACKER_EXTRACTION;
const reference = window.TRACKER_REFERENCE;
let report;
const normalize = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function textNode(tag, text, cls) { const n=document.createElement(tag); n.textContent=text; if(cls)n.className=cls; return n; }
function refresh() {
  if(!extraction){report={rows:[]};el('slot').textContent='Elige tu guardado con el lector o importa su JSON';el('source').textContent='No hay una partida precargada. No se envían guardados a Internet.';el('catalog').textContent=`${reference.location_groups_total} grupos de ubicaciones · ${reference.points.length} registros internos`;el('quality').textContent=`${reference.validated_base_targets} destinos base con terminal comprobado. Las ausencias sin evidencia permanecen NO VERIFICADAS.`;el('download').disabled=true;render();syncMap();return;}
  report = TrackerCompare.compare(reference,extraction);
  el('download').disabled=false;
  el('registered').textContent=report.registered_count;
  el('catalog').textContent=`${reference.location_groups_total} grupos de ubicaciones · ${report.catalog_total} registros internos`;
  el('discovered').textContent=report.counts.DESCUBIERTOS;
  el('pending').textContent=report.counts.PENDIENTES;
  el('unknown').textContent=report.counts['NO VERIFICADOS'];
  el('slot').textContent=extraction.source==='cet'?'Extracción CET':`Guardado ${extraction.slot||'sin nombre'}`;
  el('source').textContent=`Guardado: ${extraction.save_modified_at||'fecha no disponible'} · Extraído: ${extraction.extracted_at||'Sin fecha'} · ${extraction.source==='cet'?'Registro en memoria':'Copia del guardado'}`;
  const known = report.achievement_count !== null;
  const pct = known ? Math.min(100,100*report.achievement_count/report.achievement_threshold) : 0;
  el('percentage').textContent=known?pct.toFixed(1)+' %':'Sin verificar';
  el('progress').value=pct;
  el('achievement').textContent=known?`${report.achievement_count} nodos que cuentan / umbral ${report.achievement_threshold}. Último contador enviado por el juego: ${extraction.last_achievement_count??'no leído'}. El juego actualiza el logro en recuentos pares; este porcentaje no es el estado de Steam.`:'El catálogo o la extracción necesitan revisión. No se calcula un porcentaje fiable.';
  el('quality').textContent=report.complete?'Extracción completa. Los ausentes solo se consideran pendientes cuando también está verificado su terminal real.':'Extracción parcial o diferencias con el catálogo: se desactiva la clasificación de nuevos pendientes. '+(extraction.errors||[]).join(' ');
  render();syncMap();
}
function render() {
  const q=normalize(el('search').value),state=el('state').value,scope=el('scope').value;
  const rows=report.rows.filter(p => (state==='all'||p.state===state)&&(scope==='all'||p.scope===scope)&&normalize([p.name,p.name_en,p.record,p.id,p.district,p.subdistrict].join(' ')).includes(q));
  el('shown').textContent=`${rows.length} destinos`;
  const container=el('results');container.replaceChildren();
  if(!rows.length){container.append(textNode('div','No hay destinos con estos filtros.','empty'));return;}
  const groups=new Map();for(const p of rows){if(!groups.has(p.district))groups.set(p.district,[]);groups.get(p.district).push(p);}
  for(const [district,points] of groups){
    const section=textNode('section','','district');section.append(textNode('h3',`${district} · ${points.length}`));
    for(const p of points){
      const card=textNode('article','','destination');const name=document.createElement('div');name.append(textNode('h4',p.name));if(p.name_en!==p.name)name.append(textNode('span',p.name_en,'alias'));card.append(name,textNode('span',p.state.replaceAll('_',' '),'badge '+p.state.replaceAll(' ','_')));
      const details=textNode('div','','details');details.append(textNode('code',`${p.record||p.id} · ID ${p.id}`),textNode('p',p.reason));
      if(p.subdistrict&&p.subdistrict!==p.district)details.append(textNode('p','Zona: '+p.subdistrict));
      if(p.note&&p.note!==p.reason)details.append(textNode('p',p.note));
      if(p.locations?.length)details.append(textNode('span','Ubicación aproximada (X, Y, Z): '+p.locations.map(x=>x.map(v=>v.toFixed(1)).join(', ')).join(' / '),'coordinates'));
      else if(p.state==='PENDIENTES')details.append(textNode('span','Sin coordenadas verificadas.','coordinates'));
      if(p.state==='PENDIENTES'&&p.locations?.length){
        const nearby=report.rows.filter(x=>x.state==='DESCUBIERTOS'&&x.scope==='base'&&x.locations?.length).map(x=>({name:x.name,d:Math.min(...p.locations.flatMap(a=>x.locations.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))))})).sort((a,b)=>a.d-b.d).slice(0,2);
        if(nearby.length)details.append(textNode('p','Cerca de puntos descubiertos: '+nearby.map(x=>`${x.name} (~${Math.round(x.d)} m)`).join(' · ')+'. Distancia en línea recta, no ruta.'));
      }
      if(p.locations?.length){const show=textNode('button','Ver en el mapa');show.addEventListener('click',()=>{el('local-map').contentWindow.postMessage({type:'focus',id:p.id},'*');el('local-map').scrollIntoView({behavior:'smooth',block:'center'});});details.append(show);}
      card.append(details);section.append(card);
    }container.append(section);
  }
}
for(const id of ['search','state','scope'])el(id).addEventListener('input',render);
el('import').addEventListener('change',async event=>{
  const f=event.target.files[0];if(!f)return;
  try{if(f.size>10_000_000)throw Error('El archivo supera los 10 MB.');const candidate=JSON.parse(await f.text());TrackerCompare.validate(candidate);TrackerCompare.compare(reference,candidate);extraction=candidate;refresh();el('error').hidden=true;}
  catch(e){el('error').textContent='No se han sustituido los datos: '+e.message;el('error').hidden=false;}
  event.target.value='';
});
el('download').addEventListener('click',()=>{
  const fields=['state','name','name_en','district','record','id','scope','reason'];
  const csv=s=>{let v=String(s??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
  const content='\uFEFF'+[fields.join(','),...report.rows.map(p=>fields.map(k=>csv(p[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='dataterms-comparacion.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function syncMap(){const frame=el('local-map');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'states',states:(report?.rows||[]).map(p=>({id:p.id,state:p.state}))},'*');}
window.addEventListener('message',event=>{if(event.source!==el('local-map').contentWindow)return;if(event.data?.type==='ready')syncMap();});
el('load-map').addEventListener('click',()=>{const frame=el('official-map');frame.src='https://maps.piggyback.com/cyberpunk-2077/maps/night-city';frame.hidden=false;el('load-map').disabled=true;});
try{refresh();}catch(e){el('error').hidden=false;el('error').textContent=e.message;}
