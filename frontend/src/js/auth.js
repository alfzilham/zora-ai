/**
 * ZORA AI - Authentication Module
 * ================================
 * Handles login, signup, Google OAuth, and token management
 */

/**
 * Handle user login
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function handleLogin(email, password) {
    try {
        const response = await apiCall('/auth/login', 'POST', { email, password });

        if (response.success && response.data.token) {
            // Store token
            localStorage.setItem('zora_token', response.data.token);

            await redirectAfterLogin();
        } else {
            throw new Error(response.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Handle user signup
 * @param {string} name - User full name
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function handleSignup(name, email, password) {
    try {
        const response = await apiCall('/auth/register', 'POST', { name, email, password });

        if (response.success && response.data.token) {
            // Store token
            localStorage.setItem('zora_token', response.data.token);

            // Redirect to onboarding
            window.location.href = '../onboarding/name.html';
        } else {
            throw new Error(response.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
}

/**
 * Handle Google OAuth authentication
 * Opens Google popup and exchanges token for JWT
 */
function handleGoogleAuth() {
    // Google OAuth configuration
    const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with actual client ID
    const REDIRECT_URI = window.location.origin + '/frontend/src/pages/auth/google-callback.html';

    // Build Google OAuth URL
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('email profile')}&` +
        `include_granted_scopes=true`;

    // Open popup
    const width = 500;
    const height = 600;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const popup = window.open(
        googleAuthUrl,
        'googleAuth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    // Listen for message from popup
    window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            const googleToken = event.data.token;

            try {
                // Exchange Google token for our JWT
                const response = await apiCall('/auth/google', 'POST', { google_token: googleToken });

                if (response.success && response.data.token) {
                    // Store token
                    localStorage.setItem('zora_token', response.data.token);

                    // Redirect based on is_new_user flag
                    if (response.data.is_new_user) {
                        window.location.href = '../onboarding/name.html';
                    } else {
                        await redirectAfterLogin();
                    }
                }
            } catch (error) {
                console.error('Google auth error:', error);
                showError('Google authentication failed. Please try again.');
            }
        }

        if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            console.error('Google auth error:', event.data.error);
            showError('Google authentication failed. Please try again.');
        }
    });
}

/**
 * Check authentication status and redirect if needed
 * Call this on auth pages to prevent logged-in users from accessing them
 */
async function checkAuthStatus() {
    const token = localStorage.getItem('zora_token');

    if (!token) {
        return; // No token, stay on auth page
    }

    try {
        // Validate token by calling /auth/me
        const response = await apiCall('/auth/me', 'GET', null, true);

        if (response.success) {
            await redirectAfterLogin();
        }
    } catch (error) {
        // Token invalid, clear it
        console.log('Token invalid, staying on auth page');
        localStorage.removeItem('zora_token');
    }
}

/**
 * Check if user is on a protected page and redirect to login if not authenticated
 * Call this on protected pages
 */
async function requireAuth() {
    const token = localStorage.getItem('zora_token');

    if (!token) {
        // No token, redirect to login
        window.location.href = '../auth/login.html';
        return null;
    }

    try {
        // Validate token
        const response = await apiCall('/auth/me', 'GET', null, true);

        if (response.success) {
            return response.data; // Return user data
        }
    } catch (error) {
        // Token invalid, clear and redirect
        console.error('Auth check failed:', error);
        localStorage.removeItem('zora_token');
        showError('Your session expired. Please login again.');
        window.location.href = '../auth/login.html';
        return null;
    }
}

/**
 * Handle logout
 */
async function logout() {
    try {
        // Call logout endpoint (optional, for server-side logging)
        await apiCall('/auth/logout', 'POST', null, true);
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Always clear local session state and redirect
        [
            'zora_token',
            'zora_onboarding_name',
            'zora_onboarding_topics',
            'zora_language'
        ].forEach((key) => localStorage.removeItem(key));
        window.location.href = '../auth/login.html';
    }
}

/**
 * Get current user data
 * @returns {Promise<object|null>} User data or null
 */
async function getCurrentUser() {
    try {
        const response = await apiCall('/auth/me', 'GET', null, true);
        return response.success ? response.data : null;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Redirect authenticated users based on onboarding status.
 */
async function redirectAfterLogin() {
    const onboardingResponse = await apiCall('/onboarding/status', 'GET', null, true);
    const onboardingDone = onboardingResponse?.data?.onboarding_done === true;

    if (onboardingDone) {
        window.location.href = '../chat/index.html';
        return;
    }

    window.location.href = '../onboarding/name.html';
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleSignup,
        handleGoogleAuth,
        checkAuthStatus,
        requireAuth,
        logout,
        getCurrentUser,
        redirectAfterLogin
    };
}
