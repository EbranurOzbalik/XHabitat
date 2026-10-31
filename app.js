const $ = selector => document.querySelector(selector);
const fmt = (number, digits = 0) => new Intl.NumberFormat('tr-TR', {maximumFractionDigits: digits}).format(number);
const key = 'xhabitat-v1';
const defaultFactors = () => ({electricFactor: .45, coalFactor: 2.4});
const defaultGoal = () => ({targetIntensity: 110, electricityPrice: 3});
const createFacility = (id = 'plant-main', name = 'Ana Tesis', line = 'Genel üretim hattı', factors = defaultFactors(), goal = defaultGoal()) => ({id, name, line, factors: {...factors}, goal: {...goal}});

const demo = () => {
  const facility = createFacility();
  return {
    demo: true,
    facilities: [facility],
    activeFacilityId: facility.id,
    factors: facility.factors,
    records: [128, 135, 131, 124, 127, 119, 116].map((value, index) => ({
      facilityId: facility.id,
      date: `2026-10-${24 + index}`,
      production: 500 + index * 10,
      electricity: value * (500 + index * 10),
      coal: 40 + index * .3,
      hours: 20
    }))
  };
};

const validFactors = factors => factors && ['electricFactor', 'coalFactor'].every(field => Number.isFinite(factors[field]) && factors[field] >= 0);
const validGoal = goal => goal && Number.isFinite(goal.targetIntensity) && goal.targetIntensity > 0 && Number.isFinite(goal.electricityPrice) && goal.electricityPrice >= 0;
const validRecord = record => record && /^\d{4}-\d{2}-\d{2}$/.test(record.date) && ['production', 'electricity', 'coal', 'hours'].every(field => Number.isFinite(record[field])) && record.production > 0 && record.hours > 0 && record.hours <= 24 && record.electricity >= 0 && record.coal >= 0;
function normalizeState(raw) {
  if (!raw || !Array.isArray(raw.records) || !raw.records.every(validRecord)) return demo();
  const legacyFactors = validFactors(raw.factors) ? raw.factors : defaultFactors();
  let facilities = Array.isArray(raw.facilities) ? raw.facilities.filter(item => item && typeof item.id === 'string' && item.id && typeof item.name === 'string' && item.name.trim()).map(item => createFacility(item.id, item.name.trim(), String(item.line || '').trim() || 'Genel üretim hattı', validFactors(item.factors) ? item.factors : legacyFactors, validGoal(item.goal) ? item.goal : defaultGoal())) : [];
  if (!facilities.length) facilities = [createFacility('plant-main', 'Ana Tesis', 'Genel üretim hattı', legacyFactors)];
  const ids = new Set(facilities.map(item => item.id));
  const activeFacilityId = ids.has(raw.activeFacilityId) ? raw.activeFacilityId : facilities[0].id;
  const records = raw.records.map(record => ({...record, facilityId: ids.has(record.facilityId) ? record.facilityId : activeFacilityId}));
  const active = facilities.find(item => item.id === activeFacilityId);
  return {demo: Boolean(raw.demo), facilities, activeFacilityId, factors: active.factors, records};
}

let state = demo();
try {
  const stored = localStorage.getItem(key);
  if (stored) state = normalizeState(JSON.parse(stored));
} catch {}

const activeFacility = () => state.facilities.find(item => item.id === state.activeFacilityId) || state.facilities[0];
const facilityLabel = item => item.line ? `${item.name} · ${item.line}` : item.name;
const ordered = () => state.records.filter(record => record.facilityId === state.activeFacilityId).sort((a, b) => a.date.localeCompare(b.date));
const intensity = record => record.electricity / record.production;
const carbon = record => {
  const factors = activeFacility().factors;
  return record.electricity * factors.electricFactor / 1000 + record.coal * factors.coalFactor;
};
const dateText = date => new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', {day: 'numeric', month: 'short', year: 'numeric'});

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  setTimeout(() => $('#toast').classList.remove('show'), 3500);
}

function save() {
  try {
    state.factors = activeFacility().factors;
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    toast('Tarayıcı kaydı kullanılamıyor. Verilerini CSV ile yedekle.');
    return false;
  }
}

const views = {
  overview: ['Genel bakış', 'Üretiminin etkisini gör.', 'Enerjini takip et, fırsatları keşfet, geleceği birlikte koru.'],
  entry: ['Veri girişi', 'Her iyi adım, veriyle başlar.', 'Üretim gününü doğru tesis ve üretim hattına kaydet.'],
  analysis: ['Enerji & karbon', 'Verinin arkasındaki etki.', 'Enerji kaynaklı emisyonları şeffaf hesaplarla keşfet.'],
  insights: ['Tasarruf önerileri', 'Veriden daha iyi kararlara.', 'Seçili tesisin kayıtlarından çıkan uygulanabilir adımlar.'],
  assistant: ['AI asistan', 'Çıktılarını birlikte yorumlayalım.', 'Seçili tesisin sonuçlarını sor, karşılaştır ve anlaşılır aksiyonlara dönüştür.'],
  facilities: ['Tesisler', 'Tesislerini ayrı ayrı izle.', 'Fabrikaları ve üretim hatlarını tek çalışma alanından yönet.']
};

function show(view) {
  if (!views[view]) view = 'overview';
  document.querySelectorAll('.view').forEach(element => element.hidden = element.id !== view);
  document.querySelectorAll('nav button').forEach(element => element.classList.toggle('active', element.dataset.view === view));
  $('#crumb').textContent = views[view][0];
  $('#heading').textContent = views[view][1];
  $('#subtitle').textContent = views[view][2];
  $('#new-record').hidden = view === 'entry' || view === 'facilities' || view === 'assistant';
  history.replaceState(null, '', '#' + view);
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

document.querySelectorAll('nav button').forEach(button => button.onclick = () => show(button.dataset.view));
$('.brand').onclick = () => show('overview');
$('#new-record').onclick = () => { resetRecordForm(); show('entry'); };
$('#hero-analysis').onclick = () => show('analysis');
$('#all-insights').onclick = () => show('insights');
$('#manage-facilities').onclick = () => show('facilities');

function insights() {
  const rows = ordered(), last = rows.at(-1), previous = rows.slice(0, -1);
  if (!last) return [{title: 'İlk üretim gününü ekle.', text: 'Seçili tesis için önerileri görmek üzere üretim ve tüketim değerlerini kaydet.'}];
  const baseline = previous.reduce((sum, record) => sum + record.electricity, 0) / previous.reduce((sum, record) => sum + record.production, 0);
  const difference = (intensity(last) / baseline - 1) * 100;
  return [
    {title: previous.length ? (difference > 5 ? 'Tüketim artışını incele.' : difference < -5 ? 'İyi giden alışkanlıkları koru.' : 'İstikrarlı üretimi takip et.') : 'Karşılaştırma için bir adım daha.', text: previous.length ? `Son kaydın elektrik yoğunluğu ${fmt(intensity(last), 1)} kWh/ton; bu tesisin önceki kayıtlarının üretim ağırlıklı ortalamasına göre %${fmt(Math.abs(difference), 1)} ${difference > 0 ? 'yüksek' : 'düşük'}. ${difference > 5 ? 'Değirmen çalışma süresi, boşta çalışma ve üretim koşullarını kontrol et.' : 'Ürün türü ve çalışma koşullarını da kaydederek değişimin nedenlerini değerlendir.'}` : 'Bu tesis için bir üretim günü daha ekle. Tüketim değişimini kendi geçmiş verilerinle karşılaştıralım.'},
    {title: 'Çalışma süresini anlamlandır.', text: `Son gün saatte ${fmt(last.production / last.hours, 1)} ton üretim gerçekleşti. Duraklamaları ve boşta çalışan ekipmanları gözlemleyerek gereksiz tüketim fırsatlarını belirle.`},
    {title: 'Karbon hesabını güçlendir.', text: `Son günün enerji kaynaklı tahmini salımı ${fmt(carbon(last), 1)} ton CO₂. ${activeFacility().name} için elektrik ve kömür katsayılarını doğrulanmış değerlerle güncelle.`}
  ];
}

function chart(target, calculator, unit) {
  const rows = ordered().slice(-7);
  if (!rows.length) {
    $(target).innerHTML = '<p class="note">Seçili tesis için grafik oluşturacak kayıt yok.</p>';
    return;
  }
  const values = rows.map(calculator);
  if (rows.length === 1) {
    $(target).innerHTML = `<div class="single-reading" role="img" aria-label="${dateText(rows[0].date)}: ${fmt(values[0], 1)} ${unit}"><span>TEK KAYIT</span><strong>${fmt(values[0], 1)} <small>${unit}</small></strong><p>${dateText(rows[0].date)} · Eğilimi görmek için en az bir üretim günü daha ekle.</p></div>`;
    return;
  }
  const max = Math.max(...values, 1) * 1.2, width = 580, height = 190, left = 44, bottom = 160, top = 20;
  const x = index => left + (index + .5) * (width - left - 12) / rows.length;
  const y = value => bottom - value / max * (bottom - top);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  let svg = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${unit}, son ${rows.length} kayıt"><title>${rows.map((record, index) => dateText(record.date) + ': ' + fmt(values[index], 1) + ' ' + unit).join('; ')}</title>`;
  for (let index = 0; index < 4; index++) {
    const value = max * index / 3;
    svg += `<line x1="${left}" y1="${y(value)}" x2="${width}" y2="${y(value)}" stroke="#edf1e9" stroke-dasharray="3 4"/><text x="0" y="${y(value) + 4}">${fmt(value)}</text>`;
  }
  svg += `<polygon points="${x(0)},${bottom} ${points} ${x(rows.length - 1)},${bottom}" fill="#edf3e4"/><polyline points="${points}" fill="none" stroke="#7f9f58" stroke-width="2.5" stroke-linejoin="round"/>`;
  rows.forEach((record, index) => svg += `<circle cx="${x(index)}" cy="${y(values[index])}" r="4" fill="#fff" stroke="#7f9f58" stroke-width="2"><title>${fmt(values[index], 1)} ${unit}</title></circle><text x="${x(index)}" y="183" text-anchor="middle">${record.date.slice(8)}.${record.date.slice(5, 7)}</text>`);
  $(target).innerHTML = svg + '</svg>';
}

function renderSavings() {
  const current = activeFacility(), rows = ordered(), form = $('#goal-form');
  form.elements.targetIntensity.value = current.goal.targetIntensity;
  form.elements.electricityPrice.value = current.goal.electricityPrice;
  if (!rows.length) {
    $('#savings-results').innerHTML = '<div class="note">Tasarruf hesabı için seçili tesise en az bir üretim kaydı ekle.</div>';
    return;
  }
  const production = rows.reduce((sum, record) => sum + record.production, 0);
  const electricity = rows.reduce((sum, record) => sum + record.electricity, 0);
  const currentIntensity = electricity / production;
  const reduction = Math.max(0, currentIntensity - current.goal.targetIntensity);
  const savedElectricity = reduction * production;
  const savedCarbon = savedElectricity * current.factors.electricFactor / 1000;
  const savedCost = savedElectricity * current.goal.electricityPrice;
  const targetMessage = reduction > 0 ? `Hedefe ulaşılırsa kayıtlı dönemde ton başına ${fmt(reduction, 1)} kWh daha az elektrik kullanılır.` : 'Mevcut ortalama hedef değerin altında veya hedefe eşit; bu dönem için ek tasarruf hesaplanmadı.';
  $('#savings-results').innerHTML = `<div class="savings-summary"><div><span>Mevcut ortalama</span><strong>${fmt(currentIntensity, 1)} <small>kWh/ton</small></strong></div><div><span>Tesis hedefi</span><strong>${fmt(current.goal.targetIntensity, 1)} <small>kWh/ton</small></strong></div></div><div class="savings-grid"><article><span>Elektrik tasarrufu</span><strong>${fmt(savedElectricity, 0)}</strong><small>kWh</small></article><article><span>Enerji kaynaklı CO₂</span><strong>${fmt(savedCarbon, 2)}</strong><small>ton CO₂</small></article><article><span>Tahmini maliyet</span><strong>${fmt(savedCost, 0)}</strong><small>TL</small></article></div><p class="savings-message">${targetMessage}</p>`;
}

function fillFacilitySelect(select, selectedId) {
  select.replaceChildren();
  for (const facility of state.facilities) {
    const option = document.createElement('option');
    option.value = facility.id;
    option.textContent = facilityLabel(facility);
    option.selected = facility.id === selectedId;
    select.append(option);
  }
}

let editingRecord = null;
const recordForm = $('#record-form');
const cancelEdit = document.createElement('button');
cancelEdit.type = 'button';
cancelEdit.className = 'secondary';
cancelEdit.textContent = 'Düzenlemekten vazgeç';
cancelEdit.hidden = true;
recordForm.querySelector('[type="submit"]').after(cancelEdit);

function renderFacilityControls() {
  const current = activeFacility();
  $('#active-facility-name').textContent = current.name;
  $('#active-facility-line').textContent = current.line || 'Genel üretim hattı';
  fillFacilitySelect($('#facility-switch'), current.id);
  fillFacilitySelect(recordForm.elements.facilityId, editingRecord ? editingRecord.facilityId : current.id);
}

function render() {
  renderFacilityControls();
  renderFacilityList();
  const rows = ordered();
  if (!rows.length) { renderEmpty(); return; }
  $('#export').disabled = false;
  const current = activeFacility(), last = rows.at(-1);
  $('#latest-date').textContent = dateText(last.date);
  $('#data-label').textContent = `${current.name} · ${current.line || 'Genel üretim hattı'}`;
  $('#data-description').textContent = state.demo ? '· Örnek üretim verileri gösteriliyor.' : `· ${rows.length} günlük kayıt bu tesis için saklanıyor.`;
  const metrics = [
    ['Günlük üretim', last.production, 'ton', '▥', `${fmt(last.hours, 1)} saatlik çalışma`],
    ['Elektrik tüketimi', last.electricity, 'kWh', 'ϟ', 'Son kayıt toplam tüketimi'],
    ['Elektrik yoğunluğu', intensity(last), 'kWh/ton', '↗', 'Üretim başına elektrik'],
    ['Enerji kaynaklı tahmini CO₂', carbon(last), 'ton CO₂', '◎', 'Seçili tesis katsayılarıyla']
  ];
  $('#metrics').innerHTML = metrics.map(([title, number, unit, icon, note]) => `<article class="metric"><div class="metric-top">${title}<span class="metric-icon">${icon}</span></div><div class="metric-value">${fmt(number, 1)}<span>${unit}</span></div><div class="metric-bottom">${note}</div></article>`).join('');
  chart('#energy-chart', intensity, 'kWh/ton');
  chart('#carbon-chart', carbon, 'ton CO₂');
  $('#records').innerHTML = rows.slice().reverse().map(record => `<tr><td>${dateText(record.date)}</td><td>${fmt(record.production)} ton</td><td>${fmt(record.electricity)} kWh</td><td>${fmt(record.coal, 1)} ton</td><td><span class="intensity">${fmt(intensity(record), 1)} kWh/t</span></td><td>${fmt(carbon(record), 1)} ton</td><td class="record-actions"><button class="secondary" data-edit="${record.date}" data-facility="${record.facilityId}" aria-label="${dateText(record.date)} kaydını düzenle">Düzenle</button><button class="secondary delete-record" data-delete="${record.date}" data-facility="${record.facilityId}" aria-label="${dateText(record.date)} kaydını sil">Sil</button></td></tr>`).join('');
  const tips = insights();
  $('#quick-insight').textContent = tips[0].text;
  $('#insight-list').innerHTML = tips.map((tip, index) => `<article class="card"><span class="insight-number">ÖNERİ 0${index + 1} / VERİ ODAKLI</span><h3>${tip.title}</h3><p>${tip.text}</p></article>`).join('');
  Object.entries(current.factors).forEach(([field, value]) => $('#factor-form').elements[field].value = value);
  renderSavings();
}

function resetRecordForm() {
  editingRecord = null;
  recordForm.reset();
  recordForm.elements.date.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  fillFacilitySelect(recordForm.elements.facilityId, state.activeFacilityId);
  recordForm.querySelector('h3').textContent = 'Günlük üretim kaydı';
  recordForm.querySelector('[type="submit"]').textContent = 'Kaydet ve analizi gör ↗';
  cancelEdit.hidden = true;
  $('#form-status').textContent = '';
}

cancelEdit.onclick = () => { resetRecordForm(); show('overview'); };

function renderEmpty() {
  const current = activeFacility();
  $('#latest-date').textContent = 'Henüz kayıt yok';
  $('#data-label').textContent = `${current.name} · ${current.line || 'Genel üretim hattı'}`;
  $('#data-description').textContent = '· Bu tesis için henüz üretim kaydı yok.';
  $('#metrics').innerHTML = '<article class="card empty-records"><h3>Bu tesisin ilk üretim kaydını ekle</h3><p>Üretim, elektrik ve kömür tüketimini kaydederek analizi başlat.</p><button class="primary" id="empty-add">Günlük veri ekle</button></article>';
  $('#empty-add').onclick = () => { resetRecordForm(); show('entry'); };
  $('#records').innerHTML = '<tr><td colspan="7">Seçili tesis için henüz kayıt yok.</td></tr>';
  chart('#energy-chart', intensity, 'kWh/ton');
  chart('#carbon-chart', carbon, 'ton CO₂');
  $('#quick-insight').textContent = 'Öneriler için bu tesise ilk üretim kaydını ekle.';
  $('#insight-list').innerHTML = '<article class="card"><h3>Analiz için veri bekleniyor</h3><p>Seçili tesisin ilk üretim kaydından sonra öneriler burada görünecek.</p></article>';
  $('#export').disabled = true;
  Object.entries(current.factors).forEach(([field, value]) => $('#factor-form').elements[field].value = value);
  renderSavings();
}

$('#records').onclick = event => {
  const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
  if (edit) {
    const facilityId = edit.dataset.facility || state.activeFacilityId;
    const record = state.records.find(item => item.facilityId === facilityId && item.date === edit.dataset.edit);
    if (!record) return;
    editingRecord = {facilityId: record.facilityId, date: record.date};
    for (const [field, value] of Object.entries(record)) if (recordForm.elements[field]) recordForm.elements[field].value = value;
    recordForm.querySelector('h3').textContent = dateText(record.date) + ' kaydını düzenle';
    recordForm.querySelector('[type="submit"]').textContent = 'Değişiklikleri kaydet';
    cancelEdit.hidden = false;
    $('#form-status').textContent = 'Tesis veya tarihi değiştirirsen kayıt yeni konuma taşınır.';
    show('entry');
    recordForm.elements.production.focus();
  }
  if (remove) {
    const facilityId = remove.dataset.facility || state.activeFacilityId, date = remove.dataset.delete;
    if (!confirm(`${facilityLabel(activeFacility())} için ${dateText(date)} tarihli kayıt silinsin mi? Bu işlem geri alınamaz.`)) return;
    state.records = state.records.filter(record => !(record.facilityId === facilityId && record.date === date));
    if (editingRecord && editingRecord.facilityId === facilityId && editingRecord.date === date) resetRecordForm();
    const persisted = save(); render();
    if (persisted) toast('Üretim kaydı silindi.');
  }
};

recordForm.onsubmit = event => {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form), record = {facilityId: String(data.get('facilityId')), date: data.get('date')};
  for (const field of ['production', 'electricity', 'coal', 'hours']) record[field] = Number(data.get(field));
  if (!form.reportValidity() || !state.facilities.some(item => item.id === record.facilityId) || !['production', 'electricity', 'coal', 'hours'].every(field => Number.isFinite(record[field]))) return;
  const records = state.demo && !editingRecord ? [] : state.records;
  const collision = records.some(item => item.facilityId === record.facilityId && item.date === record.date && (!editingRecord || item.facilityId !== editingRecord.facilityId || item.date !== editingRecord.date));
  if (collision && !confirm(`${dateText(record.date)} tarihinde bu tesis için zaten bir kayıt var. Mevcut kayıt değiştirilsin mi?`)) return;
  const wasEditing = Boolean(editingRecord);
  state.records = records.filter(item => !(item.facilityId === record.facilityId && item.date === record.date) && (!editingRecord || item.facilityId !== editingRecord.facilityId || item.date !== editingRecord.date));
  state.records.push(record);
  if (!wasEditing) state.demo = false;
  state.activeFacilityId = record.facilityId;
  const persisted = save(); resetRecordForm(); render(); show('overview');
  if (persisted) toast(wasEditing ? 'Üretim kaydı güncellendi.' : 'Üretim kaydın kaydedildi.');
};

$('#factor-form').onsubmit = event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const data = new FormData(event.currentTarget), factors = {electricFactor: Number(data.get('electricFactor')), coalFactor: Number(data.get('coalFactor'))};
  if (!Object.values(factors).every(number => Number.isFinite(number) && number >= 0)) return;
  activeFacility().factors = factors;
  save(); render();
  $('#factor-status').textContent = `${activeFacility().name} için katsayılar uygulandı.`;
};

$('#goal-form').onsubmit = event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const data = new FormData(event.currentTarget), goal = {targetIntensity: Number(data.get('targetIntensity')), electricityPrice: Number(data.get('electricityPrice'))};
  if (!validGoal(goal)) return;
  activeFacility().goal = goal;
  const persisted = save(); render();
  if (persisted) $('#goal-status').textContent = `${activeFacility().name} için hedef ve elektrik fiyatı kaydedildi.`;
};

$('#facility-switch').onchange = event => {
  if (!state.facilities.some(item => item.id === event.target.value)) return;
  state.activeFacilityId = event.target.value;
  resetRecordForm(); save(); render();
  toast(`${facilityLabel(activeFacility())} gösteriliyor.`);
};

let editingFacilityId = null;
const facilityForm = $('#facility-form');
function resetFacilityForm() {
  editingFacilityId = null;
  facilityForm.reset();
  facilityForm.querySelector('[type="submit"]').textContent = 'Tesisi ekle';
  $('#facility-cancel').hidden = true;
  $('#facility-status').textContent = '';
}

function renderFacilityList() {
  const list = $('#facility-list');
  list.replaceChildren();
  for (const facility of state.facilities) {
    const records = state.records.filter(record => record.facilityId === facility.id);
    const item = document.createElement('div');
    item.className = 'facility-item' + (facility.id === state.activeFacilityId ? ' active' : '');
    const copy = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('span'), actions = document.createElement('div');
    title.textContent = facility.name;
    detail.textContent = `${facility.line || 'Genel üretim hattı'} · ${records.length} kayıt`;
    copy.append(title, detail);
    for (const [action, label] of [['select', facility.id === state.activeFacilityId ? 'Aktif' : 'Göster'], ['edit', 'Düzenle'], ['delete', 'Sil']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'secondary'; button.dataset[action] = facility.id; button.textContent = label;
      if (action === 'select' && facility.id === state.activeFacilityId) button.disabled = true;
      if (action === 'delete') button.classList.add('delete-record');
      actions.append(button);
    }
    item.append(copy, actions); list.append(item);
  }
}

$('#facility-list').onclick = event => {
  const select = event.target.closest('[data-select]'), edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
  if (select) {
    state.activeFacilityId = select.dataset.select; resetRecordForm(); save(); render(); show('overview');
  }
  if (edit) {
    const facility = state.facilities.find(item => item.id === edit.dataset.edit); if (!facility) return;
    editingFacilityId = facility.id; facilityForm.elements.name.value = facility.name; facilityForm.elements.line.value = facility.line;
    facilityForm.querySelector('[type="submit"]').textContent = 'Tesis bilgilerini kaydet'; $('#facility-cancel').hidden = false; $('#facility-status').textContent = 'Kayıtlar tesis kimliğiyle bağlı kalır.'; facilityForm.elements.name.focus();
  }
  if (remove) {
    if (state.facilities.length === 1) { $('#facility-status').textContent = 'En az bir tesis kalmalıdır.'; return; }
    const facility = state.facilities.find(item => item.id === remove.dataset.delete); if (!facility) return;
    const count = state.records.filter(record => record.facilityId === facility.id).length;
    if (!confirm(`${facilityLabel(facility)} ve bu tesise ait ${count} kayıt silinsin mi? Bu işlem geri alınamaz.`)) return;
    state.facilities = state.facilities.filter(item => item.id !== facility.id);
    state.records = state.records.filter(record => record.facilityId !== facility.id);
    if (state.activeFacilityId === facility.id) state.activeFacilityId = state.facilities[0].id;
    if (editingFacilityId === facility.id) resetFacilityForm();
    save(); render(); toast('Tesis ve bağlı kayıtları silindi.');
  }
};

facilityForm.onsubmit = event => {
  event.preventDefault();
  if (!facilityForm.reportValidity()) return;
  const data = new FormData(facilityForm), name = String(data.get('name')).trim(), line = String(data.get('line')).trim() || 'Genel üretim hattı';
  if (name.length < 2) { $('#facility-status').textContent = 'Tesis adı en az 2 karakter olmalıdır.'; return; }
  const duplicate = state.facilities.some(item => item.id !== editingFacilityId && item.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR') && item.line.toLocaleLowerCase('tr-TR') === line.toLocaleLowerCase('tr-TR'));
  if (duplicate) { $('#facility-status').textContent = 'Bu tesis ve üretim hattı zaten kayıtlı.'; return; }
  const wasEditing = Boolean(editingFacilityId);
  if (editingFacilityId) {
    const facility = state.facilities.find(item => item.id === editingFacilityId); facility.name = name; facility.line = line;
  } else {
    const id = `plant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    state.facilities.push(createFacility(id, name, line)); state.activeFacilityId = id;
  }
  save(); resetFacilityForm(); resetRecordForm(); render(); toast(wasEditing ? 'Tesis bilgileri güncellendi.' : 'Yeni tesis eklendi.');
};

$('#facility-cancel').onclick = resetFacilityForm;
$('#reset-demo').onclick = () => {
  if (!confirm('Tüm tesisler ve tarayıcı kayıtları örnek verilerle değiştirilecek. Önce CSV yedeği alabilirsin. Devam edilsin mi?')) return;
  state = demo(); resetRecordForm(); resetFacilityForm(); save(); render(); toast('Örnek senaryo yüklendi.');
};

// csv.js replaces this handler after loading.
$('#export').onclick = () => {};
resetRecordForm();
const initialView = location.hash.slice(1) || 'overview';
render();
show(initialView);
if (typeof window !== 'undefined') {
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(0, 0)));
  if (document.readyState === 'complete') window.scrollTo(0, 0);
  else window.addEventListener('load', () => window.scrollTo(0, 0), {once:true});
}
