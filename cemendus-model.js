/* Adapted from cemendus-greenai.zip. All plant values and thresholds are illustrative. */
(function(root){
  const baseline={energyKw:13775,productionTph:145,carbonIntensity:620,clinkerRatio:.85,altFuelPct:18};
  function simulate(input){
    const limits={energyReductionPct:30,altFuelIncreasePct:50,clinkerReductionPct:25,productionReductionPct:30,annualHours:8760,costPerMwh:10000};
    for(const [key,max] of Object.entries(limits))if(!Number.isFinite(input[key])||input[key]<0||input[key]>max)throw new Error('Geçersiz senaryo değeri: '+key);
    const energyFactor=1-input.energyReductionPct/100,productionFactor=1-input.productionReductionPct/100;
    // Illustrative baseline split: process 60%, fuel 30%, electricity 10%.
    // Alternative fuel is assumed to have 50% lower direct CO2 per equal heat unit.
    const carbonIntensity=baseline.carbonIntensity*(1-.6*input.clinkerReductionPct/100-.3*input.altFuelIncreasePct/100*.5+.1*(energyFactor/productionFactor-1));
    const energyKw=baseline.energyKw*energyFactor,productionTph=baseline.productionTph*productionFactor;
    const annualEnergyMwh=(baseline.energyKw-energyKw)*input.annualHours/1000;
    const annualProduction=productionTph*input.annualHours;
    return {energyKw,productionTph,energyIntensity:energyKw/productionTph,carbonIntensity,clinkerRatio:baseline.clinkerRatio*(1-input.clinkerReductionPct/100),altFuelPct:baseline.altFuelPct+input.altFuelIncreasePct,annualEnergyMwh,annualCostUsd:annualEnergyMwh*input.costPerMwh,annualCarbonTons:(baseline.carbonIntensity-carbonIntensity)*annualProduction/1000};
  }
  function sample(tick){const wave=Math.sin(tick*.8);return {motorTempC:78+wave*5,vibrationMms:4.2+Math.cos(tick*.7)*1.2,energyKw:baseline.energyKw*(1+wave*.13),productionTph:145+Math.cos(tick)*6,capacityPct:86+wave*8,uptimeHours:312+tick/360};}
  function alerts(s){const items=[];if(s.motorTempC>80)items.push('Motor sıcaklığı demo eşiği olan 80 °C üzerinde. Soğutma ve yağlama durumunun incelenmesi senaryosu.');if(s.vibrationMms>5)items.push('Titreşim demo eşiği olan 5 mm/s üzerinde. Bakım ekibinin değerlendirme yapması senaryosu.');if(s.energyKw/s.productionTph>95*1.1)items.push('Elektrik yoğunluğu demo referansı olan 95 kWh/ton değerinin %10 üzerinde. Üretim ve tüketimi birlikte inceleme senaryosu.');if(s.capacityPct<80)items.push('Kapasite kullanımı demo eşiği olan %80 altında. Boşta çalışma sürelerini inceleme senaryosu.');return items;}
  const api={baseline,simulate,sample,alerts};if(typeof module!=='undefined')module.exports=api;else root.CemendusModel=api;
})(typeof window==='undefined'?globalThis:window);
