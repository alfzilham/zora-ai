/**
 * ZORA AI - Notifications Page
 * Loads signups from backend, groups by date, supports filtering
 */

const NOTIF_KEY = 'zora_notifications';
const SEEN_KEY = 'zora_seen_signups';
let allNotifications = [];
let currentFilter = 'all';

// ─── STORAGE HELPERS ─────────────────────────────────
function loadStored() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
}

function saveStored(data) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(data));
}

// ─── DATE HELPERS ─────────────────────────────────────
function isToday(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
}

function isYesterday(dateStr) {
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
}

function isThisWeek(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo && d <= now;
}

function isThisMonth(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function timeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getGroupLabel(dateStr) {
    if (isToday(dateStr)) return 'Today';
    if (isYesterday(dateStr)) return 'Yesterday';
    if (isThisWeek(dateStr)) return 'This Week';
    if (isThisMonth(dateStr)) return 'This Month';
    return 'Earlier';
}

// ─── FILTER ──────────────────────────────────────────
function applyFilter(notifs, filter) {
    switch (filter) {
        case 'today': return notifs.filter(n => isToday(n.time));
        case 'yesterday': return notifs.filter(n => isYesterday(n.time));
        case 'week': return notifs.filter(n => isThisWeek(n.time));
        case 'month': return notifs.filter(n => isThisMonth(n.time));
        case 'unread': return notifs.filter(n => !n.read);
        default: return notifs;
    }
}

// ─── BUILD FROM SIGNUPS ───────────────────────────────
function buildFromSignups(signups) {
    const stored = loadStored();
    const storedIds = stored.map(n => n.id);

    const newNotifs = signups
        .map(s => ({
            id: `signup_${s.email}_${s.created_at}`,
            type: 'signup',
            icon: 'cyan',
            iconClass: 'fi-rr-user-add',
            title: 'New User Signed Up',
            desc: `${s.name || 'Someone'} (${s.email}) joined from ${s.country || 'Unknown'}.`,
            time: s.created_at || new Date().toISOString(),
            read: false,
        }))
        .filter(n => !storedIds.includes(n.id));

    const merged = [...newNotifs, ...stored].slice(0, 100);
    saveStored(merged);
    return merged;
}

// ─── RENDER ──────────────────────────────────────────
function renderGroups(notifs) {
    const container = document.getElementById('notifGroups');
    const countEl = document.getElementById('notifCount');
    const badge = document.getElementById('sidebarBadge');

    const unread = notifs.filter(n => !n.read).length;

    if (countEl) countEl.textContent = `${notifs.length} notification${notifs.length !== 1 ? 's' : ''}`;

    if (badge) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.classList.toggle('hidden', unread === 0);
    }

    if (!notifs.length) {
        container.innerHTML = `
            <div class="notif-empty-state">
                <i class="fi fi-rr-bell-slash"></i>
                <p>No notifications found.</p>
            </div>
        `;
        return;
    }

    // Group by date label
    const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];
    const groups = {};
    groupOrder.forEach(g => groups[g] = []);

    notifs.forEach(n => {
        const label = getGroupLabel(n.time);
        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    });

    container.innerHTML = groupOrder
        .filter(g => groups[g].length > 0)
        .map(g => `
            <div class="notif-group">
                <p class="notif-group-label">${g}</p>
                <div class="notif-group-items">
                    ${groups[g].map(n => renderItem(n)).join('')}
                </div>
            </div>
        `).join('');

    // Bind events
    container.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', e => {
            if (e.target.closest('.notif-item-dismiss')) return;
            markRead(item.dataset.id);
        });
    });

    container.querySelectorAll('.notif-item-dismiss').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            dismissNotif(btn.dataset.dismiss);
        });
    });
}

function renderItem(n) {
    return `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-item-icon ${n.icon}">
                <i class="fi ${n.iconClass}"></i>
            </div>
            <div class="notif-item-body">
                <p class="notif-item-title">${n.title}</p>
                <p class="notif-item-desc">${n.desc}</p>
            </div>
            <div class="notif-item-right">
                <span class="notif-item-time">${timeAgo(n.time)}</span>
                ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
                <button class="notif-item-dismiss" data-dismiss="${n.id}" title="Dismiss">
                    <i class="fi fi-rr-cross-small"></i>
                </button>
            </div>
        </div>
    `;
}

// ─── ACTIONS ─────────────────────────────────────────
function markRead(id) {
    allNotifications = allNotifications.map(n =>
        n.id === id ? { ...n, read: true } : n
    );
    saveStored(allNotifications);
    renderGroups(applyFilter(allNotifications, currentFilter));
}

function dismissNotif(id) {
    allNotifications = allNotifications.filter(n => n.id !== id);
    saveStored(allNotifications);
    renderGroups(applyFilter(allNotifications, currentFilter));
}

function markAllRead() {
    allNotifications = allNotifications.map(n => ({ ...n, read: true }));
    saveStored(allNotifications);
    renderGroups(applyFilter(allNotifications, currentFilter));
}

function clearAll() {
    if (!confirm('Clear all notifications?')) return;
    allNotifications = [];
    saveStored(allNotifications);
    renderGroups([]);
}

// ─── FILTER BINDING ───────────────────────────────────
function bindFilters() {
    document.querySelectorAll('.notif-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.notif-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderGroups(applyFilter(allNotifications, currentFilter));
        });
    });

    document.getElementById('markAllBtn')?.addEventListener('click', markAllRead);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAll);
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('zora_token');
        window.location.href = '/auth/login.html';
    });
}

// ─── BOOTSTRAP ───────────────────────────────────────
async function bootstrapNotifications() {
    const token = localStorage.getItem('zora_token');
    if (!token) { window.location.href = '/auth/login.html'; return; }

    bindFilters();

    try {
        const res = await apiCall('/dashboard/stats', 'GET', null, true);
        const data = res?.data || res || {};
        const signups = data.recent_signups || [];
        allNotifications = buildFromSignups(signups);
    } catch (err) {
        console.warn('Failed to load stats:', err.message);
        allNotifications = loadStored();
    }

    renderGroups(applyFilter(allNotifications, currentFilter));
}

document.addEventListener('DOMContentLoaded', bootstrapNotifications);