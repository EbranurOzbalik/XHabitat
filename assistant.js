const aiState={configured:false,mode:'local',busy:false,messages:[],facilityId:null};
const aiRound=(value,digits=3)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
const aiMedian=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2};

function buildAssistantContext(){
  const facility=activeFacility(),rows=ordered(),production=rows.reduce((sum,record)=>sum+record.production,0),electricity=rows.reduce((sum,record)=>sum+record.electricity,0);
  const weighted=production?electricity/production:null,last=rows.at(-1),previous=rows.slice(0,-1),previousProduction=previous.reduce((sum,record)=>sum+record.production,0),previousElectricity=previous.reduce((sum,record)=>sum+record.electricity,0);
  const reduction=weighted===null?0:Math.max(0,weighted-facility.goal.targetIntensity),savedElectricity=reduction*production;
  const references=typeof zenRecords!=='undefined'?zenRecords.map(record=>record.cement_electricity).filter(Number.isFinite):[];
  return {
    facility:{name:facility.name,line:facility.line},demo:state.demo,
    summary:{recordCount:rows.length,totalProductionTon:aiRound(production),weightedIntensityKwhTon:aiRound(weighted),latestIntensityKwhTon:aiRound(last?intensity(last):null),previousWeightedIntensityKwhTon:aiRound(previousProduction?previousElectricity/previousProduction:null),energyCo2Ton:aiRound(rows.reduce((sum,record)=>sum+carbon(record),0))},
    goal:{targetIntensityKwhTon:facility.goal.targetIntensity,electricityPriceTlKwh:facility.goal.electricityPrice,potentialElectricitySavingKwh:aiRound(savedElectricity),potentialEnergyCo2SavingTon:aiRound(savedElectricity*facility.factors.electricFactor/1000),potentialCostSavingTl:aiRound(savedElectricity*facility.goal.electricityPrice)},
    comparison:{zenodoMedianKwhTon:references.length?aiRound(aiMedian(references)):null,numericRecordCount:references.length},
    factors:{electricKgCo2Kwh:facility.factors.electricFactor,coalTonCo2Ton:facility.factors.coalFactor},
    records:rows.slice(-7).map(record=>({date:record.date,productionTon:record.production,electricityKwh:record.electricity,coalTon:record.coal,hours:record.hours,intensityKwhTon:aiRound(intensity(record)),energyCo2Ton:aiRound(carbon(record))}))
  };
}

function renderAssistantContext(){
  const context=buildAssistantContext(),summary=context.summary,goal=context.goal;
  const items=[
    ['Tesis',facilityLabel(activeFacility())],
    ['Kayıt',`${summary.recordCount} gün`],
    ['Ortalama yoğunluk',summary.weightedIntensityKwhTon===null?'Veri yok':`${fmt(summary.weightedIntensityKwhTon,1)} kWh/ton`],
    ['Enerji kaynaklı CO₂',`${fmt(summary.energyCo2Ton||0,1)} ton`],
    ['Tesis hedefi',`${fmt(goal.targetIntensityKwhTon,1)} kWh/ton`],
    ['Potansiyel tasarruf',`${fmt(goal.potentialElectricitySavingKwh||0)} kWh`]
  ];
  $('#assistant-context').className='assistant-context';
  $('#assistant-context').replaceChildren();
  for(const [label,value] of items){const row=document.createElement('div'),name=document.createElement('span'),result=document.createElement('strong');name.textContent=label;result.textContent=value;row.append(name,result);$('#assistant-context').append(row)}
}

function resetAiConversation(force=false){
  const facility=activeFacility(),changed=aiState.facilityId!==facility.id;
  if(!force&&!changed&&aiState.messages.length>1)return;
  aiState.facilityId=facility.id;
  aiState.messages=[{role:'assistant',source:'local',text:XHabitatAssistant.interpret('Sonuçlarımı genel olarak yorumla.',buildAssistantContext())}];
  renderAiMessages();
}

function assistantSourceLabel(message){
  if(message.loading)return 'Analiz hazırlanıyor';
  if(message.source==='openai')return message.model?`Canlı AI · ${message.model}`:'Canlı AI yorumu';
  if(message.source==='fallback')return 'Yerel yedek analiz';
  return message.role==='assistant'?'XHabitat analizi':'';
}

function renderAiMessages(){
  const panel=$('#ai-messages');
  panel.replaceChildren();
  for(const message of aiState.messages){
    const item=document.createElement('div');item.className=`ai-message ${message.role}${message.loading?' loading':''}`;
    if(message.role==='assistant'){
      const source=document.createElement('span');source.className=`ai-message-source ${message.source||'local'}`;source.textContent=assistantSourceLabel(message);item.append(source);
    }
    const text=document.createElement('div');text.className='ai-message-text';text.textContent=message.text;item.append(text);panel.append(item);
  }
  panel.scrollTop=panel.scrollHeight;
}

function setAiSendDisabled(disabled){
  const button=$('#ai-send');
  button.disabled=disabled;
  button.className=disabled?'secondary':'primary';
}

function setAiAvailability(configured,model){
  aiState.configured=configured;
  aiState.mode=configured?'openai':'local';
  const status=$('#ai-status');
  status.textContent=configured?`Canlı AI bağlı · ${model}`:'XHabitat analizi';
  status.hidden=!configured;
  status.className=`ai-status ${configured?'ready':'local'}`;
  setAiSendDisabled(false);
  $('.assistant-privacy').textContent=configured?'Sorun ve bu özet, yanıt oluşturmak için OpenAI API’ye gönderilir. API anahtarı tarayıcıya aktarılmaz.':'Yorumlar bu tarayıcıda, kural tabanlı olarak oluşturulur. Tesis verileri dışarı gönderilmez.';
  $('#ai-mode-description').textContent=configured?'Hesaplama motoru sayıları üretir; canlı AI bu sonuçları tesis bağlamında yorumlar. Bağlantı kesilirse kural tabanlı analiz otomatik devreye girer.':'Hesaplama motoru sayıları üretir; XHabitat sonuçları doğrulanmış kurallarla yorumlar. OpenAI bağlantısı etkinleştirildiğinde aynı bağlam canlı AI tarafından açıklanır.';
  $('#ai-form-status').textContent='';
}

async function loadAiStatus(){
  try{const response=await fetch('/api/assistant/status');if(!response.ok)throw Error();const data=await response.json();setAiAvailability(Boolean(data.configured),data.model||'OpenAI');}
  catch{setAiAvailability(false);}
}

async function askAssistant(question){
  if(aiState.busy)return;
  const context=buildAssistantContext();
  if(!context.summary.recordCount){$('#ai-form-status').textContent='Önce seçili tesise en az bir üretim kaydı ekle.';return;}
  aiState.busy=true;setAiSendDisabled(true);$('#ai-form-status').textContent='';
  aiState.messages.push({role:'user',text:question},{role:'assistant',source:aiState.mode,text:'Verileri yorumluyorum…',loading:true});renderAiMessages();
  try{
    if(aiState.mode==='openai'){
      const history=aiState.messages.slice(0,-2).filter(message=>!message.loading).slice(-6);
      const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,context,history})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'AI yanıtı alınamadı.');
      aiState.messages[aiState.messages.length-1]={role:'assistant',source:'openai',model:data.model,text:data.answer};
    }else{
      aiState.messages[aiState.messages.length-1]={role:'assistant',source:'local',text:XHabitatAssistant.interpret(question,context)};
    }
  }catch(error){
    const fallback=XHabitatAssistant.interpret(question,context);
    aiState.messages[aiState.messages.length-1]={role:'assistant',source:'fallback',text:aiState.mode==='openai'?`Canlı AI yanıtı alınamadı. Kesintisiz devam etmek için yerel analiz gösteriliyor.\n\n${fallback}`:`Yanıt oluşturulamadı: ${error.message}`};
  }
  finally{aiState.busy=false;setAiSendDisabled(false);renderAiMessages();}
}

$('#ai-form').onsubmit=event=>{event.preventDefault();const question=$('#ai-question').value.trim();if(question.length<2)return;$('#ai-question').value='';askAssistant(question)};
const optimizationButton=document.createElement('button');
optimizationButton.type='button';optimizationButton.className='secondary optimization-suggestion';optimizationButton.dataset.aiQuestion='Verilerime göre önceliklendirilmiş bir verimlilik optimizasyon planı oluştur.';optimizationButton.textContent='Optimizasyon planı';
$('.assistant-suggestions').prepend(optimizationButton);
document.querySelectorAll('[data-ai-question]').forEach(button=>button.onclick=()=>{const question=button.dataset.aiQuestion;$('#ai-question').value='';askAssistant(question)});
const aiHeadingActions=document.createElement('div'),aiClear=document.createElement('button'),aiStatus=$('#ai-status');
aiHeadingActions.className='ai-heading-actions';aiClear.type='button';aiClear.className='secondary ai-clear';aiClear.textContent='Yeni sohbet';
aiStatus.replaceWith(aiHeadingActions);aiHeadingActions.append(aiStatus,aiClear);aiClear.onclick=()=>resetAiConversation(true);
const renderWithAssistant=render;render=function(){renderWithAssistant();renderAssistantContext();resetAiConversation();};
renderAssistantContext();resetAiConversation(true);loadAiStatus();
