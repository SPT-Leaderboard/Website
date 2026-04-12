//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

let authCheckInterval = null;
let autoLoginAttempts = 0;
const MAX_AUTO_LOGIN_ATTEMPTS = 1;

async function checkAuth() {
    try {
        updateAuthStatus('checking', 'Checking...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/network/login/check_auth.php', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.authenticated && data.username) {
            updateAuthStatus('authenticated', data.username, data.profilePicture, data.unreadCount || 0);
            isLoggedIn = true;
            autoLoginAttempts = 0;

            startPeriodicAuthCheck();

        } else if (data.maintenance) {
            updateAuthStatus('maintenance', 'Maintenance', 0);
            isLoggedIn = false;
        } else {
            // unauth
            updateAuthStatus('not-authenticated', 'Unauthorized', 0);
            isLoggedIn = false;

            if (autoLoginAttempts < MAX_AUTO_LOGIN_ATTEMPTS) {
                autoLoginAttempts++;
                // console.log(`Auto-login attempt ${autoLoginAttempts}/${MAX_AUTO_LOGIN_ATTEMPTS}`);

                // retry
                setTimeout(() => checkAuth(), 2000);
            }
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

        // retry
        setTimeout(() => checkAuth(), 5000);
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

function startPeriodicAuthCheck() {
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
    }

    authCheckInterval = setInterval(() => {
        silentAuthCheck();
    }, 300000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            silentAuthCheck();
        }
    });
}

async function silentAuthCheck() {
    try {
        const response = await fetch('/api/network/login/check_auth.php', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) return;

        const data = await response.json();

        if (data.authenticated && data.username) {
            const notificationElement = document.getElementById('networkNotifies');
            if (notificationElement) {
                if (data.unreadCount > 0) {
                    notificationElement.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    notificationElement.style.display = 'flex';
                } else {
                    notificationElement.style.display = 'none';
                }
            }
        } else if (isLoggedIn) {
            checkAuth();
        }
    } catch (error) {
        console.error('Silent auth check failed:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    checkAuth();

    window.addEventListener('beforeunload', function () {
        if (authCheckInterval) {
            clearInterval(authCheckInterval);
        }
    });
});