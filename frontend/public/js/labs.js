/**
 * ZORA AI - Labs Module
 * =====================
 * Shared client controller for Zora Labs pages.
 */

const labsState = {
    designType: 'brief',
    imageStyle: 'photorealistic',
    researchDepth: 'quick',
    latestImageUrl: null
};

function labElement(id) {
    return document.getElementById(id);
}

function currentLab() {
    return document.body.dataset.lab;
}

function setLabStatus(id, message = '') {
    const element = labElement(id);
    if (element) {
        element.textContent = message;
    }
}

function toggleVisibility(id, visible) {
    const element = labElement(id);
    if (element) {
        element.classList.toggle('hidden', !visible);
    }
}

async function ensureLabAuth() {
    const user = await requireAuth();
    if (!user) {
        window.location.href = '../auth/login.html';
        return false;
    }
    return true;
}

function bindDesignTabs() {
    document.querySelectorAll('#designTypeTabs .lab-tab').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#designTypeTabs .lab-tab').forEach((tab) => tab.classList.remove('is-active'));
            button.classList.add('is-active');
            labsState.designType = button.dataset.type;
        });
    });
}

function bindStyleGrid() {
    document.querySelectorAll('#imageStyleGrid .style-card').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#imageStyleGrid .style-card').forEach((card) => card.classList.remove('is-active'));
            button.classList.add('is-active');
            labsState.imageStyle = button.dataset.style;
        });
    });
}

function bindResearchTabs() {
    document.querySelectorAll('#researchDepthTabs .lab-tab').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#researchDepthTabs .lab-tab').forEach((tab) => tab.classList.remove('is-active'));
            button.classList.add('is-active');
            labsState.researchDepth = button.dataset.depth;
        });
    });
}

async function handleCodeLab() {
    const prompt = labElement('codePrompt').value.trim();
    const language = labElement('codeLanguage').value;

    if (!prompt) {
        setLabStatus('codeStatus', 'Enter a task before generating.');
        return;
    }

    toggleVisibility('codeLoading', true);
    setLabStatus('codeStatus', '');

    try {
        const response = await apiCall('/labs/code', 'POST', { prompt, language }, true);
        labElement('codeOutput').innerHTML = `<code>${escapeHtml(response.data.code || '')}</code>`;
        labElement('codeExplanation').textContent = response.data.explanation || '';
    } catch (error) {
        setLabStatus('codeStatus', error.message || 'Unable to generate code.');
    } finally {
        toggleVisibility('codeLoading', false);
    }
}

async function handleDesignLab() {
    const prompt = labElement('designPrompt').value.trim();

    if (!prompt) {
        setLabStatus('designStatus', 'Describe the design direction first.');
        return;
    }

    toggleVisibility('designLoading', true);
    setLabStatus('designStatus', '');

    try {
        const response = await apiCall(
            '/labs/design',
            'POST',
            { prompt, type: labsState.designType },
            true
        );
        labElement('designConcept').textContent = response.data.concept || '';
        labElement('designColors').textContent = response.data.colors || '';
        labElement('designTypography').textContent = response.data.typography || '';
        labElement('designTone').textContent = response.data.tone || '';
        labElement('designCopy').textContent = response.data.copy || '';
    } catch (error) {
        setLabStatus('designStatus', error.message || 'Unable to generate design output.');
    } finally {
        toggleVisibility('designLoading', false);
    }
}

async function handleImageLab() {
    const prompt = labElement('imagePrompt').value.trim();

    if (!prompt) {
        setLabStatus('imageStatus', 'Describe the image you want to generate.');
        return;
    }

    toggleVisibility('imageLoading', true);
    toggleVisibility('imageResult', false);
    setLabStatus('imageStatus', '');

    try {
        const response = await apiCall(
            '/labs/image',
            'POST',
            { prompt, style: labsState.imageStyle },
            true
        );
        labsState.latestImageUrl = `${window.BASE_URL}${response.data.image_url}`;
        labElement('generatedImage').src = labsState.latestImageUrl;
        labElement('optimizedPrompt').textContent = response.data.optimized_prompt || '';
        toggleVisibility('imageResult', true);
    } catch (error) {
        setLabStatus('imageStatus', error.message || 'Unable to generate image.');
    } finally {
        toggleVisibility('imageLoading', false);
    }
}

async function handleResearchLab() {
    const query = labElement('researchQuery').value.trim();

    if (!query) {
        setLabStatus('researchStatus', 'Enter a research topic first.');
        return;
    }

    toggleVisibility('researchLoading', true);
    setLabStatus('researchStatus', '');

    try {
        const response = await apiCall(
            '/labs/research',
            'POST',
            { query, depth: labsState.researchDepth },
            true
        );

        labElement('researchSummary').textContent = response.data.summary || '';
        renderResearchSections(response.data.sections || []);
        renderResearchList('researchSources', response.data.sources || [], true);
        renderResearchList('researchFurtherReading', response.data.further_reading || []);
    } catch (error) {
        setLabStatus('researchStatus', error.message || 'Unable to complete research.');
    } finally {
        toggleVisibility('researchLoading', false);
    }
}

function renderResearchSections(sections) {
    const container = labElement('researchSections');
    if (!container) {
        return;
    }
    container.innerHTML = '';

    sections.forEach((section, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'lab-accordion-item';
        wrapper.innerHTML = `
            <button class="lab-accordion-button" type="button">${section.title || `Section ${index + 1}`}</button>
            <div class="lab-accordion-content hidden">${section.content || ''}</div>
        `;
        const button = wrapper.querySelector('.lab-accordion-button');
        const content = wrapper.querySelector('.lab-accordion-content');
        button.addEventListener('click', () => {
            content.classList.toggle('hidden');
        });
        container.appendChild(wrapper);
    });
}

function renderResearchList(id, items, linkMode = false) {
    const container = labElement(id);
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!items.length) {
        const item = document.createElement('li');
        item.textContent = linkMode ? 'No sources returned.' : 'No suggestions yet.';
        container.appendChild(item);
        return;
    }

    items.forEach((itemValue) => {
        const item = document.createElement('li');
        if (linkMode && typeof itemValue === 'object' && itemValue.url) {
            item.innerHTML = `<a href="${itemValue.url}" target="_blank" rel="noreferrer">${itemValue.title || itemValue.url}</a>`;
        } else {
            item.textContent = typeof itemValue === 'string' ? itemValue : JSON.stringify(itemValue);
        }
        container.appendChild(item);
    });
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function bindCodePage() {
    labElement('codeGenerateButton')?.addEventListener('click', handleCodeLab);
    labElement('codeCopyButton')?.addEventListener('click', async () => {
        const code = labElement('codeOutput').textContent || '';
        if (!code.trim()) {
            setLabStatus('codeStatus', 'No code to copy yet.');
            return;
        }
        await navigator.clipboard.writeText(code);
        setLabStatus('codeStatus', 'Code copied to clipboard.');
    });
}

function bindDesignPage() {
    bindDesignTabs();
    labElement('designGenerateButton')?.addEventListener('click', handleDesignLab);
}

function bindImagePage() {
    bindStyleGrid();
    labElement('imageGenerateButton')?.addEventListener('click', handleImageLab);
    labElement('imageDownloadButton')?.addEventListener('click', async () => {
        if (!labsState.latestImageUrl) {
            setLabStatus('imageStatus', 'Generate an image first.');
            return;
        }
        const link = document.createElement('a');
        link.href = labsState.latestImageUrl;
        link.download = 'zora-image';
        link.click();
    });
}

function bindResearchPage() {
    bindResearchTabs();
    labElement('researchGenerateButton')?.addEventListener('click', handleResearchLab);
}

async function bootstrapLabs() {
    const authenticated = await ensureLabAuth();
    if (!authenticated) {
        return;
    }

    if (currentLab() === 'code') {
        bindCodePage();
        return;
    }

    if (currentLab() === 'design') {
        bindDesignPage();
        return;
    }

    if (currentLab() === 'image') {
        bindImagePage();
        return;
    }

    if (currentLab() === 'research') {
        bindResearchPage();
    }
}

document.addEventListener('DOMContentLoaded', bootstrapLabs);
