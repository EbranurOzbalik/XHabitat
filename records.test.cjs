const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
function harness(saved){
  const nodes=new Map();
  function element(){return {textContent:'',innerHTML:'',value:'',hidden:false,disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},after(){},focus(){},querySelector(s){return node(s)},reset(){},reportValidity(){return true}};}
  function node(s){if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)}
  const fields=Object.fromEntries(['date','production','electricity','coal','hours','electricFactor','coalFactor'].map(k=>[k,element()]));
  node('#record-form').elements=fields;node('#factor-form').elements=fields;
  const storage={value:saved};let answer=true;
  const context=vm.createContext({console,Intl,Date,Number,Math,JSON,Blob,URL,setTimeout(){},confirm:()=>answer,history:{replaceState(){}},location:{hash:''},localStorage:{getItem:()=>storage.value,setItem:(k,v)=>{storage.value=v}},document:{querySelector:node,querySelectorAll:()=>[],createElement:element},FormData:class{constructor(form){this.form=form}get(k){return this.form.elements[k].value}}});
  vm.runInContext(fs.readFileSync('app.js','utf8'),context);
  return {context,storage,node,fields,answer:v=>answer=v,run:s=>vm.runInContext(s,context),click:(kind,date)=>node('#records').onclick({target:{closest:s=>s===`[data-${kind}]`?{dataset:{[kind]:date}}:null}})};
}
const saved=JSON.stringify({demo:false,factors:{electricFactor:.45,coalFactor:2.4},records:[{date:'2026-10-29',production:500,electricity:65000,coal:40,hours:20},{date:'2026-10-30',production:600,electricity:72000,coal:45,hours:20}]});
const h=harness(saved);
h.click('edit','2026-10-29');assert.equal(h.fields.production.value,500);
h.fields.production.value='550';h.node('#record-form').onsubmit({preventDefault(){},currentTarget:h.node('#record-form')});assert.equal(JSON.parse(h.storage.value).records.find(r=>r.date==='2026-10-29').production,550);
h.click('edit','2026-10-29');h.fields.date.value='2026-10-30';h.answer(false);h.node('#record-form').onsubmit({preventDefault(){},currentTarget:h.node('#record-form')});assert.equal(JSON.parse(h.storage.value).records.length,2);
h.run('cancelEdit.onclick()');assert.equal(h.run('editingDate'),null);
h.click('delete','2026-10-29');assert.equal(h.run('state.records.length'),2);
h.answer(true);h.click('delete','2026-10-29');h.click('delete','2026-10-30');assert.equal(JSON.parse(h.storage.value).records.length,0);assert.equal(h.node('#export').disabled,true);
const restored=harness(h.storage.value);assert.equal(restored.run('state.records.length'),0);assert.ok(restored.node('#metrics').innerHTML.includes('İlk üretim kaydını ekle'));
console.log('Record edit, overwrite cancellation, edit cancellation, delete confirmation and empty-state persistence passed.');
