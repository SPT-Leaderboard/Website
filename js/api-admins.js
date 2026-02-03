//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

const ADMINS_STATE_KEY = 'admins_widget_state';
const DROPDOWN_STATE_KEY = 'admins_dropdown_state';

// Widget state, cuz why not
function saveWidgetState(isCollapsed) {
    localStorage.setItem(ADMINS_STATE_KEY, JSON.stringify({ collapsed: isCollapsed }));
}

function loadWidgetState() {
    const saved = localStorage.getItem(ADMINS_STATE_KEY);
    return saved ? JSON.parse(saved).collapsed : false;
}

function saveDropdownState(isExpanded) {
    localStorage.setItem(DROPDOWN_STATE_KEY, JSON.stringify({ expanded: isExpanded }));
}

function loadDropdownState() {
    const saved = localStorage.getItem(DROPDOWN_STATE_KEY);
    return saved ? JSON.parse(saved).expanded : false;
}

async function updateAdminsStatus() {
    const container = document.getElementById('admins-container');
    const contentWrapper = container.querySelector('.content-wrapper');
    const loadingOverlay = document.getElementById('loading-overlay-admin');

    loadingOverlay.classList.add('active');

    try {
        const response = await fetch(`${adminsOnline}?t=${Date.now()}`);
        const usersObject = await response.json();
        let users = Object.values(usersObject);

        if (!(!users || users.length === 0)) {
            users.sort((a, b) => {
                const aOnline = (Date.now() / 1000 - a.last_seen < 2000);
                const bOnline = (Date.now() / 1000 - b.last_seen < 2000);

                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                return a.username.localeCompare(b.username);
            });
            let html = '';
            let visibleAdmins = [];
            let hiddenAdmins = [];
            users.forEach((user, index) => {
                if (!user.username) return;

                const isOnline = (Date.now() / 1000 - user.last_seen < 2000);
                const adminHtml = `
                    <div class="admin-status admin ${isOnline ? 'online' : 'offline'}">
                        <div class="user-info">
                            <span class="username">${user.username}</span>
                            <span class="role-badge">ADMIN</span>
                        </div>
                        <div class="status-info">
                            <span class="status-dot"></span>
                            <span>${isOnline ? 'Online' : formatLastSeen(user.last_seen)}</span>
                        </div>
                    </div>
                `;

                // We only show first 2 online admins
                if (index < 2) {
                    visibleAdmins.push(adminHtml);
                } else {
                    hiddenAdmins.push(adminHtml);
                }
            });
            visibleAdmins.forEach(adminHtml => {
                html += adminHtml;
            });
            if (hiddenAdmins.length > 0) {
                const dropdownExpanded = loadDropdownState();

                html += `
                    <div class="admin-dropdown">
                        <div class="dropdown-header ${dropdownExpanded ? 'active' : ''}">
                            <span>+${hiddenAdmins.length} more</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </div>
                        <div class="dropdown-content ${dropdownExpanded ? 'expanded' : ''}">
                            ${hiddenAdmins.join('')}
                        </div>
                    </div>
                `;
            }
            if (users.length === 0) {
                html = '<div class="admin-status offline"><span>No staff online</span></div>';
            }
            contentWrapper.innerHTML = html;
            const dropdownHeader = contentWrapper.querySelector('.dropdown-header');
            if (dropdownHeader) {
                dropdownHeader.addEventListener('click', function () {
                    this.classList.toggle('active');
                    const content = this.nextElementSibling;
                    content.classList.toggle('expanded');

                    const isExpanded = content.classList.contains('expanded');
                    saveDropdownState(isExpanded);
                });
            }
        } else throw new Error('No users data');

    } catch (error) {
        contentWrapper.innerHTML = `
            <div class="error-message">Failed to load staff status</div>
        `;
    } finally {
        setTimeout(() => {
            loadingOverlay.classList.remove('active');
        }, 300);
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('admins-container');
    const toggleBtn = document.getElementById('toggle-admins');

    const isCollapsed = loadWidgetState();
    if (isCollapsed) {
        container.classList.add('collapsed');
    }

    toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        container.classList.toggle('collapsed');

        const isNowCollapsed = container.classList.contains('collapsed');
        saveWidgetState(isNowCollapsed);
    });

    container.querySelector('.header').addEventListener('click', function (e) {
        if (e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
            container.classList.toggle('collapsed');

            const isNowCollapsed = container.classList.contains('collapsed');
            saveWidgetState(isNowCollapsed);
        }
    });

    updateAdminsStatus().then(r => setInterval(updateAdminsStatus, 30000));

    window.addEventListener('beforeunload', function () {
        const isCollapsed = container.classList.contains('collapsed');
        saveWidgetState(isCollapsed);

        const dropdownContent = container.querySelector('.dropdown-content');
        if (dropdownContent) {
            const isExpanded = dropdownContent.classList.contains('expanded');
            saveDropdownState(isExpanded);
        }
    });
});