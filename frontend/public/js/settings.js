/**
 * ZORA AI - Settings Module
 * =========================
 * Handles settings modal behavior, language changes, FAQ, feedback, and logout.
 */

const ZORA_LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English (United States)' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch (Deutschland)' },
    { value: 'ja', label: '日本語' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'it', label: 'Italiano' },
    { value: 'ko', label: '한국어 (한국)' },
    { value: 'pt', label: 'Português (Brasil)' },
    { value: 'es-la', label: 'Español (Latinoamérica)' },
    { value: 'es-es', label: 'Español (España)' },
    { value: 'zh', label: '中文' }
];

const FAQ_ITEMS = [
    {
        question: 'What is ZORA AI?',
        answer: "ZORA is a SuperIntelligence Autonomous AI that routes your requests to the most capable AI model automatically."
    },
    {
        question: 'Which AI models does ZORA use?',
        answer: "ZORA orchestrates multiple models including Nemotron, Deepseek, Qwen, Kimi, Minimax, GLM, Gemma, Mistral (via NVIDIA), Gemini (Google), and Groq each assigned to tasks they excel at."
    },
    {
        question: 'What is Extended Thinking Mode?',
        answer: "It activates a reasoning layer before answering, making ZORA's responses more thorough for complex questions."
    },
    {
        question: 'What is Incognito Chat?',
        answer: 'Incognito mode disables memory and history saving for that session. No data is stored.'
    },
    {
        question: 'How do I use Zora Labs?',
        answer: 'Access Labs from the sidebar. Each Lab (Code, Design, Image, Vid, Research) is powered by a specialized AI model.'
    }
];

const settingsState = {
    loaded: false,
    settings: null
};

function settingsElement(id) {
    return document.getElementById(id);
}

function hasSettingsModal() {
    return !!settingsElement('settingsOverlay') || document.body.classList.contains('settings-page');
}

function currentSettingsContainer() {
    return settingsElement('settingsContent');
}

function languageOptionsMarkup(selectedValue) {
    return ZORA_LANGUAGE_OPTIONS.map((option) => `
        <option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>
            ${option.label}
        </option>
    `).join('');
}

function faqMarkup() {
    return FAQ_ITEMS.map((item, index) => `
        <details class="faq-item" ${index === 0 ? 'open' : ''}>
            <summary>${item.question}</summary>
            <div class="faq-answer">${item.answer}</div>
        </details>
    `).join('');
}

function renderSettingsContent(data) {
    const container = currentSettingsContainer();
    if (!container) {
        return;
    }

    const general = data.general || {};
    const preferences = data.preferences || {};
    const darkMode = preferences.appearance?.dark_mode !== false;
    const avatarSeed = (general.display_name || general.email || 'Z').charAt(0).toUpperCase();

    container.innerHTML = `
        <section class="settings-section">
            <h3 class="settings-section-title">General</h3>
            <p class="settings-section-copy">Your profile summary inside ZORA.</p>
            <div class="settings-general-row">
                <div class="settings-avatar">${avatarSeed}</div>
                <div class="settings-grid">
                    <div class="settings-field">
                        <label for="settingsDisplayName">Display name</label>
                        <input id="settingsDisplayName" class="settings-input" type="text" value="${general.display_name || ''}">
                    </div>
                    <div class="settings-field">
                        <label for="settingsEmail">Email</label>
                        <input id="settingsEmail" class="settings-input" type="email" value="${general.email || ''}" readonly>
                    </div>
                </div>
            </div>
        </section>

        <section class="settings-section">
            <h3 class="settings-section-title">Language</h3>
            <p class="settings-section-copy">Choose the language ZORA should prefer across the app.</p>
            <div class="settings-field">
                <label for="settingsLanguage">Language</label>
                <select id="settingsLanguage" class="settings-select">
                    ${languageOptionsMarkup(data.language || localStorage.getItem('zora_language') || 'id')}
                </select>
            </div>
            <div class="settings-actions">
                <button id="saveLanguageButton" class="settings-button" type="button">Save Language</button>
            </div>
            <p id="languageStatus" class="settings-status"></p>
        </section>

        <section class="settings-section">
            <h3 class="settings-section-title">Appearance</h3>
            <p class="settings-section-copy">Dark mode is the default ZORA environment for now.</p>
            <div class="settings-toggle-row">
                <div>
                    <strong>Dark Mode</strong>
                    <p class="settings-section-copy">UI toggle only for now. The interface remains dark.</p>
                </div>
                <button id="darkModeToggle" class="settings-toggle ${darkMode ? 'is-active' : ''}" type="button" aria-label="Toggle dark mode"></button>
            </div>
            <div class="settings-actions">
                <button id="savePreferencesButton" class="settings-button" type="button">Save Preferences</button>
            </div>
            <p id="preferencesStatus" class="settings-status"></p>
        </section>

        <section class="settings-section">
            <h3 class="settings-section-title">Security</h3>
            <p class="settings-section-copy">Password changes are not connected yet. This is a placeholder for the next phase.</p>
            <div class="settings-field">
                <label for="securityPlaceholder">Change password</label>
                <input id="securityPlaceholder" class="settings-input" type="password" value="********" readonly>
            </div>
        </section>

        <section class="settings-section">
            <h3 class="settings-section-title">FAQ / Help</h3>
            <p class="settings-section-copy">Common questions about ZORA AI.</p>
            <div class="faq-list">${faqMarkup()}</div>
        </section>

        <section class="settings-section">
            <h3 class="settings-section-title">Feedback</h3>
            <p class="settings-section-copy">Tell us what feels good, broken, confusing, or missing.</p>
            <div class="settings-field">
                <label for="feedbackMessage">Message</label>
                <textarea id="feedbackMessage" class="settings-textarea" placeholder="Share your feedback..."></textarea>
            </div>
            <div class="settings-field">
                <label for="feedbackRating">Rating</label>
                <select id="feedbackRating" class="settings-select">
                    <option value="">No rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Okay</option>
                    <option value="2">2 - Needs work</option>
                    <option value="1">1 - Poor</option>
                </select>
            </div>
            <div class="settings-actions">
                <button id="submitFeedbackButton" class="settings-button" type="button">Submit Feedback</button>
            </div>
            <p id="feedbackStatus" class="settings-status"></p>
        </section>

        <section class="settings-section">
            <h3 class="settings-section-title">Session</h3>
            <p class="settings-section-copy">End your current ZORA session on this device.</p>
            <div class="settings-actions">
                <button id="settingsLogoutButton" class="settings-danger-button" type="button">Logout</button>
            </div>
        </section>
    `;
}

function setSettingsStatus(id, message) {
    const element = settingsElement(id);
    if (element) {
        element.textContent = message || '';
    }
}

function readPreferencesFromUi() {
    return {
        general: {
            display_name: settingsElement('settingsDisplayName')?.value.trim() || ''
        },
        appearance: {
            dark_mode: settingsElement('darkModeToggle')?.classList.contains('is-active') || false
        }
    };
}

async function loadSettingsData() {
    const response = await apiCall('/settings', 'GET', null, true);
    settingsState.settings = response.data;
    settingsState.loaded = true;
    renderSettingsContent(response.data);
    bindSettingsActions();
}

async function openSettingsModal() {
    if (!hasSettingsModal()) {
        return;
    }

    const overlay = settingsElement('settingsOverlay');
    if (overlay) {
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    await loadSettingsData();
}

function closeSettingsModal() {
    const overlay = settingsElement('settingsOverlay');
    if (overlay) {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

async function handleLanguageSave() {
    const language = settingsElement('settingsLanguage')?.value;
    if (!language) {
        return;
    }

    try {
        await apiCall('/settings/language', 'PUT', { language }, true);
        localStorage.setItem('zora_language', language);
        setSettingsStatus('languageStatus', 'Language updated. Reloading...');
        showSuccess('Language updated successfully.');
        window.location.reload();
    } catch (error) {
        setSettingsStatus('languageStatus', error.message || 'Unable to update language.');
        showError(error.message || 'Unable to update language.');
    }
}

async function handlePreferencesSave() {
    try {
        const response = await apiCall(
            '/settings/preferences',
            'PUT',
            { preferences: readPreferencesFromUi() },
            true
        );
        settingsState.settings = {
            ...settingsState.settings,
            ...response.data
        };
        if (response.data.general?.display_name) {
            localStorage.setItem('zora_onboarding_name', response.data.general.display_name);
            if (settingsElement('profileName')) {
                settingsElement('profileName').textContent = response.data.general.display_name;
            }
            if (settingsElement('profileAvatar')) {
                settingsElement('profileAvatar').textContent = response.data.general.display_name.charAt(0).toUpperCase();
            }
        }
        setSettingsStatus('preferencesStatus', 'Preferences saved successfully.');
        showSuccess('Preferences saved successfully.');
    } catch (error) {
        setSettingsStatus('preferencesStatus', error.message || 'Unable to save preferences.');
        showError(error.message || 'Unable to save preferences.');
    }
}

async function handleFeedbackSubmit() {
    const message = settingsElement('feedbackMessage')?.value.trim();
    const ratingValue = settingsElement('feedbackRating')?.value;

    if (!message) {
        setSettingsStatus('feedbackStatus', 'Please enter your feedback before submitting.');
        return;
    }

    try {
        await apiCall(
            '/feedback',
            'POST',
            {
                message,
                rating: ratingValue ? Number(ratingValue) : null
            },
            true
        );
        settingsElement('feedbackMessage').value = '';
        settingsElement('feedbackRating').value = '';
        setSettingsStatus('feedbackStatus', 'Feedback submitted successfully.');
        showSuccess('Feedback submitted successfully.');
    } catch (error) {
        setSettingsStatus('feedbackStatus', error.message || 'Unable to submit feedback.');
        showError(error.message || 'Unable to submit feedback.');
    }
}

function bindSettingsActions() {
    const darkModeToggle = settingsElement('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            darkModeToggle.classList.toggle('is-active');
        });
    }

    settingsElement('saveLanguageButton')?.addEventListener('click', handleLanguageSave);
    settingsElement('savePreferencesButton')?.addEventListener('click', handlePreferencesSave);
    settingsElement('submitFeedbackButton')?.addEventListener('click', handleFeedbackSubmit);
    settingsElement('settingsLogoutButton')?.addEventListener('click', logout);
}

function bindSettingsTriggers() {
    settingsElement('openSettingsButton')?.addEventListener('click', openSettingsModal);
    settingsElement('closeSettingsButton')?.addEventListener('click', closeSettingsModal);

    const overlay = settingsElement('settingsOverlay');
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeSettingsModal();
            }
        });
    }
}

async function bootstrapSettings() {
    if (!hasSettingsModal()) {
        return;
    }

    await requireAuth();
    bindSettingsTriggers();

    if (document.body.classList.contains('settings-page')) {
        await loadSettingsData();
    }
}

document.addEventListener('DOMContentLoaded', bootstrapSettings);
