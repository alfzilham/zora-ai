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

    const settingsResponse = await apiCall('/settings', 'GET', null, true);
    if (!settingsResponse.data?.is_developer) {
        window.location.href = '../chat/index.html';
        return null;
    }

    return settingsResponse.data;
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
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Users',
                    data: values,
                    backgroundColor: 'rgba(0, 212, 255, 0.65)',
                    borderColor: '#00D4FF',
                    borderWidth: 1,
                    borderRadius: 10,
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
    body.innerHTML = '';

    if (!items.length) {
        body.innerHTML = '<tr><td colspan="2">No country data yet.</td></tr>';
        return;
    }

    items.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.country}</td>
            <td>${item.count}</td>
        `;
        body.appendChild(row);
    });
}

function renderRecentSignups(items) {
    const body = dashboardElement('recentSignupsBody');
    body.innerHTML = '';

    if (!items.length) {
        body.innerHTML = '<tr><td colspan="4">No signups yet.</td></tr>';
        return;
    }

    items.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name || '-'}</td>
            <td>${item.email || '-'}</td>
            <td>${item.country || 'Unknown'}</td>
            <td>${item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
        `;
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
    } catch (error) {
        setWithdrawStatus(error.message || 'Unable to submit withdrawal.');
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

    dashboardElement('dashboardLogoutButton').addEventListener('click', logout);
    dashboardElement('withdrawForm').addEventListener('submit', handleWithdraw);

    await loadDashboardStats();
    startAutoRefresh();
}

document.addEventListener('DOMContentLoaded', bootstrapDashboard);
