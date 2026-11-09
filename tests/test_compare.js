const assert=require('node:assert/strict'),fs=require('node:fs'),{compare,validate}=require('../compare.js');
const ref=JSON.parse(fs.readFileSync('data/reference.json','utf8'));
const ex={schema:1,game_version:'2.50',source:'save-copy',complete:true,registered_count:0,points:[],errors:[]};
assert.equal(ref.location_groups_total,164);assert.ok(compare(ref,ex).counts.PENDIENTES>100);
const p=ref.points.find(x=>x.verified_destination);let other=structuredClone(ex);other.points=[{id:p.id,marker:'#invented',is_ep1:false,mappin_visible:false}];other.registered_count=1;assert.equal(compare(ref,other).counts.DESCUBIERTOS,1);
other.complete=false;assert.equal(compare(ref,other).counts.PENDIENTES,0);other.points[0].id=123;assert.throws(()=>validate(other));
assert.ok(compare(ref,ex).rows.filter(x=>x.location_group==='aldecaldos-camp').every(x=>x.state==='NO VERIFICADOS'));
other=structuredClone(ex);other.source='cet';other.engine_achievement_count=999;assert.equal(compare(ref,other).counts.PENDIENTES,0);
console.log('Synthetic JS classification tests: PASS');
