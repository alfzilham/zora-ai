/**
 * ZORA AI - Chat Module
 * Complete rebuild with theme support, orb tracking, and chat functionality
 */

// State Management
const state = {
    user: null,
    conversations: [],
    currentConversationId: null,
    messages: [],
    isIncognito: false,
    isExtendedThinking: false,
    isStreaming: false,
    sidebarCollapsed: false
};

// Utility Functions
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/**
 * Theme Management
 */
function initTheme() {
    const savedTheme = localStorage.getItem('zora_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('zora_theme', isLight ? 'light' : 'dark');
}

function isLightMode() {
    return document.body.classList.contains('light-mode');
}

/**
 * Time-based Greeting
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}

function updateGreeting() {
    const userName = state.user?.name || localStorage.getItem('zora_onboarding_name') || 'there';
    const greetingEl = $('greetingText');
    if (greetingEl) {
        greetingEl.textContent = `${getGreeting()}, ${userName}!`;
    }
}

/**
 * Orb Cursor Tracking
 */
function initOrbTracking() {
    const orb = $('zora-orb');
    if (!orb) return;

    document.addEventListener('mousemove', (e) => {
        const rect = orb.getBoundingClientRect();
        const orbCenterX = rect.left + rect.width / 2;
        const orbCenterY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - orbCenterY, e.clientX - orbCenterX);
        const distance = Math.min(8, Math.hypot(e.clientX - orbCenterX, e.clientY - orbCenterY) / 20);

        const eyeOffsetX = Math.cos(angle) * distance;
        const eyeOffsetY = Math.sin(angle) * distance;

        $$('.orb-eye').forEach(eye => {
            eye.style.transform = `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`;
        });
    });
}

/**
 * Orb Blinking Animation
 */
function initOrbBlinking() {
    setInterval(() => {
        $$('.orb-eye').forEach(eye => {
            eye.classList.add('blinking');
            setTimeout(() => eye.classList.remove('blinking'), 300);
        });
    }, 6000);
}

/**
 * Authentication Check
 */
async function checkAuth() {
    const token = localStorage.getItem('zora_token');
    if (!token) {
        window.location.href = '/auth/login.html';
        return null;
    }
    return token;
}

/**
 * Load Current User
 */
async function loadUser() {
    try {
        const token = await checkAuth();
        if (!token) return;

        const response = await apiCall('/auth/me', 'GET', null, true);
        state.user = response.data || response;

        updateUserProfile();
        updateGreeting();
    } catch (error) {
        console.error('Failed to load user:', error);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            localStorage.removeItem('zora_token');
            window.location.href = '/auth/login.html';
        }
    }
}

function updateUserProfile() {
    if (!state.user) return;

    const displayName = localStorage.getItem('zora_onboarding_name') || state.user.name || 'User';
    const email = state.user.email || '';
    const initial = displayName.charAt(0).toUpperCase();

    const nameEl = $('userName');
    const emailEl = $('userEmail');
    const avatarEl = $('userAvatar');

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = initial;
}

/**
 * Chat History Management
 */
async function loadChatHistory() {
    if (state.isIncognito) {
        renderChatHistory([]);
        return;
    }

    try {
        const response = await apiCall('/chat/history', 'GET', null, true);
        state.conversations = response.data?.conversations || response.conversations || [];
        renderChatHistory(state.conversations);
    } catch (error) {
        console.error('Failed to load chat history:', error);
        renderChatHistory([]);
    }
}

function renderChatHistory(conversations) {
    const container = $('chatHistory');
    if (!container) return;

    if (state.isIncognito) {
        container.innerHTML = '<div class="history-group"><div class="history-group-label">Incognito Mode</div><div class="history-item">No history saved in this mode</div></div>';
        return;
    }

    if (!conversations || conversations.length === 0) {
        container.innerHTML = '<div class="history-group"><div class="history-item" style="opacity:0.6;cursor:default;">No chat history yet</div></div>';
        return;
    }

    // Group conversations by date
    const groups = groupConversationsByDate(conversations);

    container.innerHTML = Object.entries(groups).map(([label, items]) => `
        <div class="history-group">
            <div class="history-group-label">${label}</div>
            ${items.map(conv => `
                <div class="history-item ${conv.id === state.currentConversationId ? 'active' : ''}"
                     data-conversation-id="${conv.id}"
                     title="${escapeHtml(conv.title || 'New Chat')}">
                    ${escapeHtml(conv.title || 'New Chat')}
                </div>
            `).join('')}
        </div>
    `).join('');

    // Add click handlers
    $$('.history-item[data-conversation-id]').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.conversationId;
            if (id) loadConversation(id);
        });
    });
}

function groupConversationsByDate(conversations) {
    const groups = {};
    const now = new Date();

    conversations.forEach(conv => {
        const date = new Date(conv.created_at);
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        let label;
        if (diffDays === 0) label = 'Today';
        else if (diffDays === 1) label = 'Yesterday';
        else if (diffDays < 7) label = `${diffDays} days ago`;
        else if (diffDays < 30) label = `${Math.floor(diffDays / 7)} weeks ago`;
        else label = `${Math.floor(diffDays / 30)} months ago`;

        if (!groups[label]) groups[label] = [];
        groups[label].push(conv);
    });

    return groups;
}

async function loadConversation(id) {
    if (!id || id.startsWith('incognito-')) return;

    try {
        const response = await apiCall(`/chat/${id}/messages`, 'GET', null, true);
        state.currentConversationId = id;
        state.messages = response.data?.messages || response.messages || [];

        const conversation = state.conversations.find(c => c.id === id);
        updateChatTitle(conversation?.title || 'Chat');

        showChatView();
        renderMessages();
        renderChatHistory(state.conversations);
    } catch (error) {
        console.error('Failed to load conversation:', error);
        showStatus('Failed to load conversation');
    }
}

function updateChatTitle(title) {
    const titleEl = $('chatTitle');
    if (titleEl) titleEl.textContent = title || 'New Chat';
}

/**
 * Chat View Management
 */
function showWelcomeView() {
    const welcome = $('welcomeState');
    const chatMessages = $('chatMessages');
    const suggestions = $('suggestionsContainer');

    if (welcome) welcome.classList.remove('hidden');
    if (chatMessages) chatMessages.classList.add('hidden');
    if (suggestions) suggestions.classList.remove('hidden');
}

function showChatView() {
    const welcome = $('welcomeState');
    const chatMessages = $('chatMessages');
    const suggestions = $('suggestionsContainer');

    if (welcome) welcome.classList.add('hidden');
    if (chatMessages) chatMessages.classList.remove('hidden');
    if (suggestions) suggestions.classList.add('hidden');
}

function renderMessages() {
    const container = $('chatMessages');
    if (!container) return;

    container.innerHTML = state.messages.map(msg => {
        const isUser = msg.role === 'user';
        return `
            <div class="message ${isUser ? 'user-message' : 'zora-message'} fade-in">
                ${!isUser ? `
                    <div class="message-header">
                        <img src="/assets/images/logo/logo.png" alt="ZORA" class="zora-avatar">
                        <span class="message-label">ZORA</span>
                    </div>
                ` : `
                    <div class="message-header" style="justify-content: flex-end;">
                        <span class="message-label">You</span>
                    </div>
                `}
                <div class="message-content ${isUser ? '' : 'markdown-body'}">
                    ${isUser ? escapeHtml(msg.content) : marked.parse(msg.content || '')}
                </div>
            </div>
        `;
    }).join('');

    scrollToBottom();
}

function appendMessage(role, content, isStreaming = false) {
    const container = $('chatMessages');
    if (!container) return;

    const isUser = role === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'zora-message'} fade-in`;
    messageDiv.id = isStreaming ? 'streamingMessage' : '';

    messageDiv.innerHTML = `
        ${!isUser ? `
            <div class="message-header">
                <img src="/assets/images/logo/logo.png" alt="ZORA" class="zora-avatar">
                <span class="message-label">ZORA</span>
            </div>
        ` : `
            <div class="message-header" style="justify-content: flex-end;">
                <span class="message-label">You</span>
            </div>
        `}
        <div class="message-content ${isUser ? '' : 'markdown-body'}">
            ${isUser ? escapeHtml(content) : (isStreaming ? '' : marked.parse(content || ''))}
        </div>
    `;

    container.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv.querySelector('.message-content');
}

function updateStreamingMessage(content) {
    const contentDiv = $('streamingMessage')?.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.innerHTML = marked.parse(content || '');
        scrollToBottom();
    }
}

function finalizeStreamingMessage() {
    const messageDiv = $('streamingMessage');
    if (messageDiv) {
        messageDiv.removeAttribute('id');
    }
}

function scrollToBottom() {
    const chatCenter = $('chatCenter');
    if (chatCenter) {
        chatCenter.scrollTop = chatCenter.scrollHeight;
    }
}

/**
 * Typing Indicator
 */
function showTypingIndicator() {
    const indicator = $('typingIndicator');
    if (indicator) indicator.classList.remove('hidden');
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = $('typingIndicator');
    if (indicator) indicator.classList.add('hidden');
}

/**
 * Message Sending
 */
async function sendMessage(content) {
    if (!content.trim() || state.isStreaming) return;

    state.isStreaming = true;

    // Create conversation if needed
    if (!state.currentConversationId && !state.isIncognito) {
        try {
            const response = await apiCall('/chat/new', 'POST', { is_incognito: false }, true);
            state.currentConversationId = response.data?.conversation_id || response.conversation_id;
        } catch (error) {
            console.error('Failed to create conversation:', error);
            showStatus('Failed to start chat');
            state.isStreaming = false;
            return;
        }
    }

    // Add user message
    state.messages.push({ role: 'user', content });

    // Switch to chat view
    showChatView();
    appendMessage('user', content);

    // Clear input
    const input = $('messageInput');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
    }

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch(`${window.BASE_URL}/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${localStorage.getItem('zora_token')}`
            },
            body: JSON.stringify({
                conversation_id: state.isIncognito ? null : state.currentConversationId,
                message: content,
                extended_thinking: state.isExtendedThinking,
                incognito: state.isIncognito
            })
        });

        if (!response.ok || !response.body) {
            throw new Error('Failed to connect to ZORA');
        }

        hideTypingIndicator();
        const contentDiv = appendMessage('assistant', '', true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullMessage = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const chunk of lines) {
                if (!chunk.trim()) continue;

                const lines = chunk.split('\n');
                let eventName = 'message';
                let data = '';

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        eventName = line.replace('event:', '').trim();
                    } else if (line.startsWith('data:')) {
                        data += line.replace('data:', '').trim();
                    }
                }

                if (data) {
                    try {
                        const parsed = JSON.parse(data);

                        if (eventName === 'metadata') {
                            if (!state.isIncognito && parsed.conversation_id) {
                                state.currentConversationId = parsed.conversation_id;
                            }
                            if (parsed.title) {
                                updateChatTitle(parsed.title);
                            }
                        } else if (eventName === 'chunk') {
                            fullMessage += parsed.delta || '';
                            if (contentDiv) {
                                contentDiv.innerHTML = marked.parse(fullMessage);
                                scrollToBottom();
                            }
                        } else if (eventName === 'done') {
                            fullMessage = parsed.message || fullMessage;
                            if (contentDiv) {
                                contentDiv.innerHTML = marked.parse(fullMessage);
                            }
                        } else if (eventName === 'error') {
                            throw new Error(parsed.message || 'Streaming error');
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
        }

        finalizeStreamingMessage();
        state.messages.push({ role: 'assistant', content: fullMessage });

        // Refresh history
        if (!state.isIncognito) {
            await loadChatHistory();
        }

    } catch (error) {
        console.error('Send error:', error);
        hideTypingIndicator();
        showStatus(error.message || 'Failed to send message');
    } finally {
        state.isStreaming = false;
    }
}

/**
 * New Chat
 */
async function startNewChat() {
    state.currentConversationId = null;
    state.messages = [];

    if (state.isIncognito) {
        state.currentConversationId = `incognito-${Date.now()}`;
    } else {
        try {
            const response = await apiCall('/chat/new', 'POST', { is_incognito: false }, true);
            state.currentConversationId = response.data?.conversation_id || response.conversation_id;
        } catch (error) {
            console.error('Failed to create new chat:', error);
        }
    }

    updateChatTitle(state.isIncognito ? 'Incognito Chat' : 'New Chat');
    showWelcomeView();
    renderChatHistory(state.conversations);
}

/**
 * Incognito Mode Toggle
 */
function toggleIncognito() {
    state.isIncognito = !state.isIncognito;
    const btn = $('incognitoBtn');

    if (btn) {
        btn.classList.toggle('active', state.isIncognito);
    }

    // Reset chat
    state.currentConversationId = null;
    state.messages = [];
    updateChatTitle(state.isIncognito ? 'Incognito Chat' : 'New Chat');
    showWelcomeView();
    renderChatHistory([]);

    showStatus(state.isIncognito ? 'Incognito mode enabled' : 'Incognito mode disabled');
}

/**
 * Extended Thinking Toggle
 */
function toggleExtendedThinking() {
    state.isExtendedThinking = !state.isExtendedThinking;
    const switchEl = $('extendedSwitch');

    if (switchEl) {
        switchEl.classList.toggle('active', state.isExtendedThinking);
    }
}

/**
 * Sidebar Toggle
 */
function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    const sidebar = $('chatSidebar');

    if (sidebar) {
        sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    }

    localStorage.setItem('zora_sidebar', state.sidebarCollapsed ? 'collapsed' : 'open');
}

function initSidebar() {
    const saved = localStorage.getItem('zora_sidebar');
    if (saved === 'collapsed') {
        state.sidebarCollapsed = true;
        const sidebar = $('chatSidebar');
        if (sidebar) sidebar.classList.add('collapsed');
    }
}

/**
 * Settings Modal
 */
function openSettings() {
    const overlay = $('settingsOverlay');
    const content = $('settingsContent');

    if (!overlay || !content) return;

    content.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-input);border-radius:var(--radius-md);">
                <div>
                    <div style="font-weight:600;margin-bottom:4px;">Theme</div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">Switch between dark and light mode</div>
                </div>
                <button class="toolbar-btn" id="themeToggleBtn" style="width:auto;padding:8px 16px;border-radius:var(--radius-full);background:var(--bg-card);border:1px solid var(--border);">
                    ${isLightMode() ? '🌙 Dark' : '☀️ Light'}
                </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-input);border-radius:var(--radius-md);">
                <div>
                    <div style="font-weight:600;margin-bottom:4px;">Account</div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">${state.user?.email || 'Not logged in'}</div>
                </div>
                <button class="toolbar-btn" id="logoutBtn" style="width:auto;padding:8px 16px;border-radius:var(--radius-full);background:var(--color-danger);color:white;border:none;">
                    Logout
                </button>
            </div>

            <div style="padding:12px;background:var(--bg-input);border-radius:var(--radius-md);">
                <div style="font-weight:600;margin-bottom:8px;">Keyboard Shortcuts</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">
                    <div>Enter — Send message</div>
                    <div>Shift + Enter — New line</div>
                    <div>Cmd/Ctrl + / — Toggle sidebar</div>
                </div>
            </div>
        </div>
    `;

    overlay.classList.add('active');

    // Theme toggle
    $('themeToggleBtn')?.addEventListener('click', () => {
        toggleTheme();
        openSettings(); // Re-render
    });

    // Logout
    $('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('zora_token');
        localStorage.removeItem('zora_onboarding_name');
        window.location.href = '/auth/login.html';
    });
}

function closeSettings() {
    const overlay = $('settingsOverlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Search Functionality
 */
function filterHistory(query) {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
        renderChatHistory(state.conversations);
        return;
    }

    const filtered = state.conversations.filter(c =>
        (c.title || 'New Chat').toLowerCase().includes(normalized)
    );

    renderChatHistory(filtered);
}

/**
 * Textarea Auto-resize
 */
function autoResizeTextarea() {
    const input = $('messageInput');
    if (!input) return;

    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
}

/**
 * Suggestion Cards
 */
function initSuggestionCards() {
    $$('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            if (prompt) {
                const input = $('messageInput');
                if (input) {
                    input.value = prompt;
                    autoResizeTextarea();
                    input.focus();
                }
            }
        });
    });
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Status Message
 */
function showStatus(message) {
    // Could be implemented as a toast notification
    console.log('[Status]', message);
}

/**
 * URL Parameter Handling
 */
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');

    if (conversationId) {
        loadConversation(conversationId);
    }
}

/**
 * Event Listeners
 */
function bindEvents() {
    // Sidebar toggle
    $('sidebarToggle')?.addEventListener('click', toggleSidebar);
    $('sidebarBackdrop')?.addEventListener('click', () => {
        const sidebar = $('chatSidebar');
        if (sidebar) sidebar.classList.remove('open');
    });

    // New chat
    $('newChatBtn')?.addEventListener('click', startNewChat);

    // Incognito
    $('incognitoBtn')?.addEventListener('click', toggleIncognito);

    // Extended thinking
    $('extendedToggle')?.addEventListener('click', toggleExtendedThinking);

    // Settings
    $('settingsBtn')?.addEventListener('click', openSettings);
    $('closeSettings')?.addEventListener('click', closeSettings);
    $('settingsOverlay')?.addEventListener('click', (e) => {
        if (e.target === $('settingsOverlay')) closeSettings();
    });

    // Search
    $('historySearch')?.addEventListener('input', (e) => filterHistory(e.target.value));

    // Message input
    const input = $('messageInput');
    if (input) {
        input.addEventListener('input', autoResizeTextarea);
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await sendMessage(input.value);
            }
        });
    }

    // Voice button (placeholder)
    $('voiceBtn')?.addEventListener('click', () => {
        showStatus('Voice input coming soon');
    });

    // Attachment button (placeholder)
    $('attachmentBtn')?.addEventListener('click', () => {
        showStatus('File upload coming soon');
    });

    // Chat title dropdown
    $('chatTitleDropdown')?.addEventListener('click', () => {
        showStatus('Chat options coming soon');
    });

    // Keyboard shortcut for sidebar
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
            e.preventDefault();
            toggleSidebar();
        }
    });

    // Mobile: swipe to open sidebar
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;

        // Swipe right from left edge to open sidebar
        if (diff > 50 && touchStartX < 20) {
            const sidebar = $('chatSidebar');
            if (sidebar) sidebar.classList.add('open');
        }
    }, { passive: true });
}

/**
 * Initialization
 */
async function init() {
    // Check auth first
    const token = await checkAuth();
    if (!token) return;

    // Initialize theme before any rendering
    initTheme();

    // Initialize sidebar state
    initSidebar();

    // Initialize orb features
    initOrbTracking();
    initOrbBlinking();

    // Load user data
    await loadUser();

    // Load chat history
    await loadChatHistory();

    // Initialize UI
    initSuggestionCards();
    bindEvents();

    // Handle URL params
    handleUrlParams();

    console.log('ZORA Chat initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
