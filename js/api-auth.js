//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

let autoLoginAttempts = 0;
let authCheckInProgress = false;
let authCheckCompleted = false;
const MAX_AUTO_LOGIN_ATTEMPTS = 1;
window.global_user_data = [];

async function checkAuth() {
    if (authCheckInProgress || authCheckCompleted) {
        return;
    }
    
    authCheckInProgress = true;
    
    try {
        updateAuthStatus('checking', 'Checking...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await apiFetch('/api/network/login/check_auth.php', {
            method: 'GET',
            credentials: 'include',
            cacheBust: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response) {
            console.error(`HTTP error! status: ${response.status}`);
        }

        const data = response;

        if (data.authenticated && data.username) {
            updateAuthStatus('authenticated', data.username, data.profilePicture, data.unreadCount || 0);
            isLoggedIn = true;
            autoLoginAttempts = 0;
            
            window.global_user_data = data;

        } else if (data.maintenance) {
            updateAuthStatus('maintenance', 'Maintenance', 0);
            isLoggedIn = false;
        } else {
            // unauth
            updateAuthStatus('not-authenticated', 'Unauthorized', 0);
            isLoggedIn = false;
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Auth check timeout');
            updateAuthStatus('error', 'Request timeout', 0);
        } else {
            console.error('Auth check failed:', error);
            updateAuthStatus('error', 'Connection error', 0);
        }

        isLoggedIn = false;
        autoLoginAttempts++;
    } finally {
        authCheckInProgress = false;
        authCheckCompleted = true;
    }
}

function updateAuthStatus(status, message, profilePicture, notifications = 0) {
    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');
    const userProfilePfp = document.getElementById('userProfilePfp');
    const userAvatar = document.getElementById('userAvatar');
    const notificationElement = document.getElementById('networkNotifies');

    if (loginButton) {
        if (status === 'authenticated') {
            if (loginButtonText) {
                loginButtonText.textContent = message;
            }

            if (userProfilePfp && userAvatar) {
                const avatarUrl = profilePicture;
                userAvatar.src = avatarUrl;
                userProfilePfp.style.display = 'block';
            }

            if (notificationElement) {
                if (notifications > 0) {
                    notificationElement.textContent = notifications > 99 ? '99+' : notifications;
                    notificationElement.style.display = 'flex';
                    notificationElement.setAttribute('data-count', notifications);
                } else {
                    notificationElement.textContent = '';
                    notificationElement.style.display = 'none';
                    notificationElement.removeAttribute('data-count');
                }
            }

            loginButton.classList.add('authenticated');
            loginButton.href = '/api/network/login/index.php';
            loginButton.title = `Logged in as ${message}`;
        } else {
            if (loginButtonText) {
                loginButtonText.textContent = 'Login';
            }

            if (userProfilePfp) {
                userProfilePfp.style.display = 'none';
            }

            if (notificationElement) {
                notificationElement.textContent = '';
                notificationElement.style.display = 'none';
                notificationElement.removeAttribute('data-count');
            }

            loginButton.classList.remove('authenticated');
            loginButton.href = '/api/network/login/index.php';
            loginButton.title = 'Login to your account';
        }
    }
}

async function silentAuthCheck() {
    if (authCheckCompleted) {
        return;
    }
    
    try {
        const response = await apiFetch('/api/network/login/check_auth.php', {
            method: 'GET',
            credentials: 'include',
            cacheBust: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response) return;

        if (response.authenticated && response.username) {
            const notificationElement = document.getElementById('networkNotifies');
            if (notificationElement) {
                if (response.unreadCount > 0) {
                    notificationElement.textContent = response.unreadCount > 99 ? '99+' : response.unreadCount;
                    notificationElement.style.display = 'flex';
                } else {
                    notificationElement.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Silent auth check failed:', error);
        autoLoginAttempts++;
    }
}