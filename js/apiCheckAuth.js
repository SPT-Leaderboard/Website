
//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

async function checkAuth() {
    try {
        updateAuthStatus('checking', 'Checking...');

        const response = await fetch('/api/network/login/check_auth.php', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.authenticated && data.username) {
            updateAuthStatus('authenticated', data.username);
            isLoggedIn = true;
        } else {
            updateAuthStatus('not-authenticated', 'Unauthtorized');
        }

    } catch (error) {
        isLoggedIn = false;
        console.error('Auth check failed:', error);
        updateAuthStatus('error', 'Auth error');
    }
}

function updateAuthStatus(status, message) {
    const authElement = document.getElementById('authStatus');
    const authText = authElement.querySelector('.auth-text');

    authElement.className = `auth-status ${status}`;
    authText.textContent = message;

    setTimeout(() => {
        authElement.classList.add('show');
    }, 100);
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(checkAuth(), 3000);
});