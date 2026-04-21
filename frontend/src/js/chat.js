/**
 * ZORA AI - Chat Module
 * =====================
 * Vanilla JS controller for chat history, streaming, and composer state.
 */

const chatState = {
    user: null,
    conversations: [],
    filteredConversations: [],
    messages: [],
    currentConversationId: null,
    currentConversationTitle: 'New Chat',
    incognito: false,
    extendedThinking: false,
    isStreaming: false
};

function qs(id) {
    return document.getElementById(id);
}

function setComposerStatus(message = '') {
    qs('composerStatus').textContent = message;
}

function getDisplayName() {
    return localStorage.getItem('zora_onboarding_name')
        || chatState.user?.name
        || 'there';
}

function updateLayoutState() {
    const app = qs('chatApp');
    const incognitoButton = qs('incognitoButton');
    const extendedThinkingButton = qs('extendedThinkingButton');

    app.classList.toggle('is-incognito', chatState.incognito);
    incognitoButton.classList.toggle('is-active', chatState.incognito);
    extendedThinkingButton.classList.toggle('is-active', chatState.extendedThinking);
}

function updateHeader(title = 'New Chat') {
    chatState.currentConversationTitle = title;
    qs('chatTitle').textContent = title;
}

function updateEmptyState() {
    const emptyState = qs('emptyState');
    const messageList = qs('messageList');
    const greeting = qs('emptyGreeting');

    greeting.textContent = `What shall we do, ${getDisplayName()}?`;
    emptyState.classList.toggle('hidden', chatState.messages.length > 0);
    messageList.innerHTML = '';

    chatState.messages.forEach((message) => {
        appendMessageBubble(message.role, message.content);
    });
}

function appendMessageBubble(role, content = '', options = {}) {
    const messageList = qs('messageList');
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    if (role === 'assistant') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'Z';
        row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;
    row.appendChild(bubble);

    if (role === 'user') {
        row.appendChild(document.createElement('div'));
    }

    messageList.appendChild(row);
    scrollToBottom();

    if (options.returnBubble) {
        return bubble;
    }

    return null;
}

function setTypingIndicator(visible) {
    qs('typingIndicator').classList.toggle('hidden', !visible);
    scrollToBottom();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        qs('chatFeed').scrollTop = qs('chatFeed').scrollHeight;
    });
}

function autoResizeTextarea() {
    const input = qs('chatInput');
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
}

function renderConversationList() {
    const container = qs('conversationList');
    const items = chatState.filteredConversations;

    if (chatState.incognito) {
        container.innerHTML = '<div class="sidebar-empty">Incognito mode hides conversation history for this session.</div>';
        return;
    }

    if (!items.length) {
        container.innerHTML = '<div class="sidebar-empty">No saved conversations yet.</div>';
        return;
    }

    container.innerHTML = '';

    items.forEach((conversation) => {
        const wrapper = document.createElement('div');
        wrapper.className = `conversation-item ${chatState.currentConversationId === conversation.id ? 'is-active' : ''}`;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'conversation-delete';
        deleteButton.textContent = '×';
        deleteButton.addEventListener('click', async (event) => {
            event.stopPropagation();
            await deleteConversation(conversation.id);
        });

        wrapper.innerHTML = `
            <div>
                <span class="conversation-title">${conversation.title || 'New Chat'}</span>
                <span class="conversation-meta">${new Date(conversation.created_at).toLocaleString()}</span>
            </div>
        `;
        wrapper.appendChild(deleteButton);
        wrapper.addEventListener('click', () => selectConversation(conversation.id));

        container.appendChild(wrapper);
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

async function loadCurrentUser() {
    const user = await requireAuth();
    if (!user) {
        return;
    }

    chatState.user = user;
    qs('profileName').textContent = localStorage.getItem('zora_onboarding_name') || user.name || 'ZORA User';
    qs('profileEmail').textContent = user.email || '';
    qs('profileAvatar').textContent = (qs('profileName').textContent || 'Z').charAt(0).toUpperCase();
}

async function loadHistory() {
    try {
        const response = await apiCall('/chat/history', 'GET', null, true);
        chatState.conversations = response.data.conversations || [];
        filterConversations(qs('historySearch').value);
    } catch (error) {
        setComposerStatus(error.message || 'Unable to load chat history.');
    }
}

async function selectConversation(conversationId) {
    if (!conversationId || conversationId.startsWith('incognito-')) {
        return;
    }

    try {
        const response = await apiCall(`/chat/${conversationId}/messages`, 'GET', null, true);
        chatState.currentConversationId = conversationId;
        chatState.messages = response.data.messages || [];
        updateHeader(response.data.conversation?.title || 'New Chat');
        updateUrl(conversationId);
        updateEmptyState();
        filterConversations(qs('historySearch').value);
    } catch (error) {
        setComposerStatus(error.message || 'Unable to load the conversation.');
    }
}

async function createNewChat() {
    setComposerStatus('');
    chatState.messages = [];
    updateHeader(chatState.incognito ? 'Incognito Chat' : 'New Chat');

    try {
        const response = await apiCall('/chat/new', 'POST', { is_incognito: chatState.incognito }, true);
        chatState.currentConversationId = response.data.conversation_id;
        updateUrl(chatState.incognito ? '' : chatState.currentConversationId);
        updateEmptyState();
        if (!chatState.incognito) {
            await loadHistory();
        }
        filterConversations(qs('historySearch').value);
    } catch (error) {
        setComposerStatus(error.message || 'Unable to start a new chat.');
    }
}

async function deleteConversation(conversationId) {
    try {
        await apiCall(`/chat/${conversationId}`, 'DELETE', null, true);
        chatState.conversations = chatState.conversations.filter((item) => item.id !== conversationId);
        if (chatState.currentConversationId === conversationId) {
            chatState.currentConversationId = null;
            chatState.messages = [];
            updateHeader('New Chat');
            updateUrl('');
            updateEmptyState();
        }
        filterConversations(qs('historySearch').value);
    } catch (error) {
        setComposerStatus(error.message || 'Unable to delete the conversation.');
    }
}

async function ensureConversationForSend() {
    if (chatState.currentConversationId) {
        return;
    }

    if (chatState.incognito) {
        chatState.currentConversationId = `incognito-${Date.now()}`;
        return;
    }

    await createNewChat();
}

function parseSsePayload(buffer, onEvent) {
    const chunks = buffer.split('\n\n');
    const remainder = chunks.pop();

    chunks.forEach((chunk) => {
        if (!chunk.trim()) {
            return;
        }

        const lines = chunk.split('\n');
        let eventName = 'message';
        let data = '';

        lines.forEach((line) => {
            if (line.startsWith('event:')) {
                eventName = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
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
    await ensureConversationForSend();

    const assistantBubble = appendMessageBubble('assistant', '', { returnBubble: true });
    setTypingIndicator(true);
    setComposerStatus('');

    const response = await fetch(`${window.BASE_URL}/chat/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${localStorage.getItem('zora_token')}`
        },
        body: JSON.stringify({
            conversation_id: chatState.incognito ? null : chatState.currentConversationId,
            message,
            extended_thinking: chatState.extendedThinking,
            incognito: chatState.incognito
        })
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
        buffer = parseSsePayload(buffer, (eventName, payload) => {
            if (eventName === 'metadata') {
                if (!chatState.incognito && payload.conversation_id) {
                    chatState.currentConversationId = payload.conversation_id;
                    updateUrl(payload.conversation_id);
                }
                updateHeader(payload.title || chatState.currentConversationTitle);
            }

            if (eventName === 'chunk') {
                assistantText += payload.delta || '';
                assistantBubble.textContent = assistantText;
                scrollToBottom();
            }

            if (eventName === 'done') {
                assistantText = payload.message || assistantText;
                assistantBubble.textContent = assistantText;
            }

            if (eventName === 'error') {
                throw new Error(payload.message || 'Streaming error.');
            }
        });
    }

    chatState.messages.push({ role: 'assistant', content: assistantText });
    setTypingIndicator(false);

    if (!chatState.incognito) {
        await loadHistory();
    }
}

async function handleSendMessage() {
    if (chatState.isStreaming) {
        return;
    }

    const input = qs('chatInput');
    const message = input.value.trim();

    if (!message) {
        return;
    }

    chatState.isStreaming = true;
    chatState.messages.push({ role: 'user', content: message });
    updateEmptyState();
    input.value = '';
    autoResizeTextarea();

    try {
        await streamAssistantReply(message);
    } catch (error) {
        setTypingIndicator(false);
        setComposerStatus(error.message || 'Unable to complete the request.');
    } finally {
        chatState.isStreaming = false;
    }
}

function bindUi() {
    qs('composerForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleSendMessage();
    });

    qs('chatInput').addEventListener('input', autoResizeTextarea);
    qs('chatInput').addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            await handleSendMessage();
        }
    });

    qs('newChatButton').addEventListener('click', createNewChat);
    qs('historySearch').addEventListener('input', (event) => {
        filterConversations(event.target.value);
    });

    qs('extendedThinkingButton').addEventListener('click', () => {
        chatState.extendedThinking = !chatState.extendedThinking;
        updateLayoutState();
    });

    qs('incognitoButton').addEventListener('click', async () => {
        chatState.incognito = !chatState.incognito;
        chatState.currentConversationId = null;
        chatState.messages = [];
        updateHeader(chatState.incognito ? 'Incognito Chat' : 'New Chat');
        updateUrl('');
        updateLayoutState();
        updateEmptyState();
        filterConversations(qs('historySearch').value);
    });

    qs('voiceButton').addEventListener('click', () => {
        setComposerStatus('Voice note UI is not connected yet.');
    });

    document.querySelectorAll('.suggestion-card').forEach((button) => {
        button.addEventListener('click', () => {
            qs('chatInput').value = button.dataset.prompt || '';
            autoResizeTextarea();
            qs('chatInput').focus();
        });
    });
}

async function bootstrapChat() {
    await loadCurrentUser();
    bindUi();
    updateLayoutState();
    updateEmptyState();
    autoResizeTextarea();
    await loadHistory();

    const initialConversation = new URL(window.location.href).searchParams.get('conversation');
    if (initialConversation) {
        await selectConversation(initialConversation);
    }
}

document.addEventListener('DOMContentLoaded', bootstrapChat);
