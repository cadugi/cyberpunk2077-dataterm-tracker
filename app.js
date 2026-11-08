'use strict';
const el=id=>document.getElementById(id),t=(id,params)=>I18n.t(id,params);
let extraction=window.TRACKER_EXTRACTION,report,lastError=null,pendingMapFocus=null;
const reference=window.TRACKER_REFERENCE;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function textNode(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function showError(){el('error').hidden=!lastError;if(lastError)el('error').textContent=t('errorPrefix',{message:t(lastError.key,lastError.params)});}
function refresh(){
 I18n.apply();el('catalog').textContent=t('catalog',{groups:reference.location_groups_total,records:reference.points.length});
 if(!extraction){report={rows:[]};el('slot').textContent=t('chooseSave');el('source').textContent=t('noSave');el('quality').textContent=t('coverage',{count:reference.validated_base_targets});el('download').disabled=true;render();syncMap();showError();return;}
 report=TrackerCompare.compare(reference,extraction);el('download').disabled=false;
 for(const [id,value]of Object.entries({registered:report.registered_count,discovered:report.counts.DESCUBIERTOS,pending:report.counts.PENDIENTES,unknown:report.counts['NO VERIFICADOS']}))el(id).textContent=value;
 el('slot').textContent=extraction.source==='cet'?t('cetExtraction'):t('saveSlot',{slot:extraction.slot||t('unnamed')});
 el('source').textContent=t('source',{saved:I18n.date(extraction.save_modified_at),extracted:I18n.date(extraction.extracted_at),method:t(extraction.source==='cet'?'memory':'saveCopy')});
 const known=report.achievement_count!==null,pct=known?Math.min(100,100*report.achievement_count/report.achievement_threshold):0;
 el('percentage').textContent=known?I18n.number(pct,1)+' %':t('NO VERIFICADOS');el('progress').value=pct;
 el('achievement').textContent=known?t('progress',{count:report.achievement_count,threshold:report.achievement_threshold,last:extraction.last_achievement_count??t('notRead')}):t('progressUnknown');
 el('quality').textContent=t(report.complete?'complete':'incomplete');if(extraction.errors?.length)el('quality').textContent+=' '+extraction.errors.join(' ');
 render();syncMap();showError();
}
function render(){
 const q=normalize(el('search').value),state=el('state').value,scope=el('scope').value;
 const rows=report.rows.filter(p=>(state==='all'||p.state===state)&&(scope==='all'||p.scope===scope)&&normalize([p.name,p.name_en,p.record,p.id,p.district,p.subdistrict,I18n.district(p.district),I18n.district(p.subdistrict)].join(' ')).includes(q));
 el('shown').textContent=t('destinations',{count:rows.length});const container=el('results');container.replaceChildren();if(!rows.length){container.append(textNode('div',t(extraction?'empty':'emptySave'),'empty'));return;}
 const groups=new Map();for(const p of rows){const district=I18n.district(p.district);if(!groups.has(district))groups.set(district,[]);groups.get(district).push(p);}
 for(const [district,points]of groups){const section=textNode('section','','district');section.append(textNode('h3',`${district} · ${points.length}`));
  for(const p of points){const card=textNode('article','','destination');card.dataset.id=p.id;const names=document.createElement('div');names.append(textNode('h4',I18n.name(p)));const alternate=I18n.alternate(p);if(alternate&&alternate!==I18n.name(p))names.append(textNode('span',alternate,'alias'));card.append(names,textNode('span',t(p.state),'badge '+p.state.replaceAll(' ','_')));
   const details=textNode('div','','details');details.append(textNode('code',`${p.record||p.id} · ID ${p.id}`),textNode('p',I18n.reason(p)));
   if(p.subdistrict&&p.subdistrict!==p.district)details.append(textNode('p',t('area',{area:I18n.district(p.subdistrict)})));if(p.note&&p.state!=='NO VERIFICADOS')details.append(textNode('p',I18n.note(p.note)));
   if(p.locations?.length)details.append(textNode('span',t('coordinates',{coordinates:p.locations.map(x=>x.map(v=>I18n.number(v,1)).join(', ')).join(' / ')}),'coordinates'));else if(p.state==='PENDIENTES')details.append(textNode('span',t('noCoordinates'),'coordinates'));
   if(p.state==='PENDIENTES'&&p.locations?.length){const nearby=report.rows.filter(x=>x.state==='DESCUBIERTOS'&&x.scope==='base'&&x.locations?.length).map(x=>({point:x,d:Math.min(...p.locations.flatMap(a=>x.locations.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))))})).sort((a,b)=>a.d-b.d).slice(0,2);if(nearby.length)details.append(textNode('p',t('nearby',{points:nearby.map(x=>`${I18n.name(x.point)} (~${I18n.number(x.d)} m)`).join(' · ')})));}
   if(p.locations?.length){const show=textNode('button',t('showMap'));show.addEventListener('click',()=>{pendingMapFocus=p.id;syncMap();el('local-map').scrollIntoView({behavior:'smooth',block:'center'});});details.append(show);}card.append(details);section.append(card);
  }container.append(section);
 }
}
for(const id of ['search','state','scope'])el(id).addEventListener('input',render);
el('language').addEventListener('change',()=>{I18n.setLanguage(el('language').value);refresh();});
el('import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;
 try{if(file.size>10_000_000)throw Error('fileSize');const candidate=JSON.parse(await file.text());TrackerCompare.validate(candidate);TrackerCompare.compare(reference,candidate);extraction=candidate;lastError=null;refresh();}
 catch(error){lastError=error instanceof SyntaxError?{key:'invalidJson'}:['fileSize','version','metadata','node','duplicates'].includes(error.message)?{key:error.message}:{key:'readError',params:{message:error.message}};showError();}event.target.value='';
});
el('download').addEventListener('click',()=>{const headers=[t('csvState'),'state_code',t('csvName'),t('csvAlternate'),t('csvDistrict'),'record','id',t('csvScope'),t('csvReason')];
 const csv=s=>{let v=String(s??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
 const content='\uFEFF'+[headers.map(csv).join(','),...report.rows.map(p=>[t(p.state),p.state,I18n.name(p),I18n.alternate(p),I18n.district(p.district),p.record,p.id,t(p.scope),I18n.reason(p)].map(csv).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=t('csvFile');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function syncMap(){const frame=el('local-map');if(frame?.contentWindow){frame.contentWindow.postMessage({type:'states',language:I18n.language,states:(report?.rows||[]).map(p=>({id:p.id,state:p.state}))},'*');if(pendingMapFocus)frame.contentWindow.postMessage({type:'focus',id:pendingMapFocus},'*');}}
window.addEventListener('message',event=>{if(event.source!==el('local-map').contentWindow)return;if(event.data?.type==='ready')syncMap();});
el('load-map').addEventListener('click',()=>{const frame=el('official-map');frame.src='https://maps.piggyback.com/cyberpunk-2077/maps/night-city';frame.hidden=false;el('load-map').disabled=true;});
try{refresh();}catch(error){lastError={key:'readError',params:{message:error.message}};showError();}
