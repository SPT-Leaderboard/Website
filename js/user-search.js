//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

const AppState = (() => {
    let autoUpdateEnabled = true;
    let searchActive = false;
    let searchType = 'name';

    return {
        setAutoUpdate(enabled) {
            autoUpdateEnabled = enabled && !this.isSearchActive();
            if (typeof AutoUpdater !== 'undefined') {
                AutoUpdater.setEnabled(autoUpdateEnabled);
            }
        },

        setSearchActive(active) {
            searchActive = active;
            this.setAutoUpdate(!active);
        },

        isSearchActive() {
            return searchActive;
        },

        isAutoUpdateEnabled() {
            return autoUpdateEnabled;
        },

        setSearchType(type) {
            searchType = type;
            this.updateSearchUI();
        },

        getSearchType() {
            return searchType;
        },

        updateSearchUI() {
            const searchInput = document.getElementById('playerSearch');
            const searchContainer = document.querySelector('.search-container');
            const buttons = document.querySelectorAll('.search-type-btn');

            // Update active buttons
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === searchType);
            });

            if (searchType === 'id') {
                searchInput.placeholder = 'Find player by ID...';
                searchContainer.classList.add('searching-by-id');
            } else {
                searchInput.placeholder = 'Find player by name...';
                searchContainer.classList.remove('searching-by-id');
            }

        }
    };
})();

function normalizeText(text) {
    return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

function normalizeId(id) {
    return id.toString().replace(/[^\d]/g, '');
}

function searchPlayers() {
    const searchTerm = document.getElementById('playerSearch').value;
    const searchType = AppState.getSearchType();
    const rows = document.querySelectorAll('tbody tr');
    const searchContainer = document.querySelector('.search-container');

    let foundAny = false;
    let visibleCount = 0;

    if (searchTerm !== '') {
        searchContainer.classList.add('search-active');
    } else {
        searchContainer.classList.remove('search-active');
    }

    AppState.setSearchActive(searchTerm !== '');

    rows.forEach((row, index) => {
        const playerNameCell = row.querySelector('.player-name');
        if (!playerNameCell) return;

        let shouldShow = false;

        if (searchType === 'id') {
            // ID
            const playerId = playerNameCell.getAttribute('data-player-id') || '0';
            const normalizedSearch = normalizeId(searchTerm);
            const normalizedId = normalizeId(playerId);

            shouldShow = searchTerm === '' || normalizedId.includes(normalizedSearch);
        } else {
            // Name
            const nameSpan = playerNameCell.querySelector('span');
            const playerName = nameSpan ? normalizeText(nameSpan.textContent) : '';
            const normalizedSearch = normalizeText(searchTerm);

            shouldShow = searchTerm === '' || playerName.includes(normalizedSearch);
        }

        if (shouldShow) {
            visibleCount++;
            row.style.display = '';
            // Highlight row
            if (searchTerm !== '') {
                row.classList.add('search-highlight');
            } else {
                row.classList.remove('search-highlight');
            }

            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 5);
        } else {
            row.classList.remove('search-highlight');
            row.style.opacity = '0';
            row.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                row.style.display = 'none';
            }, 10);
        }

        if (shouldShow) foundAny = true;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('playerSearch');
    const clearButton = document.getElementById('clearSearch');
    const searchTypeButtons = document.querySelectorAll('.search-type-btn');
    const searchIndicator = document.createElement('div');

    searchIndicator.className = 'search-indicator';
    searchInput.parentNode.appendChild(searchIndicator);

    searchTypeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const searchType = this.dataset.type;
            AppState.setSearchType(searchType);

            if (searchInput.value.trim() !== '') {
                searchPlayers();
            }

            setCookie('searchType', searchType, 7);
        });
    });

    // Restore search
    const savedSearch = getCookie('playerSearch');
    const savedSearchType = getCookie('searchType') || 'name';

    if (savedSearch) {
        searchInput.value = savedSearch;
    }

    AppState.setSearchType(savedSearchType);

    setTimeout(() => {
        searchPlayers();
    }, 300);

    let searchTimeout;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            setCookie('playerSearch', this.value, 7);
            searchPlayers();
        }, 200);
    });

    clearButton.addEventListener('click', function () {
        searchInput.style.transform = 'scale(0.98)';
        setTimeout(() => {
            searchInput.value = '';
            setCookie('playerSearch', '', -1);
            searchPlayers();
            searchInput.focus();
            searchInput.style.transform = 'scale(1)';
        }, 150);
    });

    autoUpdateToggle.addEventListener('change', function () {
        const label = this.parentElement;
        if (this.checked) {
            label.style.color = 'var(--accent-teal)';
        } else {
            label.style.color = 'var(--text-light)';
        }
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.ctrlKey) {
            if (e.key === '1') {
                e.preventDefault();
                AppState.setSearchType('name');
                searchTypeButtons[0].click();
            } else if (e.key === '2') {
                e.preventDefault();
                AppState.setSearchType('id');
                searchTypeButtons[1].click();
            }
        }
    });

    clearButton.addEventListener('click', function () {
        searchInput.style.transform = 'scale(0.98)';
        setTimeout(() => {
            searchInput.value = '';
            setCookie('playerSearch', '', -1);
            searchPlayers();
            searchInput.focus();
            searchInput.style.transform = 'scale(1)';
        }, 150);
    });

    // Sync with AutoUpdater
    if (typeof AutoUpdater !== 'undefined') {
        AutoUpdater.init();
        AppState.setAutoUpdate(AutoUpdater.getStatus());
    }
});