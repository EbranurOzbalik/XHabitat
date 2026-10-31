/* Supabase persistence with localStorage fallback. */
let databaseSaveTimer=null,databaseConfigured=false,databaseLoading=false;
const browserSave=save;

function databaseStatus(text,connected=false){
  const indicator=document.querySelector('.local-status');
  if(!indicator)return;
  indicator.innerHTML=`<i></i> ${text}`;
  indicator.classList.toggle('database-connected',connected);
}

async function pushDatabaseState(){
  if(!databaseConfigured||databaseLoading)return;
  try{
    const response=await fetch('/api/database/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state})});
    if(!response.ok)throw Error();
    databaseStatus('Supabase ile eşitlendi',true);
  }catch{databaseStatus('Yerel kayıt · eşitleme bekliyor',false)}
}

function queueDatabaseSave(){
  if(!databaseConfigured||databaseLoading)return;
  clearTimeout(databaseSaveTimer);
  databaseSaveTimer=setTimeout(pushDatabaseState,450);
}

save=function(){const stored=browserSave();if(stored)queueDatabaseSave();return stored};

async function loadDatabase(){
  databaseStatus('Veri deposu kontrol ediliyor');
  try{
    const statusResponse=await fetch('/api/database/status');
    const status=await statusResponse.json();
    databaseConfigured=Boolean(status.configured);
    if(!databaseConfigured){databaseStatus('Tarayıcıda saklanır');return}
    databaseLoading=true;
    const response=await fetch('/api/database/state');
    if(!response.ok)throw Error();
    const payload=await response.json();
    if(payload.state){
      state=normalizeState(payload.state);
      localStorage.setItem(key,JSON.stringify(state));
      resetRecordForm();resetFacilityForm();render();show(location.hash.slice(1)||'overview');
    }else{
      await fetch('/api/database/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state})});
    }
    databaseStatus('Supabase ile eşitlendi',true);
  }catch{databaseStatus('Yerel kayıt · veritabanına ulaşılamadı',false)}
  finally{databaseLoading=false}
}

loadDatabase();
