const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');

function harness(saved){
  const nodes=new Map();
  function element(){
    return {
      textContent:'',innerHTML:'',value:'',hidden:false,disabled:false,selected:false,dataset:{},children:[],
      classList:{add(){},remove(){},toggle(){}},
      append(...items){this.children.push(...items);for(const item of items)if(item.selected)this.value=item.value},
      replaceChildren(...items){this.children=[];this.value='';this.append(...items)},
      after(){},focus(){},reset(){},reportValidity(){return true},querySelector(s){return node(s)}
    };
  }
  function node(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector)}
  const recordFields=Object.fromEntries(['facilityId','date','production','electricity','coal','hours'].map(key=>[key,element()]));
  const factorFields=Object.fromEntries(['electricFactor','coalFactor'].map(key=>[key,element()]));
  const goalFields=Object.fromEntries(['targetIntensity','electricityPrice'].map(key=>[key,element()]));
  const facilityFields=Object.fromEntries(['name','line'].map(key=>[key,element()]));
  node('#record-form').elements=recordFields;
  node('#factor-form').elements=factorFields;
  node('#goal-form').elements=goalFields;
  node('#facility-form').elements=facilityFields;
  const storage={value:saved};let answer=true;
  const context=vm.createContext({
    console,Intl,Date,Number,Math,JSON,Blob,URL,setTimeout(){},confirm:()=>answer,
    history:{replaceState(){}},location:{hash:''},
    localStorage:{getItem:()=>storage.value,setItem:(key,value)=>{storage.value=value}},
    document:{querySelector:node,querySelectorAll:()=>[],createElement:element},
    FormData:class{constructor(form){this.form=form}get(key){return this.form.elements[key].value}}
  });
  vm.runInContext(fs.readFileSync('app.js','utf8'),context);
  return {
    context,storage,node,recordFields,factorFields,goalFields,facilityFields,answer:value=>answer=value,
    run:source=>vm.runInContext(source,context),
    click:(kind,date,facilityId='plant-main')=>node('#records').onclick({target:{closest:selector=>selector===`[data-${kind}]`?{dataset:{[kind]:date,facility:facilityId}}:null}})
  };
}

const saved=JSON.stringify({
  demo:false,
  facilities:[
    {id:'plant-main',name:'Ana Tesis',line:'Hat 1',factors:{electricFactor:.45,coalFactor:2.4}},
    {id:'plant-north',name:'Kuzey Tesisi',line:'Hat 2',factors:{electricFactor:.5,coalFactor:2.3}}
  ],
  activeFacilityId:'plant-main',
  records:[
    {facilityId:'plant-main',date:'2026-10-29',production:500,electricity:65000,coal:40,hours:20},
    {facilityId:'plant-main',date:'2026-10-30',production:600,electricity:72000,coal:45,hours:20},
    {facilityId:'plant-north',date:'2026-10-29',production:450,electricity:54000,coal:35,hours:19}
  ]
});

const h=harness(saved);
h.click('edit','2026-10-29');
assert.equal(h.recordFields.production.value,500);
h.recordFields.production.value='550';
h.node('#record-form').onsubmit({preventDefault(){},currentTarget:h.node('#record-form')});
let persisted=JSON.parse(h.storage.value);
assert.equal(persisted.records.find(record=>record.facilityId==='plant-main'&&record.date==='2026-10-29').production,550);
assert.equal(persisted.records.find(record=>record.facilityId==='plant-north'&&record.date==='2026-10-29').production,450);

h.click('edit','2026-10-29');
h.recordFields.date.value='2026-10-30';
h.answer(false);
h.node('#record-form').onsubmit({preventDefault(){},currentTarget:h.node('#record-form')});
assert.equal(JSON.parse(h.storage.value).records.length,3);
h.run('cancelEdit.onclick()');
assert.equal(h.run('editingRecord'),null);

h.click('delete','2026-10-29');
assert.equal(h.run('state.records.length'),3);
h.answer(true);
h.click('delete','2026-10-29');
h.click('delete','2026-10-30');
persisted=JSON.parse(h.storage.value);
assert.equal(persisted.records.length,1);
assert.equal(persisted.records[0].facilityId,'plant-north');
assert.equal(h.node('#export').disabled,true);

const restored=harness(h.storage.value);
assert.equal(restored.run("state.records.filter(record=>record.facilityId==='plant-main').length"),0);
assert.ok(restored.node('#metrics').innerHTML.includes('ilk üretim kaydını ekle'));

const facilities=harness(saved);
facilities.facilityFields.name.value='İzmir Fabrikası';
facilities.facilityFields.line.value='Klinker Hattı 3';
facilities.node('#facility-form').onsubmit({preventDefault(){}});
persisted=JSON.parse(facilities.storage.value);
assert.equal(persisted.facilities.length,3);
assert.equal(persisted.facilities.find(item=>item.id===persisted.activeFacilityId).name,'İzmir Fabrikası');

facilities.node('#facility-switch').onchange({target:{value:'plant-north'}});
facilities.factorFields.electricFactor.value='.61';
facilities.factorFields.coalFactor.value='2.25';
facilities.node('#factor-form').onsubmit({preventDefault(){},currentTarget:facilities.node('#factor-form')});
persisted=JSON.parse(facilities.storage.value);
assert.equal(persisted.facilities.find(item=>item.id==='plant-north').factors.electricFactor,.61);
assert.equal(persisted.facilities.find(item=>item.id==='plant-main').factors.electricFactor,.45);

facilities.goalFields.targetIntensity.value='100';
facilities.goalFields.electricityPrice.value='3.5';
facilities.node('#goal-form').onsubmit({preventDefault(){},currentTarget:facilities.node('#goal-form')});
persisted=JSON.parse(facilities.storage.value);
assert.deepEqual(persisted.facilities.find(item=>item.id==='plant-north').goal,{targetIntensity:100,electricityPrice:3.5});
assert.deepEqual(persisted.facilities.find(item=>item.id==='plant-main').goal,{targetIntensity:110,electricityPrice:3});
assert.match(facilities.node('#savings-results').innerHTML,/9[.\u00a0]?000/);

const legacy=harness(JSON.stringify({demo:false,factors:{electricFactor:.45,coalFactor:2.4},records:[{date:'2026-10-29',production:500,electricity:65000,coal:40,hours:20}]}));
persisted=legacy.run('JSON.parse(JSON.stringify(state))');
assert.equal(persisted.facilities[0].id,'plant-main');
assert.equal(persisted.records[0].facilityId,'plant-main');
assert.equal(persisted.facilities[0].goal.targetIntensity,110);
assert.equal(persisted.facilities[0].goal.electricityPrice,3);

console.log('Record editing, deletion, empty facility state, facility creation, factor and goal isolation, savings and legacy migration passed.');
