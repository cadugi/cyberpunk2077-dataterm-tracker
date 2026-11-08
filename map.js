'use strict';
const svg=document.getElementById('map'),layer=document.getElementById('points'),tip=document.getElementById('tooltip'),NS='http://www.w3.org/2000/svg';
const points=window.TRACKER_REFERENCE.points.filter(p=>['base','expansion'].includes(p.scope)&&p.locations?.length);
let states=new Map(),focused=null,drag=null,view=[-4300,-4800,10000,11000];
function node(tag,attrs){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
function dotRadius(focus){return Math.max(12,Math.min(75,view[2]/130))*(focus?1.9:1);}
function applyView(){svg.setAttribute('viewBox',view.join(' '));for(const c of layer.children)c.setAttribute('r',dotRadius(c.dataset.focus==='1'));scheduleTiles();}
function tooltip(p){tip.dataset.id=p.id;tip.hidden=false;tip.textContent=[I18n.name(p),I18n.district(p.district),states.has(p.id)?I18n.t(states.get(p.id)):I18n.t('noSaveShort'),p.locations[0].map(x=>I18n.number(x,1)).join(', ')].join(' / ');}
function render(){layer.replaceChildren();const filter=document.getElementById('filter').value;
 for(const p of points){const status=states.get(p.id)||'NO VERIFICADOS';if(filter!=='all'&&status!==filter&&p.id!==focused)continue;
  for(const xyz of p.locations){const c=node('circle',{cx:xyz[0],cy:-xyz[1],r:dotRadius(p.id===focused),'data-focus':p.id===focused?'1':'0',fill:status==='PENDIENTES'?'#fcee09':status==='DESCUBIERTOS'?'#00f0ff':'#6b6f78',tabindex:0,'aria-label':I18n.name(p)+' '+I18n.t(status)});const title=node('title',{});title.textContent=I18n.name(p)+' / '+I18n.t(status);c.append(title);c.addEventListener('pointerenter',()=>tooltip(p));c.addEventListener('focus',()=>tooltip(p));c.addEventListener('click',()=>{focused=p.id;tooltip(p);render();});layer.append(c);}
 }
}

/* Mosaico del mapa: solo se dibujan las teselas visibles en el nivel de zoom adecuado.
   a = pixeles de imagen por unidad de juego; (tx, ty) = pixel de imagen que corresponde al origen del juego. */
const TILE_MAP={dir:'tiles',size:14080,tile:512,maxZoom:5,a:1.07,tx:7492,ty:5732};
const tileGroup=document.getElementById('tile-layer'),tileNodes=new Map();let tileFrame=0;
function tileLevelSize(z){return Math.ceil(TILE_MAP.size/2**(TILE_MAP.maxZoom-z));}
function addTile(z,x,y,key){
 const f=2**(TILE_MAP.maxZoom-z),lw=tileLevelSize(z),tw=Math.min(TILE_MAP.tile,lw-x*TILE_MAP.tile),th=Math.min(TILE_MAP.tile,lw-y*TILE_MAP.tile),a=TILE_MAP.a;
 const n=node('image',{href:`${TILE_MAP.dir}/${z}/${x}/${y}.webp`,x:(x*TILE_MAP.tile*f-TILE_MAP.tx)/a,y:(y*TILE_MAP.tile*f-TILE_MAP.ty)/a,width:tw*f/a+1,height:th*f/a+1,preserveAspectRatio:'none'});
 n.dataset.z=z;tileNodes.set(key,n);tileGroup.append(n);
}
function updateTiles(){
 tileFrame=0;if(tileGroup.getAttribute('display')==='none')return;
 const w=svg.clientWidth||1,h=svg.clientHeight||1,scale=Math.min(w/view[2],h/view[3]),visW=w/scale,visH=h/scale,cx=view[0]+view[2]/2,cy=view[1]+view[3]/2;
 const {a,tx,ty,tile,maxZoom,size}=TILE_MAP;
 const z=Math.max(1,Math.min(maxZoom,Math.ceil(maxZoom+Math.log2(scale/a)-0.25)));
 const f=2**(maxZoom-z),step=tile*f,count=Math.ceil(size/step);
 const u0=(cx-visW/2)*a+tx,u1=(cx+visW/2)*a+tx,v0=(cy-visH/2)*a+ty,v1=(cy+visH/2)*a+ty;
 const wanted=new Set();
 const add=(zz,x,y)=>{const key=`${zz}/${x}/${y}`;wanted.add(key);if(!tileNodes.has(key))addTile(zz,x,y,key);};
 for(let x=0;x<Math.ceil(size/(tile*2**(maxZoom-1)));x++)for(let y=0;y<Math.ceil(size/(tile*2**(maxZoom-1)));y++)add(1,x,y); // base siempre visible
 if(z>1)for(let x=Math.max(0,Math.floor(u0/step));x<=Math.min(count-1,Math.floor(u1/step));x++)for(let y=Math.max(0,Math.floor(v0/step));y<=Math.min(count-1,Math.floor(v1/step));y++)add(z,x,y);
 for(const [key,n] of tileNodes)if(!wanted.has(key)){n.remove();tileNodes.delete(key);}
 // las teselas finas se ordenan por nivel para que las de mayor zoom queden encima de la base
 for(const n of [...tileGroup.children].sort((p,q)=>p.dataset.z-q.dataset.z))tileGroup.append(n);
}
function scheduleTiles(){if(!tileFrame)tileFrame=requestAnimationFrame(updateTiles);}
window.addEventListener('resize',scheduleTiles);
scheduleTiles();
const grid=document.getElementById('grid');for(let a=-8000;a<=8000;a+=1000){for(const attrs of [{x1:a,y1:-8000,x2:a,y2:8000},{x1:-8000,y1:a,x2:8000,y2:a}])grid.append(node('line',{...attrs,stroke:'#1f1f22','stroke-width':1,'vector-effect':'non-scaling-stroke'}));}
const groups=new Map();for(const p of points){if(!groups.has(p.district))groups.set(p.district,[]);groups.get(p.district).push(p.locations[0]);}for(const [district,a]of groups){const t=node('text',{x:a.reduce((s,b)=>s+b[0],0)/a.length,y:-a.reduce((s,b)=>s+b[1],0)/a.length});t.dataset.district=district;t.textContent=I18n.district(district);document.getElementById('districts').append(t);}
svg.addEventListener('wheel',e=>{e.preventDefault();const b=svg.getBoundingClientRect(),px=(e.clientX-b.left)/b.width,py=(e.clientY-b.top)/b.height,f=e.deltaY>0?1.15:0.87,w=Math.max(300,Math.min(24000,view[2]*f)),h=w*1.1;view=[view[0]+px*(view[2]-w),view[1]+py*(view[3]-h),w,h];applyView();},{passive:false});
svg.addEventListener('pointerdown',e=>{if(e.target.tagName==='circle')return;drag={x:e.clientX,y:e.clientY,view:[...view]};svg.setPointerCapture(e.pointerId);});svg.addEventListener('pointermove',e=>{if(!drag)return;const b=svg.getBoundingClientRect();view=[drag.view[0]-(e.clientX-drag.x)*drag.view[2]/b.width,drag.view[1]-(e.clientY-drag.y)*drag.view[3]/b.height,drag.view[2],drag.view[3]];applyView();});svg.addEventListener('pointerup',()=>{drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});
document.getElementById('filter').addEventListener('change',render);document.getElementById('reset').addEventListener('click',()=>{view=[-4300,-4800,10000,11000];focused=null;applyView();render();tip.hidden=true;});
window.addEventListener('message',e=>{if(e.source!==window.parent)return;if(e.data?.type==='states'&&Array.isArray(e.data.states)){I18n.setLanguage(e.data.language,false);for(const n of document.querySelectorAll('[data-district]'))n.textContent=I18n.district(n.dataset.district);if(tip.dataset.id){const p=points.find(p=>p.id===tip.dataset.id);if(p)tooltip(p);}states=new Map(e.data.states.filter(x=>typeof x.id==='string'&&['DESCUBIERTOS','PENDIENTES','NO VERIFICADOS'].includes(x.state)).map(x=>[x.id,x.state]));render();}if(e.data?.type==='focus'&&typeof e.data.id==='string'){const p=points.find(p=>p.id===e.data.id);if(!p)return;focused=p.id;view=[p.locations[0][0]-1100,-p.locations[0][1]-1210,2200,2420];applyView();tooltip(p);render();}});render();window.parent.postMessage({type:'ready'},'*');
