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

function updateGreeting() {
    qs('welcomeLineOne').textContent = `${getGreetingLabel()}, ${getDisplayName()}!`;
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
    qs('chatTitle').textContent = chatState.currentConversationTitle || 'Chat Title';
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

        // Action: Star
        const starBtn = e.target.closest('[data-action="star"]');
        if (starBtn) {
            e.stopPropagation();
            const item = starBtn.closest('.chat-history-item');
            item.classList.toggle('starred');
            const isStarred = item.classList.contains('starred');

            // Update dropdown icon & label
            const dropIcon = starBtn.querySelector('i');
            const dropLabel = starBtn.querySelector('span');
            if (dropIcon) dropIcon.className = isStarred ? 'fi fi-sr-star' : 'fi fi-rr-star';
            if (dropIcon) dropIcon.style.color = isStarred ? '#0099CC' : '';
            if (dropLabel) dropLabel.textContent = isStarred ? 'Unstar' : 'Star';

            // Update star indicator visibility (handled by CSS .starred class)
            closeAllHistoryDropdowns();
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

    qs('historySearch')?.addEventListener('input', (event) => filterConversations(event.target.value));
    qs('chatTitleButton')?.addEventListener('click', renameCurrentChat);
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
                <i class="fi fi-sr-star item-star-indicator"></i>
                <button class="item-menu-btn" type="button" aria-label="More options">•••</button>
                <div class="chat-item-dropdown hidden">
                    <div class="chat-item-action" data-action="star">
                        <i class="fi fi-rr-star"></i> <span>Star</span>
                    </div>
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
    if (!chatState.currentConversationId) return;
    const newTitle = prompt('Rename chat:', chatState.currentConversationTitle);
    if (!newTitle?.trim()) return;
    chatState.currentConversationTitle = newTitle.trim();
    updateShellState();
    await apiCallOrWarn(
        `/chat/${chatState.currentConversationId}/rename`,
        'PUT',
        { title: newTitle.trim() }
    );
    await loadHistory();
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
    if (!orb) return;

    // Cursor tracking
    document.addEventListener('mousemove', (e) => {
        const rect = orb.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const dist = Math.min(8, Math.hypot(e.clientX - cx, e.clientY - cy) / 20);
        const ox = Math.cos(angle) * dist;
        const oy = Math.sin(angle) * dist;

        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.style.transform = `translate(${ox}px, ${oy}px)`;
        });
    });

    // Reset eyes when cursor leaves window
    document.addEventListener('mouseleave', () => {
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.style.transform = 'translate(0px, 0px)';
        });
    });

    // Blink every 6 seconds
    setInterval(() => {
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.classList.add('blinking');
            setTimeout(() => eye.classList.remove('blinking'), 300);
        });
    }, 6000);
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

document.addEventListener('DOMContentLoaded', bootstrapChat);
