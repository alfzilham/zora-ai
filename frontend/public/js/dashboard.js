/**
 * ZORA AI - Dashboard Module
 * ==========================
 * Developer-only dashboard stats, charts, and withdrawal handling.
 */

let usersByMonthChart = null;
let dashboardRefreshHandle = null;

function dashboardElement(id) {
    return document.getElementById(id);
}

function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function setDashboardStatus(message = '') {
    dashboardElement('dashboardStatus').textContent = message;
}

function setWithdrawStatus(message = '') {
    dashboardElement('withdrawStatus').textContent = message;
}

async function ensureDeveloperAccess() {
    const user = await requireAuth();
    if (!user) {
        return null;
    }
    return user;
}

function renderStats(data) {
    dashboardElement('totalUsersValue').textContent = String(data.total_users || 0);
    dashboardElement('totalEarningsValue').textContent = formatRupiah(data.total_earnings || 0);
    dashboardElement('usersThisMonthValue').textContent = String(data.users_this_month || 0);
    dashboardElement('usersThisYearValue').textContent = String(data.users_this_year || 0);
}

function renderUsersByMonthChart(items) {
    const labels = items.map((item) => `${String(item.month).padStart(2, '0')}/${item.year}`);
    const values = items.map((item) => item.count);
    const context = dashboardElement('usersByMonthChart');

    if (usersByMonthChart) {
        usersByMonthChart.destroy();
    }

    usersByMonthChart = new Chart(context, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Users',
                    data: values,
                    backgroundColor: 'rgba(0,212,255,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00D4FF',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderColor: '#00D4FF',
                    borderWidth: 1,
                    
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                }
            },
            scales: {
                x: {
                    ticks: { color: '#A0A0B0' },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    ticks: { color: '#A0A0B0', precision: 0 },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                }
            }
        }
    });
}

function renderCountriesTable(items) {
    const body = dashboardElement('countriesTableBody');
    if (!body) return;

    if (!items.length) {
        body.innerHTML = '<p style="color:rgba(255,255,255,0.2);font-size:0.8rem;padding:8px 0">No country data yet.</p>';
        return;
    }

    const max = Math.max(...items.map(i => i.count), 1);

    const flagMap = {
        'Indonesia': '🇮🇩', 'United States': '🇺🇸', 'Malaysia': '🇲🇾',
        'Singapore': '🇸🇬', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
        'Australia': '🇦🇺', 'Germany': '🇩🇪', 'United Kingdom': '🇬🇧',
        'France': '🇫🇷', 'India': '🇮🇳', 'China': '🇨🇳', 'Unknown': '🌐'
    };

    body.innerHTML = items.slice(0, 6).map(item => {
        const pct = Math.round((item.count / max) * 100);
        const flag = flagMap[item.country] || '🌐';
        return `
            <div class="db-country-item">
                <div class="db-country-row">
                    <span class="db-country-name">
                        <span class="db-country-flag">${flag}</span>
                        ${item.country}
                    </span>
                    <span class="db-country-pct">${pct}%</span>
                </div>
                <div class="db-country-bar-track">
                    <div class="db-country-bar-fill" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderRecentSignups(items) {
    const body = dashboardElement('recentSignupsBody');
    body.innerHTML = '';

    if (!items.length) {
        body.innerHTML = '<tr><td colspan="5" style="color:rgba(255,255,255,0.2);padding:16px 14px">No signups yet.</td></tr>';
        return;
    }

    items.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name || '-'}</td>
            <td style="color:rgba(255,255,255,0.35)">${item.email || '-'}</td>
            <td>${item.country || 'Unknown'}</td>
            <td><span class="db-status-dot">Active</span></td>
            <td style="color:rgba(255,255,255,0.3)">${item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
        `;;
        body.appendChild(row);
    });
}

async function loadDashboardStats() {
    try {
        const response = await apiCall('/dashboard/stats', 'GET', null, true);
        const data = response.data || {};
        renderStats(data);
        renderUsersByMonthChart(data.users_by_month || []);
        renderCountriesTable(data.users_by_country || []);
        renderRecentSignups(data.recent_signups || []);
        setDashboardStatus('');
    } catch (error) {
        setDashboardStatus(error.message || 'Unable to load dashboard stats.');
    }
}

async function handleWithdraw(event) {
    event.preventDefault();
    setWithdrawStatus('');
    const withdrawBtn = document.querySelector('.withdraw-button');
    if (withdrawBtn) { withdrawBtn.disabled = true; withdrawBtn.textContent = 'Processing...'; }

    const payload = {
        amount: Number(dashboardElement('withdrawAmount').value),
        bank_code: dashboardElement('withdrawBankCode').value.trim(),
        account_number: dashboardElement('withdrawAccountNumber').value.trim(),
        account_holder_name: dashboardElement('withdrawAccountHolderName').value.trim(),
    };

    try {
        const response = await apiCall('/dashboard/withdraw', 'POST', payload, true);
        const data = response.data || {};
        setWithdrawStatus(
            `${data.message || response.message || 'Withdrawal submitted.'} ${data.disbursement_id ? `(${data.disbursement_id})` : ''}`.trim()
        );
        dashboardElement('withdrawForm').reset();
        if (withdrawBtn) { withdrawBtn.disabled = false; withdrawBtn.textContent = 'Withdraw Funds'; }
    } catch (error) {
        setWithdrawStatus(error.message || 'Unable to submit withdrawal.');
        if (withdrawBtn) { withdrawBtn.disabled = false; withdrawBtn.textContent = 'Withdraw Funds'; }
    }
}

function startAutoRefresh() {
    if (dashboardRefreshHandle) {
        clearInterval(dashboardRefreshHandle);
    }
    dashboardRefreshHandle = setInterval(loadDashboardStats, 60000);
}

async function bootstrapDashboard() {
    const settingsData = await ensureDeveloperAccess();
    if (!settingsData) {
        return;
    }

    const logoutBtn = dashboardElement('dashboardLogoutButton');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('zora_token');
        window.location.href = '/auth/login.html';
    });
    dashboardElement('withdrawForm').addEventListener('submit', handleWithdraw);

    await loadDashboardStats();
    startAutoRefresh();
}

document.addEventListener('DOMContentLoaded', bootstrapDashboard);
