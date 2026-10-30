(function(root){
  'use strict';
  const columns=['tarih','uretim_ton','elektrik_kwh','komur_ton','saat'];
  function tokenize(text,delimiter){
    const rows=[];let cells=[],value='',quoted=false,closed=false,line=1,start=1;
    const cell=()=>{cells.push(value.trim());value='';closed=false};
    const row=()=>{cell();if(cells.some(v=>v!==''))rows.push({line:start,cells});cells=[];start=line+1};
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else{value+=c;if(c==='\n')line++}continue;}
      if(c==='"'){if(value.trim()||closed)throw Error(`Satır ${line}: geçersiz tırnak kullanımı.`);quoted=true;value='';}
      else if(c===delimiter)cell();
      else if(c==='\n'||c==='\r'){row();if(c==='\r'&&text[i+1]==='\n')i++;line++;start=line;}
      else{if(closed&&!/\s/.test(c))throw Error(`Satır ${line}: kapanan tırnaktan sonra beklenmeyen karakter.`);value+=c;}
    }
    if(quoted)throw Error(`Satır ${start}: kapanmamış tırnak.`);
    if(value||cells.length||closed)row();return rows;
  }
  function number(value){
    // No thousands separators: 65000, 65000.5 or 65000,5.
    if(!/^[+-]?\d+(?:[.,]\d+)?$/.test(value))return NaN;
    return Number(value.replace(',','.'));
  }
  function date(value){let normalized=value;const local=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);if(local)normalized=`${local[3]}-${local[2]}-${local[1]}`;if(!/^\d{4}-\d{2}-\d{2}$/.test(normalized))return null;const d=new Date(normalized+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===normalized?normalized:null;}
  function parse(input){
    const errors=[],records=[],seen=new Set(),types=new Set();let rows,delimiter;
    try{let text=input.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';rows=tokenize(text,delimiter);}catch(e){return {records,errors:[e.message],demo:false};}
    if(!rows.length)return {records,errors:['Dosya boş.'],demo:false};
    const headers=rows.shift().cells.map(v=>v.toLowerCase());
    if(new Set(headers).size!==headers.length)errors.push('Sütun başlıkları tekrarlanmamalı.');
    for(const c of columns)if(!headers.includes(c))errors.push('Eksik sütun: '+c);
    if(errors.length)return {records,errors,demo:false};
    if(rows.length>10000)return {records,errors:['En fazla 10.000 kayıt yüklenebilir.'],demo:false};
    for(const row of rows){const fail=message=>errors.push(`Satır ${row.line}: ${message}`);if(row.cells.length!==headers.length){fail('Sütun sayısı başlıklarla uyuşmuyor.');continue;}
      const get=k=>row.cells[headers.indexOf(k)],record={date:date(get('tarih'))};const before=errors.length;
      if(!record.date)fail('Tarih geçersiz. YYYY-AA-GG veya GG.AA.YYYY kullan.');
      for(const [field,key] of [['production','uretim_ton'],['electricity','elektrik_kwh'],['coal','komur_ton'],['hours','saat']]){const n=number(get(key));record[field]=n;if(!Number.isFinite(n)||n<0||((field==='production'||field==='hours')&&n===0)||(field==='hours'&&n>24))fail(`${key} geçersiz: ${field==='hours'?'0’dan büyük, en fazla 24':field==='production'?'0’dan büyük':'0 veya daha büyük'} bir sayı gir.`);}
      if(record.date&&seen.has(record.date))fail('Aynı tarih dosyada birden fazla kez yer alıyor: '+record.date);if(record.date)seen.add(record.date);
      const kind=headers.includes('veri_turu')?get('veri_turu'):'kullanici';if(!['demo','kullanici'].includes(kind))fail('veri_turu yalnızca demo veya kullanici olabilir.');types.add(kind);
      if(errors.length===before)records.push(record);
    }
    if(types.size>1)errors.push('Demo ve kullanıcı kayıtları aynı dosyada karıştırılamaz.');
    if(!rows.length)errors.push('Başlık dışında veri satırı yok.');
    return {records,errors,demo:types.has('demo'),delimiter,hasCalculatedColumns:headers.some(h=>['kwh_ton','enerji_co2_ton','elektrik_kg_co2_kwh','komur_t_co2_t'].includes(h))};
  }
  function merge(current,imported,mode='skip'){
    if(imported.errors.length||!imported.records.length)throw Error('Önce dosyadaki hataları düzelt.');
    if(!['skip','replace'].includes(mode))throw Error('Geçersiz çakışma seçimi.');
    if(imported.demo&&!current.demo&&current.records.length)throw Error('Örnek kayıtlar mevcut gerçek kayıtlarla birleştirilemez.');
    const activeId=current.activeFacilityId||current.facilities?.[0]?.id||'plant-main';
    const base=(current.demo&&!imported.demo?[]:current.records).map(r=>({...r,facilityId:r.facilityId||activeId}));
    const map=new Map(base.map(r=>[`${r.facilityId}|${r.date}`,r]));let added=0,updated=0,skipped=0;
    for(const r of imported.records){const key=`${activeId}|${r.date}`;if(map.has(key)){if(mode==='skip'){skipped++;continue;}updated++;}else added++;map.set(key,{...r,facilityId:activeId});}
    return {state:{...current,demo:imported.demo,records:[...map.values()].sort((a,b)=>(a.facilityId||'').localeCompare(b.facilityId||'')||a.date.localeCompare(b.date))},added,updated,skipped};
  }
  function serialize(current){
    const activeId=current.activeFacilityId||current.facilities?.[0]?.id;
    const facility=current.facilities?.find(item=>item.id===activeId);
    const factors=facility?.factors||current.factors;
    const records=activeId?current.records.filter(r=>(r.facilityId||activeId)===activeId):current.records;
    const rows=[columns.concat(['tesis','uretim_hatti','kwh_ton','enerji_co2_ton','elektrik_kg_co2_kwh','komur_t_co2_t','veri_turu'])];
    const num=n=>String(n).replace('.',',');
    const cell=value=>{const text=String(value??'');return /[;"\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text};
    for(const r of [...records].sort((a,b)=>a.date.localeCompare(b.date)))rows.push([r.date,...[r.production,r.electricity,r.coal,r.hours].map(num),facility?.name||'Ana Tesis',facility?.line||'Genel üretim hattı',...[Number((r.electricity/r.production).toFixed(3)),Number((r.electricity*factors.electricFactor/1000+r.coal*factors.coalFactor).toFixed(3)),factors.electricFactor,factors.coalFactor].map(num),current.demo?'demo':'kullanici']);
    return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
  }
  const api={parse,merge,serialize};if(typeof module!=='undefined')module.exports=api;else root.XHabitatCSV=api;
})(typeof window==='undefined'?globalThis:window);
