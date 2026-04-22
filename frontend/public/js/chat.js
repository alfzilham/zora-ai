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
