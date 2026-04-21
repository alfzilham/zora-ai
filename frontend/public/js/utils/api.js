/**
 * ZORA AI - API Utilities
 * ========================
 * HTTP client for backend communication
 */

const BASE_URL = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? 'http://127.0.0.1:8000'
    : `${window.location.origin}/api`;
window.BASE_URL = BASE_URL;

const API_CONFIG = {
    BASE_URL,
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 * Make an API call to the backend
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object|null} body - Request body
 * @param {boolean} requireAuth - Whether to attach Authorization header
 * @returns {Promise<object>} Response JSON
 * @throws {Error} On request failure
 */
async function apiCall(endpoint, method = 'GET', body = null, requireAuth = false) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    const headers = { ...API_CONFIG.DEFAULT_HEADERS };

    // Add auth token if required
    if (requireAuth) {
        const token = localStorage.getItem('zora_token');
        if (!token) {
            throw new Error('No authentication token found. Please login again.');
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            const errorMessage =
                data?.message ||
                data?.detail ||
                data?.errors?.[0]?.message ||
                `HTTP ${response.status}: Request failed`;
            // Handle specific HTTP errors
            if (response.status === 401) {
                // Clear invalid token
                localStorage.removeItem('zora_token');
                throw new Error(errorMessage || 'Session expired. Please login again.');
            }
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection.');
        }
        throw error;
    }
}

/**
 * Get the stored auth token
 * @returns {string|null} JWT token or null
 */
function getToken() {
    return localStorage.getItem('zora_token');
}

/**
 * Set the auth token
 * @param {string} token - JWT token
 */
function setToken(token) {
    localStorage.setItem('zora_token', token);
}

/**
 * Remove the auth token (logout)
 */
function removeToken() {
    localStorage.removeItem('zora_token');
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!getToken();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiCall, getToken, setToken, removeToken, isAuthenticated, API_CONFIG, BASE_URL };
}
