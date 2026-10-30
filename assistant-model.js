(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.XHabitatAssistant=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const isNumber=value=>Number.isFinite(value);
  const format=(value,digits=1)=>isNumber(value)?new Intl.NumberFormat('tr-TR',{maximumFractionDigits:digits}).format(value):'—';
  const percent=value=>`${format(Math.abs(value),1)}%`;

  function facilityName(context){
    const name=context?.facility?.name||'Seçili tesis';
    return context?.facility?.line?`${name} · ${context.facility.line}`:name;
  }

  function intensityFinding(context){
    const summary=context.summary||{},goal=context.goal||{};
    if(!isNumber(summary.weightedIntensityKwhTon))return 'Elektrik yoğunluğunu hesaplamak için yeterli üretim ve elektrik verisi yok.';
    const current=summary.weightedIntensityKwhTon,target=goal.targetIntensityKwhTon;
    if(!isNumber(target))return `Üretim ağırlıklı elektrik yoğunluğu ${format(current)} kWh/ton.`;
    const difference=current-target;
    if(Math.abs(difference)<0.05)return `Üretim ağırlıklı elektrik yoğunluğu ${format(current)} kWh/ton ve tanımlı hedefle aynı seviyede.`;
    return `Üretim ağırlıklı elektrik yoğunluğu ${format(current)} kWh/ton; ${format(target)} kWh/ton hedefinin ${format(Math.abs(difference))} kWh/ton (${percent(difference/target*100)}) ${difference>0?'üzerinde':'altında'}.`;
  }

  function trendFinding(context){
    const summary=context.summary||{};
    if((summary.recordCount||0)<2||!isNumber(summary.latestIntensityKwhTon)||!isNumber(summary.previousWeightedIntensityKwhTon))return 'Tek bir kayıtla eğilim çıkarılamaz; ikinci üretim günü eklendiğinde değişim karşılaştırılabilir.';
    const change=(summary.latestIntensityKwhTon/summary.previousWeightedIntensityKwhTon-1)*100;
    if(Math.abs(change)<0.5)return `Son gün yoğunluğu önceki kayıtların ortalamasına çok yakın (${format(summary.latestIntensityKwhTon)} kWh/ton).`;
    return `Son gün yoğunluğu ${format(summary.latestIntensityKwhTon)} kWh/ton; önceki kayıtların ortalamasından ${percent(change)} ${change>0?'yüksek':'düşük'}.`;
  }

  function savingFinding(context){
    const goal=context.goal||{};
    if(!isNumber(goal.potentialElectricitySavingKwh)||goal.potentialElectricitySavingKwh<=0)return 'Tanımlı hedefe göre kayıtlı dönemde hesaplanan ek elektrik tasarrufu bulunmuyor.';
    const details=[`${format(goal.potentialElectricitySavingKwh,0)} kWh elektrik`];
    if(isNumber(goal.potentialEnergyCo2SavingTon))details.push(`${format(goal.potentialEnergyCo2SavingTon)} ton enerji kaynaklı CO₂`);
    if(isNumber(goal.potentialCostSavingTl))details.push(`${format(goal.potentialCostSavingTl,0)} TL`);
    return `Hedef yoğunluğa inilirse kayıtlı dönem için teorik potansiyel ${details.join(', ')} tasarrufudur.`;
  }

  function referenceFinding(context){
    const current=context.summary?.weightedIntensityKwhTon,median=context.comparison?.zenodoMedianKwhTon;
    if(!isNumber(current)||!isNumber(median))return 'Zenodo karşılaştırması için kullanılabilir ortak yoğunluk değeri bulunmuyor.';
    const difference=(current/median-1)*100;
    return `Yoğunluk, Zenodo örneklerinin medyanı olan ${format(median)} kWh/ton değerinden ${percent(difference)} ${difference>0?'yüksek':'düşük'}; bu değer farklı bölge ve yıllardan gelen bir bağlamdır, performans hedefi değildir.`;
  }

  function formatDate(value){
    if(!value)return 'bilinmeyen tarih';
    const date=new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric'}).format(date);
  }

  function optimizationPlan(context){
    const summary=context.summary||{},goal=context.goal||{},records=(context.records||[]).filter(record=>isNumber(record.intensityKwhTon));
    const scope=summary.recordCount>=7?'Orta':summary.recordCount>=2?'Sınırlı':'Başlangıç';
    const actions=[];
    const current=summary.weightedIntensityKwhTon,target=goal.targetIntensityKwhTon;

    if(isNumber(current)&&isNumber(target)&&current>target){
      actions.push(`[Yüksek öncelik] ${format(current-target)} kWh/tonluk hedef açığını kapat. Kayıtlı dönem için doğrulanması gereken teorik fırsat: ${format(goal.potentialElectricitySavingKwh,0)} kWh ve ${format(goal.potentialCostSavingTl,0)} TL.`);
    }else if(isNumber(current)&&isNumber(target)){
      actions.push(`[Koruma] ${format(current)} kWh/ton seviyesi hedefi karşılıyor. Aynı ürün ve kalite koşullarındaki çalışma ayarlarını standartlaştır.`);
    }

    if(records.length>=2){
      const ordered=[...records].sort((a,b)=>a.intensityKwhTon-b.intensityKwhTon),best=ordered[0],worst=ordered.at(-1);
      const gap=(worst.intensityKwhTon/best.intensityKwhTon-1)*100;
      actions.push(`[İç kıyas] Son kayıtlarda en iyi gün ${formatDate(best.date)} (${format(best.intensityKwhTon)} kWh/ton), en yüksek tüketimli gün ${formatDate(worst.date)} (${format(worst.intensityKwhTon)} kWh/ton). ${percent(gap)} farkı ürün, kalite, ton/saat, duruş ve değirmen çalışma süresiyle karşılaştır.`);
    }else{
      actions.push('[Ölçüm] En az 7 aynı ürün ve benzer kalite koşulundaki üretim gününü ekle; tek günlük veriyle optimum çalışma noktası belirlenemez.');
    }

    if(isNumber(summary.latestIntensityKwhTon)&&isNumber(summary.previousWeightedIntensityKwhTon)){
      const change=(summary.latestIntensityKwhTon/summary.previousWeightedIntensityKwhTon-1)*100;
      if(change>5)actions.push(`[Hızlı kontrol] Son gün yoğunluğu önceki seviyeden ${percent(change)} yüksek. Plansız duruş, boşta çalışma, düşük besleme ve ürün değişimini önce kontrol et.`);
    }

    actions.push('[Veri kalitesi] Ürün tipi, klinker oranı, vardiya, değirmen çalışma/duruş süresi, ton/saat, incelik ve kalite sonucunu kayda ekle. AI ancak aynı koşulları ayırabildiğinde daha güvenilir öneri verir.');
    actions.push('[Deney] Tek seferde bir ayarı değiştir; kWh/ton ana ölçütünü ton/saat ve kalite sınırlarıyla birlikte önce/sonra karşılaştır.');

    return `Verimlilik optimizasyon planı — ${facilityName(context)}\nVeri kapsamı: ${scope} (${summary.recordCount} günlük kayıt)\n${actions.slice(0,4).map((action,index)=>`${index+1}. ${action}`).join('\n')}\n\nBaşarı ölçütü: kWh/ton düşerken ton/saat ve ürün kalitesi korunmalı. Bu plan kontrol ve deney sırasıdır; otomatik proses ayarı değildir.`;
  }

  function interpret(question,context={}){
    const summary=context.summary||{},goal=context.goal||{},topic=String(question||'').toLocaleLowerCase('tr-TR');
    if(!(summary.recordCount>0))return `${facilityName(context)} için henüz yorumlanabilecek üretim kaydı yok. Önce üretim, elektrik, kömür ve çalışma süresi verilerini ekle.`;

    if(/optimiz|verimli|verimlilik|iyileştir|aksiyon plan|ne yapmalı|tavsiye|öneri/.test(topic))return optimizationPlan(context);

    if(/karbon|co₂|co2|emisyon/.test(topic)){
      const carbon=isNumber(summary.energyCo2Ton)?`${format(summary.energyCo2Ton)} ton`:'hesaplanamadı';
      return `Enerji kaynaklı karbon yorumu\n• Kayıtlı dönemin tahmini enerji kaynaklı salımı ${carbon} CO₂.\n• ${savingFinding(context)}\n• Sonuç elektrik ve kömür katsayılarına bağlıdır; katsayıları tesisin doğrulanmış kaynaklarıyla güncelle.\n\nKapsam: Kalsinasyon, taşıma ve diğer süreç emisyonları bu toplamda yer almaz.`;
    }

    if(/hedef|tasarruf|maliyet|fiyat|kazanç/.test(topic)){
      return `Hedef ve tasarruf yorumu\n• ${intensityFinding(context)}\n• ${savingFinding(context)}\n• Hesap ${format(summary.totalProductionTon,0)} tonluk kayıtlı üretim dönemini ve ${format(goal.electricityPriceTlKwh,2)} TL/kWh fiyatını kullanır.\n\nBu değer yıllık tahmin veya tasarruf garantisi değildir; hedefin teknik olarak uygulanabilirliği ayrıca doğrulanmalıdır.`;
    }

    if(/yoğunluk|elektrik|enerji|neden|yüksek|düşük|değiş/.test(topic)){
      return `Elektrik yoğunluğu yorumu\n• ${intensityFinding(context)}\n• ${trendFinding(context)}\n• Ürün türü ve kalite hedefi, değirmen çalışma süresi, duruşlar ve boşta çalışan ekipmanlar aynı koşullarda karşılaştırılmalı.\n• ${referenceFinding(context)}\n\nBu veriler tek başına ekipman arızasının nedenini göstermez; maddeler kontrol sırasıdır.`;
    }

    return `${facilityName(context)} için öne çıkanlar\n• ${intensityFinding(context)}\n• ${trendFinding(context)}\n• Kayıtlı dönemin tahmini enerji kaynaklı salımı ${format(summary.energyCo2Ton)} ton CO₂.\n• ${savingFinding(context)}\n• ${referenceFinding(context)}\n\nÖnerilen ilk adım: aynı ürün ve çalışma koşullarındaki yeni üretim günlerini ekleyerek yoğunluk değişimini doğrula.`;
  }

  return {interpret,intensityFinding,trendFinding,savingFinding,referenceFinding,optimizationPlan};
});
