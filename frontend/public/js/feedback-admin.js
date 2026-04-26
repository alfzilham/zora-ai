/**
 * ZORA AI — Feedback Admin JS
 * Developer view: list all users, read feedback, send replies
 */

const fa = {
    users: [],
    activeUserId: null,
    activeUserData: null,
    isSending: false,
    currentFilter: 'all',
};

const catLabels = {
    suggestion: 'Suggestion',
    bug:        'Bug Report',
    praise:     'Praise',
    question:   'Question',
};

const catColors = {
    suggestion: 'cat-suggestion',
    bug:        'cat-bug',
    praise:     'cat-praise',
    question:   'cat-question',
};

// ── UTILS ─────────────────────────────────────────────
const qs  = id => document.getElementById(id);
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function esc(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(iso) {
    if (!iso) return now();
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function toast(msg, type = 'success') {
    const el = qs('faToast');
    if (!el) return;
    el.textContent = msg;
    el.className = `fa-toast ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'fa-toast hidden'; }, 3000);
}

function scrollBottom() {
    requestAnimationFrame(() => {
        const m = qs('faMessages');
        if (m) m.scrollTop = m.scrollHeight;
    });
}

async function apiSafe(endpoint, method = 'GET', body = null) {
    try {
        if (typeof apiCall === 'function') return await apiCall(endpoint, method, body, true);
        const token = localStorage.getItem('zora_token');
        const opts  = {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`/api${endpoint}`, opts);
        return await res.json();
    } catch (e) { console.warn('API:', endpoint, e); return null; }
}

// ── SCREENSHOT LIGHTBOX ───────────────────────────────
function buildImgLightbox() {
    if (qs('faImgLightbox')) return;
    const el = document.createElement('div');
    el.id = 'faImgLightbox';
    el.className = 'fa-img-lightbox hidden';
    el.innerHTML = `
        <button class="fa-img-lb-close" id="faImgLbClose">
            <i class="fi fi-rr-cross"></i>
        </button>
        <img id="faImgLbImg" src="" alt="Screenshot">
    `;
    document.body.appendChild(el);
    qs('faImgLbClose')?.addEventListener('click', closeImgLightbox);
    el.addEventListener('click', e => { if (e.target === el) closeImgLightbox(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeImgLightbox(); });
}

function openImgLightbox(src) {
    const lb  = qs('faImgLightbox');
    const img = qs('faImgLbImg');
    if (!lb || !img) return;
    img.src = src;
    lb.classList.remove('hidden');
}

function closeImgLightbox() {
    qs('faImgLightbox')?.classList.add('hidden');
}

// ── BUILD USER LIST ───────────────────────────────────
function buildUserItem(userData) {
    const el = document.createElement('div');
    el.className = `fa-user-item${userData.unread ? ' unread' : ''}`;
    el.dataset.uid = userData.user_id;

    const initial  = userData.name?.[0]?.toUpperCase() || 'U';
    const lastFb   = userData.feedbacks?.[userData.feedbacks.length - 1];
    const preview  = lastFb?.message?.slice(0, 44) + (lastFb?.message?.length > 44 ? '…' : '') || '—';
    const timeStr  = lastFb?.created_at ? formatTime(lastFb.created_at) : '';
    const cat      = lastFb?.category || '';
    const catClass = catColors[cat] || '';

    el.innerHTML = `
        <div class="fa-item-avatar">
            ${userData.avatar_url
                ? `<img src="${esc(userData.avatar_url)}" alt="${esc(userData.name)}">`
                : initial}
        </div>
        <div class="fa-item-body">
            <div class="fa-item-top">
                <span class="fa-item-name">${esc(userData.name || 'User')}</span>
                <span class="fa-item-time">${timeStr}</span>
            </div>
            <p class="fa-item-preview">${esc(preview)}</p>
            ${cat ? `
            <div class="fa-item-badges">
                <span class="fa-item-cat ${catClass}">${esc(catLabels[cat] || cat)}</span>
            </div>` : ''}
        </div>
        ${userData.unread ? '<div class="fa-item-unread-dot"></div>' : ''}
    `;

    el.addEventListener('click', () => openUserChat(userData));
    return el;
}

function renderUserList(users) {
    const container = qs('faUserList');
    const empty     = qs('faListEmpty');
    if (!container) return;

    container.querySelectorAll('.fa-user-item').forEach(el => el.remove());

    const filtered = fa.currentFilter === 'all'
        ? users
        : users.filter(u => u.feedbacks?.some(f => f.category === fa.currentFilter));

    if (!filtered.length) {
        empty?.classList.remove('hidden');
        return;
    }

    empty?.classList.add('hidden');
    filtered.forEach(u => container.appendChild(buildUserItem(u)));

    // Update counts
    const totalFb = filtered.reduce((acc, u) => acc + (u.feedbacks?.length || 0), 0);
    const unread  = filtered.filter(u => u.unread).length;
    const siBadge = qs('sidebarUnreadBadge');
    const totalEl = qs('totalFeedbackCount');
    const unreadEl = qs('unreadFeedbackCount');

    if (totalEl) totalEl.textContent = totalFb;
    if (unreadEl) unreadEl.textContent = unread;
    if (siBadge) {
        siBadge.textContent = unread;
        siBadge.classList.toggle('hidden', unread === 0);
    }
}

// ── OPEN USER CHAT ────────────────────────────────────
function openUserChat(userData) {
    fa.activeUserId   = userData.user_id;
    fa.activeUserData = userData;

    // Active state in list
    document.querySelectorAll('.fa-user-item').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === String(userData.user_id));
        if (el.dataset.uid === String(userData.user_id)) {
            el.classList.remove('unread');
            el.querySelector('.fa-item-unread-dot')?.remove();
        }
    });

    // Show chat wrap
    qs('faEmptyState')?.classList.add('hidden');
    const chatWrap = qs('faChatWrap');
    chatWrap?.classList.remove('hidden');

    // Set header
    const initial = userData.name?.[0]?.toUpperCase() || 'U';
    const av = qs('faChatAvatar');
    if (av) av.innerHTML = userData.avatar_url
        ? `<img src="${esc(userData.avatar_url)}" alt="avatar">`
        : initial;

    const nameEl  = qs('faChatName');  if (nameEl)  nameEl.textContent  = userData.name  || 'User';
    const emailEl = qs('faChatEmail'); if (emailEl) emailEl.textContent = userData.email || '—';
    const countEl = qs('faChatCount'); if (countEl) countEl.textContent = `${userData.feedbacks?.length || 0} feedback`;

    // Render messages
    renderChatMessages(userData);

    // Mark as read
    userData.unread = false;
    renderUserList(fa.users);

    // Focus composer
    setTimeout(() => qs('faReplyInput')?.focus(), 100);
}

function renderChatMessages(userData) {
    const list = qs('faMessageList');
    if (!list) return;
    list.innerHTML = '';

    (userData.feedbacks || []).forEach(fb => {
        list.appendChild(buildFeedbackCard(fb, userData));
        if (fb.reply) list.appendChild(buildReplyBubble(fb.reply, fb.reply_at));
    });

    scrollBottom();
}

function buildFeedbackCard(fb, userData) {
    const initial  = userData.name?.[0]?.toUpperCase() || 'U';
    const stars    = fb.rating > 0 ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : '';
    const catClass = catColors[fb.category] || '';
    const shotHtml = fb.screenshot_url
        ? `<div class="fa-card-screenshot" data-src="${esc(fb.screenshot_url)}">
               <img src="${esc(fb.screenshot_url)}" alt="Screenshot">
           </div>`
        : '';

    const div = document.createElement('div');
    div.className = 'fa-feedback-card';
    div.innerHTML = `
        <div class="fa-card-top">
            <div class="fa-card-avatar">
                ${userData.avatar_url ? `<img src="${esc(userData.avatar_url)}" alt="">` : initial}
            </div>
            <span class="fa-card-sender">${esc(userData.name || 'User')}</span>
            ${fb.category ? `<span class="fa-card-cat ${catClass}">${esc(catLabels[fb.category] || fb.category)}</span>` : ''}
            ${stars ? `<span class="fa-card-stars">${stars}</span>` : ''}
            <span class="fa-card-time">${formatDate(fb.created_at)}</span>
        </div>
        <p class="fa-card-msg">${esc(fb.message)}</p>
        ${shotHtml}
    `;

    // Screenshot click → lightbox
    div.querySelectorAll('.fa-card-screenshot').forEach(el => {
        el.addEventListener('click', () => openImgLightbox(el.dataset.src));
    });

    return div;
}

function buildReplyBubble(text, time) {
    const div = document.createElement('div');
    div.className = 'fa-reply-bubble';
    div.innerHTML = `
        <div class="fa-reply-bubble-body">
            <div class="fa-reply-meta">
                <span class="fa-reply-sender">ZORA Team</span>
                <span class="fa-reply-badge">Developer</span>
                <span class="fa-reply-time">${time ? formatDate(time) : now()}</span>
            </div>
            <div class="fa-reply-content">${esc(text)}</div>
        </div>
        <div class="fa-reply-avatar">
            <img src="/assets/images/logo/logo.png" alt="Dev" onerror="this.style.display='none';this.parentNode.innerHTML='Z'">
        </div>
    `;
    return div;
}

// ── SEND REPLY ────────────────────────────────────────
async function sendReply() {
    if (fa.isSending || !fa.activeUserId) return;

    const input = qs('faReplyInput');
    const text  = input?.value?.trim();
    if (!text) { toast('Please write a reply', 'error'); return; }

    fa.isSending = true;
    const btn = qs('faSendBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fi fi-rr-spinner"></i> Sending…'; }

    // Optimistic UI
    const list = qs('faMessageList');
    if (list) {
        list.appendChild(buildReplyBubble(text));
        scrollBottom();
    }

    input.value = '';
    autoResizeReply();

    try {
        await apiSafe(`/feedback/reply/${fa.activeUserId}`, 'POST', { reply: text });
        toast('Reply sent ✓', 'success');

        // Update local data
        if (fa.activeUserData?.feedbacks?.length) {
            const last = fa.activeUserData.feedbacks[fa.activeUserData.feedbacks.length - 1];
            last.reply = text;
            last.reply_at = new Date().toISOString();
        }
    } catch (e) {
        toast('Failed to send reply', 'error');
        console.error('Reply error:', e);
    } finally {
        fa.isSending = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fi fi-rs-paper-plane"></i> Send Reply'; }
    }
}

// ── LOAD ALL FEEDBACKS ────────────────────────────────
async function loadAllFeedbacks() {
    const data = await apiSafe('/feedback/all', 'GET');

    if (!data?.data?.length) {
        qs('faListEmpty')?.classList.remove('hidden');
        return;
    }

    // Group by user
    const userMap = {};
    data.data.forEach(item => {
        const uid = item.user_id || item.id;
        if (!userMap[uid]) {
            userMap[uid] = {
                user_id:    uid,
                name:       item.user_name  || item.name  || 'User',
                email:      item.user_email || item.email || '—',
                avatar_url: item.avatar_url || null,
                feedbacks:  [],
                unread:     false,
            };
        }
        userMap[uid].feedbacks.push(item);
        if (!item.read_by_admin) userMap[uid].unread = true;
    });

    fa.users = Object.values(userMap);
    renderUserList(fa.users);
}

// ── AUTO RESIZE TEXTAREA ──────────────────────────────
function autoResizeReply() {
    const el = qs('faReplyInput');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

// ── FILTER BUTTONS ────────────────────────────────────
function bindFilters() {
    document.querySelectorAll('.fa-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fa-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fa.currentFilter = btn.dataset.filter;
            renderUserList(fa.users);
        });
    });
}

// ── SEARCH ────────────────────────────────────────────
function bindSearch() {
    qs('faSearch')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.fa-user-item').forEach(el => {
            const name    = el.querySelector('.fa-item-name')?.textContent?.toLowerCase()    || '';
            const preview = el.querySelector('.fa-item-preview')?.textContent?.toLowerCase() || '';
            el.style.display = (name.includes(q) || preview.includes(q)) ? '' : 'none';
        });
    });
}

// ── BOOTSTRAP ─────────────────────────────────────────
async function bootstrap() {
    buildImgLightbox();

    const token = localStorage.getItem('zora_token');
    if (!token) { window.location.href = '/auth/login.html'; return; }

    // Logout
    qs('adminLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('zora_token');
        window.location.href = '/auth/login.html';
    });

    // Send reply
    qs('faSendBtn')?.addEventListener('click', sendReply);

    qs('faReplyInput')?.addEventListener('input', autoResizeReply);
    qs('faReplyInput')?.addEventListener('keydown', async e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await sendReply(); }
    });

    // Mark all read
    qs('faMarkReadBtn')?.addEventListener('click', () => {
        if (!fa.activeUserData) return;
        fa.activeUserData.unread = false;
        renderUserList(fa.users);
        toast('Marked as read ✓', 'success');
    });

    bindFilters();
    bindSearch();

    await loadAllFeedbacks();
}

document.addEventListener('DOMContentLoaded', bootstrap);
