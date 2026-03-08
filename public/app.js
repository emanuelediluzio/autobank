const API = '/api';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function loadBanks(country) {
  const list = await fetchJson(`${API}/institutions?country=${country}`);
  const select = document.getElementById('bank');
  select.innerHTML = '<option value="SANDBOXFINANCE_SFIN0000">Sandbox Finance (test)</option>';
  for (const b of list) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    select.appendChild(opt);
  }
}

function showError(msg) {
  const el = document.querySelector('.error');
  if (el) el.remove();
  const err = document.createElement('div');
  err.className = 'error';
  err.textContent = msg;
  document.querySelector('.card').prepend(err);
  setTimeout(() => err.remove(), 5000);
}

function formatAmount(amount, currency = 'EUR') {
  const n = parseFloat(amount) || 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(n);
}

function formatDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderDashboard(data) {
  const container = document.getElementById('dashboard-content');
  let totalSpent = 0;
  let totalIn = 0;

  const allByCategory = [];
  const allTransactions = [];

  for (const acc of data.accounts) {
    const booked = acc.transactions?.booked || [];
    for (const tx of booked) {
      const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
      if (amount < 0) totalSpent += Math.abs(amount);
      else totalIn += amount;
      allTransactions.push({ ...tx, accountId: acc.accountId });
    }
    for (const g of acc.byCategory || []) {
      const existing = allByCategory.find((c) => c.category.id === g.category.id);
      if (existing) {
        existing.total += g.total;
        existing.count += g.count;
      } else {
        allByCategory.push({ ...g });
      }
    }
  }

  allByCategory.sort((a, b) => b.total - a.total);
  allTransactions.sort((a, b) => b.bookingDate?.localeCompare(a.bookingDate) || 0);

  const currency = data.accounts[0]?.balances?.balances?.[0]?.balanceAmount?.currency || 'EUR';

  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Spese totali</div>
        <div class="value negative">${formatAmount(totalSpent, currency)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Entrate</div>
        <div class="value positive">${formatAmount(totalIn, currency)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Transazioni</div>
        <div class="value">${allTransactions.length}</div>
      </div>
    </div>

    <h3>Per categoria</h3>
    <div class="category-list">
      ${allByCategory.map((g) => `
        <div class="category-item">
          <span class="icon">${g.category.icon}</span>
          <div class="info">
            <div class="name">${g.category.label}</div>
            <div class="count">${g.count} transazioni</div>
          </div>
          <span class="amount">${formatAmount(g.total, currency)}</span>
        </div>
      `).join('')}
    </div>

    <h3 style="margin-top: 1.5rem;">Ultime transazioni</h3>
    <div class="transaction-list">
      ${allTransactions.slice(0, 20).map((tx) => {
        const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
        const desc = tx.remittanceInformationUnstructured || tx.debtorName || tx.creditorName || 'Transazione';
        const cat = tx.category?.label || 'Altro';
        return `
          <div class="transaction-item">
            <div class="desc">
              <div>${desc}</div>
              <div class="cat">${cat} · ${formatDate(tx.bookingDate)}</div>
            </div>
            <span class="amount ${amount < 0 ? 'out' : 'in'}">${formatAmount(amount, tx.transactionAmount?.currency || currency)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

document.getElementById('country').addEventListener('change', (e) => {
  loadBanks(e.target.value);
});

document.getElementById('btn-connect').addEventListener('click', async () => {
  const btn = document.getElementById('btn-connect');
  const btnText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Creazione link...';

  try {
    const institutionId = document.getElementById('bank').value;
    const res = await fetchJson(`${API}/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId }),
    });

    if (res.link) {
      localStorage.setItem('autobank_requisition', res.id);
      window.location.href = res.link;
    } else {
      showError('Link non ricevuto. Controlla la configurazione.');
    }
  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = btnText;
  }
});

// Inizializzazione
(async () => {
  const params = new URLSearchParams(window.location.search);
  const requisitionId = params.get('requisition');
  const ref = params.get('ref');

  if (requisitionId || ref) {
    const id = requisitionId || ref;
    document.getElementById('connect-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');

    const content = document.getElementById('dashboard-content');
    content.innerHTML = '<div class="loading">Caricamento...</div>';

    try {
      const data = await fetchJson(`${API}/dashboard/${id}`);
      renderDashboard(data);
    } catch (e) {
      content.innerHTML = `<div class="error">${e.message}</div>`;
    }
  } else {
    await loadBanks('IT');
  }
})();
