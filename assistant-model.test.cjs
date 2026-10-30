const assert=require('node:assert/strict');
const {interpret}=require('./assistant-model.js');

const context={
  facility:{name:'Ana Tesis',line:'Hat 1'},
  summary:{recordCount:3,totalProductionTon:1500,weightedIntensityKwhTon:130,latestIntensityKwhTon:140,previousWeightedIntensityKwhTon:125,energyCo2Ton:125.3},
  goal:{targetIntensityKwhTon:110,electricityPriceTlKwh:3.2,potentialElectricitySavingKwh:30000,potentialEnergyCo2SavingTon:13.5,potentialCostSavingTl:96000},
  comparison:{zenodoMedianKwhTon:120,numericRecordCount:20}
};

assert.match(interpret('Yoğunluğum neden yüksek?',context),/hedefinin 20 kWh\/ton/);
assert.match(interpret('Yoğunluğum neden yüksek?',context),/önceki kayıtların ortalamasından 12% yüksek/);
assert.match(interpret('Hedef tasarrufumu açıkla',context),/30\.000 kWh elektrik/);
assert.match(interpret('Karbon çıktısını yorumla',context),/Kalsinasyon, taşıma/);
assert.match(interpret('Genel sonuçları yorumla',context),/performans hedefi değildir/);
assert.match(interpret('Yorumla',{facility:{name:'Boş Tesis'},summary:{recordCount:0}}),/henüz yorumlanabilecek üretim kaydı yok/);

console.log('Local assistant intensity, trend, savings, carbon, reference and empty-state interpretations passed.');
