/**
 * ZORA AI - Public Chat Controller
 * Handles light mode chat UI, history, streaming, orb animation, and sidebar state.
 */

const chatState = {
    user: null,
    conversations: [],
    filteredConversations: [],
    messages: [],
    currentConversationId: null,
    currentConversationTitle: 'Chat Title',
    incognito: false,
    extended: false,
    isStreaming: false,
    sidebarCollapsed: false,
};

function qs(id) {
    return document.getElementById(id);
}

function getTokenOrRedirect() {
    const token = localStorage.getItem('zora_token');
    if (!token) {
        window.location.href = '/auth/login.html';
        return null;
    }
    return token;
}

function getDisplayName() {
    return (
        localStorage.getItem('zora_onboarding_name')
        || chatState.user?.display_name
        || chatState.user?.name
        || 'User'
    );
}

function getUserEmail() {
    return chatState.user?.email || '';
}

function truncateEmail(email = '', length = 22) {
    if (email.length <= length) {
        return email;
    }
    return `${email.slice(0, length - 3)}...`;
}

function getResponseData(response) {
    return response?.data || response || {};
}

function isNotFoundError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.status === 404 || message.includes('404') || message.includes('not found');
}

async function apiCallOrWarn(endpoint, method = 'GET', body = null, requireAuth = true) {
    try {
        return await apiCall(endpoint, method, body, requireAuth);
    } catch (error) {
        if (isNotFoundError(error)) {
            console.warn(`Endpoint unavailable: ${method} ${endpoint}`);
            return null;
        }
        throw error;
    }
}

function getGreetingLabel() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) {
        return 'Good Morning';
    }
    if (hour >= 12 && hour <= 17) {
        return 'Good Afternoon';
    }
    return 'Good Evening';
}

function splitTextAnimate(el, text, startDelay = 0) {
    if (!el) return;
    el.innerHTML = '';

    [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.classList.add('split-char');
        if (char === ' ') span.classList.add('space');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.animationDelay = `${startDelay + i * 50}ms`;
        el.appendChild(span);
    });
}

const rotatingPhrases = [
    'Will we Build something today?',
    'Will we Build a website?',
    'Will we Design some products?',
    'Will we Create an Image?',
    'Will we Create a video?',
    'Will we Research some news today?',
    'Will we Analytic a Business?',
];

let rotatingIndex = 0;
let rotatingInterval = null;

function renderRotatingText(el, text, animateIn = true) {
    if (!el) return;

    const words = text.split(' ');
    let charIndex = 0;

    el.innerHTML = words.map((word, wi) => {
        const chars = [...word].map((char) => {
            const delay = animateIn
                ? `${(rotatingPhrases[rotatingIndex].length - 1 - charIndex++) * 25}ms`
                : `${charIndex++ * 20}ms`;

            return `<span class="rotating-char">
                <span style="animation-delay:${delay}">${char}</span>
            </span>`;
        }).join('');

        const space = wi < words.length - 1
            ? '<span class="rotating-space"> </span>'
            : '';

        return chars + space;
    }).join('');
}

function cycleRotatingText() {
    const el = qs('rotatingText');
    if (!el) return;

    // Exit animation
    el.querySelectorAll('.rotating-char').forEach((ch, i) => {
        ch.classList.add('exit');
        const inner = ch.querySelector('span');
        if (inner) inner.style.animationDelay = `${i * 20}ms`;
    });

    const currentText = rotatingPhrases[rotatingIndex];
    const exitDuration = currentText.length * 20 + 400;

    setTimeout(() => {
        rotatingIndex = (rotatingIndex + 1) % rotatingPhrases.length;
        renderRotatingText(el, rotatingPhrases[rotatingIndex], true);
    }, exitDuration);
}

function startRotatingText() {
    const el = qs('rotatingText');
    if (!el) return;

    rotatingIndex = 0;
    renderRotatingText(el, rotatingPhrases[0], true);

    if (rotatingInterval) clearInterval(rotatingInterval);
    rotatingInterval = setInterval(cycleRotatingText, 3000);
}

function updateGreeting() {
    const name = getDisplayName();
    const greeting = getGreetingLabel();
    const lineOne = `${greeting}, ${name}!`;

    splitTextAnimate(qs('welcomeLineOne'), lineOne, 0);

    const lineOneDelay = lineOne.length * 50 + 300;
    setTimeout(startRotatingText, lineOneDelay);
}

function autoResizeTextarea() {
    const input = qs('chatInput');
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
}

function scrollMessagesToBottom() {
    requestAnimationFrame(() => {
        const scroller = qs('messageScroller');
        scroller.scrollTop = scroller.scrollHeight;
    });
}

function setTypingIndicator(visible) {
    qs('typingIndicator').classList.toggle('hidden', !visible);
    if (visible) {
        scrollMessagesToBottom();
    }
}

function updateShellState() {
    const shell = qs('chatShell');
    const sidebar = document.getElementById('sidebar') || qs('chatSidebar');
    shell.classList.toggle('has-messages', chatState.messages.length > 0);
    sidebar.classList.toggle('collapsed', chatState.sidebarCollapsed);
    qs('incognitoButton').classList.toggle('active', chatState.incognito);
    qs('extendedToggle').classList.toggle('active', chatState.extended);
    const titleEl = qs('chatTitle');
    if (titleEl && titleEl.contentEditable !== 'true') {
        titleEl.textContent = chatState.currentConversationTitle || 'New Chat';
    }
}

function saveSidebarState() {
    localStorage.setItem('zora_sidebar', chatState.sidebarCollapsed ? 'collapsed' : 'expanded');
    localStorage.setItem('sidebarCollapsed', String(chatState.sidebarCollapsed));
}

function initializeSidebarState() {
    const sidebar = document.getElementById('sidebar') || qs('chatSidebar');
    const savedSidebar = localStorage.getItem('sidebarCollapsed');
    const legacySidebar = localStorage.getItem('zora_sidebar');

    chatState.sidebarCollapsed = savedSidebar === 'true' || legacySidebar === 'collapsed';
    if (window.innerWidth < 768) {
        chatState.sidebarCollapsed = true;
    }

    sidebar.classList.toggle('collapsed', chatState.sidebarCollapsed);
    updateShellState();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar') || qs('chatSidebar');
    sidebar.classList.toggle('collapsed');
    chatState.sidebarCollapsed = sidebar.classList.contains('collapsed');
    saveSidebarState();
    updateShellState();
}

function truncateLine(text, length = 42) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= length) {
        return normalized;
    }
    return `${normalized.slice(0, length - 3)}...`;
}

function daysDifference(date) {
    const now = new Date();
    const midnightNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const midnightDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((midnightNow - midnightDate) / 86400000);
}

function getHistoryGroupLabel(dateString) {
    if (!dateString) {
        return 'Earlier';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return 'Earlier';
    }

    const diff = daysDifference(date);
    if (diff <= -1) {
        return 'Tomorrow';
    }
    if (diff === 0) {
        return 'Today';
    }
    if (diff === 1) {
        return 'Yesterday';
    }
    return `${diff} days ago`;
}

function closeAllHistoryDropdowns() {
    document.querySelectorAll('.chat-item-dropdown').forEach((dropdown) => dropdown.classList.add('hidden'));
    document.querySelectorAll('.chat-history-item.menu-open').forEach((item) => item.classList.remove('menu-open'));
}

function bindSettingsDropdown() {
    const gearBtn = qs('settings-gear');
    const avatarBtn = qs('profileAvatar');
    const dropdown = qs('settings-dropdown');
    const logoutBtn = qs('logout-button');

    if (gearBtn && dropdown) {
        gearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('visible');
        });
    }

    if (avatarBtn && dropdown) {
        avatarBtn.addEventListener('click', (e) => {
            if (chatState.sidebarCollapsed) {
                e.stopPropagation();
                dropdown.classList.toggle('visible');
            }
        });
    }

    if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('zora_token');
            window.location.href = '/auth/login.html';
        });
    }

    document.addEventListener('click', () => {
        dropdown?.classList.remove('visible');
    });
}

// ─── ARCHIVE LIGHTBOX ────────────────────────────────────────────────────────

let archivePendingId = null;

function showArchiveLightbox(convId) {
    archivePendingId = convId;
    qs('archiveLightbox').classList.remove('hidden');
}

function hideArchiveLightbox() {
    archivePendingId = null;
    qs('archiveLightbox').classList.add('hidden');
}

function bindArchiveLightbox() {
    qs('archiveCancelBtn')?.addEventListener('click', hideArchiveLightbox);

    qs('archiveConfirmBtn')?.addEventListener('click', async () => {
        const convId = archivePendingId;
        if (!convId) return;

        hideArchiveLightbox();

        // Remove from state
        chatState.conversations = chatState.conversations.filter((c) => c.id !== convId);
        chatState.filteredConversations = chatState.filteredConversations.filter((c) => c.id !== convId);
        renderConversationList(chatState.filteredConversations);

        await apiCallOrWarn(`/chat/${convId}`, 'DELETE');

        if (convId === chatState.currentConversationId) {
            startNewChat();
        }
    });

    // Close on overlay click
    qs('archiveLightbox')?.addEventListener('click', (e) => {
        if (e.target === qs('archiveLightbox')) hideArchiveLightbox();
    });
}

// ─── RENAME LIGHTBOX ─────────────────────────────────────────────────────────

let renamePendingItem = null;

function showRenameLightbox(item) {
    renamePendingItem = item;
    const titleEl = item.querySelector('.chat-history-title');
    const input = qs('renameInput');
    if (input) {
        input.value = titleEl?.textContent || '';
        input.select();
    }
    qs('renameLightbox').classList.remove('hidden');
    setTimeout(() => qs('renameInput')?.focus(), 100);
}

function hideRenameLightbox() {
    renamePendingItem = null;
    qs('renameLightbox').classList.add('hidden');
}

function bindRenameLightbox() {
    qs('renameCancelBtn')?.addEventListener('click', hideRenameLightbox);

    qs('renameConfirmBtn')?.addEventListener('click', async () => {
        const item = renamePendingItem;
        const newTitle = qs('renameInput')?.value.trim();
        if (!item || !newTitle) return;

        const titleEl = item.querySelector('.chat-history-title');
        const convId = item.dataset.convId;

        if (titleEl) titleEl.textContent = newTitle;

        if (convId === chatState.currentConversationId) {
            chatState.currentConversationTitle = newTitle;
            updateShellState();
        }

        // Update in state
        const conv = chatState.conversations.find((c) => c.id === convId);
        if (conv) conv.title = newTitle;

        hideRenameLightbox();
        await apiCallOrWarn(`/chat/${convId}/rename`, 'PUT', { title: newTitle });
    });

    // Close on overlay click
    qs('renameLightbox')?.addEventListener('click', (e) => {
        if (e.target === qs('renameLightbox')) hideRenameLightbox();
    });

    // Enter key = confirm
    qs('renameInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') qs('renameConfirmBtn')?.click();
        if (e.key === 'Escape') hideRenameLightbox();
    });
}

function bindHistoryMenu() {
    const list = qs('conversationList');
    if (!list) return;

    list.addEventListener('click', (e) => {
        // Three-dot button
        const menuBtn = e.target.closest('.item-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const item = menuBtn.closest('.chat-history-item');
            const dropdown = item?.querySelector('.chat-item-dropdown');
            if (!dropdown) return;

            closeAllHistoryDropdowns();
            dropdown.classList.toggle('hidden');
            item.classList.toggle('menu-open');
            return;
        }

        // Action: Rename
        const renameBtn = e.target.closest('[data-action="rename"]');
        if (renameBtn) {
            e.stopPropagation();
            const item = renameBtn.closest('.chat-history-item');
            if (!item) return;
            closeAllHistoryDropdowns();
            showRenameLightbox(item);
            return;
        }

        // Action: Archive
        const archiveBtn = e.target.closest('[data-action="archive"]');
        if (archiveBtn) {
            e.stopPropagation();
            const item = archiveBtn.closest('.chat-history-item');
            const convId = item?.dataset.convId;
            if (!convId) return;

            closeAllHistoryDropdowns();
            showArchiveLightbox(convId);
            return;
        }

        // Click on item itself = open conversation
        const histItem = e.target.closest('.chat-history-item');
        if (histItem && histItem.dataset.convId) {
            selectConversation(histItem.dataset.convId);
        }
    });
}

function bindEvents() {
    const toggleBtn = document.getElementById('sidebar-toggle') || qs('sidebar-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }

    qs('searchNavItem')?.addEventListener('click', (e) => {
        e.preventDefault();
        const query = prompt('Search chats:');
        if (query !== null) filterConversations(query);
    });
    qs('chatTitleEditBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        renameCurrentChat();
    });

    const titleEl = qs('chatTitle');
    if (titleEl) {
        // Enter = save
        titleEl.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await renameCurrentChat();
            }
            if (e.key === 'Escape') {
                titleEl.textContent = chatState.currentConversationTitle || 'New Chat';
                titleEl.contentEditable = 'false';
                qs('chatTitleEditBtn')?.classList.remove('editing');
            }
        });

        // Click outside = save
        document.addEventListener('click', async (e) => {
            if (titleEl.contentEditable === 'true' && !e.target.closest('.chat-title-editable-wrap')) {
                await renameCurrentChat();
            }
        });
    }
    qs('newChatIconButton')?.addEventListener('click', startNewChat);

    qs('incognitoButton')?.addEventListener('click', () => {
        chatState.incognito = !chatState.incognito;
        clearConversationState();
        updateShellState();
        filterConversations(qs('historySearch').value);
    });

    qs('extendedToggle')?.addEventListener('click', () => {
        chatState.extended = !chatState.extended;
        updateShellState();
    });

    qs('voiceButton')?.addEventListener('click', () => console.info('Voice input is not connected yet.'));
    qs('sendButton')?.addEventListener('click', async () => await sendMessage());
    qs('attachButton')?.addEventListener('click', () => console.info('Attachment UI is not connected yet.'));

    const chatInput = qs('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', autoResizeTextarea);
        chatInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                await sendMessage();
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.chat-history-item')) {
            closeAllHistoryDropdowns();
        }
    });

    window.addEventListener('resize', initializeSidebarState);
    applyNavTooltips();
    bindHistoryMenu();
    bindSettingsDropdown();
    bindSuggestionCards();
    bindOrbBehavior();
    bindArchiveLightbox();
    bindSettingsFeatures();
    bindRenameLightbox();
}

async function bootstrapChat() {
    if (!await loadCurrentUser()) {
        return;
    }

    initializeSidebarState();
    bindEvents();
    autoResizeTextarea();
    updateGreeting();
    renderMessages();
    await loadHistory();

    const initialConversation = new URL(window.location.href).searchParams.get('conversation');
    if (initialConversation) {
        await selectConversation(initialConversation);
    }
}

// ─── USER ────────────────────────────────────────────────────────────────────

async function loadCurrentUser() {
    const token = getTokenOrRedirect();
    if (!token) return false;

    try {
        const res = await apiCallOrWarn('/auth/me', 'GET', null, true);
        const data = getResponseData(res);
        chatState.user = data;

        // Avatar
        const avatarEl = qs('profileAvatar');
        if (avatarEl) {
            if (data.avatar_url) {
                avatarEl.innerHTML = `<img src="${data.avatar_url}" alt="avatar">`;
            } else {
                const initial = (data.display_name || data.name || 'Z')[0].toUpperCase();
                avatarEl.textContent = initial;
            }
        }

        // Name & email
        const nameEl = qs('profileName');
        const emailEl = qs('profileEmail');
        const dropEmailEl = qs('settingsDropdownEmail');

        if (nameEl) nameEl.textContent = data.display_name || data.name || 'User';
        if (emailEl) emailEl.textContent = truncateEmail(data.email || '');
        if (dropEmailEl) dropEmailEl.textContent = data.email || '';

        return true;
    } catch (err) {
        console.error('Failed to load user:', err);
        window.location.href = '/auth/login.html';
        return false;
    }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────

async function loadHistory() {
    if (chatState.incognito) return;

    try {
        const res = await apiCallOrWarn('/chat/history', 'GET', null, true);
        const data = getResponseData(res);
        chatState.conversations = Array.isArray(data) ? data
            : Array.isArray(data.conversations) ? data.conversations : [];
        chatState.filteredConversations = [...chatState.conversations];
        renderConversationList(chatState.filteredConversations);
    } catch (err) {
        console.warn('Could not load history:', err);
        chatState.conversations = [];
        renderConversationList([]);
    }
}

function filterConversations(query = '') {
    const q = query.toLowerCase().trim();
    chatState.filteredConversations = q
        ? chatState.conversations.filter((c) =>
            (c.title || '').toLowerCase().includes(q))
        : [...chatState.conversations];
    renderConversationList(chatState.filteredConversations);
}

function renderConversationList(conversations) {
    const list = qs('conversationList');
    if (!list) return;

    if (!conversations.length) {
        list.innerHTML = '<p style="font-size:0.82rem;color:#999;padding:8px 12px;">No chats yet.</p>';
        return;
    }

    // Group by date
    const groups = {};
    conversations.forEach((conv) => {
        const label = getHistoryGroupLabel(conv.created_at || conv.updated_at);
        if (!groups[label]) groups[label] = [];
        groups[label].push(conv);
    });

    list.innerHTML = Object.entries(groups).map(([label, items]) => `
        <div class="history-group-label">${label}</div>
        ${items.map((conv) => `
            <div class="chat-history-item ${conv.id === chatState.currentConversationId ? 'active' : ''}"
                 data-conv-id="${conv.id}">
                <span class="chat-history-title">${truncateLine(conv.title || 'New Chat', 36)}</span>
                <button class="item-menu-btn" type="button" aria-label="More options">
                    <i class="fi fi-br-menu-dots-vertical"></i>
                </button>
                <div class="chat-item-dropdown hidden">
                    <div class="chat-item-action" data-action="rename">
                        <i class="fi fi-ss-pencil"></i> <span>Rename</span>
                    </div>
                    <div class="chat-item-action delete-action" data-action="archive">
                        <i class="fi fi-rr-trash"></i> <span>Archive</span>
                    </div>
                </div>
            </div>
        `).join('')}
    `).join('');
}

// ─── CONVERSATION ─────────────────────────────────────────────────────────────

async function selectConversation(convId) {
    chatState.currentConversationId = convId;
    const conv = chatState.conversations.find((c) => c.id === convId);
    chatState.currentConversationTitle = conv?.title || 'Chat';
    chatState.messages = [];

    try {
        const res = await apiCallOrWarn(`/chat/history/${convId}`, 'GET', null, true);
        const data = getResponseData(res);
        const msgs = Array.isArray(data) ? data
            : Array.isArray(data.messages) ? data.messages : [];
        chatState.messages = msgs;
    } catch (err) {
        console.warn('Could not load messages:', err);
    }

    updateShellState();
    renderMessages();
    renderConversationList(chatState.filteredConversations);
    scrollMessagesToBottom();
}

function clearConversationState() {
    chatState.currentConversationId = null;
    chatState.currentConversationTitle = 'Chat Title';
    chatState.messages = [];
}

function startNewChat() {
    clearConversationState();
    updateShellState();
    renderMessages();
    const input = qs('chatInput');
    if (input) {
        input.value = '';
        autoResizeTextarea();
        input.focus();
    }
}

async function renameCurrentChat() {
    const titleEl = qs('chatTitle');
    const editBtn = qs('chatTitleEditBtn');
    if (!titleEl) return;

    const isEditing = titleEl.contentEditable === 'true';

    if (isEditing) {
        // Save
        const newTitle = titleEl.textContent.trim();
        titleEl.contentEditable = 'false';
        titleEl.style.cursor = 'default';
        editBtn?.classList.remove('editing');

        if (newTitle && newTitle !== chatState.currentConversationTitle) {
            chatState.currentConversationTitle = newTitle;
            if (chatState.currentConversationId) {
                await apiCallOrWarn(
                    `/chat/${chatState.currentConversationId}/rename`,
                    'PUT',
                    { title: newTitle }
                );
                await loadHistory();
            }
        }
    } else {
        // Start editing
        titleEl.contentEditable = 'true';
        titleEl.style.cursor = 'text';
        editBtn?.classList.add('editing');
        titleEl.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

function renderMessages() {
    const list = qs('messageList');
    const welcome = qs('welcomeScreen');
    const msgScreen = document.querySelector('.message-screen');
    const suggRow = qs('suggestionRow');

    const hasMessages = chatState.messages.length > 0;

    if (welcome) welcome.style.display = hasMessages ? 'none' : 'flex';
    if (msgScreen) msgScreen.style.display = hasMessages ? 'flex' : 'none';
    if (suggRow) suggRow.style.display = hasMessages ? 'none' : 'flex';

    if (!list) return;

    list.innerHTML = chatState.messages.map((msg) => {
        const isUser = msg.role === 'user';
        const content = typeof marked !== 'undefined' && !isUser
            ? marked.parse(msg.content || '')
            : (msg.content || '');

        return isUser ? `
            <div class="message user-message">
                <span class="msg-sender">You</span>
                <div class="msg-content">${escapeHtml(msg.content || '')}</div>
            </div>
        ` : `
            <div class="message zora-message">
                <div class="msg-header">
                    <img src="/assets/images/logo/logo.png" class="zora-msg-avatar" alt="ZORA">
                    <span class="msg-sender">ZORA</span>
                </div>
                <div class="msg-content markdown-body">${content}</div>
            </div>
        `;
    }).join('');

    scrollMessagesToBottom();
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function appendMessage(role, content) {
    chatState.messages.push({ role, content });
    renderMessages();
}

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────

async function sendMessage() {
    if (chatState.isStreaming) return;

    const input = qs('chatInput');
    const text = input?.value.trim();
    if (!text) return;

    input.value = '';
    autoResizeTextarea();

    const isFirstMessage = chatState.messages.length === 0;
    appendMessage('user', text);
    setTypingIndicator(true);
    chatState.isStreaming = true;

    try {
        // Create conversation if first message
        if (!chatState.currentConversationId && !chatState.incognito) {
            const convRes = await apiCallOrWarn('/chat/new', 'POST', {
                title: text.slice(0, 60),
                is_incognito: false,
            }, true);
            const convData = getResponseData(convRes);
            chatState.currentConversationId = convData.id || convData.conversation_id;
            chatState.currentConversationTitle = convData.title || text.slice(0, 40);
            updateShellState();
        }

        // Send to backend
        const res = await apiCallOrWarn('/chat/send', 'POST', {
            conversation_id: chatState.currentConversationId,
            message: text,
            extended: chatState.extended,
            incognito: chatState.incognito,
        }, true);

        const data = getResponseData(res);
        const reply = data.response || data.message || data.content
            || 'ZORA is thinking... (backend not connected yet)';

        setTypingIndicator(false);
        appendMessage('assistant', reply);

        // Auto-generate title from first message
        if (isFirstMessage && chatState.currentConversationId) {
            if (!data.title) {
                chatState.currentConversationTitle = text.slice(0, 40);
                updateShellState();
            }
            await loadHistory();
        }

    } catch (err) {
        setTypingIndicator(false);
        // Local MVP fallback
        const fallback = `ZORA (nemotron) is running in local MVP mode. I received: ${text}`;
        appendMessage('assistant', fallback);
        console.warn('Chat send error:', err);
    } finally {
        chatState.isStreaming = false;
    }
}

// ─── ORB BEHAVIOR ─────────────────────────────────────────────────────────────

function bindOrbBehavior() {
    const orb = qs('zoraOrb');
    const container = qs('orbCanvas');
    if (!orb || !container) return;

    // ── Eye cursor tracking ───────────────────────────────
    document.addEventListener('mousemove', (e) => {
        const rect = orb.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const dist = Math.min(22, Math.hypot(e.clientX - cx, e.clientY - cy) / 8);
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
        });
    });

    document.addEventListener('mouseleave', () => {
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.style.transform = 'translate(0px, 0px)';
        });
    });

    // ── Blink every 6 seconds ─────────────────────────────
    setInterval(() => {
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.classList.add('blinking');
            setTimeout(() => eye.classList.remove('blinking'), 300);
        });
    }, 6000);

    // ── WebGL Orb via OGL ─────────────────────────────────
    initWebGLOrb(container);
}

async function initWebGLOrb(container) {
    try {
        const { Renderer, Program, Mesh, Triangle, Vec3 } =
            await import('https://cdn.jsdelivr.net/npm/ogl@1.0.9/src/index.js');

        const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        container.appendChild(gl.canvas);

        const vert = `
            precision highp float;
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const frag = `
            precision highp float;
            uniform float iTime;
            uniform vec3 iResolution;
            uniform float hue;
            uniform float hover;
            uniform float rot;
            uniform float hoverIntensity;
            uniform vec3 backgroundColor;
            varying vec2 vUv;

            vec3 rgb2yiq(vec3 c) {
                return vec3(
                    dot(c, vec3(0.299, 0.587, 0.114)),
                    dot(c, vec3(0.596, -0.274, -0.322)),
                    dot(c, vec3(0.211, -0.523, 0.312))
                );
            }
            vec3 yiq2rgb(vec3 c) {
                return vec3(
                    c.x + 0.956*c.y + 0.621*c.z,
                    c.x - 0.272*c.y - 0.647*c.z,
                    c.x - 1.106*c.y + 1.703*c.z
                );
            }
            vec3 adjustHue(vec3 color, float hueDeg) {
                float hueRad = hueDeg * 3.14159265 / 180.0;
                vec3 yiq = rgb2yiq(color);
                float cosA = cos(hueRad); float sinA = sin(hueRad);
                yiq.y = yiq.y*cosA - yiq.z*sinA;
                yiq.z = yiq.y*sinA + yiq.z*cosA;
                return yiq2rgb(yiq);
            }
            vec3 hash33(vec3 p3) {
                p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
                p3 += dot(p3, p3.yxz + 19.19);
                return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z)*p3.zyx);
            }
            float snoise3(vec3 p) {
                const float K1 = 0.333333333; const float K2 = 0.166666667;
                vec3 i = floor(p + (p.x+p.y+p.z)*K1);
                vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
                vec3 e = step(vec3(0.0), d0 - d0.yzx);
                vec3 i1 = e*(1.0-e.zxy); vec3 i2 = 1.0-e.zxy*(1.0-e);
                vec3 d1 = d0-(i1-K2); vec3 d2 = d0-(i2-K1); vec3 d3 = d0-0.5;
                vec4 h = max(0.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.0);
                vec4 n = h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0)));
                return dot(vec4(31.316),n);
            }
            vec4 extractAlpha(vec3 colorIn) {
                float a = max(max(colorIn.r,colorIn.g),colorIn.b);
                return vec4(colorIn.rgb/(a+1e-5),a);
            }
            const vec3 baseColor1 = vec3(0.611765,0.262745,0.996078);
            const vec3 baseColor2 = vec3(0.298039,0.760784,0.913725);
            const vec3 baseColor3 = vec3(0.062745,0.078431,0.600000);
            const float innerRadius = 0.6;
            const float noiseScale = 0.65;
            float light1(float i,float a,float d){return i/(1.0+d*a);}
            float light2(float i,float a,float d){return i/(1.0+d*d*a);}
            vec4 draw(vec2 uv) {
                vec3 color1=adjustHue(baseColor1,hue);
                vec3 color2=adjustHue(baseColor2,hue);
                vec3 color3=adjustHue(baseColor3,hue);
                float ang=atan(uv.y,uv.x); float len=length(uv);
                float invLen=len>0.0?1.0/len:0.0;
                float bgLum=dot(backgroundColor,vec3(0.299,0.587,0.114));
                float n0=snoise3(vec3(uv*noiseScale,iTime*0.5))*0.5+0.5;
                float r0=mix(mix(innerRadius,1.0,0.4),mix(innerRadius,1.0,0.6),n0);
                float d0=distance(uv,(r0*invLen)*uv);
                float v0=light1(1.0,10.0,d0);
                v0*=smoothstep(r0*1.05,r0,len);
                float innerFade=smoothstep(r0*0.8,r0*0.95,len);
                v0*=mix(innerFade,1.0,bgLum*0.7);
                float cl=cos(ang+iTime*2.0)*0.5+0.5;
                float a=iTime*-1.0;
                vec2 pos=vec2(cos(a),sin(a))*r0;
                float d=distance(uv,pos);
                float v1=light2(1.5,5.0,d)*light1(1.0,50.0,d0);
                float v2=smoothstep(1.0,mix(innerRadius,1.0,n0*0.5),len);
                float v3=smoothstep(innerRadius,mix(innerRadius,1.0,0.5),len);
                vec3 colBase=mix(color1,color2,cl);
                float fadeAmount=mix(1.0,0.1,bgLum);
                vec3 darkCol=clamp((mix(color3,colBase,v0)+v1)*v2*v3,0.0,1.0);
                vec3 lightCol=clamp(mix(backgroundColor,colBase+v1,v0)*mix(1.0,v2*v3,fadeAmount),0.0,1.0);
                return extractAlpha(mix(darkCol,lightCol,bgLum));
            }
            void main() {
                vec2 center=iResolution.xy*0.5;
                float size=min(iResolution.x,iResolution.y);
                vec2 uv=(vUv*iResolution.xy-center)/size*2.0;
                float s=sin(rot); float c=cos(rot);
                uv=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);
                uv.x+=hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);
                uv.y+=hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);
                vec4 col=draw(uv);
                gl_FragColor=vec4(col.rgb*col.a,col.a);
            }
        `;

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new Vec3(300, 300, 1) },
                hue: { value: 0 },
                hover: { value: 0 },
                rot: { value: 0 },
                hoverIntensity: { value: 0.2 },
                // backgroundColor:  { value: new Vec3(1.0, 1.0, 1.0) },
            }
        });

        const mesh = new Mesh(gl, { geometry, program });

        // Resize
        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const w = container.clientWidth;
            const h = container.clientHeight;
            renderer.setSize(w * dpr, h * dpr);
            gl.canvas.style.width = w + 'px';
            gl.canvas.style.height = h + 'px';
            program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
        }
        window.addEventListener('resize', resize);
        resize();

        // Hover
        let targetHover = 0;
        let currentRot = 0;
        let lastTime = 0;

        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const uvX = ((e.clientX - rect.left - rect.width / 2) / Math.min(rect.width, rect.height)) * 2;
            const uvY = ((e.clientY - rect.top - rect.height / 2) / Math.min(rect.width, rect.height)) * 2;
            targetHover = Math.hypot(uvX, uvY) < 0.8 ? 1 : 0;
        });
        container.addEventListener('mouseleave', () => { targetHover = 0; });

        // Render loop
        (function loop(t) {
            requestAnimationFrame(loop);
            const dt = (t - lastTime) * 0.001;
            lastTime = t;
            program.uniforms.iTime.value = t * 0.001;
            program.uniforms.hover.value += (targetHover - program.uniforms.hover.value) * 0.1;
            if (targetHover > 0.5) currentRot += dt * 0.3;
            program.uniforms.rot.value = currentRot;
            renderer.render({ scene: mesh });
        })(0);

    } catch (err) {
        console.warn('WebGL Orb failed, using CSS fallback:', err);
        // CSS fallback sudah ada di parent .zora-orb
    }
}

// ─── SUGGESTION CARDS ────────────────────────────────────────────────────────

function bindSuggestionCards() {
    document.querySelectorAll('.suggestion-card').forEach((card) => {
        card.addEventListener('click', () => {
            const suggestion = card.dataset.suggestion;
            const input = qs('chatInput');
            if (input && suggestion) {
                input.value = suggestion;
                autoResizeTextarea();
                input.focus();
            }
        });
    });
}

// ─── NAV TOOLTIPS (collapsed sidebar) ────────────────────────────────────────

function applyNavTooltips() {
    document.querySelectorAll('.nav-item').forEach((item) => {
        const label = item.querySelector('.nav-label')?.textContent || item.title || '';
        if (label) item.setAttribute('title', label);
    });
}

// ─── SETTINGS FEATURES ───────────────────────────────────────────────────────

function bindSettingsFeatures() {

    // ── Language ─────────────────────────────────────────
    const langBtn = qs('languageBtn');
    const langSubmenu = qs('languageSubmenu');
    const currentLangLabel = qs('currentLangLabel');

    const savedLang = localStorage.getItem('zora_language') || 'en';
    const savedLabel = localStorage.getItem('zora_language_label') || 'EN';
    if (currentLangLabel) currentLangLabel.textContent = savedLabel;

    document.querySelectorAll('.lang-option').forEach((opt) => {
        if (opt.dataset.lang === savedLang) opt.classList.add('active');
    });

    langBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        langSubmenu?.classList.toggle('hidden');
    });

    document.querySelectorAll('.lang-option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = opt.dataset.lang;
            const label = opt.dataset.label;

            localStorage.setItem('zora_language', lang);
            localStorage.setItem('zora_language_label', label);
            if (currentLangLabel) currentLangLabel.textContent = label;

            document.querySelectorAll('.lang-option').forEach((o) => o.classList.remove('active'));
            opt.classList.add('active');

            langSubmenu?.classList.add('hidden');
            qs('settings-dropdown')?.classList.remove('visible');

            apiCallOrWarn('/settings/language', 'PUT', { language: lang });
        });
    });

    // ── Profile Settings ──────────────────────────────────
    const profileBtn = qs('profileSettingsBtn');
    const profileLB = qs('profileLightbox');
    const profileCancel = qs('profileCancelBtn');
    const profileSave = qs('profileSaveBtn');
    const nameInput = qs('profileNameInput');
    const avatarPreview = qs('profileAvatarPreview');
    const avatarInput = qs('avatarUploadInput');

    profileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        qs('settings-dropdown')?.classList.remove('visible');

        // Pre-fill current name
        if (nameInput) {
            nameInput.value = chatState.user?.display_name
                || chatState.user?.name || '';
        }

        // Pre-fill avatar preview
        if (avatarPreview) {
            const avatarEl = qs('profileAvatar');
            const img = avatarEl?.querySelector('img');
            if (img) {
                avatarPreview.innerHTML = `<img src="${img.src}" alt="avatar">`;
            } else {
                avatarPreview.textContent = (chatState.user?.display_name
                    || chatState.user?.name || 'Z')[0].toUpperCase();
            }
        }

        profileLB?.classList.remove('hidden');
    });

    profileCancel?.addEventListener('click', () => {
        profileLB?.classList.add('hidden');
    });

    profileLB?.addEventListener('click', (e) => {
        if (e.target === profileLB) profileLB.classList.add('hidden');
    });

    // Avatar upload preview
    avatarInput?.addEventListener('change', () => {
        const file = avatarInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (avatarPreview) {
                avatarPreview.innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
            }
        };
        reader.readAsDataURL(file);
    });

    profileSave?.addEventListener('click', async () => {
        const newName = nameInput?.value.trim();
        if (!newName) return;

        // Update local state
        if (chatState.user) {
            chatState.user.display_name = newName;
            chatState.user.name = newName;
        }

        // Update sidebar
        const nameEl = qs('profileName');
        if (nameEl) nameEl.textContent = newName;
        localStorage.setItem('zora_onboarding_name', newName);

        // Update avatar initial if no photo
        const avatarEl = qs('profileAvatar');
        const previewImg = avatarPreview?.querySelector('img');
        if (avatarEl) {
            if (previewImg) {
                avatarEl.innerHTML = `<img src="${previewImg.src}" alt="avatar">`;
            } else {
                avatarEl.textContent = newName[0].toUpperCase();
            }
        }

        updateGreeting();
        profileLB?.classList.add('hidden');

        await apiCallOrWarn('/settings/profile', 'PUT', { display_name: newName });
    });

    // ── FAQ ───────────────────────────────────────────────
    const faqBtn = qs('faqBtn');
    const faqLB = qs('faqLightbox');
    const faqClose = qs('faqCloseBtn');

    faqBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        qs('settings-dropdown')?.classList.remove('visible');
        faqLB?.classList.remove('hidden');
    });

    faqClose?.addEventListener('click', () => {
        faqLB?.classList.add('hidden');
    });

    faqLB?.addEventListener('click', (e) => {
        if (e.target === faqLB) faqLB.classList.add('hidden');
    });
}

document.addEventListener('DOMContentLoaded', bootstrapChat);
