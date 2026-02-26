//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// #region Settings Modal
class SettingsManager {
    constructor() {
        this.settings = {
            showTimer: true,
            showWinners: true,
            lbToggle: false,
            casualToggle: false,
            cacheBypassToggle: false
        };
        this.playerWidget = null;
        this.bannedMods = [];
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.applySettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('appSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }

    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(this.getToggleId(key));
            if (element) {
                element.checked = this.settings[key];
                this.updateVisibility(element, this.getTargetElement(key), key);
            }
        });
    }

    getToggleId(settingKey) {
        const map = {
            showTimer: 'timerToggle',
            showWinners: 'winnersToggle',
            lbToggle: 'lbToggle',
            casualToggle: 'casualToggle',
            cacheBypassToggle: 'cacheBypassToggle'
        };
        return map[settingKey];
    }

    getTargetElement(settingKey) {
        const map = {
            showTimer: document.getElementById('seasonTimer'),
            showWinners: document.getElementById('winners')
        };
        return map[settingKey] || null;
    }

    updateVisibility(toggle, element, settingKey) {
        const isVisible = toggle.checked;
        this.settings[settingKey] = isVisible;

        if (element) {
            element.style.display = isVisible ? 'block' : 'none';
        }
    }

    setupEventListeners() {
        const toggles = [
            'timerToggle', 'winnersToggle', 'lbToggle', 'casualToggle', 'cacheBypassToggle'
        ];

        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                const settingKey = this.getSettingKey(toggleId);
                const targetElement = this.getTargetElement(settingKey);

                toggle.addEventListener('change', () => {
                    this.updateVisibility(toggle, targetElement, settingKey);
                    this.saveSettings(); // Auto-save
                });
            }
        });

        // Save button just in case lol
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.showSaveConfirmation();
            });
        }

        this.setupModalHandlers();
    }

    getSettingKey(toggleId) {
        const map = {
            timerToggle: 'showTimer',
            winnersToggle: 'showWinners',
            lbToggle: 'lbToggle',
            casualToggle: 'casualToggle',
            cacheBypassToggle: 'cacheBypassToggle'
        };
        return map[toggleId];
    }

    showSaveConfirmation() {
        const btn = document.getElementById('saveSettings');
        if (!btn) return;

        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))';
        }, 2000);
    }

    setupModalHandlers() {
        const elements = {
            infoModal: document.getElementById('infoModal'),
            infoButton: document.getElementById('infoButton'),
            tosModal: document.getElementById('tosModal'),
            tosButton: document.getElementById('tosButton'),
            settingsModal: document.getElementById('settingsModal'),
            settingsButton: document.getElementById('settingsButton'),
            bannedModal: document.getElementById('bannedModal'),
            bannedButton: document.getElementById('bannedButton')
        };

        // Check existing elements
        Object.keys(elements).forEach(key => {
            if (!elements[key]) {
                console.warn(`Element not found: ${key}`);
            }
        });

        this.setupModalLogic(elements);
    }

    setupModalLogic(elements) {
        const toggleModal = (modal, show) => {
            if (!modal) {
                console.error('Modal element not found');
                return;
            }

            if (show) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('active');
                    modal.style.opacity = '1';
                    modal.style.visibility = 'visible';
                }, 10);
            } else {
                modal.classList.remove('active');
                modal.style.opacity = '0';
                modal.style.visibility = 'hidden';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        };

        // Modal
        if (elements.infoButton && elements.infoModal) {
            elements.infoButton.addEventListener('click', () => toggleModal(elements.infoModal, true));
        }

        if (elements.tosButton && elements.tosModal) {
            elements.tosButton.addEventListener('click', () => toggleModal(elements.tosModal, true));
        }

        if (elements.bannedButton && elements.bannedModal) {
            elements.bannedButton.addEventListener('click', async () => {
                try {
                    this.bannedMods = await this.getBannedMods();
                    if (this.bannedMods && !this.bannedMods.error) {
                        toggleModal(elements.bannedModal, true);
                        this.displayBannedMods(this.bannedMods);
                    } else {
                        console.error('Error loading banned mods:', this.bannedMods?.error);
                    }
                } catch (error) {
                    console.error('Error loading banned mods:', error);
                }
            });
        }

        if (elements.settingsButton && elements.settingsModal) {
            elements.settingsButton.addEventListener('click', () => {
                toggleModal(elements.settingsModal, true);
                if (this.playerWidget) {
                    this.playerWidget.show();
                }
            });
        }

        // Modal close
        const closeButtons = document.querySelectorAll('.close, .close-btn, .close-button');
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = button.closest('.modal');
                if (modal) {
                    toggleModal(modal, false);
                }
                if (this.playerWidget) {
                    this.playerWidget.hideIfEmpty();
                }
            });
        });

        // Click out of modal close
        window.addEventListener('click', (event) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (event.target === modal) {
                    toggleModal(modal, false);
                    if (modal === elements.settingsModal && this.playerWidget) {
                        this.playerWidget.hideIfEmpty();
                    }
                }
            });
        });

        // Escape closing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    toggleModal(modal, false);
                    if (modal === elements.settingsModal && this.playerWidget) {
                        this.playerWidget.hideIfEmpty();
                    }
                });
            }
        });
    }

    async getBannedMods() {
        try {
            const response = await fetch(`/api/network/functions/get_banned_mods.php`);
            if (!response.ok) console.error(`HTTP error! ${response.status}`);

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return { error: error.message };
        }
    }

    displayBannedMods(mods) {
        const container = document.getElementById('bannedModsContainer');
        if (!container) {
            return;
        }

        if (!Array.isArray(mods)) {
            container.innerHTML = '<p class="error-message">Error loading mods</p>';
            return;
        }

        if (mods.length === 0) {
            container.innerHTML = '<p class="no-mods-message">No banned mods</p>';
            return;
        }

        const middleIndex = Math.ceil(mods.length / 2);
        container.innerHTML = `
            <div class="banned-mods-grid">
                <div class="mods-column">
                    ${mods.slice(0, middleIndex).map((mod, index) => `
                        <div class="mod-item" data-index="${index}">
                            <span class="ban-mod-name">${this.escapeHtml(mod)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="mods-column">
                    ${mods.slice(middleIndex).map((mod, index) => `
                        <div class="mod-item" data-index="${index + middleIndex}">
                            <span class="ban-mod-name">${this.escapeHtml(mod)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    getSetting(key) {
        return this.settings[key];
    }

    getAllSettings() {
        return { ...this.settings };
    }
}

// #region Player Widget
class PlayerWidget {
    constructor(data) {
        this.data = data || [];
        this.container = null;
        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        // Bind methods
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        this.init();
    }

    init() {
        if (document.getElementById('playerComparisonWidget')) {
            this.container = document.getElementById('playerComparisonWidget');
            return;
        }

        this.createWidget();
        this.setupDrag();
        this.setupEventListeners();

        // Restore the widget state
        this.restoreState();
    }

    createWidget() {
        this.container = document.createElement('div');
        this.container.id = 'playerComparisonWidget';
        this.container.className = 'draggable-widget';
        this.container.style.display = 'none';
        this.container.innerHTML = this.getWidgetHTML();
        document.body.appendChild(this.container);
    }

    getWidgetHTML() {
        return `
            <div class="widget-header">
                <h3>Player Watchlist</h3>
                <button class="close-widget">×</button>
            </div>
            <div class="widget-content">
                <div class="player-inputs">
                    <div class="player-input-group">
                        <label for="widgetPlayerOneId">Player ID:</label>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <input type="text" id="widgetPlayerOneId" class="player-id-input" style="flex: 1;" placeholder="Enter player ID">
                            <button id="copyIdBtn" title="Copy ID" class="icon-btn" style="display: none;">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button id="openProfileBtn" title="Open Profile" class="icon-btn" style="display: none;">
                                <i class="fa-solid fa-user"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="player-stats-container-watchlist">
                    <div id="widgetPlayerOneStats"></div>
                </div>
            </div>
        `;
    }

    setupDrag() {
        const header = this.container.querySelector('.widget-header');

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close-widget')) return;

            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.offsetX = e.clientX - rect.left;
            this.offsetY = e.clientY - rect.top;
            this.container.style.cursor = 'grabbing';

            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        });
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        this.container.style.left = `${e.clientX - this.offsetX}px`;
        this.container.style.top = `${e.clientY - this.offsetY}px`;
    }

    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.style.cursor = 'grab';

            // Save position
            this.savePosition();

            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
        }
    }

    setupEventListeners() {
        const playerOneInput = this.container.querySelector('#widgetPlayerOneId');
        const playerOneStatsDiv = this.container.querySelector('#widgetPlayerOneStats');
        const copyBtn = this.container.querySelector('#copyIdBtn');
        const openBtn = this.container.querySelector('#openProfileBtn');
        const closeBtn = this.container.querySelector('.close-widget');

        const updateStats = () => {
            const p1Id = playerOneInput.value.trim();
            localStorage.setItem('playerOneId', p1Id);

            const p1 = this.findPlayerById(p1Id);

            if (p1) {
                playerOneStatsDiv.innerHTML = this.getPlayerStatsHTML(p1);
                copyBtn.style.display = 'inline-block';
                openBtn.style.display = 'inline-block';
            } else {
                playerOneStatsDiv.innerHTML = '<p class="not-found">Player ID not found</p>';
                copyBtn.style.display = 'none';
                openBtn.style.display = 'none';
            }
        };

        playerOneInput.addEventListener('input', updateStats);

        // Copy the ID
        copyBtn.addEventListener('click', () => {
            const id = playerOneInput.value.trim();
            if (id) {
                navigator.clipboard.writeText(id).then(() => {
                    copyBtn.innerHTML = "<i class='fa-solid fa-check'></i>";
                    setTimeout(() => copyBtn.innerHTML = "<i class='fa-solid fa-copy'></i>", 1500);
                });
            }
        });

        // Opening profile
        openBtn.addEventListener('click', () => {
            const id = playerOneInput.value.trim();
            if (id) {
                openProfile(id);
            }
        });

        // Close widget
        closeBtn.addEventListener('click', () => {
            this.hide();
            playerOneInput.value = '';
            localStorage.removeItem('playerOneId');
            playerOneStatsDiv.innerHTML = '';
        });
    }

    findPlayerById(id) {
        return this.data.find(p => p.id === id);
    }

    getPlayerStatsHTML(player) {
        return `
            <div class="raid-stats-grid">
                <div class="raid-stat-block">
                    <span class="profile-stat-label">Name:</span>
                    <span class="profile-stat-value">${player.name || 'N/A'}</span>
                </div>
                <div class="raid-stat-block">
                    <span class="profile-stat-label">Rank:</span>
                    <span class="profile-stat-value">${player.rank || 'N/A'}</span>
                </div>
                <div class="raid-stat-block">
                    <span class="profile-stat-label">K/D:</span>
                    <span class="profile-stat-value">${player.killToDeathRatio || 'N/A'}</span>
                </div>
                <div class="raid-stat-block">
                    <span class="profile-stat-label">Skill:</span>
                    <span class="profile-stat-value">${player.totalScore ? player.totalScore.toFixed(2) : 'N/A'} (${getRankLabel(player.totalScore)})</span>
                </div>
            </div>
        `;
    }

    // Restore Widget State
    restoreState() {
        this.restorePosition();
        const savedId = localStorage.getItem('playerOneId');
        if (savedId) {
            const input = this.container.querySelector('#widgetPlayerOneId');
            input.value = savedId;

            // Trigger the update
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }
    }

    restorePosition() {
        const savedPosition = JSON.parse(localStorage.getItem('widgetPosition')) || { top: '20px', left: '20px' };
        this.container.style.top = savedPosition.top;
        this.container.style.left = savedPosition.left;
    }

    savePosition() {
        localStorage.setItem('widgetPosition', JSON.stringify({
            top: this.container.style.top,
            left: this.container.style.left
        }));
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    hideIfEmpty() {
        const input = this.container.querySelector('#widgetPlayerOneId');
        if (input && !input.value.trim()) {
            this.hide();
        }
    }
}

class SettingsHelper {
    static get(key) {
        if (window.settingsManager) {
            return window.settingsManager.getSetting(key);
        }
        return null;
    }

    // Unused for now
    static set(key, value) {
        if (window.settingsManager) {
            window.settingsManager.settings[key] = value;
            window.settingsManager.saveSettings();
            return true;
        }
        return false;
    }

    static getAll() {
        if (window.settingsManager) {
            return window.settingsManager.getAllSettings();
        }
        return null;
    }
}

// #region Init
window.settingsManager = null;
window.playerWidget = null;

document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

window.SettingsHelper = SettingsHelper;

// Backwards compability
function initProfileWatchList(data) {
    if (!window.playerWidget) {
        window.playerWidget = new PlayerWidget(data);
        window.settingsManager.playerWidget = window.playerWidget;
    }
    return window.playerWidget;
}