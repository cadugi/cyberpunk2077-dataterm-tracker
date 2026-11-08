(function (root) {
  'use strict';
  function validate(ex) {
    if (!ex || ex.schema !== 1 || ex.game_version !== '2.50') throw Error('Versión o formato no admitidos. Se requiere una extracción 2.50.');
    if (!Array.isArray(ex.points) || !Array.isArray(ex.errors) || typeof ex.complete !== 'boolean' || ex.registered_count !== ex.points.length) throw Error('Extracción incompleta o recuento inconsistente.');
    const keys = new Set();
    for (const p of ex.points) {
      if (!p || typeof p.id !== 'string' || !/^\d+$/.test(p.id) || Number(p.id) >= 2 ** 40 || typeof p.is_ep1 !== 'boolean') throw Error('Nodo sin identificador o estado fiable.');
      const key = JSON.stringify([p.id, p.marker ?? null]);
      if (keys.has(key)) throw Error('Hay nodos duplicados en la extracción.');
      keys.add(key);
    }
    return ex;
  }
  function compare(ref, ex) {
    validate(ex);
    const by = new Map(ref.points.map(p => [p.id, p]));
    const found = new Set(ex.points.map(p => p.id));
    let complete = ex.complete && ex.errors.length === 0;
    const unknown_ids = ex.points.filter(p => !by.has(p.id)).map(p => p.id);
    if(unknown_ids.length)complete=false;
    const count = ex.points.filter(p => by.has(p.id) && by.get(p.id).show_on_world_map && !p.is_ep1).length;
    const runtimeMismatch = ex.source === 'cet' && (ex.engine_achievement_count !== count || ex.points.some(p => by.has(p.id) && p.show_on_world_map !== by.get(p.id).show_on_world_map));
    if (runtimeMismatch) complete = false;
    const rows = ref.points.map(p => {
      let state, reason;
      if (found.has(p.id)) { state = 'DESCUBIERTOS'; reason = 'ID exacto presente en FastTravelSystem'; }
      else if (complete && p.scope === 'base' && p.verified_destination) { state = 'PENDIENTES'; reason = 'Terminal real verificado y ausente del registro completo'; }
      else { state = 'NO VERIFICADOS'; reason = p.note || 'No hay evidencia suficiente para afirmar un pendiente'; }
      return {...p, state, reason};
    });
    for (const id of new Set(unknown_ids)) rows.push({id, record:'', name:'ID desconocido '+id, name_en:'', district:'Sin distrito verificado', scope:'unknown', state:'NO VERIFICADOS', reason:'Registrado, pero no reconocido por el catálogo 2.50', locations:[], note:''});
    const base = rows.filter(p => p.scope === 'base');
    const counts = Object.fromEntries(['DESCUBIERTOS','PENDIENTES','NO VERIFICADOS'].map(s => [s,base.filter(p => p.state === s).length]));
    return {rows, counts, complete, runtimeMismatch, unknown_ids, catalog_total:by.size, registered_count:ex.points.length, base_catalog_total:base.length, achievement_count:complete && !unknown_ids.length ? count : null, achievement_threshold:ref.achievement_threshold, last_achievement_count:ex.last_achievement_count};
  }
  const api = {validate,compare};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrackerCompare = api;
})(typeof window === 'undefined' ? globalThis : window);
