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
    const mobile = window.innerWidth < 768;
    shell.classList.toggle('has-messages', chatState.messages.length > 0);
    shell.classList.toggle('sidebar-collapsed', !mobile && chatState.sidebarCollapsed);
    shell.classList.toggle('sidebar-open-mobile', mobile && !chatState.sidebarCollapsed);
    qs('incognitoButton').classList.toggle('active', chatState.incognito);
    qs('extendedToggle').classList.toggle('active', chatState.extended);
    qs('chatTitle').textContent = chatState.currentConversationTitle || 'Chat Title';
}

function saveSidebarState() {
    localStorage.setItem('zora_sidebar', chatState.sidebarCollapsed ? 'collapsed' : 'open');
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

function renderConversationList() {
    const container = qs('conversationList');
    container.innerHTML = '';

    if (chatState.incognito) {
        container.innerHTML = '<p class="history-empty">Incognito mode hides chat history for this session.</p>';
        return;
    }

    if (!chatState.filteredConversations.length) {
        container.innerHTML = '<p class="history-empty">No chats yet. Start a new conversation.</p>';
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

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'history-item';
        if (chatState.currentConversationId === conversation.id) {
            item.classList.add('active');
        }
        item.textContent = truncateLine(conversation.title || 'New Chat');
        item.addEventListener('click', () => selectConversation(conversation.id));
        currentWrapper.appendChild(item);
    });
}

function filterConversations(query = '') {
    const normalized = query.trim().toLowerCase();
    chatState.filteredConversations = chatState.conversations.filter((conversation) => {
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
        const user = response.data || {};
        chatState.user = user;
        qs('profileName').textContent = user.name || 'ZORA User';
        qs('profileEmail').textContent = user.email || '';
        qs('profileAvatar').textContent = (user.name || 'Z').charAt(0).toUpperCase();
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
        const response = await apiCall('/chat/history', 'GET', null, true);
        chatState.conversations = response.data?.conversations || [];
        filterConversations(qs('historySearch').value);
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

async function ensureConversation() {
    if (chatState.currentConversationId && !String(chatState.currentConversationId).startsWith('incognito-')) {
        return;
    }

    if (chatState.incognito) {
        chatState.currentConversationId = `incognito-${Date.now()}`;
        return;
    }

    const response = await apiCall('/chat/new', 'POST', { is_incognito: false }, true);
    chatState.currentConversationId = response.data?.conversation_id || null;
    updateUrl(chatState.currentConversationId || '');
}

async function selectConversation(conversationId) {
    if (!conversationId || String(conversationId).startsWith('incognito-')) {
        return;
    }

    try {
        const response = await apiCall(`/chat/${conversationId}/messages`, 'GET', null, true);
        chatState.currentConversationId = conversationId;
        chatState.currentConversationTitle = response.data?.conversation?.title || 'Chat Title';
        chatState.messages = response.data?.messages || [];
        renderMessages();
        updateUrl(conversationId);
        filterConversations(qs('historySearch').value);
        if (window.innerWidth < 768) {
            chatState.sidebarCollapsed = true;
            updateShellState();
        }
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
    updateShellState();
    updateUrl('');
}

function startNewChat() {
    clearConversationState();
    qs('chatInput').focus();
}

function renameCurrentChat() {
    const nextTitle = window.prompt('Rename chat title', chatState.currentConversationTitle || 'Chat Title');
    if (nextTitle && nextTitle.trim()) {
        chatState.currentConversationTitle = nextTitle.trim();
        updateShellState();
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

async function streamAssistantReply(message) {
    await ensureConversation();
    setTypingIndicator(true);

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
    appendMessage('user', message);
    input.value = '';
    autoResizeTextarea();

    try {
        await streamAssistantReply(message);
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

function bindEvents() {
    qs('sidebarToggle').addEventListener('click', toggleSidebar);
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

    window.addEventListener('resize', initializeSidebarState);
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
