const state = {
  parts: [
    { id: crypto.randomUUID(), name: 'OLED Display', model: 'iPhone 14', category: 'Display', quantity: 12, reorderLevel: 5, location: 'Gang A / Regal 2', supplier: 'MobileParts GmbH' },
    { id: crypto.randomUUID(), name: 'Akkumodul', model: 'Samsung S22', category: 'Akku', quantity: 4, reorderLevel: 6, location: 'Gang C / Regal 5', supplier: 'BlueCell' },
    { id: crypto.randomUUID(), name: 'Kamera Modul', model: 'Pixel 8', category: 'Kamera', quantity: 2, reorderLevel: 3, location: 'Gang B / Regal 1', supplier: 'OptiVision' },
    { id: crypto.randomUUID(), name: 'USB-C Ladeport', model: 'iPad Pro 12"', category: 'Anschlüsse', quantity: 8, reorderLevel: 4, location: 'Gang D / Regal 3', supplier: 'Portify' },
    { id: crypto.randomUUID(), name: 'Lautsprecher', model: 'iPhone 12', category: 'Audio', quantity: 1, reorderLevel: 3, location: 'Gang A / Regal 1', supplier: 'SoundLab' },
    { id: crypto.randomUUID(), name: 'Displayglas', model: 'Galaxy A52', category: 'Display', quantity: 15, reorderLevel: 7, location: 'Gang A / Regal 3', supplier: 'MobileParts GmbH' },
    { id: crypto.randomUUID(), name: 'Vibrationsmotor', model: 'Xiaomi 12', category: 'Mechanik', quantity: 5, reorderLevel: 5, location: 'Gang E / Regal 2', supplier: 'MotionX' }
  ],
  filters: { search: '', category: '', status: '', onlyCritical: false, onlyLow: false, onlyAvailable: false }
};

const tableBody = document.querySelector('#inventoryTable');
const rowTemplate = document.querySelector('#rowTemplate');
const cardTemplate = document.querySelector('#cardTemplate');
const summaryCards = document.querySelector('#summaryCards');
const categoryFilter = document.querySelector('#categoryFilter');
const statusFilter = document.querySelector('#statusFilter');

function getStatus(part) {
  if (part.quantity === 0) return 'out';
  if (part.quantity <= part.reorderLevel / 2) return 'critical';
  if (part.quantity <= part.reorderLevel) return 'low';
  return 'available';
}

function toneFor(status) {
  return status === 'available'
    ? 'good'
    : status === 'low'
    ? 'warn'
    : status === 'critical' || status === 'out'
    ? 'bad'
    : 'info';
}

function statusLabel(status) {
  switch (status) {
    case 'available':
      return 'Lagernd';
    case 'low':
      return 'Niedrig';
    case 'critical':
      return 'Kritisch';
    case 'out':
      return 'Nicht vorrätig';
    case 'ordered':
      return 'Bestellt';
    default:
      return status;
  }
}

function filteredParts() {
  return state.parts.filter((part) => {
    const status = getStatus(part);
    if (state.filters.onlyCritical && status !== 'critical' && status !== 'out') return false;
    if (state.filters.onlyLow && status !== 'low') return false;
    if (state.filters.onlyAvailable && status !== 'available') return false;
    if (state.filters.status && status !== state.filters.status) return false;

    const query = state.filters.search.toLowerCase();
    if (query) {
      const haystack = `${part.name} ${part.model} ${part.category} ${part.supplier}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (state.filters.category && part.category !== state.filters.category) return false;
    return true;
  });
}

function renderTable() {
  tableBody.innerHTML = '';
  const parts = filteredParts();

  parts.forEach((part) => {
    const clone = rowTemplate.content.cloneNode(true);
    clone.querySelector('.title').textContent = part.name;
    clone.querySelector('.subline').textContent = `Mindestbestand ${part.reorderLevel} • ID ${part.id.slice(0, 6)}`;
    clone.querySelector('.model').textContent = part.model;
    clone.querySelector('.category').textContent = part.category;
    clone.querySelector('.location').textContent = part.location || '–';
    clone.querySelector('.quantity').textContent = part.quantity;
    clone.querySelector('.supplier').textContent = part.supplier || '–';

    const status = getStatus(part);
    const pill = clone.querySelector('.status');
    pill.textContent = statusLabel(status);
    pill.dataset.tone = toneFor(status);

    clone.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => updateStock(part.id, btn.dataset.action));
    });

    tableBody.appendChild(clone);
  });
}

function renderSummary() {
  summaryCards.innerHTML = '';
  const parts = filteredParts();
  const total = parts.length;
  const low = parts.filter((p) => getStatus(p) === 'low').length;
  const critical = parts.filter((p) => getStatus(p) === 'critical' || getStatus(p) === 'out').length;
  const ordered = parts.filter((p) => p.status === 'ordered').length;

  const cards = [
    { label: 'Gesamtteile', value: total, tone: 'info', desc: 'Aktiv im Lager' },
    { label: 'Niedriger Bestand', value: low, tone: 'warn', desc: 'Unter Mindestbestand' },
    { label: 'Kritisch / Leer', value: critical, tone: 'bad', desc: 'Sofort nachbestellen' },
    { label: 'Bestellt', value: ordered, tone: 'good', desc: 'Auf dem Weg' }
  ];

  cards.forEach((card) => {
    const node = cardTemplate.content.cloneNode(true);
    node.querySelector('.muted').textContent = card.label;
    node.querySelector('.stat-card__value').textContent = card.value;
    node.querySelectorAll('.muted')[1].textContent = card.desc;
    node.querySelector('.pill').textContent = card.tone === 'good' ? 'OK' : card.tone === 'warn' ? 'Achtung' : 'Alarm';
    node.querySelector('.pill').dataset.tone = card.tone;
    summaryCards.appendChild(node);
  });
}

function populateFilters() {
  const categories = Array.from(new Set(state.parts.map((p) => p.category))).sort();
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

function updateStock(id, action) {
  const part = state.parts.find((p) => p.id === id);
  if (!part) return;
  if (action === 'increment') part.quantity += 5;
  if (action === 'decrement') part.quantity = Math.max(0, part.quantity - 1);
  renderAll();
}

function exportCsv() {
  const rows = [
    ['Teil', 'Modell', 'Kategorie', 'Bestand', 'Mindest', 'Standort', 'Lieferant', 'Status']
  ];
  filteredParts().forEach((p) => {
    rows.push([
      p.name,
      p.model,
      p.category,
      p.quantity,
      p.reorderLevel,
      p.location,
      p.supplier,
      statusLabel(getStatus(p))
    ]);
  });

  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lager-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function addPart(formData) {
  const newPart = {
    id: crypto.randomUUID(),
    name: formData.get('name').trim(),
    model: formData.get('model').trim(),
    category: formData.get('category').trim(),
    location: formData.get('location').trim(),
    supplier: formData.get('supplier').trim(),
    reorderLevel: Number(formData.get('reorderLevel')) || 0,
    quantity: Number(formData.get('quantity')) || 0
  };
  state.parts.unshift(newPart);
  renderAll();
}

function renderAll() {
  renderSummary();
  renderTable();
}

function attachEvents() {
  document.querySelector('#searchInput').addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderAll();
  });

  categoryFilter.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    renderAll();
  });
  statusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderAll();
  });

  ['onlyCritical', 'onlyLow', 'onlyAvailable'].forEach((id) => {
    const el = document.querySelector(`#${id}`);
    el.addEventListener('change', () => {
      state.filters[id] = el.checked;
      renderAll();
    });
  });

  document.querySelector('#partForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    addPart(formData);
    e.target.reset();
  });

  document.querySelector('#newPartButton').addEventListener('click', () => {
    document.querySelector('#partForm input[name="name"]').focus();
  });

  document.querySelector('#exportButton').addEventListener('click', exportCsv);
}

populateFilters();
attachEvents();
renderAll();
