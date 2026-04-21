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
    const sidebar = qs('chatSidebar');
    shell.classList.toggle('has-messages', chatState.messages.length > 0);
    sidebar.classList.toggle('collapsed', chatState.sidebarCollapsed);
    qs('incognitoButton').classList.toggle('active', chatState.incognito);
    qs('extendedToggle').classList.toggle('active', chatState.extended);
    qs('chatTitle').textContent = chatState.currentConversationTitle || 'Chat Title';
}

function saveSidebarState() {
    localStorage.setItem('zora_sidebar', chatState.sidebarCollapsed ? 'collapsed' : 'expanded');
}

function initializeSidebarState() {
    const stored = localStorage.getItem('zora_sidebar');
    if (window.innerWidth < 768) {
        chatState.sidebarCollapsed = true;
    } else {
        chatState.sidebarCollapsed = stored === 'collapsed';
    }
    updateShellState();
}

function toggleSidebar() {
    chatState.sidebarCollapsed = !chatState.sidebarCollapsed;
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

function closeSettingsDropdown() {
    qs('settings-dropdown')?.classList.add('hidden');
}

function createHistoryItem(conversation) {
    const item = document.createElement('div');
    item.className = 'chat-history-item';
    item.dataset.sessionId = conversation.id;
    if (String(chatState.currentConversationId) === String(conversation.id)) {
        item.classList.add('active');
    }
    if (conversation.starred) {
        item.classList.add('starred');
    }

    item.innerHTML = `
        <span class="chat-history-title">${truncateLine(conversation.title || 'New Chat')}</span>
        <button class="chat-item-menu-btn" type="button" aria-label="More options">
            <i class="fi fi-br-menu-dots-vertical"></i>
        </button>
        <div class="chat-item-dropdown hidden">
            <button class="chat-action-btn" type="button" data-action="star">
                <i class="fi fi-br-star"></i> Star
            </button>
            <button class="chat-action-btn" type="button" data-action="rename">
                <i class="fi fi-br-edit"></i> Rename
            </button>
            <button class="chat-action-btn" type="button" data-action="archive">
                <i class="fi fi-br-inbox"></i> Archive
            </button>
        </div>
    `;

    return item;
}

function renderConversationList() {
    const container = qs('conversationList');
    container.innerHTML = '';

    if (chatState.incognito) {
        container.innerHTML = '<p class="history-empty">Incognito mode hides chat history for this session.</p>';
        return;
    }

    if (!chatState.filteredConversations.length) {
        container.innerHTML = '<p class="history-empty">No chats yet. Start a conversation!</p>';
        return;
    }

    let currentGroup = '';
    let currentWrapper = null;

    chatState.filteredConversations.forEach((conversation) => {
        const label = getHistoryGroupLabel(conversation.created_at);
        if (label !== currentGroup) {
            currentGroup = label;
            const group = document.createElement('section');
            group.className = 'history-group';
            group.innerHTML = `<h3 class="history-group-label">${label}</h3>`;
            currentWrapper = document.createElement('div');
            group.appendChild(currentWrapper);
            container.appendChild(group);
        }

        currentWrapper.appendChild(createHistoryItem(conversation));
    });
}

function filterConversations(query = '') {
    const normalized = query.trim().toLowerCase();
    chatState.filteredConversations = chatState.conversations.filter((conversation) => {
        if (conversation.archived) {
            return false;
        }
        if (!normalized) {
            return true;
        }
        return (conversation.title || 'New Chat').toLowerCase().includes(normalized);
    });
    renderConversationList();
}

function updateUrl(conversationId = '') {
    const url = new URL(window.location.href);
    if (conversationId) {
        url.searchParams.set('conversation', conversationId);
    } else {
        url.searchParams.delete('conversation');
    }
    window.history.replaceState({}, '', url);
}

function createMessageElement(role, content) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role === 'assistant' ? 'zora-message' : 'user-message'}`;

    if (role === 'assistant') {
        wrapper.innerHTML = `
            <div class="msg-header">
                <img src="/assets/images/logo/logo.png" class="zora-msg-avatar" alt="ZORA AI logo">
                <span class="msg-sender">ZORA</span>
            </div>
            <div class="msg-content markdown-body"></div>
        `;
        wrapper.querySelector('.markdown-body').innerHTML = window.marked
            ? window.marked.parse(content || '')
            : content;
    } else {
        wrapper.innerHTML = `
            <span class="msg-sender">You</span>
            <div class="msg-content"></div>
        `;
        wrapper.querySelector('.msg-content').textContent = content || '';
    }

    return wrapper;
}

function renderMessages() {
    const list = qs('messageList');
    list.innerHTML = '';

    chatState.messages.forEach((message) => {
        list.appendChild(createMessageElement(message.role, message.content));
    });

    updateGreeting();
    updateShellState();
    scrollMessagesToBottom();
}

function appendMessage(role, content = '', options = {}) {
    const list = qs('messageList');
    const element = createMessageElement(role, content);
    list.appendChild(element);
    scrollMessagesToBottom();

    if (!options.skipStatePush) {
        chatState.messages.push({ role, content });
        updateShellState();
    }

    return element;
}

async function loadCurrentUser() {
    const token = getTokenOrRedirect();
    if (!token) {
        return false;
    }

    try {
        const response = await apiCall('/auth/me', 'GET', null, true);
        const user = getResponseData(response);
        const displayName = user.display_name || user.name || 'ZORA User';
        const avatar = qs('profileAvatar');
        chatState.user = user;
        qs('profileName').textContent = displayName;
        qs('profileEmail').textContent = truncateEmail(user.email || '');
        qs('settingsDropdownEmail').textContent = user.email || '';

        if (user.avatar_url) {
            avatar.innerHTML = `<img src="${user.avatar_url}" alt="${displayName} avatar">`;
            avatar.style.background = '#f0f0f0';
            avatar.style.color = '#111111';
        } else {
            avatar.textContent = displayName.charAt(0).toUpperCase();
            avatar.style.background = '#0099CC';
            avatar.style.color = '#FFFFFF';
        }

        updateGreeting();
        return true;
    } catch (_error) {
        localStorage.removeItem('zora_token');
        window.location.href = '/auth/login.html';
        return false;
    }
}

async function loadHistory() {
    try {
        const sessionResponse = await apiCallOrWarn('/chat/sessions', 'GET', null, true);
        const sessionData = getResponseData(sessionResponse);

        if (sessionResponse) {
            const sessions = Array.isArray(sessionData)
                ? sessionData
                : (sessionData.sessions || sessionData.conversations || []);
            chatState.conversations = sessions.filter((session) => !session.archived && !session.deleted);
        } else {
            const response = await apiCall('/chat/history', 'GET', null, true);
            const data = getResponseData(response);
            chatState.conversations = (Array.isArray(data)
                ? data
                : (data.conversations || data.history || [])
            ).filter((conversation) => !conversation.archived && !conversation.deleted);
        }
        filterConversations(qs('historySearch').value);
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

async function ensureConversation() {
    if (chatState.currentConversationId && !String(chatState.currentConversationId).startsWith('incognito-')) {
        return chatState.currentConversationId;
    }

    if (chatState.incognito) {
        chatState.currentConversationId = `incognito-${Date.now()}`;
        return chatState.currentConversationId;
    }

    const sessionResponse = await apiCallOrWarn('/chat/sessions', 'POST', {}, true);
    const sessionData = getResponseData(sessionResponse);

    if (sessionData.session_id) {
        chatState.currentConversationId = sessionData.session_id;
        chatState.currentConversationTitle = sessionData.title || 'New Chat';
    } else {
        const response = await apiCall('/chat/new', 'POST', { is_incognito: false }, true);
        const data = getResponseData(response);
        chatState.currentConversationId = data.conversation_id || data.session_id || null;
    }

    updateUrl(chatState.currentConversationId || '');
    return chatState.currentConversationId;
}

async function selectConversation(conversationId) {
    if (!conversationId || String(conversationId).startsWith('incognito-')) {
        return;
    }

    try {
        const response = await apiCall(`/chat/${conversationId}/messages`, 'GET', null, true);
        const data = getResponseData(response);
        chatState.currentConversationId = conversationId;
        chatState.currentConversationTitle = data.conversation?.title
            || chatState.conversations.find((conversation) => conversation.id === conversationId)?.title
            || 'Chat Title';
        chatState.messages = data.messages || [];
        renderMessages();
        updateUrl(conversationId);
        filterConversations(qs('historySearch').value);
    } catch (error) {
        console.error('Failed to select conversation:', error);
    }
}

function clearConversationState() {
    chatState.currentConversationId = null;
    chatState.currentConversationTitle = 'Chat Title';
    chatState.messages = [];
    qs('messageList').innerHTML = '';
    setTypingIndicator(false);
    closeAllHistoryDropdowns();
    updateShellState();
    updateUrl('');
}

function startNewChat() {
    clearConversationState();
    qs('chatInput').focus();
}

async function persistSessionPatch(sessionId, payload) {
    if (!sessionId || String(sessionId).startsWith('incognito-')) {
        return null;
    }
    return apiCallOrWarn(`/chat/sessions/${sessionId}`, 'PATCH', payload, true);
}

function updateConversationInState(sessionId, updates = {}) {
    const index = chatState.conversations.findIndex((conversation) => conversation.id === sessionId);
    if (index !== -1) {
        chatState.conversations[index] = {
            ...chatState.conversations[index],
            ...updates,
        };
    } else if (!updates.archived) {
        chatState.conversations.unshift({
            id: sessionId,
            title: updates.title || 'New Chat',
            created_at: new Date().toISOString(),
            ...updates,
        });
    }

    if (chatState.currentConversationId === sessionId && updates.title) {
        chatState.currentConversationTitle = updates.title;
    }

    filterConversations(qs('historySearch').value);
    updateShellState();
}

function getFallbackGeneratedTitle(message) {
    return truncateLine(message, 40) || 'New Chat';
}

async function maybeGenerateSessionTitle(firstMessage) {
    if (chatState.incognito || !chatState.currentConversationId || String(chatState.currentConversationId).startsWith('incognito-')) {
        return;
    }

    const endpoint = `/chat/sessions/${chatState.currentConversationId}/generate-title`;
    const response = await apiCallOrWarn(endpoint, 'POST', { first_message: firstMessage }, true);
    const data = getResponseData(response);
    const nextTitle = data.title || getFallbackGeneratedTitle(firstMessage);
    updateConversationInState(chatState.currentConversationId, { title: nextTitle });
}

async function renameCurrentChat() {
    const nextTitle = window.prompt('Rename chat title', chatState.currentConversationTitle || 'Chat Title');
    if (nextTitle && nextTitle.trim()) {
        const title = nextTitle.trim();
        updateConversationInState(chatState.currentConversationId, { title });
        await persistSessionPatch(chatState.currentConversationId, { title });
    }
}

function parseSseChunk(buffer, onEvent) {
    const parts = buffer.split('\n\n');
    const remainder = parts.pop();

    parts.forEach((part) => {
        if (!part.trim()) {
            return;
        }

        let eventName = 'message';
        let data = '';

        part.split('\n').forEach((line) => {
            if (line.startsWith('event:')) {
                eventName = line.replace('event:', '').trim();
            }
            if (line.startsWith('data:')) {
                data += line.replace('data:', '').trim();
            }
        });

        if (data) {
            onEvent(eventName, JSON.parse(data));
        }
    });

    return remainder || '';
}

async function streamAssistantReply(message, options = {}) {
    const sessionId = await ensureConversation();
    setTypingIndicator(true);

    if (!chatState.incognito && sessionId) {
        updateConversationInState(sessionId, {
            title: chatState.currentConversationTitle || 'New Chat',
        });
    }

    const assistantNode = appendMessage('assistant', '', { skipStatePush: true });
    const markdownNode = assistantNode.querySelector('.markdown-body');

    const response = await fetch(`${window.BASE_URL}/chat/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${localStorage.getItem('zora_token') || ''}`,
        },
        body: JSON.stringify({
            conversation_id: chatState.incognito ? null : chatState.currentConversationId,
            message,
            extended_thinking: chatState.extended,
            incognito: chatState.incognito,
        }),
    });

    if (!response.ok || !response.body) {
        throw new Error('Unable to stream response from ZORA.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantText = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseChunk(buffer, (eventName, payload) => {
            if (eventName === 'metadata') {
                if (!chatState.incognito && payload.conversation_id) {
                    chatState.currentConversationId = payload.conversation_id;
                    updateUrl(payload.conversation_id);
                }
                chatState.currentConversationTitle = payload.title || chatState.currentConversationTitle;
                if (!chatState.incognito && chatState.currentConversationId) {
                    updateConversationInState(chatState.currentConversationId, {
                        title: chatState.currentConversationTitle || 'New Chat',
                    });
                }
                updateShellState();
            }

            if (eventName === 'chunk') {
                assistantText += payload.delta || '';
                markdownNode.innerHTML = window.marked
                    ? window.marked.parse(assistantText)
                    : assistantText;
                scrollMessagesToBottom();
            }

            if (eventName === 'done') {
                assistantText = payload.message || assistantText;
                markdownNode.innerHTML = window.marked
                    ? window.marked.parse(assistantText)
                    : assistantText;
            }
        });
    }

    chatState.messages.push({ role: 'assistant', content: assistantText });
    setTypingIndicator(false);
    updateShellState();

    if (!chatState.incognito) {
        if (options.isFirstMessageInNewChat) {
            await maybeGenerateSessionTitle(message);
        }
        await loadHistory();
    }
}

async function sendMessage() {
    if (chatState.isStreaming) {
        return;
    }

    const input = qs('chatInput');
    const message = input.value.trim();
    if (!message) {
        return;
    }

    chatState.isStreaming = true;
    const isFirstMessageInNewChat = !chatState.incognito && chatState.messages.length === 0;
    appendMessage('user', message);
    input.value = '';
    autoResizeTextarea();

    try {
        await streamAssistantReply(message, { isFirstMessageInNewChat });
    } catch (error) {
        console.error('Send failed:', error);
        setTypingIndicator(false);
    } finally {
        chatState.isStreaming = false;
    }
}

function bindSuggestionCards() {
    document.querySelectorAll('.suggestion-card').forEach((card) => {
        card.addEventListener('click', () => {
            qs('chatInput').value = card.dataset.suggestion || '';
            autoResizeTextarea();
            qs('chatInput').focus();
        });
    });
}

function bindOrbBehavior() {
    const orb = qs('zoraOrb');
    if (!orb) {
        return;
    }

    document.addEventListener('mousemove', (event) => {
        const rect = orb.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx);
        const dist = Math.min(8, Math.hypot(event.clientX - cx, event.clientY - cy) / 20);
        const ox = Math.cos(angle) * dist;
        const oy = Math.sin(angle) * dist;

        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.style.transform = `translate(${ox}px, ${oy}px)`;
        });
    });

    document.addEventListener('mouseleave', () => {
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.style.transform = 'translate(0px, 0px)';
        });
    });

    window.setInterval(() => {
        document.querySelectorAll('.orb-eye').forEach((eye) => {
            eye.classList.add('blinking');
            window.setTimeout(() => eye.classList.remove('blinking'), 300);
        });
    }, 6000);
}

async function handleHistoryAction(action, sessionId, item) {
    if (!sessionId || !item) {
        return;
    }

    if (action === 'star') {
        const starred = !item.classList.contains('starred');
        item.classList.toggle('starred', starred);
        updateConversationInState(sessionId, { starred });
        await persistSessionPatch(sessionId, { starred });
        return;
    }

    if (action === 'rename') {
        const titleNode = item.querySelector('.chat-history-title');
        if (!titleNode) {
            return;
        }

        const currentTitle = titleNode.textContent || 'New Chat';
        const input = document.createElement('input');
        input.className = 'rename-input';
        input.value = currentTitle;
        titleNode.replaceWith(input);
        input.focus();
        input.select();

        let saved = false;
        const saveRename = async () => {
            if (saved) {
                return;
            }
            saved = true;
            const nextTitle = (input.value || '').trim() || currentTitle;
            const span = document.createElement('span');
            span.className = 'chat-history-title';
            span.textContent = truncateLine(nextTitle);
            input.replaceWith(span);
            updateConversationInState(sessionId, { title: nextTitle });
            await persistSessionPatch(sessionId, { title: nextTitle });
        };

        input.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await saveRename();
            }
        }, { once: true });

        input.addEventListener('blur', async () => {
            await saveRename();
        }, { once: true });

        return;
    }

    if (action === 'archive') {
        const response = await persistSessionPatch(sessionId, { archived: true });
        if (!response) {
            console.warn(`Archive skipped for session ${sessionId}`);
            return;
        }

        item.classList.add('archiving');
        window.setTimeout(() => {
            updateConversationInState(sessionId, { archived: true });
            item.remove();
        }, 300);
        return;
    }

    if (action === 'delete') {
        const response = await apiCallOrWarn(`/chat/sessions/${sessionId}`, 'DELETE', null, true);
        if (!response) {
            console.warn(`Delete skipped for session ${sessionId}`);
            return;
        }

        item.classList.add('archiving');
        window.setTimeout(() => {
            chatState.conversations = chatState.conversations.filter((conversation) => String(conversation.id) !== String(sessionId));
            filterConversations(qs('historySearch').value);
            item.remove();
        }, 300);
    }
}

function applyNavTooltips() {
    document.querySelectorAll('.nav-item').forEach((item) => {
        const label = item.querySelector('.nav-label')?.textContent;
        if (label) {
            item.setAttribute('title', label);
        }
    });
}

function bindHistoryMenu() {
    qs('conversationList').addEventListener('click', async (event) => {
        const menuButton = event.target.closest('.chat-item-menu-btn');
        if (menuButton) {
            event.stopPropagation();
            const item = menuButton.closest('.chat-history-item');
            const dropdown = item?.querySelector('.chat-item-dropdown');
            const isHidden = dropdown?.classList.contains('hidden');
            closeAllHistoryDropdowns();
            if (item && dropdown && isHidden) {
                item.classList.add('menu-open');
                dropdown.classList.remove('hidden');
            }
            return;
        }

        const actionButton = event.target.closest('.chat-action-btn');
        if (actionButton) {
            event.stopPropagation();
            const item = actionButton.closest('.chat-history-item');
            const sessionId = item?.dataset.sessionId;
            closeAllHistoryDropdowns();
            await handleHistoryAction(actionButton.dataset.action, sessionId, item);
            return;
        }

        const historyItem = event.target.closest('.chat-history-item');
        if (historyItem) {
            await selectConversation(historyItem.dataset.sessionId);
        }
    });
}

async function logoutUser() {
    await apiCallOrWarn('/auth/logout', 'POST', {}, true);
    localStorage.removeItem('zora_token');
    window.location.href = '/auth/login.html';
}

function bindSettingsDropdown() {
    qs('settingsGearButton').addEventListener('click', (event) => {
        event.stopPropagation();
        qs('settings-dropdown').classList.toggle('hidden');
    });

    qs('settings-dropdown').addEventListener('click', async (event) => {
        const actionButton = event.target.closest('.settings-action-btn');
        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.action;
        if (action === 'settings') {
            window.location.href = '/settings/index.html';
            return;
        }

        if (action === 'logout') {
            await logoutUser();
        }
    });
}

function bindEvents() {
    qs('sidebar-toggle-btn').addEventListener('click', toggleSidebar);
    qs('historySearch').addEventListener('input', (event) => filterConversations(event.target.value));
    qs('chatTitleButton').addEventListener('click', renameCurrentChat);
    qs('newChatIconButton').addEventListener('click', startNewChat);
    qs('incognitoButton').addEventListener('click', () => {
        chatState.incognito = !chatState.incognito;
        clearConversationState();
        updateShellState();
        filterConversations(qs('historySearch').value);
    });
    qs('extendedToggle').addEventListener('click', () => {
        chatState.extended = !chatState.extended;
        updateShellState();
    });
    qs('voiceButton').addEventListener('click', () => console.info('Voice input is not connected yet.'));
    qs('attachButton').addEventListener('click', () => console.info('Attachment UI is not connected yet.'));
    qs('chatInput').addEventListener('input', autoResizeTextarea);
    qs('chatInput').addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            await sendMessage();
        }
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.chat-history-item')) {
            closeAllHistoryDropdowns();
        }
        if (!event.target.closest('.user-profile-section')) {
            closeSettingsDropdown();
        }
    });

    window.addEventListener('resize', initializeSidebarState);
    applyNavTooltips();
    bindHistoryMenu();
    bindSettingsDropdown();
    bindSuggestionCards();
    bindOrbBehavior();
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

document.addEventListener('DOMContentLoaded', bootstrapChat);
