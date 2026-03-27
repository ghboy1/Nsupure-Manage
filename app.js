/* ============================================================
   NSUPURE WATER MANAGER - COMPLETE APP LOGIC
   ============================================================ */

// ===== CONFIG =====
const BACKUP_EMAIL = 'nsupure.adumasa@gmail.com';
const WA_NUMBERS = ['233248837001', '233551086492', '233249737654'];
const WA_NAMES = ['Main Line', 'Line 2', 'Line 3'];

// ===== UTILS =====
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function today() {
  return new Date().toISOString().split('T')[0];
}
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function formatNum(n) {
  return (n || 0).toLocaleString();
}
function formatMoney(n) {
  return 'GH₵ ' + parseFloat(n || 0).toFixed(2);
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

// ===== DATA LAYER =====
const DB = {
  KEY: 'nsupure_v1',
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : this.defaultData();
    } catch { return this.defaultData(); }
  },
  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
    updateNavBadges();
  },
  defaultData() {
    return { productions: [], loadings: [], customers: [], orders: [], debtors: [], lastBackup: null };
  },
  get(key) { return this.load()[key] || []; },
  add(key, item) {
    const data = this.load();
    data[key] = [item, ...(data[key] || [])];
    this.save(data);
  },
  update(key, id, updates) {
    const data = this.load();
    data[key] = (data[key] || []).map(item => item.id === id ? { ...item, ...updates } : item);
    this.save(data);
  },
  remove(key, id) {
    const data = this.load();
    data[key] = (data[key] || []).filter(item => item.id !== id);
    this.save(data);
  },
  setMeta(key, value) {
    const data = this.load();
    data[key] = value;
    this.save(data);
  }
};

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== MODAL =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ===== NAVIGATION =====
let currentSection = 'dashboard';
function navigate(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + section)?.classList.add('active');
  document.querySelector(`.nav-item[data-sec="${section}"]`)?.classList.add('active');
  currentSection = section;
  window.scrollTo(0, 0);
  renderSection(section);
}
function renderSection(s) {
  switch (s) {
    case 'dashboard': renderDashboard(); break;
    case 'production': renderProduction(); break;
    case 'loading': renderLoading(); break;
    case 'orders': renderOrders(); break;
    case 'finance': renderFinance(); break;
  }
}
function updateNavBadges() {
  const pending = DB.get('orders').filter(o => o.status === 'pending').length;
  const badge = document.getElementById('orders-badge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'flex' : 'none';
  }
}

// ===========================
// DASHBOARD
// ===========================
function renderDashboard() {
  const todayDate = today();
  const prods = DB.get('productions').filter(p => p.date === todayDate);
  const loads = DB.get('loadings').filter(l => l.date === todayDate);
  const orders = DB.get('orders');
  const debtors = DB.get('debtors');

  const totalProd = prods.reduce((s, p) => s + p.bags, 0);
  const totalLoad = loads.reduce((s, l) => s + l.bags, 0);
  const remaining = Math.max(0, totalProd - totalLoad);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalDebt = debtors.filter(d => !d.settled && d.type === 'owes_money').reduce((s, d) => s + d.amount, 0);

  const loadPct = totalProd > 0 ? Math.min(100, Math.round(totalLoad / totalProd * 100)) : 0;

  // Build roll summary
  const rollSummary = {};
  prods.forEach(p => {
    rollSummary[p.roll] = (rollSummary[p.roll] || 0) + p.bags;
  });
  const rollHtml = Object.keys(rollSummary).sort().map(r =>
    `<div class="summary-row">
      <span class="label">Roll ${r}</span>
      <span class="value">${formatNum(rollSummary[r])} bags</span>
    </div>`
  ).join('');

  document.getElementById('sec-dashboard').innerHTML = `
    <div class="section-title"><span class="icon">🏠</span> Dashboard</div>

    <div class="stat-grid">
      <div class="stat-card blue">
        <div class="stat-value">${formatNum(totalProd)}</div>
        <div class="stat-label">Produced Today</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-value">${formatNum(totalLoad)}</div>
        <div class="stat-label">Loaded Today</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${formatNum(remaining)}</div>
        <div class="stat-label">Remaining</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value">${pendingOrders}</div>
        <div class="stat-label">Pending Orders</div>
      </div>
    </div>

    ${totalProd > 0 ? `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:var(--text-dim)">Loading Progress</span>
        <span style="font-size:13px;font-weight:700;color:var(--cyan)">${loadPct}%</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${loadPct}%"></div></div>
    </div>` : ''}

    ${Object.keys(rollSummary).length > 0 ? `
    <div class="card">
      <div class="report-title">📦 Today's Production by Roll</div>
      <div class="summary-box">${rollHtml}
        <div class="summary-row total"><span class="label">Total</span><span class="value">${formatNum(totalProd)} bags</span></div>
      </div>
    </div>` : `
    <div class="card" style="text-align:center;padding:24px;">
      <div style="font-size:40px;margin-bottom:10px;">💧</div>
      <p style="color:var(--text-muted);font-size:14px;">No production recorded today.<br>Tap <b style="color:var(--blue-light)">Produce</b> to add production.</p>
    </div>`}

    ${totalDebt > 0 ? `
    <div class="card" style="border-color:rgba(255,82,82,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:14px;color:var(--text-dim)">💸 Total Debt Owed to You</span>
        <span style="font-size:18px;font-weight:700;color:var(--danger)">${formatMoney(totalDebt)}</span>
      </div>
    </div>` : ''}

    <button class="btn btn-primary" onclick="navigate('production')" style="margin-bottom:10px;">
      ➕ Add Today's Production
    </button>
    <button class="btn btn-ghost btn-primary" onclick="navigate('loading')" style="background:transparent;border:1.5px solid var(--blue);">
      🚚 Load Truck / Aboboyaa
    </button>
  `;
}

// ===========================
// PRODUCTION
// ===========================
function renderProduction(filterDate) {
  const fd = filterDate || document.getElementById('prod-filter-date')?.value || '';
  let prods = DB.get('productions');
  if (fd) prods = prods.filter(p => p.date === fd);

  const totalBags = prods.reduce((s, p) => s + p.bags, 0);

  document.getElementById('sec-production').innerHTML = `
    <div class="section-title"><span class="icon">🏭</span> Production</div>

    <button class="btn btn-primary" onclick="openModal('modal-prod')" style="margin-bottom:14px;">
      ➕ Record Production
    </button>

    <div class="filter-bar">
      <input type="date" class="form-input" id="prod-filter-date" value="${fd}"
        onchange="renderProduction(this.value)" style="flex:1">
      ${fd ? `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('prod-filter-date').value='';renderProduction('')">✕</button>` : ''}
    </div>

    ${prods.length > 0 ? `
    <div class="card summary-box" style="margin-bottom:14px;">
      <div class="summary-row total">
        <span class="label">Total Bags ${fd ? 'on ' + formatDate(fd) : '(Filtered)'}</span>
        <span class="value">${formatNum(totalBags)}</span>
      </div>
    </div>` : ''}

    <div id="prod-list">
      ${prods.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <p>No production records found.<br>Use the button above to add.</p>
        </div>` :
      prods.map(p => `
        <div class="list-item">
          <div class="list-item-header">
            <div>
              <span class="roll-badge roll-${Math.min(p.roll,5)}">R${p.roll}</span>
              <span class="list-item-title" style="margin-left:8px;">Roll ${p.roll}</span>
            </div>
            <span style="font-family:var(--font-main);font-size:20px;font-weight:700;color:var(--blue-light)">${formatNum(p.bags)}</span>
          </div>
          <div class="list-item-meta">
            <span>📅 ${formatDate(p.date)}</span>
            ${p.notes ? `<span>📝 ${p.notes}</span>` : ''}
          </div>
          <div class="list-item-actions">
            <button class="btn btn-danger btn-sm" onclick="deleteProd('${p.id}')">🗑 Delete</button>
          </div>
        </div>`).join('')}
    </div>
  `;
}

function submitProduction() {
  const roll = parseInt(document.getElementById('p-roll').value);
  const bags = parseInt(document.getElementById('p-bags').value);
  const date = document.getElementById('p-date').value;
  const notes = document.getElementById('p-notes').value.trim();
  if (!roll || !bags || !date) return showToast('Fill in all required fields', 'error');
  if (bags < 1) return showToast('Bags must be at least 1', 'error');

  DB.add('productions', { id: uuid(), date, roll, bags, notes, createdAt: Date.now() });
  closeModal('modal-prod');
  document.getElementById('p-bags').value = '';
  document.getElementById('p-notes').value = '';
  showToast('✅ Production recorded!', 'success');
  if (currentSection === 'production') renderProduction();
  if (currentSection === 'dashboard') renderDashboard();
}

function deleteProd(id) {
  if (confirm('Delete this production record?')) {
    DB.remove('productions', id);
    showToast('Deleted', 'error');
    renderProduction();
    if (currentSection === 'dashboard') renderDashboard();
  }
}

// ===========================
// LOADING / TRUCK
// ===========================
function renderLoading(filterDate) {
  const fd = filterDate || document.getElementById('load-filter-date')?.value || today();
  const prods = DB.get('productions').filter(p => p.date === fd);
  const loads = DB.get('loadings').filter(l => l.date === fd);
  const totalProd = prods.reduce((s, p) => s + p.bags, 0);
  const totalLoad = loads.reduce((s, l) => s + l.bags, 0);
  const remaining = Math.max(0, totalProd - totalLoad);
  const loadPct = totalProd > 0 ? Math.min(100, Math.round(totalLoad / totalProd * 100)) : 0;

  let allLoads = DB.get('loadings');

  document.getElementById('sec-loading').innerHTML = `
    <div class="section-title"><span class="icon">🚚</span> Loading</div>

    <div class="filter-bar" style="margin-bottom:14px;">
      <input type="date" class="form-input" id="load-filter-date" value="${fd}"
        onchange="renderLoading(this.value)" style="flex:1">
    </div>

    <div class="card summary-box">
      <div class="summary-row">
        <span class="label">Total Produced</span>
        <span class="value" style="color:var(--blue-light)">${formatNum(totalProd)} bags</span>
      </div>
      <div class="summary-row">
        <span class="label">Total Loaded</span>
        <span class="value" style="color:var(--warning)">${formatNum(totalLoad)} bags</span>
      </div>
      <div class="summary-row remain">
        <span class="label">🟢 Remaining in Store</span>
        <span class="value">${formatNum(remaining)} bags</span>
      </div>
      ${totalProd > 0 ? `
      <div style="margin-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px;">
          <span>Loaded</span><span>${loadPct}%</span>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${loadPct}%"></div></div>
      </div>` : ''}
    </div>

    <button class="btn btn-primary" onclick="openModal('modal-load')" style="margin-bottom:16px;">
      ➕ Add Loading
    </button>

    <div class="section-title" style="font-size:16px;">Recent Loadings</div>
    ${loads.length === 0 ? `<div class="empty-state"><div class="empty-icon">🚚</div><p>No loadings on this date.</p></div>` :
      loads.map(l => `
        <div class="list-item">
          <div class="list-item-header">
            <div>
              <div class="list-item-title">🚛 ${l.vehicle || 'Vehicle'}</div>
              ${l.destination ? `<div class="list-item-sub">📍 ${l.destination}</div>` : ''}
            </div>
            <span style="font-family:var(--font-main);font-size:22px;font-weight:700;color:var(--cyan)">${formatNum(l.bags)}</span>
          </div>
          <div class="list-item-meta">
            <span>📅 ${formatDate(l.date)}</span>
            ${l.notes ? `<span>📝 ${l.notes}</span>` : ''}
          </div>
          <div class="list-item-actions">
            <button class="btn btn-danger btn-sm" onclick="deleteLoad('${l.id}')">🗑 Delete</button>
          </div>
        </div>`).join('')}
  `;
}

function submitLoading() {
  const vehicle = document.getElementById('l-vehicle').value.trim();
  const bags = parseInt(document.getElementById('l-bags').value);
  const date = document.getElementById('l-date').value;
  const destination = document.getElementById('l-dest').value.trim();
  const notes = document.getElementById('l-notes').value.trim();
  if (!vehicle || !bags || !date) return showToast('Fill all required fields', 'error');

  // Check remaining
  const prods = DB.get('productions').filter(p => p.date === date);
  const loads = DB.get('loadings').filter(l => l.date === date);
  const totalProd = prods.reduce((s, p) => s + p.bags, 0);
  const totalLoaded = loads.reduce((s, l) => s + l.bags, 0);
  const remaining = totalProd - totalLoaded;
  if (bags > remaining && totalProd > 0) {
    if (!confirm(`You are loading ${formatNum(bags)} bags but only ${formatNum(remaining)} bags remain. Continue?`)) return;
  }

  DB.add('loadings', { id: uuid(), date, vehicle, bags, destination, notes, createdAt: Date.now() });
  closeModal('modal-load');
  document.getElementById('l-vehicle').value = '';
  document.getElementById('l-bags').value = '';
  document.getElementById('l-dest').value = '';
  document.getElementById('l-notes').value = '';
  showToast('✅ Loading recorded!', 'success');
  renderLoading(date);
  if (currentSection === 'dashboard') renderDashboard();
}

function deleteLoad(id) {
  if (confirm('Delete this loading record?')) {
    DB.remove('loadings', id);
    showToast('Deleted', 'error');
    renderLoading();
  }
}

// ===========================
// ORDERS / CUSTOMERS
// ===========================
let ordersTab = 'orders';
function renderOrders() {
  const customers = DB.get('customers');
  const orders = DB.get('orders');

  if (ordersTab === 'orders') renderOrdersList(orders, customers);
  else renderCustomersList(customers);
}

function renderOrdersList(orders, customers) {
  const filterStatus = document.getElementById('ord-filter-status')?.value || '';
  const filterCust = document.getElementById('ord-filter-cust')?.value?.toLowerCase() || '';
  let filtered = [...orders];
  if (filterStatus) filtered = filtered.filter(o => o.status === filterStatus);
  if (filterCust) filtered = filtered.filter(o => o.customerName.toLowerCase().includes(filterCust));

  const pending = orders.filter(o => o.status === 'pending').length;
  const fulfilled = orders.filter(o => o.status === 'fulfilled').length;

  document.getElementById('sec-orders').innerHTML = `
    <div class="section-title"><span class="icon">📋</span> Orders & Customers</div>
    <div class="tabs">
      <button class="tab-btn active" onclick="ordersTab='orders';renderOrders()">📦 Orders</button>
      <button class="tab-btn" onclick="ordersTab='customers';renderOrders()">👥 Customers</button>
    </div>

    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-card orange">
        <div class="stat-value">${pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${fulfilled}</div>
        <div class="stat-label">Fulfilled</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <input type="text" class="form-input" id="ord-filter-cust" placeholder="🔍 Search customer..." value="${filterCust}"
        oninput="renderOrders()" style="flex:1;min-width:0;">
      <select class="form-select" id="ord-filter-status" onchange="renderOrders()" style="width:130px;">
        <option value="">All Status</option>
        <option value="pending" ${filterStatus==='pending'?'selected':''}>Pending</option>
        <option value="fulfilled" ${filterStatus==='fulfilled'?'selected':''}>Fulfilled</option>
      </select>
    </div>

    <button class="btn btn-primary" onclick="openModal('modal-order')" style="margin-bottom:14px;">
      ➕ Place New Order
    </button>

    ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-icon">📋</div><p>No orders found.</p></div>` :
      filtered.map(o => {
        const balance = (o.bags * (o.pricePerBag || 0)) - (o.amountPaid || 0);
        return `
        <div class="list-item">
          <div class="list-item-header">
            <div>
              <div class="list-item-title">👤 ${o.customerName}</div>
              <div class="list-item-sub">${o.customerPhone || ''}</div>
            </div>
            <span class="badge badge-${o.status}">${o.status}</span>
          </div>
          <div class="summary-box" style="margin:8px 0 0;padding:10px 12px;">
            <div class="summary-row"><span class="label">Bags Ordered</span><span class="value">${formatNum(o.bags)} bags</span></div>
            ${o.pricePerBag ? `<div class="summary-row"><span class="label">Price/Bag</span><span class="value">${formatMoney(o.pricePerBag)}</span></div>` : ''}
            ${o.pricePerBag ? `<div class="summary-row"><span class="label">Total Amount</span><span class="value">${formatMoney(o.bags * o.pricePerBag)}</span></div>` : ''}
            ${o.pricePerBag ? `<div class="summary-row"><span class="label">Amount Paid</span><span class="value" style="color:var(--success)">${formatMoney(o.amountPaid||0)}</span></div>` : ''}
            ${o.pricePerBag && balance > 0 ? `<div class="summary-row danger"><span class="label">Balance Owed</span><span class="value">${formatMoney(balance)}</span></div>` : ''}
          </div>
          <div class="list-item-meta" style="margin-top:8px;">
            <span>📅 ${formatDate(o.date)}</span>
            ${o.notes ? `<span>📝 ${o.notes}</span>` : ''}
          </div>
          <div class="list-item-actions">
            ${o.status === 'pending' ? `
              <button class="btn btn-success btn-sm" onclick="fulfillOrder('${o.id}')">✅ Mark Fulfilled</button>
              <button class="btn btn-warning btn-sm" onclick="editOrderPayment('${o.id}','${o.amountPaid||0}')">💰 Update Payment</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')">🗑 Delete</button>
          </div>
        </div>`;
      }).join('')}
  `;
  // Fix tab styling
  document.querySelectorAll('.tab-btn')[0]?.classList.add('active');
}

function renderCustomersList(customers) {
  document.getElementById('sec-orders').innerHTML = `
    <div class="section-title"><span class="icon">📋</span> Orders & Customers</div>
    <div class="tabs">
      <button class="tab-btn" onclick="ordersTab='orders';renderOrders()">📦 Orders</button>
      <button class="tab-btn active" onclick="ordersTab='customers';renderOrders()">👥 Customers</button>
    </div>

    <button class="btn btn-primary" onclick="openModal('modal-customer')" style="margin-bottom:14px;">
      ➕ Add Customer
    </button>

    ${customers.length === 0 ? `<div class="empty-state"><div class="empty-icon">👥</div><p>No customers yet.<br>Add your first customer above.</p></div>` :
      customers.map(c => {
        const custOrders = DB.get('orders').filter(o => o.customerId === c.id);
        const pending = custOrders.filter(o => o.status === 'pending').length;
        const totalBags = custOrders.reduce((s, o) => s + o.bags, 0);
        return `
        <div class="list-item">
          <div class="list-item-header">
            <div>
              <div class="list-item-title">👤 ${c.name}</div>
              ${c.phone ? `<div class="list-item-sub">📞 ${c.phone}</div>` : ''}
            </div>
            <div style="text-align:right">
              ${pending > 0 ? `<span class="badge badge-pending">${pending} pending</span>` : ''}
            </div>
          </div>
          <div class="list-item-meta">
            <span>📦 ${formatNum(totalBags)} total bags</span>
            <span>📋 ${custOrders.length} orders</span>
          </div>
          <div class="list-item-actions">
            <button class="btn btn-cyan btn-sm" onclick="quickOrder('${c.id}','${c.name}','${c.phone||''}')">📦 Place Order</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">🗑 Remove</button>
          </div>
        </div>`;
      }).join('')}
  `;
}

function submitCustomer() {
  const name = document.getElementById('c-name').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  if (!name) return showToast('Customer name is required', 'error');
  DB.add('customers', { id: uuid(), name, phone, createdAt: Date.now() });
  closeModal('modal-customer');
  document.getElementById('c-name').value = '';
  document.getElementById('c-phone').value = '';
  populateCustomerDropdown();
  showToast('✅ Customer added!', 'success');
  renderOrders();
}

function deleteCustomer(id) {
  if (confirm('Remove this customer? Their orders will remain.')) {
    DB.remove('customers', id);
    showToast('Customer removed', 'error');
    renderOrders();
  }
}

function populateCustomerDropdown() {
  const sel = document.getElementById('o-customer');
  if (!sel) return;
  const customers = DB.get('customers');
  sel.innerHTML = '<option value="">Select Customer</option>' +
    customers.map(c => `<option value="${c.id}|${c.name}|${c.phone||''}">${c.name}${c.phone ? ' ('+c.phone+')' : ''}</option>`).join('');
}

function quickOrder(custId, name, phone) {
  ordersTab = 'orders';
  openModal('modal-order');
  setTimeout(() => {
    populateCustomerDropdown();
    const sel = document.getElementById('o-customer');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.startsWith(custId)) {
        sel.selectedIndex = i;
        break;
      }
    }
  }, 100);
}

function submitOrder() {
  const custRaw = document.getElementById('o-customer').value;
  const bags = parseInt(document.getElementById('o-bags').value);
  const date = document.getElementById('o-date').value;
  const pricePerBag = parseFloat(document.getElementById('o-price').value) || 0;
  const amountPaid = parseFloat(document.getElementById('o-paid').value) || 0;
  const notes = document.getElementById('o-notes').value.trim();

  if (!custRaw) return showToast('Select a customer', 'error');
  if (!bags || bags < 1) return showToast('Enter number of bags', 'error');
  if (!date) return showToast('Select a date', 'error');

  const [customerId, customerName, customerPhone] = custRaw.split('|');
  DB.add('orders', {
    id: uuid(), customerId, customerName, customerPhone,
    date, bags, pricePerBag, amountPaid,
    status: 'pending', notes, createdAt: Date.now()
  });
  closeModal('modal-order');
  document.getElementById('o-bags').value = '';
  document.getElementById('o-price').value = '';
  document.getElementById('o-paid').value = '';
  document.getElementById('o-notes').value = '';
  document.getElementById('o-customer').selectedIndex = 0;
  showToast('✅ Order placed!', 'success');
  renderOrders();
}

function fulfillOrder(id) {
  DB.update('orders', id, { status: 'fulfilled', deliveredAt: Date.now() });
  showToast('✅ Order marked as fulfilled!', 'success');
  renderOrders();
}

function editOrderPayment(id, currentPaid) {
  const paid = prompt('Enter total amount paid (GH₵):', currentPaid);
  if (paid !== null && !isNaN(paid)) {
    DB.update('orders', id, { amountPaid: parseFloat(paid) });
    showToast('💰 Payment updated!', 'success');
    renderOrders();
  }
}

function deleteOrder(id) {
  if (confirm('Delete this order?')) {
    DB.remove('orders', id);
    showToast('Order deleted', 'error');
    renderOrders();
  }
}

// ===========================
// FINANCE (DEBTORS + REPORTS)
// ===========================
let financeTab = 'debtors';
function renderFinance() {
  if (financeTab === 'debtors') renderDebtors();
  else renderReports();
}

function renderDebtors() {
  const debtors = DB.get('debtors');
  const active = debtors.filter(d => !d.settled);
  const settled = debtors.filter(d => d.settled);
  const totalOwed = active.filter(d => d.type === 'owes_money').reduce((s, d) => s + d.amount, 0);
  const totalCredit = active.filter(d => d.type === 'owes_water').reduce((s, d) => s + (d.bags || 0), 0);

  document.getElementById('sec-finance').innerHTML = `
    <div class="section-title"><span class="icon">💸</span> Finance & Reports</div>
    <div class="tabs">
      <button class="tab-btn active" onclick="financeTab='debtors';renderFinance()">💸 Debtors</button>
      <button class="tab-btn" onclick="financeTab='reports';renderFinance()">📊 Reports</button>
    </div>

    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-card blue" style="--after-bg:var(--danger)">
        <div class="stat-value" style="color:var(--danger)">${formatMoney(totalOwed)}</div>
        <div class="stat-label">Money Owed to You</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-value">${totalCredit}</div>
        <div class="stat-label">Bags Owed Out</div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="openModal('modal-debtor')" style="margin-bottom:14px;">
      ➕ Add Debtor / Credit
    </button>

    ${active.length === 0 ? `<div class="empty-state"><div class="empty-icon">🎉</div><p>No active debtors. All clear!</p></div>` :
      active.map(d => `
        <div class="list-item" style="border-color:${d.type==='owes_money'?'rgba(255,82,82,0.3)':'rgba(255,179,0,0.3)'}">
          <div class="list-item-header">
            <div>
              <div class="list-item-title">👤 ${d.name}</div>
              ${d.phone ? `<div class="list-item-sub">📞 ${d.phone}</div>` : ''}
            </div>
            <span class="badge ${d.type==='owes_money'?'badge-owes':'badge-credit'}">
              ${d.type === 'owes_money' ? 'Owes Money' : 'Owes Water'}
            </span>
          </div>
          <div class="summary-box" style="margin:8px 0 0;padding:10px 12px;">
            ${d.type === 'owes_money' ? `
              <div class="summary-row danger"><span class="label">Amount Owed</span><span class="value">${formatMoney(d.amount)}</span></div>` : `
              <div class="summary-row"><span class="label">Bags Owed</span><span class="value" style="color:var(--warning)">${formatNum(d.bags)} bags</span></div>
              ${d.amount ? `<div class="summary-row"><span class="label">Prepaid Amount</span><span class="value" style="color:var(--success)">${formatMoney(d.amount)}</span></div>` : ''}`}
            ${d.description ? `<div class="summary-row"><span class="label">Note</span><span class="value" style="font-size:13px">${d.description}</span></div>` : ''}
            <div class="summary-row"><span class="label">Date</span><span class="value" style="font-size:12px">${formatDate(d.date)}</span></div>
          </div>
          <div class="list-item-actions">
            <button class="btn btn-success btn-sm" onclick="settleDebtor('${d.id}')">✅ Mark Settled</button>
            <button class="btn btn-danger btn-sm" onclick="deleteDebtor('${d.id}')">🗑 Delete</button>
          </div>
        </div>`).join('')}

    ${settled.length > 0 ? `
      <div class="divider"></div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:10px;">SETTLED (${settled.length})</div>
      ${settled.map(d => `
        <div class="list-item" style="opacity:0.55">
          <div class="list-item-header">
            <div class="list-item-title">👤 ${d.name}</div>
            <span class="badge badge-settled">Settled</span>
          </div>
          <div class="list-item-meta">
            ${d.type === 'owes_money' ? formatMoney(d.amount) : formatNum(d.bags)+' bags'}
            <span>|</span><span>${formatDate(d.date)}</span>
          </div>
          <div class="list-item-actions">
            <button class="btn btn-danger btn-sm" onclick="deleteDebtor('${d.id}')">🗑 Delete</button>
          </div>
        </div>`).join('')}` : ''}
  `;
}

function submitDebtor() {
  const name = document.getElementById('d-name').value.trim();
  const phone = document.getElementById('d-phone').value.trim();
  const type = document.getElementById('d-type').value;
  const amount = parseFloat(document.getElementById('d-amount').value) || 0;
  const bags = parseInt(document.getElementById('d-bags').value) || 0;
  const description = document.getElementById('d-desc').value.trim();
  const date = document.getElementById('d-date').value;
  if (!name || !date) return showToast('Name and date are required', 'error');
  if (type === 'owes_money' && !amount) return showToast('Enter the amount', 'error');
  if (type === 'owes_water' && !bags) return showToast('Enter number of bags', 'error');

  DB.add('debtors', { id: uuid(), name, phone, type, amount, bags, description, date, settled: false, createdAt: Date.now() });
  closeModal('modal-debtor');
  document.getElementById('d-name').value = '';
  document.getElementById('d-phone').value = '';
  document.getElementById('d-amount').value = '';
  document.getElementById('d-bags').value = '';
  document.getElementById('d-desc').value = '';
  showToast('✅ Debtor added!', 'success');
  renderFinance();
}

function settleDebtor(id) {
  if (confirm('Mark this as settled?')) {
    DB.update('debtors', id, { settled: true, settledAt: Date.now() });
    showToast('✅ Marked as settled!', 'success');
    renderFinance();
  }
}

function deleteDebtor(id) {
  if (confirm('Delete this record?')) {
    DB.remove('debtors', id);
    showToast('Deleted', 'error');
    renderFinance();
  }
}

// Debtor type toggle
function toggleDebtorType() {
  const type = document.getElementById('d-type').value;
  document.getElementById('d-amount-wrap').style.display = type === 'owes_money' ? 'block' : 'none';
  document.getElementById('d-bags-wrap').style.display = type === 'owes_water' ? 'block' : 'none';
}

// ===========================
// REPORTS
// ===========================
function renderReports() {
  const reportDate = document.getElementById('r-date')?.value || today();

  document.getElementById('sec-finance').innerHTML = `
    <div class="section-title"><span class="icon">💸</span> Finance & Reports</div>
    <div class="tabs">
      <button class="tab-btn" onclick="financeTab='debtors';renderFinance()">💸 Debtors</button>
      <button class="tab-btn active" onclick="financeTab='reports';renderFinance()">📊 Reports</button>
    </div>

    <div class="card">
      <div class="report-title">📅 Generate Daily Report</div>
      <div class="form-group">
        <label class="form-label">Select Date</label>
        <input type="date" class="form-input" id="r-date" value="${reportDate}" onchange="renderReports()">
      </div>
    </div>

    <div id="report-preview">${buildReportPreview(reportDate)}</div>

    <div class="card">
      <div class="report-title">📤 Send Report</div>
      ${WA_NUMBERS.map((num, i) => `
        <button class="btn btn-wa" onclick="sendWhatsApp('${num}','${reportDate}')">
          📱 WhatsApp — ${WA_NAMES[i]} (${num.slice(-9)})
        </button>`).join('')}
      <div style="margin:12px 0 8px;text-align:center;font-size:12px;color:var(--text-muted)">— or —</div>
      <button class="btn btn-gmail" onclick="sendGmail('${reportDate}')">
        📧 Backup to Gmail
      </button>
    </div>

    <div class="card" style="border-color:rgba(255,82,82,0.2)">
      <div class="report-title" style="color:var(--danger)">⚠️ Data Management</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Export all data before clearing. This cannot be undone.</p>
      <button class="btn btn-ghost btn-primary" onclick="exportAllData()" style="background:transparent;border:1px solid var(--blue);margin-bottom:8px;">
        💾 Export All Data (JSON)
      </button>
      <button class="btn btn-danger" onclick="clearAllData()" style="width:100%;font-size:14px;padding:10px;">
        🗑 Clear All Data
      </button>
    </div>
  `;
}

function buildReportPreview(date) {
  const prods = DB.get('productions').filter(p => p.date === date);
  const loads = DB.get('loadings').filter(l => l.date === date);
  const orders = DB.get('orders').filter(o => o.date === date);
  const totalProd = prods.reduce((s, p) => s + p.bags, 0);
  const totalLoad = loads.reduce((s, l) => s + l.bags, 0);
  const remaining = Math.max(0, totalProd - totalLoad);
  const totalSales = orders.reduce((s, o) => s + (o.bags * (o.pricePerBag || 0)), 0);
  const totalPaid = orders.reduce((s, o) => s + (o.amountPaid || 0), 0);

  if (totalProd === 0 && totalLoad === 0 && orders.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">📊</div><p>No data for ${formatDate(date)}</p></div>`;
  }

  const rollGroups = {};
  prods.forEach(p => { rollGroups[p.roll] = (rollGroups[p.roll] || 0) + p.bags; });

  return `
    <div class="card report-card">
      <div class="report-title">📊 Report: ${formatDate(date)}</div>
      <div class="summary-box">
        <div style="font-size:12px;font-weight:700;color:var(--blue-light);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">PRODUCTION</div>
        ${Object.keys(rollGroups).sort().map(r =>
          `<div class="summary-row"><span class="label">Roll ${r}</span><span class="value">${formatNum(rollGroups[r])} bags</span></div>`
        ).join('')}
        <div class="summary-row total"><span class="label">Total Produced</span><span class="value">${formatNum(totalProd)} bags</span></div>
        <div class="divider" style="margin:6px 0"></div>
        <div style="font-size:12px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">LOADING</div>
        ${loads.map(l => `<div class="summary-row"><span class="label">${l.vehicle}</span><span class="value">${formatNum(l.bags)} bags</span></div>`).join('')}
        <div class="summary-row"><span class="label">Total Loaded</span><span class="value" style="color:var(--warning)">${formatNum(totalLoad)} bags</span></div>
        <div class="summary-row remain"><span class="label">Remaining</span><span class="value">${formatNum(remaining)} bags</span></div>
        ${orders.length > 0 ? `
        <div class="divider" style="margin:6px 0"></div>
        <div style="font-size:12px;font-weight:700;color:var(--success);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">ORDERS</div>
        ${orders.map(o => `<div class="summary-row"><span class="label">${o.customerName}</span><span class="value">${formatNum(o.bags)} bags</span></div>`).join('')}
        ${totalSales ? `<div class="summary-row total"><span class="label">Total Sales</span><span class="value">${formatMoney(totalSales)}</span></div>` : ''}
        ${totalPaid ? `<div class="summary-row"><span class="label">Amount Paid</span><span class="value" style="color:var(--success)">${formatMoney(totalPaid)}</span></div>` : ''}
        ` : ''}
      </div>
    </div>`;
}

function buildReportText(date) {
  const prods = DB.get('productions').filter(p => p.date === date);
  const loads = DB.get('loadings').filter(l => l.date === date);
  const orders = DB.get('orders').filter(o => o.date === date);
  const debtors = DB.get('debtors').filter(d => !d.settled);
  const totalProd = prods.reduce((s, p) => s + p.bags, 0);
  const totalLoad = loads.reduce((s, l) => s + l.bags, 0);
  const remaining = Math.max(0, totalProd - totalLoad);
  const totalSales = orders.reduce((s, o) => s + (o.bags * (o.pricePerBag || 0)), 0);
  const totalPaid = orders.reduce((s, o) => s + (o.amountPaid || 0), 0);

  const rollGroups = {};
  prods.forEach(p => { rollGroups[p.roll] = (rollGroups[p.roll] || 0) + p.bags; });

  let txt = `💧 *NSUPURE WATER - DAILY REPORT*\n`;
  txt += `📅 Date: ${formatDate(date)}\n`;
  txt += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  txt += `🏭 *PRODUCTION*\n`;
  Object.keys(rollGroups).sort().forEach(r => {
    txt += `  Roll ${r}: ${formatNum(rollGroups[r])} bags\n`;
  });
  txt += `  *Total: ${formatNum(totalProd)} bags*\n\n`;

  txt += `🚚 *LOADING*\n`;
  if (loads.length > 0) {
    loads.forEach(l => { txt += `  ${l.vehicle}: ${formatNum(l.bags)} bags\n`; });
  } else {
    txt += `  No loadings\n`;
  }
  txt += `  *Total Loaded: ${formatNum(totalLoad)} bags*\n`;
  txt += `  *Remaining: ${formatNum(remaining)} bags*\n\n`;

  if (orders.length > 0) {
    txt += `📋 *ORDERS*\n`;
    orders.forEach(o => {
      txt += `  ${o.customerName}: ${formatNum(o.bags)} bags [${o.status}]\n`;
    });
    if (totalSales) txt += `  *Total Sales: ${formatMoney(totalSales)}*\n`;
    if (totalPaid) txt += `  *Paid: ${formatMoney(totalPaid)}*\n`;
    txt += '\n';
  }

  if (debtors.length > 0) {
    txt += `💸 *OUTSTANDING DEBTORS*\n`;
    debtors.slice(0, 5).forEach(d => {
      txt += `  ${d.name}: ${d.type === 'owes_money' ? formatMoney(d.amount) : formatNum(d.bags)+' bags'}\n`;
    });
    txt += '\n';
  }

  txt += `━━━━━━━━━━━━━━━━━━━━\n`;
  txt += `Generated by NSUPURE Manager\n`;
  txt += `Adumasa, Ashanti, Ghana 🇬🇭`;
  return txt;
}

function sendWhatsApp(number, date) {
  const text = buildReportText(date || today());
  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
  showToast('📱 Opening WhatsApp...', 'success');
}

function sendGmail(date) {
  const text = buildReportText(date || today());
  const subject = `NSUPURE Daily Report - ${date}`;
  const url = `mailto:${BACKUP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  window.location.href = url;
  showToast('📧 Opening Gmail...', 'success');
}

function exportAllData() {
  const data = DB.load();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nsupure-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Data exported!', 'success');
}

function clearAllData() {
  if (confirm('⚠️ Clear ALL data? This cannot be undone!\n\nExport your data first.')) {
    if (confirm('Are you absolutely sure? All production, orders, and customer data will be deleted.')) {
      localStorage.removeItem(DB.KEY);
      showToast('Data cleared', 'error');
      renderSection(currentSection);
    }
  }
}

// ===========================
// SERVICE WORKER
// ===========================
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔄 App updated! Refresh to apply.', 'success');
          }
        });
      });
    }).catch(e => console.log('SW reg failed:', e));
  }
}

// ===========================
// ONLINE STATUS
// ===========================
function handleOnlineStatus() {
  const isOnline = navigator.onLine;
  const indicator = document.getElementById('online-indicator');
  if (indicator) {
    indicator.textContent = isOnline ? '🟢' : '🔴';
    indicator.title = isOnline ? 'Online' : 'Offline';
  }
  if (isOnline) {
    showToast('🌐 Online - Auto-backup available', 'success');
  }
}
window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', () => showToast('📵 Offline mode - Data saved locally', ''));

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date in all date fields
  const fields = ['p-date', 'l-date', 'o-date', 'd-date'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today();
  });

  // Header date
  const now = new Date();
  document.getElementById('header-day').textContent = now.toLocaleDateString('en-GH', { weekday: 'long' });
  document.getElementById('header-date').textContent = now.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' });

  // Register SW
  registerSW();

  // Init nav badges
  updateNavBadges();

  // Start on dashboard
  navigate('dashboard');

  // Check network
  handleOnlineStatus();
});
