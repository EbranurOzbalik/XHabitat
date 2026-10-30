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

  function interpret(question,context={}){
    const summary=context.summary||{},goal=context.goal||{},topic=String(question||'').toLocaleLowerCase('tr-TR');
    if(!(summary.recordCount>0))return `${facilityName(context)} için henüz yorumlanabilecek üretim kaydı yok. Önce üretim, elektrik, kömür ve çalışma süresi verilerini ekle.`;

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

  return {interpret,intensityFinding,trendFinding,savingFinding,referenceFinding};
});
