const assert=require('node:assert/strict');
const {createServer,cleanContext,extractOutput}=require('./server.cjs');

async function withServer(options,run){
  const server=createServer(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try{await run(`http://127.0.0.1:${port}`)}finally{await new Promise(resolve=>server.close(resolve))}
}

(async()=>{
  const cleaned=cleanContext({facility:{name:'Ana Tesis',line:'Hat 1'},secret:'gönderilmemeli',summary:{recordCount:2,weightedIntensityKwhTon:120},records:[{date:'2026-10-30',productionTon:500,electricityKwh:60000,unknown:'sil'}]});
  assert.equal(cleaned.facility.name,'Ana Tesis');
  assert.equal(cleaned.summary.weightedIntensityKwhTon,120);
  assert.equal('secret' in cleaned,false);
  assert.equal('unknown' in cleaned.records[0],false);
  assert.equal(extractOutput({output:[{content:[{type:'output_text',text:'Yanıt'}]}]}),'Yanıt');

  await withServer({apiKey:''},async base=>{
    const status=await fetch(base+'/api/assistant/status').then(response=>response.json());
    assert.equal(status.configured,false);
    const databaseStatus=await fetch(base+'/api/database/status').then(response=>response.json());
    assert.equal(databaseStatus.configured,false);
    const localModel=await fetch(base+'/assistant-model.js');
    assert.equal(localModel.status,200);
    assert.match(await localModel.text(),/function interpret/);
    const interfaceHtml=await fetch(base+'/').then(response=>response.text());
    assert.match(interfaceHtml,/assistant-ops/);
    assert.match(interfaceHtml,/Öncelikli bulgular/);
    assert.match(interfaceHtml,/OPERASYON DEĞERLENDİRMESİ/);
    assert.match(interfaceHtml,/ANALİZ ARAÇLARI/);
    assert.match(interfaceHtml,/database\.js/);
    const industrialTheme=await fetch(base+'/industrial.css');
    assert.equal(industrialTheme.status,200);
    assert.match(await industrialTheme.text(),/Restrained industrial interface/);
    const operationsTheme=await fetch(base+'/operations.css');
    assert.equal(operationsTheme.status,200);
    assert.match(await operationsTheme.text(),/data-first industrial workspace/);
    const response=await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Yorumla'})});
    assert.equal(response.status,503);
  });

  const databaseState={demo:false,activeFacilityId:'plant-main',facilities:[{id:'plant-main',name:'Ana Tesis',line:'Hat 1',factors:{electricFactor:.45,coalFactor:2.4},goal:{targetIntensity:110,electricityPrice:3}}],records:[]};
  const databaseCalls=[];
  const databaseFetch=async(url,options)=>{
    databaseCalls.push({url,body:JSON.parse(options.body),authorization:options.headers.Authorization});
    const payload=url.endsWith('/xh_get_state')?JSON.stringify(databaseState):'';
    return {ok:true,status:200,text:async()=>payload};
  };
  await withServer({supabaseUrl:'https://example-ref.supabase.co',supabaseServiceKey:'service-test',workspaceId:'test-workspace',fetchImpl:databaseFetch},async base=>{
    const status=await fetch(base+'/api/database/status').then(response=>response.json());
    assert.deepEqual(status,{configured:true,workspaceId:'test-workspace'});
    const loaded=await fetch(base+'/api/database/state').then(response=>response.json());
    assert.deepEqual(loaded.state,databaseState);
    const saved=await fetch(base+'/api/database/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:databaseState})});
    assert.equal(saved.status,200);
    assert.deepEqual(await saved.json(),{saved:true});
    assert.equal(databaseCalls[0].url,'https://example-ref.supabase.co/rest/v1/rpc/xh_get_state');
    assert.deepEqual(databaseCalls[0].body,{p_workspace_id:'test-workspace'});
    assert.equal(databaseCalls[0].authorization,'Bearer service-test');
    assert.equal(databaseCalls[1].url,'https://example-ref.supabase.co/rest/v1/rpc/xh_save_state');
    assert.deepEqual(databaseCalls[1].body,{p_workspace_id:'test-workspace',p_state:databaseState});
  });

  let upstreamBody,authorization;
  const fetchImpl=async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    upstreamBody=JSON.parse(options.body);authorization=options.headers.Authorization;
    return {ok:true,status:200,headers:{get:()=>null},json:async()=>({output:[{content:[{type:'output_text',text:'Yoğunluk önceki döneme göre yükselmiş.'}]}]})};
  };
  await withServer({apiKey:'test-key',model:'test-model',fetchImpl},async base=>{
    const status=await fetch(base+'/api/assistant/status').then(response=>response.json());
    assert.deepEqual(status,{configured:true,model:'test-model'});
    const tooLarge=await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Yorumla',padding:'x'.repeat(33000)})});
    assert.equal(tooLarge.status,413);
    const response=await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Sonuçları yorumla',context:{facility:{name:'Ana Tesis'},secret:'gönderilmemeli',summary:{recordCount:1,weightedIntensityKwhTon:130}}})});
    assert.equal(response.status,200);
    const payload=await response.json();
    assert.equal(payload.answer,'Yoğunluk önceki döneme göre yükselmiş.');
    assert.equal(authorization,'Bearer test-key');
    assert.equal(upstreamBody.model,'test-model');
    assert.equal(upstreamBody.store,false);
    assert.ok(!JSON.stringify(upstreamBody).includes('gönderilmemeli'));
  });
  console.log('AI status, context filtering, missing-key behavior and Responses API proxy passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
