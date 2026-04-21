/**
 * ZORA AI - Shared UI helpers
 * ===========================
 * Toasts, button loading states, and formatting helpers.
 */

function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'info') {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('toast--leaving');
        window.setTimeout(() => toast.remove(), 220);
    }, 4000);
}

function showError(message) {
    showToast(message || 'Something went wrong.', 'error');
}

function showSuccess(message) {
    showToast(message || 'Success.', 'success');
}

function showInfo(message) {
    showToast(message || 'Info.', 'info');
}

function showLoading(element) {
    if (!element) {
        return;
    }

    if (!element.dataset.originalHtml) {
        element.dataset.originalHtml = element.innerHTML;
    }

    element.disabled = true;
    element.classList.add('is-loading');
    element.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>Loading...</span>';
}

function hideLoading(element) {
    if (!element) {
        return;
    }

    element.disabled = false;
    element.classList.remove('is-loading');
    if (element.dataset.originalHtml) {
        element.innerHTML = element.dataset.originalHtml;
    }
}

function formatRupiah(amount) {
    const numericAmount = Number(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(numericAmount);
}

function timeAgo(date) {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) {
        return '';
    }

    const seconds = Math.floor((Date.now() - value.getTime()) / 1000);
    const units = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
    ];

    for (const unit of units) {
        const count = Math.floor(seconds / unit.seconds);
        if (count >= 1) {
            return `${count} ${unit.label}${count > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

window.showError = showError;
window.showSuccess = showSuccess;
window.showInfo = showInfo;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.formatRupiah = formatRupiah;
window.timeAgo = timeAgo;
