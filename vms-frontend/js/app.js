import { api, auth, API_BASE } from './api.js';

// ------------------------------------------------------------------
// Small DOM / helper utilities
// ------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDateOnly(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function toast(message, type = 'info') {
  const stack = $('#toast-stack');
  const node = el(`<div class="toast ${type}">${esc(message)}</div>`);
  stack.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function beacon(color, label) {
  return `<span class="beacon-tag"><span class="beacon ${color}"></span>${esc(label)}</span>`;
}

const statusBeacon = (status) => {
  const map = { available: 'green', assigned: 'amber', maintenance: 'red' };
  return beacon(map[status] || 'grey', status || 'unknown');
};

const availBeacon = (isAvailable) => isAvailable
  ? beacon('green', 'available')
  : beacon('amber', 'unavailable');

const activeBeacon = (isActive) => isActive
  ? beacon('green', 'active')
  : beacon('grey', 'ended');

// ------------------------------------------------------------------
// Modal helper
// ------------------------------------------------------------------
function openModal(innerHtml, { onMount } = {}) {
  const backdrop = el(`<div class="modal-backdrop"><div class="modal">${innerHtml}</div></div>`);
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function esc1(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc1); }
  });
  if (onMount) onMount(backdrop, close);
  return { backdrop, close };
}

function confirmAction(message, onConfirm) {
  const { close } = openModal(`
    <h3>Confirm</h3>
    <p class="modal-sub">${esc(message)}</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-cancel>Cancel</button>
      <button class="btn btn-danger" data-confirm>Confirm</button>
    </div>
  `, {
    onMount: (backdrop, close) => {
      $('[data-cancel]', backdrop).addEventListener('click', close);
      $('[data-confirm]', backdrop).addEventListener('click', async () => {
        close();
        await onConfirm();
      });
    },
  });
  return close;
}

// ------------------------------------------------------------------
// Router
// ------------------------------------------------------------------
const routes = ['dashboard', 'vehicles', 'drivers', 'assignments'];

function currentRoute() {
  const hash = (location.hash || '#/dashboard').replace('#/', '');
  return routes.includes(hash) ? hash : 'dashboard';
}

async function navigate() {
  if (!auth.isLoggedIn()) { showLogin(); return; }
  showApp();
  const route = currentRoute();
  $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.route === route));
  const main = $('#main-content');
  main.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    if (route === 'dashboard') await renderDashboard(main);
    else if (route === 'vehicles') await renderVehicles(main);
    else if (route === 'drivers') await renderDrivers(main);
    else if (route === 'assignments') await renderAssignments(main);
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><div class="empty-title">Couldn't load this page</div>${esc(e.message)}</div>`;
    toast(e.message, 'error');
  }
}

window.addEventListener('hashchange', navigate);

// ------------------------------------------------------------------
// Login screen
// ------------------------------------------------------------------
function showLogin() {
  $('#app-shell').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
}

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  $('#session-username').textContent = auth.getUsername() || '—';
  $('#session-role').textContent = auth.isAdmin() ? 'Admin' : 'Driver';
  $$('.admin-only').forEach((n) => n.classList.toggle('hidden', !auth.isAdmin()));
}

function initLogin() {
  let selectedRole = 'admin';
  $$('.role-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRole = btn.dataset.role;
      $$('.role-toggle button').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  const form = $('#login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    const errorBox = $('#login-error');
    errorBox.classList.add('hidden');
    const btn = $('#login-submit');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const data = await api.login(username, password);
      auth.setSession({ access: data.access, refresh: data.refresh, role: selectedRole, username });
      location.hash = '#/dashboard';
      navigate();
    } catch (err) {
      errorBox.textContent = err.message || 'Login failed';
      errorBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
}

$('#logout-btn').addEventListener('click', () => {
  auth.clear();
  location.hash = '#/dashboard';
  showLogin();
});

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
async function renderDashboard(main) {
  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dispatch overview</h1>
        <p class="page-sub">Live counts across the fleet, pulled from the API on every visit.</p>
      </div>
    </div>
    <div id="dash-stats" class="stat-grid"></div>
    <div class="panel-block">
      <h3>Quick actions</h3>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn btn-ghost" href="#/vehicles">View vehicles</a>
        <a class="btn btn-ghost" href="#/drivers">View drivers</a>
        <a class="btn btn-ghost" href="#/assignments">View assignments</a>
      </div>
    </div>
  `;

  let stats;
  try {
    stats = await api.dashboard();
  } catch (e) {
    // /api/dashboard/ is optional per the backend spec — fall back to
    // deriving the same numbers from the list endpoints' counts.
    const [total, avail, assigned, maint, driversTotal, driversAvail, activeAssign] = await Promise.all([
      api.listVehicles(''), api.listVehicles('?status=available'), api.listVehicles('?status=assigned'),
      api.listVehicles('?status=maintenance'), api.listDrivers(''), api.listDrivers('?is_available=true'),
      api.listAssignments('?is_active=true'),
    ]);
    stats = {
      vehicles: { total: total.count, available: avail.count, assigned: assigned.count, maintenance: maint.count },
      drivers: { total: driversTotal.count, available: driversAvail.count, unavailable: driversTotal.count - driversAvail.count },
      assignments: { active: activeAssign.count },
    };
  }

  const v = stats.vehicles || {};
  const d = stats.drivers || {};
  const a = stats.assignments || {};
  const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

  $('#dash-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total vehicles</div>
      <div class="stat-value">${esc(v.total ?? '—')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Available vehicles</div>
      <div class="stat-value">${esc(v.available ?? '—')}</div>
      <div class="stat-bar"><div style="width:${pct(v.available, v.total)}%; background: var(--green);"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Assigned vehicles</div>
      <div class="stat-value">${esc(v.assigned ?? '—')}</div>
      <div class="stat-bar"><div style="width:${pct(v.assigned, v.total)}%; background: var(--amber);"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Under maintenance</div>
      <div class="stat-value">${esc(v.maintenance ?? '—')}</div>
      <div class="stat-bar"><div style="width:${pct(v.maintenance, v.total)}%; background: var(--red);"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total drivers</div>
      <div class="stat-value">${esc(d.total ?? '—')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Available drivers</div>
      <div class="stat-value">${esc(d.available ?? '—')}</div>
      <div class="stat-bar"><div style="width:${pct(d.available, d.total)}%; background: var(--green);"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Unavailable drivers</div>
      <div class="stat-value">${esc(d.unavailable ?? '—')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active assignments</div>
      <div class="stat-value">${esc(a.active ?? '—')}</div>
    </div>
  `;
}

// ------------------------------------------------------------------
// Generic pagination footer
// ------------------------------------------------------------------
function paginationBar(data, onPage) {
  const bar = el(`
    <div class="pagination">
      <span>${data.count ?? 0} total</span>
      <div class="btns">
        <button class="btn btn-ghost btn-sm" data-prev ${data.previous ? '' : 'disabled'}>← Prev</button>
        <button class="btn btn-ghost btn-sm" data-next ${data.next ? '' : 'disabled'}>Next →</button>
      </div>
    </div>
  `);
  $('[data-prev]', bar).addEventListener('click', () => onPage(data.previous));
  $('[data-next]', bar).addEventListener('click', () => onPage(data.next));
  return bar;
}

function pageParamFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.search; // reuse full query string from DRF's next/previous link
  } catch (e) { return null; }
}

// ------------------------------------------------------------------
// Vehicles view
// ------------------------------------------------------------------
async function renderVehicles(main) {
  const state = { search: '', status: '', condition: '', ordering: '-created_at', query: '' };

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Vehicles</h1>
        <p class="page-sub">Fleet inventory, condition, and current status.</p>
      </div>
      <button class="btn btn-primary admin-only" id="new-vehicle-btn">+ New vehicle</button>
    </div>
    <div class="toolbar">
      <input type="search" id="v-search" placeholder="Search number, model, type…" />
      <select id="v-status">
        <option value="">All statuses</option>
        <option value="available">Available</option>
        <option value="assigned">Assigned</option>
        <option value="maintenance">Maintenance</option>
      </select>
      <select id="v-condition">
        <option value="">All conditions</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
      </select>
      <select id="v-ordering">
        <option value="-created_at">Newest first</option>
        <option value="created_at">Oldest first</option>
        <option value="vehicle_number">Vehicle number</option>
      </select>
      <div class="spacer"></div>
    </div>
    <div class="table-wrap"><div id="v-table"></div></div>
  `;
  $('.admin-only', main)?.classList.toggle('hidden', !auth.isAdmin());

  const search = $('#v-search'), statusSel = $('#v-status'), condSel = $('#v-condition'), orderSel = $('#v-ordering');
  let debounce;
  const reload = () => load(state.query);
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.search = search.value.trim(); state.query = ''; reload(); }, 350);
  });
  statusSel.addEventListener('change', () => { state.status = statusSel.value; state.query = ''; reload(); });
  condSel.addEventListener('change', () => { state.condition = condSel.value; state.query = ''; reload(); });
  orderSel.addEventListener('change', () => { state.ordering = orderSel.value; state.query = ''; reload(); });

  $('#new-vehicle-btn')?.addEventListener('click', () => openVehicleForm(null, reload));

  function buildParams() {
    const p = new URLSearchParams();
    if (state.search) p.set('search', state.search);
    if (state.status) p.set('status', state.status);
    if (state.condition) p.set('condition', state.condition);
    if (state.ordering) p.set('ordering', state.ordering);
    return `?${p.toString()}`;
  }

  async function load(pageUrl) {
    const target = $('#v-table');
    target.innerHTML = '<div class="empty-state">Loading…</div>';
    const q = pageUrl ? pageUrl.replace(/^.*\?/, '?') : buildParams();
    const data = await api.listVehicles(q);
    if (!data.results.length) {
      target.innerHTML = `<div class="empty-state"><div class="empty-title">No vehicles found</div>Try adjusting search or filters.</div>`;
      return;
    }
    const rows = data.results.map((v) => `
      <tr>
        <td class="mono">${esc(v.vehicle_number)}</td>
        <td>${esc(v.vehicle_type)}</td>
        <td>${esc(v.model)}</td>
        <td>${statusBeacon(v.status)}</td>
        <td>${esc(v.condition)}</td>
        <td class="muted">${fmtDate(v.updated_at)}</td>
        <td>
          <div class="row-actions admin-only ${auth.isAdmin() ? '' : 'hidden'}">
            <button class="btn btn-ghost btn-sm" data-edit="${v.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${v.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
    target.innerHTML = `
      <table>
        <thead><tr><th>Number</th><th>Type</th><th>Model</th><th>Status</th><th>Condition</th><th>Updated</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    target.appendChild(paginationBar(data, (url) => load(url)));

    $$('[data-edit]', target).forEach((b) => b.addEventListener('click', () => {
      const v = data.results.find((x) => x.id === Number(b.dataset.edit));
      openVehicleForm(v, reload);
    }));
    $$('[data-del]', target).forEach((b) => b.addEventListener('click', () => {
      const v = data.results.find((x) => x.id === Number(b.dataset.del));
      confirmAction(`Delete vehicle ${v.vehicle_number}? This cannot be undone.`, async () => {
        try { await api.deleteVehicle(v.id); toast('Vehicle deleted', 'success'); reload(); }
        catch (e) { toast(e.message, 'error'); }
      });
    }));
  }

  await load();
}

function openVehicleForm(vehicle, onDone) {
  const isEdit = !!vehicle;
  const { close } = openModal(`
    <h3>${isEdit ? 'Edit vehicle' : 'New vehicle'}</h3>
    <p class="modal-sub">${isEdit ? esc(vehicle.vehicle_number) : 'Add a vehicle to the fleet.'}</p>
    <form id="vehicle-form">
      <div class="modal-grid">
        <div class="field full">
          <label>Vehicle number</label>
          <input name="vehicle_number" required value="${isEdit ? esc(vehicle.vehicle_number) : ''}" />
        </div>
        <div class="field">
          <label>Type</label>
          <input name="vehicle_type" required value="${isEdit ? esc(vehicle.vehicle_type) : ''}" placeholder="Car, SUV, Truck…" />
        </div>
        <div class="field">
          <label>Model</label>
          <input name="model" required value="${isEdit ? esc(vehicle.model) : ''}" />
        </div>
        <div class="field">
          <label>Status</label>
          <select name="status">
            ${['available', 'assigned', 'maintenance'].map((s) => `<option value="${s}" ${isEdit && vehicle.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Condition</label>
          <select name="condition">
            ${['good', 'fair', 'poor'].map((c) => `<option value="${c}" ${isEdit && vehicle.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-error hidden" id="vehicle-form-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create vehicle'}</button>
      </div>
    </form>
  `, {
    onMount: (backdrop, closeFn) => {
      $('[data-cancel]', backdrop).addEventListener('click', closeFn);
      $('#vehicle-form', backdrop).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        const errBox = $('#vehicle-form-error', backdrop);
        try {
          if (isEdit) await api.updateVehicle(vehicle.id, payload);
          else await api.createVehicle(payload);
          toast(isEdit ? 'Vehicle updated' : 'Vehicle created', 'success');
          closeFn();
          onDone();
        } catch (err) {
          errBox.textContent = err.message;
          errBox.classList.remove('hidden');
        }
      });
    },
  });
  return close;
}

// ------------------------------------------------------------------
// Drivers view
// ------------------------------------------------------------------
async function renderDrivers(main) {
  const state = { search: '', is_available: '', ordering: '-created_at' };

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Drivers</h1>
        <p class="page-sub">License details and availability for every driver profile.</p>
      </div>
      <button class="btn btn-primary admin-only" id="new-driver-btn">+ New driver</button>
    </div>
    <div class="toolbar">
      <input type="search" id="d-search" placeholder="Search username, phone, license…" />
      <select id="d-avail">
        <option value="">All drivers</option>
        <option value="true">Available</option>
        <option value="false">Unavailable</option>
      </select>
      <select id="d-ordering">
        <option value="-created_at">Newest first</option>
        <option value="created_at">Oldest first</option>
      </select>
      <div class="spacer"></div>
    </div>
    <div class="table-wrap"><div id="d-table"></div></div>
  `;
  $('.admin-only', main)?.classList.toggle('hidden', !auth.isAdmin());

  const search = $('#d-search'), availSel = $('#d-avail'), orderSel = $('#d-ordering');
  let debounce;
  const reload = () => load();
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.search = search.value.trim(); reload(); }, 350);
  });
  availSel.addEventListener('change', () => { state.is_available = availSel.value; reload(); });
  orderSel.addEventListener('change', () => { state.ordering = orderSel.value; reload(); });

  $('#new-driver-btn')?.addEventListener('click', () => openDriverForm(null, reload));

  function buildParams() {
    const p = new URLSearchParams();
    if (state.search) p.set('search', state.search);
    if (state.is_available) p.set('is_available', state.is_available);
    if (state.ordering) p.set('ordering', state.ordering);
    return `?${p.toString()}`;
  }

  async function load(pageUrl) {
    const target = $('#d-table');
    target.innerHTML = '<div class="empty-state">Loading…</div>';
    const q = pageUrl ? pageUrl.replace(/^.*\?/, '?') : buildParams();
    const data = await api.listDrivers(q);
    if (!data.results.length) {
      target.innerHTML = `<div class="empty-state"><div class="empty-title">No drivers found</div>Try adjusting search or filters.</div>`;
      return;
    }
    const today = new Date();
    const rows = data.results.map((d) => {
      const expiry = new Date(d.license_expiry);
      const daysLeft = Math.ceil((expiry - today) / 86400000);
      const expiryNote = daysLeft < 0 ? `<span style="color:var(--red)">expired</span>` : daysLeft <= 30 ? `<span style="color:var(--amber)">${daysLeft}d left</span>` : '';
      return `
      <tr>
        <td class="mono">#${d.user}</td>
        <td>${esc(d.username)}</td>
        <td class="mono">${esc(d.phone)}</td>
        <td class="mono">${esc(d.license_number)}</td>
        <td>${fmtDateOnly(d.license_expiry)} ${expiryNote}</td>
        <td>${availBeacon(d.is_available)}</td>
        <td>
          <div class="row-actions admin-only ${auth.isAdmin() ? '' : 'hidden'}">
            <button class="btn btn-ghost btn-sm" data-edit="${d.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${d.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    target.innerHTML = `
      <table>
        <thead><tr><th>User ID</th><th>Username</th><th>Phone</th><th>License #</th><th>Expiry</th><th>Available</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    target.appendChild(paginationBar(data, (url) => load(url)));

    $$('[data-edit]', target).forEach((b) => b.addEventListener('click', () => {
      const d = data.results.find((x) => x.id === Number(b.dataset.edit));
      openDriverForm(d, reload);
    }));
    $$('[data-del]', target).forEach((b) => b.addEventListener('click', () => {
      const d = data.results.find((x) => x.id === Number(b.dataset.del));
      confirmAction(`Delete driver profile for ${d.username}?`, async () => {
        try { await api.deleteDriver(d.id); toast('Driver deleted', 'success'); reload(); }
        catch (e) { toast(e.message, 'error'); }
      });
    }));
  }

  await load();
}

function openDriverForm(driver, onDone) {
  const isEdit = !!driver;
  const { close } = openModal(`
    <h3>${isEdit ? 'Edit driver' : 'New driver'}</h3>
    <p class="modal-sub">${isEdit ? esc(driver.username) : 'Link a driver profile to an existing Django user account.'}</p>
    <form id="driver-form">
      <div class="modal-grid">
        <div class="field full">
          <label>User ID ${isEdit ? '' : '<span class="muted">— created via Django admin first</span>'}</label>
          <input name="user" type="number" required value="${isEdit ? esc(driver.user) : ''}" />
        </div>
        <div class="field full">
          <label>Phone</label>
          <input name="phone" required value="${isEdit ? esc(driver.phone) : ''}" />
        </div>
        <div class="field full">
          <label>License number</label>
          <input name="license_number" required value="${isEdit ? esc(driver.license_number) : ''}" />
        </div>
        <div class="field full">
          <label>License expiry</label>
          <input name="license_expiry" type="date" required value="${isEdit ? esc(driver.license_expiry) : ''}" />
        </div>
        <div class="field full checkbox-row">
          <input type="checkbox" id="driver-avail" name="is_available" ${!isEdit || driver.is_available ? 'checked' : ''} />
          <label for="driver-avail" style="margin:0;">Available for assignment</label>
        </div>
      </div>
      <div class="field-error hidden" id="driver-form-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create driver'}</button>
      </div>
    </form>
  `, {
    onMount: (backdrop, closeFn) => {
      $('[data-cancel]', backdrop).addEventListener('click', closeFn);
      $('#driver-form', backdrop).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
          user: Number(fd.get('user')),
          phone: fd.get('phone'),
          license_number: fd.get('license_number'),
          license_expiry: fd.get('license_expiry'),
          is_available: fd.get('is_available') === 'on',
        };
        const errBox = $('#driver-form-error', backdrop);
        try {
          if (isEdit) await api.updateDriver(driver.id, payload);
          else await api.createDriver(payload);
          toast(isEdit ? 'Driver updated' : 'Driver created', 'success');
          closeFn();
          onDone();
        } catch (err) {
          errBox.textContent = err.message;
          errBox.classList.remove('hidden');
        }
      });
    },
  });
  return close;
}

// ------------------------------------------------------------------
// Assignments view
// ------------------------------------------------------------------
async function renderAssignments(main) {
  const state = { search: '', is_active: '', ordering: '-assigned_at' };

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Assignments</h1>
        <p class="page-sub">Which driver is on which vehicle, right now and historically.</p>
      </div>
      <button class="btn btn-primary admin-only" id="new-assign-btn">+ Assign driver</button>
    </div>
    <div class="toolbar">
      <input type="search" id="a-search" placeholder="Search driver, vehicle, license…" />
      <select id="a-active">
        <option value="">All history</option>
        <option value="true">Active only</option>
        <option value="false">Ended only</option>
      </select>
      <select id="a-ordering">
        <option value="-assigned_at">Newest first</option>
        <option value="assigned_at">Oldest first</option>
      </select>
      <div class="spacer"></div>
    </div>
    <div class="table-wrap"><div id="a-table"></div></div>
  `;
  $('.admin-only', main)?.classList.toggle('hidden', !auth.isAdmin());

  const search = $('#a-search'), activeSel = $('#a-active'), orderSel = $('#a-ordering');
  let debounce;
  const reload = () => load();
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.search = search.value.trim(); reload(); }, 350);
  });
  activeSel.addEventListener('change', () => { state.is_active = activeSel.value; reload(); });
  orderSel.addEventListener('change', () => { state.ordering = orderSel.value; reload(); });

  $('#new-assign-btn')?.addEventListener('click', () => openAssignmentForm(reload));

  function buildParams() {
    const p = new URLSearchParams();
    if (state.search) p.set('search', state.search);
    if (state.is_active) p.set('is_active', state.is_active);
    if (state.ordering) p.set('ordering', state.ordering);
    return `?${p.toString()}`;
  }

  async function load(pageUrl) {
    const target = $('#a-table');
    target.innerHTML = '<div class="empty-state">Loading…</div>';
    const q = pageUrl ? pageUrl.replace(/^.*\?/, '?') : buildParams();
    const data = await api.listAssignments(q);
    if (!data.results.length) {
      target.innerHTML = `<div class="empty-state"><div class="empty-title">No assignments found</div>Try adjusting search or filters.</div>`;
      return;
    }
    const rows = data.results.map((a) => `
      <tr>
        <td>${esc(a.driver_name)} <span class="muted mono">#${a.driver}</span></td>
        <td class="mono">${esc(a.vehicle_number)} <span class="muted">#${a.vehicle}</span></td>
        <td class="muted">${fmtDate(a.assigned_at)}</td>
        <td class="muted">${fmtDate(a.unassigned_at)}</td>
        <td>${activeBeacon(a.is_active)}</td>
        <td>
          <div class="row-actions admin-only ${auth.isAdmin() ? '' : 'hidden'}">
            ${a.is_active ? `<button class="btn btn-ghost btn-sm" data-unassign="${a.id}">Unassign</button>` : ''}
            <button class="btn btn-danger btn-sm" data-del="${a.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
    target.innerHTML = `
      <table>
        <thead><tr><th>Driver</th><th>Vehicle</th><th>Assigned</th><th>Unassigned</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    target.appendChild(paginationBar(data, (url) => load(url)));

    $$('[data-unassign]', target).forEach((b) => b.addEventListener('click', () => {
      const a = data.results.find((x) => x.id === Number(b.dataset.unassign));
      confirmAction(`Unassign ${a.driver_name} from ${a.vehicle_number}?`, async () => {
        try { await api.patchAssignment(a.id, { is_active: false }); toast('Unassigned', 'success'); reload(); }
        catch (e) { toast(e.message, 'error'); }
      });
    }));
    $$('[data-del]', target).forEach((b) => b.addEventListener('click', () => {
      const a = data.results.find((x) => x.id === Number(b.dataset.del));
      confirmAction(`Delete this assignment record permanently?`, async () => {
        try { await api.deleteAssignment(a.id); toast('Assignment deleted', 'success'); reload(); }
        catch (e) { toast(e.message, 'error'); }
      });
    }));
  }

  await load();
}

async function openAssignmentForm(onDone) {
  let drivers = [], vehicles = [];
  try {
    const [dRes, vRes] = await Promise.all([
      api.listDrivers('?is_available=true'),
      api.listVehicles('?status=available'),
    ]);
    drivers = dRes.results;
    vehicles = vRes.results;
  } catch (e) {
    toast('Could not load available drivers/vehicles: ' + e.message, 'error');
    return;
  }

  const driverOptions = drivers.length
    ? drivers.map((d) => `<option value="${d.id}">${esc(d.username)} — ${esc(d.license_number)}</option>`).join('')
    : '<option value="">No available drivers</option>';
  const vehicleOptions = vehicles.length
    ? vehicles.map((v) => `<option value="${v.id}">${esc(v.vehicle_number)} — ${esc(v.model)}</option>`).join('')
    : '<option value="">No available vehicles</option>';

  openModal(`
    <h3>Assign driver to vehicle</h3>
    <p class="modal-sub">Only available drivers and vehicles are listed.</p>
    <form id="assign-form">
      <div class="modal-grid">
        <div class="field full">
          <label>Driver</label>
          <select name="driver" required ${drivers.length ? '' : 'disabled'}>${driverOptions}</select>
        </div>
        <div class="field full">
          <label>Vehicle</label>
          <select name="vehicle" required ${vehicles.length ? '' : 'disabled'}>${vehicleOptions}</select>
        </div>
      </div>
      <div class="field-error hidden" id="assign-form-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
        <button type="submit" class="btn btn-primary" ${drivers.length && vehicles.length ? '' : 'disabled'}>Create assignment</button>
      </div>
    </form>
  `, {
    onMount: (backdrop, closeFn) => {
      $('[data-cancel]', backdrop).addEventListener('click', closeFn);
      $('#assign-form', backdrop).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = { driver: Number(fd.get('driver')), vehicle: Number(fd.get('vehicle')) };
        const errBox = $('#assign-form-error', backdrop);
        try {
          await api.createAssignment(payload);
          toast('Driver assigned', 'success');
          closeFn();
          onDone();
        } catch (err) {
          errBox.textContent = err.message;
          errBox.classList.remove('hidden');
        }
      });
    },
  });
}

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------
function initNav() {
  $$('.nav-link').forEach((link) => {
    link.addEventListener('click', () => { location.hash = `#/${link.dataset.route}`; });
  });
}

function init() {
  initLogin();
  initNav();
  $('#api-base-label').textContent = API_BASE;
  if (auth.isLoggedIn()) showApp(); else showLogin();
  navigate();
}

document.addEventListener('DOMContentLoaded', init);
