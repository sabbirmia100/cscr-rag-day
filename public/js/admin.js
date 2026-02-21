/**
 * js/admin.js
 * Admin dashboard — load registrations, filter, view details, approve, reject
 */

const API_BASE = '/api';
const token = localStorage.getItem('ragday_token');

// ─── Auth Guard ────────────────────────────────────────────────────────────────
if (!token) {
    window.location.href = '/admin';
}

// Display admin username
const username = localStorage.getItem('ragday_username') || 'Admin';
document.getElementById('adminUsername').textContent = username;

// ─── State ─────────────────────────────────────────────────────────────────────
let currentFilter = 'all';
let allRegistrations = [];
let filteredRegistrations = [];
let currentRegId = null;
let confirmCallback = null;

// ─── DOM Refs ──────────────────────────────────────────────────────────────────
const regTableBody = document.getElementById('regTableBody');
const emptyState = document.getElementById('emptyState');
const dashAlert = document.getElementById('dashAlert');
const searchInput = document.getElementById('searchInput');
const tableTitle = document.getElementById('tableTitle');

// Modals
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');
const confirmOverlay = document.getElementById('confirmOverlay');

// ─── Auth Header ───────────────────────────────────────────────────────────────
const authHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
function showDashAlert(type, msg, duration = 4000) {
    dashAlert.className = `alert ${type}`;
    dashAlert.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
    dashAlert.classList.remove('hidden');
    if (duration) setTimeout(() => dashAlert.classList.add('hidden'), duration);
}

function formatDate(dateStr) {
    return dateStr ? new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }) : '—';
}

function statusBadge(status) {
    const icons = { pending: '⏳', approved: '✅', rejected: '❌' };
    return `<span class="status-badge ${status}">${icons[status] || ''} ${status}</span>`;
}

// ─── Load Stats ─────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() });
        if (res.status === 401) return handleUnauthorized();
        const { data } = await res.json();
        document.getElementById('statTotal').textContent = data.total;
        document.getElementById('statPending').textContent = data.pending;
        document.getElementById('statApproved').textContent = data.approved;
        document.getElementById('statRejected').textContent = data.rejected;
        document.getElementById('pendingCount').textContent = data.pending;
        document.getElementById('approvedCount').textContent = data.approved;
        document.getElementById('rejectedCount').textContent = data.rejected;
    } catch (_) { }
}

// ─── Load Registrations ────────────────────────────────────────────────────────
async function loadRegistrations() {
    const url = currentFilter === 'all'
        ? `${API_BASE}/admin/registrations`
        : `${API_BASE}/admin/registrations?status=${currentFilter}`;

    try {
        const res = await fetch(url, { headers: authHeaders() });
        if (res.status === 401) return handleUnauthorized();
        const result = await res.json();
        allRegistrations = result.data || [];
        filteredRegistrations = [...allRegistrations];
        applySearch();
        renderTable();
        loadStats();
    } catch (err) {
        regTableBody.innerHTML = `<tr><td colspan="10" class="table-loading">⚠️ Failed to load registrations.</td></tr>`;
    }
}

// ─── Search Filter ─────────────────────────────────────────────────────────────
function applySearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
        filteredRegistrations = [...allRegistrations];
        return;
    }
    filteredRegistrations = allRegistrations.filter((r) =>
        [r.name, r.roll, r.email, r.department, r.section, r.tshirt_size, r.transaction_id]
            .some((field) => field && field.toLowerCase().includes(q))
    );
}

searchInput.addEventListener('input', () => {
    applySearch();
    renderTable();
});

// ─── Render Table ──────────────────────────────────────────────────────────────
function renderTable() {
    const tableContainer = document.querySelector('.table-container');

    if (!filteredRegistrations.length) {
        regTableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tableContainer.classList.remove('hidden');

    regTableBody.innerHTML = filteredRegistrations.map((r, i) => `
    <tr data-id="${r._id}" onclick="openDetailModal('${r._id}')">
      <td>${i + 1}</td>
      <td title="${r.name}">${r.name}</td>
      <td>${r.roll}</td>
      <td title="${r.department}">${r.department}</td>
      <td title="${r.email}">${r.email}</td>
      <td>${r.payment_method}</td>
      <td title="${r.transaction_id}">${r.transaction_id}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${formatDate(r.created_at)}</td>
      <td onclick="event.stopPropagation()">
        <div class="btn-actions">
          <button class="btn-view" onclick="openDetailModal('${r._id}')">View</button>
          ${r.status !== 'approved' ? `<button class="btn-approve" onclick="confirmAction('approve', '${r._id}', '${r.name}')">Approve</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="btn-reject" onclick="confirmAction('reject', '${r._id}', '${r.name}')">Reject</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
async function openDetailModal(id) {
    currentRegId = id;
    const reg = allRegistrations.find((r) => r._id === id);
    if (!reg) return;

    modalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Full Name</label><span>${reg.name}</span></div>
      <div class="detail-item"><label>Roll Number</label><span>${reg.roll}</span></div>
      <div class="detail-item"><label>Section</label><span>${reg.section}</span></div>
      <div class="detail-item"><label>Department</label><span>${reg.department}</span></div>
      <div class="detail-item"><label>T-shirt Size</label><span>${reg.tshirt_size || '—'}</span></div>
      <div class="detail-item"><label>Email</label><span>${reg.email}</span></div>
      <div class="detail-item"><label>Phone</label><span>${reg.phone || '—'}</span></div>
      <div class="detail-item"><label>Payment Method</label><span>${reg.payment_method}</span></div>
      <div class="detail-item"><label>Transaction ID</label><span>${reg.transaction_id}</span></div>
      <div class="detail-item"><label>Payment Time</label><span>${formatDate(reg.payment_time)}</span></div>
      <div class="detail-item"><label>Status</label><span>${statusBadge(reg.status)}</span></div>
      <div class="detail-item"><label>Registered At</label><span>${formatDate(reg.created_at)}</span></div>
    </div>
    ${reg.screenshot ? `
      <div class="screenshot-preview">
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Payment Screenshot</p>
        <a href="/uploads/${reg.screenshot}" target="_blank">
          <img src="/uploads/${reg.screenshot}" alt="Payment screenshot" onerror="this.style.display='none'" />
        </a>
      </div>` : ''}
  `;

    const actions = [];
    if (reg.status !== 'approved') {
        actions.push(`<button class="btn-approve" style="padding:10px 22px;border-radius:50px;font-size:13px;" onclick="confirmAction('approve','${reg._id}','${reg.name}');closeModal()">✅ Approve</button>`);
    }
    if (reg.status !== 'rejected') {
        actions.push(`<button class="btn-reject" style="padding:10px 22px;border-radius:50px;font-size:13px;" onclick="confirmAction('reject','${reg._id}','${reg.name}');closeModal()">❌ Reject</button>`);
    }
    modalFooter.innerHTML = actions.join('');

    modalOverlay.classList.remove('hidden');
}

function closeModal() {
    modalOverlay.classList.add('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// ─── Confirm Action ────────────────────────────────────────────────────────────
function confirmAction(action, id, name) {
    const isApprove = action === 'approve';
    document.getElementById('confirmTitle').textContent = isApprove ? 'Confirm Approval' : 'Confirm Rejection';
    document.getElementById('confirmMessage').textContent =
        isApprove
            ? `Approve registration for "${name}"? A confirmation email will be sent automatically.`
            : `Reject registration for "${name}"? The student will be notified by email.`;

    document.getElementById('confirmOk').style.background = isApprove
        ? 'linear-gradient(135deg,#2ecc71,#48C9B0)'
        : 'linear-gradient(135deg,#FF6B6B,#fc5c7d)';

    confirmCallback = () => performAction(action, id);
    confirmOverlay.classList.remove('hidden');
}

document.getElementById('confirmOk').addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
});

document.getElementById('confirmCancel').addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    confirmCallback = null;
});

// ─── Perform Approve / Reject ──────────────────────────────────────────────────
async function performAction(action, id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) row.style.opacity = '0.5';

    try {
        const res = await fetch(`${API_BASE}/admin/registrations/${id}/${action}`, {
            method: 'PATCH',
            headers: authHeaders(),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showDashAlert('success', data.message);
            loadRegistrations();
        } else {
            showDashAlert('error', data.message || 'Action failed.');
            if (row) row.style.opacity = '1';
        }
    } catch (err) {
        showDashAlert('error', 'Network error. Please try again.');
        if (row) row.style.opacity = '1';
    }
}

// ─── Nav Filters ───────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        currentFilter = item.dataset.filter || 'all';
        const labels = { all: 'All Registrations', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
        tableTitle.textContent = labels[currentFilter] || 'Registrations';
        searchInput.value = '';
        loadRegistrations();
    });
});

// ─── Refresh ───────────────────────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', loadRegistrations);

// ─── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('ragday_token');
    localStorage.removeItem('ragday_username');
    window.location.href = '/admin';
});

// ─── Handle Unauthorized ───────────────────────────────────────────────────────
function handleUnauthorized() {
    localStorage.removeItem('ragday_token');
    window.location.href = '/admin';
}

// ─── Init ──────────────────────────────────────────────────────────────────────
loadRegistrations();
