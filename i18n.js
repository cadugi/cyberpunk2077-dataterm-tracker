(function(root){
  'use strict';
  const data=root.TRACKER_LOCALES,key='dataterm-tracker.language';
  let language='en';
  try{const saved=localStorage.getItem(key);if(saved==='en'||saved==='es')language=saved;else if(root.TRACKER_DEFAULT_LANGUAGE==='es')language='es';}catch{if(root.TRACKER_DEFAULT_LANGUAGE==='es')language='es';}
  const api={
    get language(){return language;},
    setLanguage(value,persist=true){language=value==='es'?'es':'en';if(persist)try{localStorage.setItem(key,language);}catch{}api.apply();},
    t(id,params={}){const value=data[language][id]??data.en[id];if(value===undefined)throw Error('Missing locale key: '+id);return value.replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??''));},
    name(point){return point.scope==='unknown'?api.t('unknownName',{id:point.id}):(language==='en'?(point.name_en||point.name):point.name);},
    alternate(point){return language==='en'?point.name:point.name_en;},
    district(value){if(!value||value==='Sin distrito verificado'||value==='Unverified district')return api.t('unknownDistrict');return language==='en'?(data.districts[value]||value):value;},
    note(value){if(!value)return '';return language==='es'?value:(data.notes[value]||api.t('reasonUnverified'));},
    reason(point){if(point.scope==='unknown')return api.t('reasonUnknown');if(point.state==='DESCUBIERTOS')return api.t('reasonDiscovered');if(point.state==='PENDIENTES')return api.t('reasonMissing');return api.note(point.note)||api.t('reasonUnverified');},
    number(value,digits=0){return new Intl.NumberFormat(language==='es'?'es-ES':'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);},
    date(value){if(!value)return api.t('noDate');const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(language==='es'?'es-ES':'en-GB',{dateStyle:'medium',timeStyle:'medium'}).format(date);},
    apply(){document.documentElement.lang=language;for(const n of document.querySelectorAll('[data-i18n]'))n.textContent=api.t(n.dataset.i18n);for(const [attr,prop]of [['data-i18n-title','title'],['data-i18n-placeholder','placeholder'],['data-i18n-aria','aria-label']])for(const n of document.querySelectorAll('['+attr+']'))n.setAttribute(prop,api.t(n.getAttribute(attr)));const select=document.getElementById('language');if(select)select.value=language;}
  };
  root.I18n=api;api.apply();
})(window);
