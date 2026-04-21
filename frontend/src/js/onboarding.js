/**
 * ZORA AI - Onboarding Module
 * ===========================
 * Shared client-side logic for the onboarding flow.
 */

const ONBOARDING_STORAGE_KEYS = {
    NAME: 'zora_onboarding_name',
    TOPICS: 'zora_onboarding_topics'
};

function setStatusMessage(element, message = '') {
    if (element) {
        element.textContent = message;
    }
}

async function initNamePage() {
    const form = document.getElementById('nameForm');
    const input = document.getElementById('displayName');
    const error = document.getElementById('nameError');
    const storedName = localStorage.getItem(ONBOARDING_STORAGE_KEYS.NAME);

    if (!form || !input) {
        return;
    }

    if (storedName) {
        input.value = storedName;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const displayName = input.value.trim();

        if (!displayName) {
            setStatusMessage(error, 'Please enter your name.');
            return;
        }

        setStatusMessage(error);

        try {
            const response = await apiCall(
                '/onboarding/name',
                'POST',
                { display_name: displayName },
                true
            );

            if (response.status === 'success' || response.success) {
                localStorage.setItem(ONBOARDING_STORAGE_KEYS.NAME, displayName);
                window.location.href = './topics.html';
            } else {
                throw new Error(response.message || 'Unable to save your name.');
            }
        } catch (err) {
            setStatusMessage(error, err.message || 'Unable to save your name.');
        }
    });
}

async function initTopicsPage() {
    const buttons = Array.from(document.querySelectorAll('.topic-chip'));
    const continueButton = document.getElementById('topicsContinue');
    const countElement = document.getElementById('topicCount');
    const error = document.getElementById('topicsError');
    const selected = new Set(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEYS.TOPICS) || '[]'));

    if (!buttons.length || !continueButton) {
        return;
    }

    function renderSelection() {
        buttons.forEach((button) => {
            const topic = button.dataset.topic;
            button.classList.toggle('is-selected', selected.has(topic));
        });

        const count = selected.size;
        countElement.textContent = `${count} selected`;
        continueButton.disabled = count < 2;
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const topic = button.dataset.topic;

            if (selected.has(topic)) {
                selected.delete(topic);
            } else {
                selected.add(topic);
            }

            setStatusMessage(error);
            renderSelection();
        });
    });

    continueButton.addEventListener('click', async () => {
        const topics = Array.from(selected);

        if (topics.length < 2) {
            setStatusMessage(error, 'Choose at least 2 topics to continue.');
            return;
        }

        try {
            const response = await apiCall(
                '/onboarding/topics',
                'POST',
                { topics },
                true
            );

            if (response.status === 'success' || response.success) {
                localStorage.setItem(ONBOARDING_STORAGE_KEYS.TOPICS, JSON.stringify(topics));
                window.location.href = './hello.html';
            } else {
                throw new Error(response.message || 'Unable to save your topics.');
            }
        } catch (err) {
            setStatusMessage(error, err.message || 'Unable to save your topics.');
        }
    });

    renderSelection();
}

async function initHelloPage() {
    const helloName = document.getElementById('helloName');
    const startButton = document.getElementById('startChatting');
    const storedName = localStorage.getItem(ONBOARDING_STORAGE_KEYS.NAME);

    if (helloName) {
        helloName.textContent = storedName || 'there';
    }

    if (startButton) {
        startButton.addEventListener('click', () => {
            window.location.href = '../chat/index.html';
        });
    }
}

async function bootstrapOnboarding() {
    const page = document.body.dataset.page;

    try {
        await requireAuth();
    } catch (error) {
        return;
    }

    if (page === 'name') {
        await initNamePage();
        return;
    }

    if (page === 'topics') {
        await initTopicsPage();
        return;
    }

    if (page === 'hello') {
        await initHelloPage();
    }
}

document.addEventListener('DOMContentLoaded', bootstrapOnboarding);
