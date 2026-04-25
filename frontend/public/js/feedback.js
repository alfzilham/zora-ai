/**
 * ZORA AI — Feedback Page JS
 * 2-column layout · Light cyan theme
 */

const fb = {
    user: null,
    category: 'suggestion',
    rating: 0,
    screenshotBase64: null,
    isSubmitting: false,
    feedbacks: [],
    activeId: 'welcome',
};

const starLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const catLabels = { suggestion: 'Suggestion', bug: 'Bug Report', praise: 'Praise', question: 'Question' };
const autoReplies = {
    suggestion: "Thanks for the suggestion! Our team will review it for future updates. 💡",
    bug: "Thanks for the report! Our team will investigate and fix it ASAP. 🔧",
    praise: "Thank you so much — that means a lot to us! 🚀",
    question: "Thanks for reaching out! We'll get back to you with an answer shortly. 💬",
};

// ── UTILS ────────────────────────────────────────────
const qs = id => document.getElementById(id);
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getToken() {
    const t = localStorage.getItem('zora_token');
    if (!t) { window.location.href = '/auth/login.html'; return null; }
    return t;
}

async function apiSafe(endpoint, method = 'GET', body = null) {
    try {
        if (typeof apiCall === 'function') return await apiCall(endpoint, method, body, true);
        const token = localStorage.getItem('zora_token');
        const opts = { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`/api${endpoint}`, opts);
        return await res.json();
    } catch (e) { console.warn('API:', endpoint, e); return null; }
}

function toast(msg, type = 'success') {
    const el = qs('fbToast');
    if (!el) return;
    el.textContent = msg;
    el.className = `fb-toast ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'fb-toast hidden'; }, 3200);
}

function scrollBottom() {
    requestAnimationFrame(() => {
        const s = qs('chatScroll');
        if (s) s.scrollTop = s.scrollHeight;
    });
}

// ── DRAWER ───────────────────────────────────────────
function openDrawer() {
    qs('feedbackDrawer')?.classList.add('open');
    qs('drawerBackdrop')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    qs('feedbackDrawer')?.classList.remove('open');
    qs('drawerBackdrop')?.classList.remove('active');
    document.body.style.overflow = '';
}

// ── LEFT COL — list item ──────────────────────────────
function buildListItem(fbData) {
    const el = document.createElement('div');
    el.className = 'feedback-list-item';
    el.dataset.id = fbData.id;

    const initial = fb.user?.name?.[0]?.toUpperCase() || 'U';
    el.innerHTML = `
        <div class="fli-avatar fli-avatar--user">${initial}</div>
        <div class="fli-content">
            <div class="fli-top">
                <span class="fli-name">You</span>
                <span class="fli-time">${fbData.time || now()}</span>
            </div>
            <p class="fli-preview">${esc(fbData.message).slice(0, 48)}${fbData.message.length > 48 ? '…' : ''}</p>
            <span class="fli-cat-badge">${catLabels[fbData.category] || fbData.category}</span>
        </div>
    `;

    el.addEventListener('click', () => setActive(fbData.id));
    return el;
}

function addToList(fbData) {
    const container = qs('feedbackListItems');
    if (!container) return;

    const existing = container.querySelector(`[data-id="${fbData.id}"]`);
    if (existing) return;

    container.appendChild(buildListItem(fbData));
    qs('leftEmpty')?.classList.remove('show');
}

function setActive(id) {
    document.querySelectorAll('.feedback-list-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
    });
    fb.activeId = id;
}

// ── RIGHT COL — bubbles ───────────────────────────────
function appendUserBubble(data) {
    const list = qs('messageList');
    if (!list) return;

    qs('stageHint')?.classList.add('hidden');

    const stars = data.rating > 0 ? '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating) : '';
    const initial = fb.user?.name?.[0]?.toUpperCase() || 'U';
    const shotHtml = data.screenshotBase64
        ? `<div class="bubble-screenshot"><img src="${data.screenshotBase64}" alt="Screenshot"></div>`
        : '';

    const div = document.createElement('div');
    div.className = 'bubble-wrap bubble-wrap--user';
    div.innerHTML = `
        <div class="bubble-group">
            <div class="bubble-meta" style="justify-content:flex-end">
                <span class="bubble-time">${data.time || now()}</span>
                <span class="bubble-sender">${esc(fb.user?.name || 'You')}</span>
            </div>
            <div class="bubble bubble--user">
                <p>${esc(data.message)}</p>
                ${shotHtml}
                <div class="bubble-tags">
                    <span class="bubble-tag">${catLabels[data.category] || data.category}</span>
                    ${stars ? `<span class="bubble-tag">${stars}</span>` : ''}
                </div>
                ${data.rating > 0 ? `<div class="bubble-stars" style="color:rgba(255,255,255,0.9)">${stars} <span style="font-size:.72rem;opacity:.8">${starLabels[data.rating]}</span></div>` : ''}
            </div>
        </div>
        <div class="bubble-avatar bubble-avatar--user">${initial}</div>
    `;

    list.appendChild(div);
    scrollBottom();
}

function appendDevBubble(text, time) {
    const list = qs('messageList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'bubble-wrap bubble-wrap--dev';
    div.innerHTML = `
        <div class="bubble-avatar bubble-avatar--dev">
            <img src="/assets/images/logo/logo.png" alt="Z" onerror="this.style.display='none';this.parentNode.innerHTML='Z'">
        </div>
        <div class="bubble-group">
            <div class="bubble-meta">
                <span class="bubble-sender">ZORA Team</span>
                <span class="bubble-badge">Developer</span>
                <span class="bubble-time">${time || now()}</span>
            </div>
            <div class="bubble bubble--dev"><p>${esc(text)}</p></div>
        </div>
    `;

    list.appendChild(div);
    scrollBottom();
}

function showTyping(visible) {
    qs('typingWrap')?.classList.toggle('hidden', !visible);
    if (visible) scrollBottom();
}

// ── FORM CONTROLS ─────────────────────────────────────
function bindCategories() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fb.category = btn.dataset.cat;
        });
    });
}

function bindStars() {
    const stars = document.querySelectorAll('.star-btn');
    const label = qs('starLabel');
    stars.forEach(btn => {
        btn.addEventListener('mouseenter', () => highlightStars(+btn.dataset.val));
        btn.addEventListener('mouseleave', () => highlightStars(fb.rating));
        btn.addEventListener('click', () => {
            fb.rating = +btn.dataset.val;
            highlightStars(fb.rating);
            if (label) label.textContent = starLabels[fb.rating] || '';
        });
    });
}

function highlightStars(val) {
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.toggle('active', +btn.dataset.val <= val);
    });
}

function bindUpload() {
    const input = qs('screenshotInput');
    const zone = qs('uploadZone');
    const preview = qs('uploadPreview');
    const content = qs('uploadContent');
    const img = qs('previewImg');
    const rmBtn = qs('removeImgBtn');

    if (!input) return;

    const loadFile = file => {
        if (!file?.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { toast('Image too large (max 5MB)', 'error'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            fb.screenshotBase64 = e.target.result;
            if (img) img.src = e.target.result;
            preview?.classList.remove('hidden');
            content?.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    };

    input.addEventListener('change', () => loadFile(input.files?.[0]));
    zone?.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--cyan)'; });
    zone?.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone?.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; loadFile(e.dataTransfer.files?.[0]); });

    rmBtn?.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        fb.screenshotBase64 = null;
        input.value = '';
        if (img) img.src = '';
        preview?.classList.add('hidden');
        content?.classList.remove('hidden');
    });
}

function resetForm() {
    if (qs('feedbackMsg')) qs('feedbackMsg').value = '';
    fb.rating = 0; fb.screenshotBase64 = null; fb.category = 'suggestion';
    highlightStars(0);
    const sl = qs('starLabel'); if (sl) sl.textContent = 'Select rating';
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-cat="suggestion"]')?.classList.add('active');
    const prev = qs('uploadPreview'), cont = qs('uploadContent');
    prev?.classList.add('hidden'); cont?.classList.remove('hidden');
    const inp = qs('screenshotInput'); if (inp) inp.value = '';
    const pi = qs('previewImg'); if (pi) pi.src = '';
}

// ── SUBMIT ────────────────────────────────────────────
async function submitFeedback() {
    if (fb.isSubmitting) return;

    const message = qs('feedbackMsg')?.value?.trim();
    if (!message) { toast('Please write a message', 'error'); return; }
    if (fb.rating === 0) { toast('Please select a rating', 'error'); return; }

    fb.isSubmitting = true;
    const btn = qs('submitFeedbackBtn');
    if (btn) { btn.disabled = true; btn.querySelector('.submit-btn-text').textContent = 'Sending…'; }

    const payload = { category: fb.category, rating: fb.rating, message, screenshot: fb.screenshotBase64 || null };

    try {
        await apiSafe('/feedback', 'POST', payload);
    } catch (e) { console.warn('Submit warn:', e); }

    const fbData = {
        id: `fb_${Date.now()}`,
        category: fb.category,
        rating: fb.rating,
        message,
        screenshotBase64: fb.screenshotBase64,
        time: now(),
    };

    fb.feedbacks.push(fbData);

    closeDrawer();
    addToList(fbData);
    setActive(fbData.id);
    appendUserBubble(fbData);
    resetForm();
    toast('Feedback sent! Thank you 🙏', 'success');

    // Auto-reply
    setTimeout(() => {
        showTyping(true);
        setTimeout(() => {
            showTyping(false);
            appendDevBubble(autoReplies[fbData.category] || "Thank you for your feedback! We'll get back to you soon.");
        }, 2200);
    }, 700);

    if (btn) { btn.disabled = false; btn.querySelector('.submit-btn-text').textContent = 'Send Feedback'; }
    fb.isSubmitting = false;
}

// ── SEARCH ────────────────────────────────────────────
function bindSearch() {
    qs('searchInput')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#feedbackListItems .feedback-list-item').forEach(el => {
            const preview = el.querySelector('.fli-preview')?.textContent?.toLowerCase() || '';
            el.style.display = preview.includes(q) ? '' : 'none';
        });
    });
}

// ── LIGHTBOX ──────────────────────────────────────────
function openLightbox(userData) {
    const lb = qs('fbLightbox');
    const bd = qs('lbBackdrop');
    if (!lb || !bd) return;

    // Set user info
    const initial = userData.name?.[0]?.toUpperCase() || 'U';
    const lbAv = qs('lbAvatar');
    if (lbAv) {
        lbAv.innerHTML = userData.avatar_url
            ? `<img src="${esc(userData.avatar_url)}" alt="avatar">`
            : initial;
    }
    const lbN = qs('lbName'); if (lbN) lbN.textContent = userData.name || 'User';
    const lbE = qs('lbEmail'); if (lbE) lbE.textContent = userData.email || '—';

    // Build feedback cards
    const body = qs('lbBody');
    if (!body) return;

    if (!userData.feedbacks?.length) {
        body.innerHTML = `<p class="lb-empty">No feedback found for this user.</p>`;
    } else {
        body.innerHTML = userData.feedbacks.map(f => {
            const stars = f.rating > 0
                ? '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating)
                : '';
            const shotHtml = f.screenshot_url
                ? `<div class="lb-card-screenshot"><img src="${esc(f.screenshot_url)}" alt="Screenshot"></div>`
                : '';
            return `
                <div class="lb-card">
                    <div class="lb-card-top">
                        <span class="lb-card-cat">${esc(catLabels[f.category] || f.category)}</span>
                        <span class="lb-card-time">${f.created_at
                    ? new Date(f.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                    : now()}</span>
                    </div>
                    ${stars ? `<div class="lb-card-stars">${stars} <span style="font-size:.72rem;color:var(--text-secondary)">${starLabels[f.rating] || ''}</span></div>` : ''}
                    <p class="lb-card-msg">${esc(f.message)}</p>
                    ${shotHtml}
                </div>
            `;
        }).join('');
    }

    bd.classList.remove('hidden');
}

function closeLightbox() {
    qs('lbBackdrop')?.classList.add('hidden');
}

// ── BUILD USER LIST ────────────────────────────────────
function buildUserListItem(userData) {
    const el = document.createElement('div');
    el.className = 'feedback-list-item';
    el.dataset.uid = userData.user_id || userData.id;

    const initial = userData.name?.[0]?.toUpperCase() || 'U';
    const lastFb = userData.feedbacks?.[userData.feedbacks.length - 1];
    const preview = lastFb?.message?.slice(0, 46) + (lastFb?.message?.length > 46 ? '…' : '') || '—';
    const timeStr = lastFb?.created_at
        ? new Date(lastFb.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : now();
    const cat = lastFb ? catLabels[lastFb.category] || lastFb.category : '';

    el.innerHTML = `
        <div class="fli-avatar fli-avatar--user-photo">
            ${userData.avatar_url
            ? `<img src="${esc(userData.avatar_url)}" alt="${esc(userData.name)}">`
            : initial}
        </div>
        <div class="fli-content">
            <div class="fli-top">
                <span class="fli-name">${esc(userData.name || 'User')}</span>
                <span class="fli-time">${timeStr}</span>
            </div>
            <p class="fli-preview">${esc(preview)}</p>
            ${cat ? `<span class="fli-cat-badge">${esc(cat)}</span>` : ''}
        </div>
        ${userData.unread ? '<div class="fli-unread"></div>' : ''}
    `;

    el.addEventListener('click', () => {
        document.querySelectorAll('.feedback-list-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        openLightbox(userData);
    });

    return el;
}

async function loadHistory() {
    const data = await apiSafe('/feedback/my', 'GET');
    const container = qs('feedbackListItems');
    const leftEmpty = qs('leftEmpty');

    if (!data?.data?.length) {
        leftEmpty?.classList.add('show');
        return;
    }

    leftEmpty?.classList.remove('show');
    qs('stageHint')?.classList.add('hidden');

    data.data.forEach(item => {
        const fbData = {
            id: item.id || `fb_${Date.now()}_${Math.random()}`,
            category: item.category || 'suggestion',
            rating: item.rating || 0,
            message: item.message || '',
            screenshotBase64: item.screenshot_url || null,
            time: item.created_at
                ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : now(),
        };

        fb.feedbacks.push(fbData);
        addToList(fbData);
        appendUserBubble(fbData);
        if (item.reply) appendDevBubble(item.reply);
    });
}

// ── BOOTSTRAP ─────────────────────────────────────────
async function bootstrap() {
    if (!getToken()) return;

    // Set times
    const wt = qs('welcomeTime'); if (wt) wt.textContent = now();
    const dt = qs('devWelcomeTime'); if (dt) dt.textContent = now();

    // Load user
    try {
        const res = await apiSafe('/auth/me');
        fb.user = res?.data || res;
        const name = fb.user?.name || 'User';
        const initial = name[0]?.toUpperCase() || 'U';
        const uname = qs('userName'); if (uname) uname.textContent = name;
        const uinit = qs('userInitial'); if (uinit) uinit.textContent = initial;
        if (fb.user?.avatar_url) {
            const av = qs('userAvatar');
            if (av) av.innerHTML = `<img src="${fb.user.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
    } catch (e) { console.warn('User load:', e); }

    // Drawer
    qs('feedbackTab')?.addEventListener('click', openDrawer);
    qs('newFeedbackBtn')?.addEventListener('click', openDrawer);
    qs('drawerBackdrop')?.addEventListener('click', closeDrawer);
    qs('drawerCloseBtn')?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

    // Lightbox close
    qs('lbCloseBtn')?.addEventListener('click', closeLightbox);
    qs('lbBackdrop')?.addEventListener('click', e => {
        if (e.target === qs('lbBackdrop')) closeLightbox();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeLightbox();
    });

    // Submit
    qs('submitFeedbackBtn')?.addEventListener('click', submitFeedback);

    // Form controls
    bindCategories();
    bindStars();
    bindUpload();
    bindSearch();

    // Load existing
    await loadHistory();
}

document.addEventListener('DOMContentLoaded', bootstrap);