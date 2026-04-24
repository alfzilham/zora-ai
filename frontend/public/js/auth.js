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
    const GOOGLE_CLIENT_ID = window.ZORA_CONFIG?.GOOGLE_CLIENT_ID || '';
    if (!GOOGLE_CLIENT_ID) {
        showError('Google Sign-In is not configured. Please try email login.');
        return;
    }
    // Callback page lives at /auth/google-callback.html in production
    // and at the same path locally  always derived from current origin
    const REDIRECT_URI = window.location.origin + '/auth/google-callback.html';

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

    // Remove any previous listener to avoid accumulation
    if (window._googleAuthListener) {
        window.removeEventListener('message', window._googleAuthListener);
    }

    // Listen for message from popup
    window._googleAuthListener = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            window.removeEventListener('message', window._googleAuthListener);
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
            window.removeEventListener('message', window._googleAuthListener);
            console.error('Google auth error:', event.data.error);
            showError('Google authentication failed. Please try again.');
        }
    };
    window.addEventListener('message', window._googleAuthListener);
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
    let onboardingDone = false;
    try {
        const onboardingResponse = await apiCall('/onboarding/status', 'GET', null, true);
        onboardingDone = onboardingResponse?.data?.onboarding_done === true;
    } catch (err) {
        console.warn('Failed to check onboarding status:', err);
    }

    if (onboardingDone) {
        window.location.href = '../chat/index.html';
        return;
    }

    window.location.href = '../onboarding/name.html';
}

/**
 * Handle Email OTP — send OTP/magic link to email
 * @param {string} email
 */
async function handleEmailOtp(email) {
    try {
        const response = await apiCall('/auth/email-otp/send', 'POST', { email });
        if (!response.success) throw new Error(response.message || 'Failed to send OTP');
        return response.data;
    } catch (error) {
        console.error('Email OTP send error:', error);
        throw error;
    }
}

/**
 * Handle Email OTP — verify code
 * @param {string} email
 * @param {string} code - 6-digit OTP
 */
async function handleVerifyEmailOtp(email, code) {
    try {
        const response = await apiCall('/auth/email-otp/verify', 'POST', { email, code });
        if (response.success && response.data.token) {
            localStorage.setItem('zora_token', response.data.token);
            if (response.data.is_new_user) {
                window.location.href = '../onboarding/name.html';
            } else {
                await redirectAfterLogin();
            }
        } else {
            throw new Error(response.message || 'OTP verification failed');
        }
    } catch (error) {
        console.error('Email OTP verify error:', error);
        throw error;
    }
}

/**
 * Handle Phone OTP — send OTP via Twilio SMS
 * @param {string} phone - format +628xxxxxxxxxx
 */
async function handlePhoneOtp(phone) {
    try {
        const response = await apiCall('/auth/phone-otp/send', 'POST', { phone });
        if (!response.success) throw new Error(response.message || 'Failed to send OTP');
        return response.data;
    } catch (error) {
        console.error('Phone OTP send error:', error);
        throw error;
    }
}

/**
 * Handle Phone OTP — verify code via Twilio Verify
 * @param {string} phone
 * @param {string} code - 6-digit OTP
 */
async function handleVerifyPhoneOtp(phone, code) {
    try {
        const response = await apiCall('/auth/phone-otp/verify', 'POST', { phone, code });
        if (response.success && response.data.token) {
            localStorage.setItem('zora_token', response.data.token);
            if (response.data.is_new_user) {
                window.location.href = '../onboarding/name.html';
            } else {
                await redirectAfterLogin();
            }
        } else {
            throw new Error(response.message || 'OTP verification failed');
        }
    } catch (error) {
        console.error('Phone OTP verify error:', error);
        throw error;
    }
}

/**
 * Handle GitHub OAuth authentication
 */
function handleGithubAuth() {
    const GITHUB_CLIENT_ID = window.ZORA_CONFIG?.GITHUB_CLIENT_ID || '';
    if (!GITHUB_CLIENT_ID) {
        showError('GitHub Sign-In is not configured.');
        return;
    }

    const REDIRECT_URI = window.location.origin + '/auth/github-callback.html';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${GITHUB_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=user:email`;

    const width = 500;
    const height = 600;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const popup = window.open(
        githubAuthUrl,
        'githubAuth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    // Remove any previous listener to avoid accumulation
    if (window._githubAuthListener) {
        window.removeEventListener('message', window._githubAuthListener);
    }

    window._githubAuthListener = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GITHUB_AUTH_SUCCESS') {
            window.removeEventListener('message', window._githubAuthListener);
            try {
                const response = await apiCall('/auth/github', 'POST', {
                    code: event.data.code
                });
                if (response.success && response.data.token) {
                    localStorage.setItem('zora_token', response.data.token);
                    if (response.data.is_new_user) {
                        window.location.href = '../onboarding/name.html';
                    } else {
                        await redirectAfterLogin();
                    }
                }
            } catch (error) {
                console.error('GitHub auth error:', error);
                showError('GitHub authentication failed. Please try again.');
            }
        }

        if (event.data.type === 'GITHUB_AUTH_ERROR') {
            window.removeEventListener('message', window._githubAuthListener);
            console.error('GitHub auth error:', event.data.error);
            showError('GitHub authentication failed. Please try again.');
        }
    };
    window.addEventListener('message', window._githubAuthListener);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleSignup,
        handleGoogleAuth,
        handleEmailOtp,
        handleVerifyEmailOtp,
        handlePhoneOtp,
        handleVerifyPhoneOtp,
        handleGithubAuth,
        checkAuthStatus,
        requireAuth,
        logout,
        getCurrentUser,
        redirectAfterLogin
    };
}
