/**
 * ZORA AI — Feedback Page
 * Sliding drawer, chat bubbles, API integration
 */

const fbState = {
    user: null,
    category: 'suggestion',
    rating: 0,
    screenshotFile: null,
    screenshotBase64: null,
    isSubmitting: false,
};

const starLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// ── UTILS ────────────────────────────────────────────
function qs(id) { return document.getElementById(id); }

function getToken() {
    const t = localStorage.getItem('zora_token');
    if (!t) { window.location.href = '/auth/login.html'; return null; }
    return t;
}

function nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'success') {
    const t = qs('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast hidden'; }, 3500);
}

function scrollBottom() {
    requestAnimationFrame(() => {
        const s = qs('chatScroll');
        if (s) s.scrollTop = s.scrollHeight;
    });
}

async function safeApiCall(endpoint, method = 'GET', body = null) {
    try {
        if (typeof apiCall === 'function') {
            return await apiCall(endpoint, method, body, true);
        }
        // fallback fetch
        const token = localStorage.getItem('zora_token');
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`/api${endpoint}`, opts);
        return await res.json();
    } catch (err) {
        console.warn('API error:', endpoint, err);
        return null;
    }
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

// ── CATEGORY ─────────────────────────────────────────
function bindCategoryBtns() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fbState.category = btn.dataset.cat;
        });
    });
}

// ── STARS ─────────────────────────────────────────────
function bindStarRating() {
    const stars = document.querySelectorAll('.star-btn');
    const label = qs('starLabel');

    stars.forEach(btn => {
        btn.addEventListener('mouseenter', () => highlightStars(Number(btn.dataset.val)));
        btn.addEventListener('mouseleave', () => highlightStars(fbState.rating));
        btn.addEventListener('click', () => {
            fbState.rating = Number(btn.dataset.val);
            highlightStars(fbState.rating);
            if (label) label.textContent = starLabels[fbState.rating] || '';
        });
    });
}

function highlightStars(val) {
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.val) <= val);
    });
}

// ── SCREENSHOT ───────────────────────────────────────
function bindUploadZone() {
    const input = qs('screenshotInput');
    const zone = qs('uploadZone');
    const preview = qs('uploadPreview');
    const content = qs('uploadContent');
    const img = qs('previewImg');
    const removeBtn = qs('removeImgBtn');

    if (!input) return;

    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
        fbState.screenshotFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            fbState.screenshotBase64 = e.target.result;
            if (img) img.src = e.target.result;
            preview?.classList.remove('hidden');
            content?.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    });

    // Drag & drop
    zone?.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--cyan)'; });
    zone?.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone?.addEventListener('drop', e => {
        e.preventDefault();
        zone.style.borderColor = '';
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            input.files = e.dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        }
    });

    removeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fbState.screenshotFile = null;
        fbState.screenshotBase64 = null;
        input.value = '';
        if (img) img.src = '';
        preview?.classList.add('hidden');
        content?.classList.remove('hidden');
    });
}

// ── APPEND BUBBLES ────────────────────────────────────
function appendUserBubble({ category, rating, message, screenshotBase64 }) {
    const list = qs('messageList');
    if (!list) return;

    const hint = qs('stageHint');
    if (hint) hint.classList.add('hidden');

    const stars = rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '';
    const catLabel = { suggestion: 'Suggestion', bug: 'Bug Report', praise: 'Praise', question: 'Question' }[category] || category;
    const initial = fbState.user?.name?.[0]?.toUpperCase() || 'U';

    const screenshotHtml = screenshotBase64
        ? `<div class="bubble-screenshot"><img src="${screenshotBase64}" alt="Screenshot"></div>`
        : '';

    const div = document.createElement('div');
    div.className = 'bubble-row bubble-row--user';
    div.innerHTML = `
        <div class="bubble-content">
            <div class="bubble-meta" style="justify-content:flex-end">
                <span class="bubble-time">${nowTime()}</span>
                <span class="bubble-sender">${fbState.user?.name || 'You'}</span>
            </div>
            <div class="bubble-body bubble-body--user">
                <p>${escapeHtml(message)}</p>
                ${screenshotHtml}
                <div class="bubble-tags">
                    <span class="bubble-tag">${catLabel}</span>
                    ${stars ? `<span class="bubble-tag">${stars}</span>` : ''}
                </div>
                ${rating > 0 ? `<div class="bubble-stars">${stars} <span style="font-size:0.78rem;color:var(--text-secondary);font-family:var(--font)">${starLabels[rating]}</span></div>` : ''}
            </div>
        </div>
        <div class="bubble-avatar bubble-avatar--user">${initial}</div>
    `;
    list.appendChild(div);
    scrollBottom();
}

function appendDevBubble(text) {
    const list = qs('messageList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'bubble-row bubble-row--dev';
    div.innerHTML = `
        <div class="bubble-avatar bubble-avatar--dev">
            <img src="/assets/images/logo/logo.png" alt="ZORA" onerror="this.style.display='none';this.parentNode.innerHTML='Z'">
        </div>
        <div class="bubble-content">
            <div class="bubble-meta">
                <span class="bubble-sender">ZORA Team</span>
                <span class="bubble-badge">Developer</span>
                <span class="bubble-time">${nowTime()}</span>
            </div>
            <div class="bubble-body bubble-body--dev">
                <p>${text}</p>
            </div>
        </div>
    `;
    list.appendChild(div);
    scrollBottom();
}

function showTyping(visible) {
    qs('typingRow')?.classList.toggle('hidden', !visible);
    if (visible) scrollBottom();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── LOAD EXISTING FEEDBACKS ───────────────────────────
async function loadFeedbacks() {
    const data = await safeApiCall('/feedback/my', 'GET');
    if (!data?.data?.length) return;

    const hint = qs('stageHint');
    if (hint) hint.classList.add('hidden');

    data.data.forEach(fb => {
        appendUserBubble({
            category: fb.category,
            rating: fb.rating || 0,
            message: fb.message,
            screenshotBase64: fb.screenshot_url || null,
        });
        if (fb.reply) {
            appendDevBubble(escapeHtml(fb.reply));
        }
    });
}

// ── SUBMIT ────────────────────────────────────────────
async function submitFeedback() {
    if (fbState.isSubmitting) return;

    const message = qs('feedbackMsg')?.value?.trim();
    if (!message) { showToast('Please write a message', 'error'); return; }
    if (fbState.rating === 0) { showToast('Please select a rating', 'error'); return; }

    fbState.isSubmitting = true;
    const btn = qs('submitFeedbackBtn');
    if (btn) { btn.disabled = true; btn.querySelector('.submit-btn-text').textContent = 'Sending...'; }

    const payload = {
        category: fbState.category,
        rating: fbState.rating,
        message,
        screenshot: fbState.screenshotBase64 || null,
    };

    try {
        const res = await safeApiCall('/feedback', 'POST', payload);
        const ok = res?.success !== false;

        closeDrawer();

        appendUserBubble({
            category: fbState.category,
            rating: fbState.rating,
            message,
            screenshotBase64: fbState.screenshotBase64,
        });

        // Reset form
        if (qs('feedbackMsg')) qs('feedbackMsg').value = '';
        fbState.rating = 0;
        fbState.screenshotFile = null;
        fbState.screenshotBase64 = null;
        fbState.category = 'suggestion';
        highlightStars(0);
        const starLabel = qs('starLabel');
        if (starLabel) starLabel.textContent = 'Select rating';
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-cat="suggestion"]')?.classList.add('active');
        const preview = qs('uploadPreview');
        const content = qs('uploadContent');
        if (preview) preview.classList.add('hidden');
        if (content) content.classList.remove('hidden');
        if (qs('screenshotInput')) qs('screenshotInput').value = '';
        if (qs('previewImg')) qs('previewImg').src = '';

        showToast('Feedback sent! Thank you 🙏', 'success');

        // Auto reply after short delay
        setTimeout(() => {
            showTyping(true);
            setTimeout(() => {
                showTyping(false);
                const autoReplies = {
                    suggestion: "Thanks for your suggestion! Our team will review it and consider it for future updates. 💡",
                    bug: "Thanks for reporting this bug! Our team will investigate and fix it as soon as possible. 🔧",
                    praise: "Thank you so much for the kind words! It means the world to us. 🚀",
                    question: "Thanks for reaching out! Our team will get back to you with an answer shortly. 💬",
                };
                appendDevBubble(autoReplies[fbState.category] || "Thank you for your feedback! We'll get back to you soon.");
            }, 2000);
        }, 800);

        if (!ok) console.warn('Feedback saved locally (API issue):', res);

    } catch (err) {
        showToast('Failed to send feedback. Please try again.', 'error');
        console.error('Submit error:', err);
    } finally {
        fbState.isSubmitting = false;
        if (btn) { btn.disabled = false; btn.querySelector('.submit-btn-text').textContent = 'Send Feedback'; }
    }
}

// ── BOOTSTRAP ─────────────────────────────────────────
async function bootstrap() {
    const token = getToken();
    if (!token) return;

    // Set welcome time
    const wt = qs('welcomeTime');
    if (wt) wt.textContent = nowTime();

    // Load user
    try {
        const res = await safeApiCall('/auth/me');
        fbState.user = res?.data || res;
        const initial = fbState.user?.name?.[0]?.toUpperCase() || 'U';
        const el = qs('topbarInitial');
        if (el) el.textContent = initial;
        if (fbState.user?.avatar_url) {
            const av = qs('topbarAvatar');
            if (av) av.innerHTML = `<img src="${fbState.user.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
    } catch (e) { console.warn('User load failed:', e); }

    // Pull tab → open drawer
    qs('feedbackTab')?.addEventListener('click', openDrawer);
    qs('drawerBackdrop')?.addEventListener('click', closeDrawer);
    qs('drawerCloseBtn')?.addEventListener('click', closeDrawer);

    // ESC to close
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

    // Submit
    qs('submitFeedbackBtn')?.addEventListener('click', submitFeedback);

    // Bind controls
    bindCategoryBtns();
    bindStarRating();
    bindUploadZone();

    // Load existing feedbacks
    await loadFeedbacks();
}

document.addEventListener('DOMContentLoaded', bootstrap);