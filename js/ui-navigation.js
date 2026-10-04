//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// #region Settings Modal
/**
 * @class SettingsManager
 * @description Manages application settings.
 */
class SettingsManager {
    constructor() {
        this.settings = {
            showTimer: true,
            showWinners: true,
            lbToggle: false,
            casualToggle: false,
            cacheBypassToggle: false
        };
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
        // Save button
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.syncSettingsFromUI();
                this.applySettings();
                this.saveSettings();
                this.showSaveConfirmation();
            });
        }

        this.setupToggleHandlers();
        this.setupModalHandlers();
    }

    /**
     * Wire a change listener to every settings checkbox so we insta save those
     */
    setupToggleHandlers() {
        Object.keys(this.settings).forEach(key => {
            const toggle = document.getElementById(this.getToggleId(key));
            if (!toggle) {
                console.warn(`Settings toggle not found for: ${key}`);
                return;
            }

            toggle.addEventListener('change', () => {
                this.settings[key] = toggle.checked;
                this.updateVisibility(toggle, this.getTargetElement(key), key);
                this.saveSettings();
            });
        });
    }

    syncSettingsFromUI() {
        Object.keys(this.settings).forEach(key => {
            const toggle = document.getElementById(this.getToggleId(key));
            if (toggle) {
                this.settings[key] = toggle.checked;
            }
        });
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
            bannedButton: document.getElementById('bannedButton'),
            whitelistModal: document.getElementById('whiteListModsModal'),
            whitelistButton: document.getElementById('whiteListModsButton')
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

        if (elements.whitelistButton && elements.whitelistModal) {
            elements.whitelistButton.addEventListener('click', async () => {
                try {
                    this.whitelistmods = await this.getWhiteListMods();
                    if (this.whitelistmods && !this.whitelistmods.error) {
                        toggleModal(elements.whitelistModal, true);
                        this.displayWhitelistMods(this.whitelistmods);
                    } else {
                        console.error('Error loading whitelisted mods:', this.whitelistmods?.error);
                    }
                } catch (error) {
                    console.error('Error loading whitelisted mods:', error);
                }
            });
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
            });
        });

        // Click out of modal close
        window.addEventListener('click', (event) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (event.target === modal) {
                    toggleModal(modal, false);
                }
            });
        });

        // Escape closing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    toggleModal(modal, false);
                });
            }
        });
    }

    async getBannedMods() {
        const data = await apiFetch(`/api/network/functions/get_banned_mods.php`, { showErrorToast: false });
        if (!data) return { error: 'Failed to fetch banned mods' };

        return data;
    }

    async getWhiteListMods() {
        const data = await apiFetch(`/api/network/functions/get_whitelist_mods.php`, { showErrorToast: false });
        if (!data) return { error: 'Failed to fetch banned mods' };

        return data;
    }

    /**
     * Renders the list of banned mods into a two-column grid layout in the banned mods modal.
     * @param {Array<string>} mods - Array of banned mod name strings to display
     */
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

    /**
     * Renders the list of whitelisted mods into a two-column grid layout
     * @param {Array<string>} mods - Array of whitelisted mod name strings to display
     */
    displayWhitelistMods(mods) {
        const container = document.getElementById('whitelistModsContainer');
        if (!container) {
            return;
        }

        if (!Array.isArray(mods)) {
            container.innerHTML = '<p class="error-message">Error loading mods</p>';
            return;
        }

        if (mods.length === 0) {
            container.innerHTML = '<p class="no-mods-message">No whitelisted mods</p>';
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

/**
 * @class SettingsHelper
 * @description Class providing access to the global SettingsManager instance
 */
class SettingsHelper {
    /**
     * Get setting value
     * @param {string} key - The setting key
     * @returns {*|null} The setting value, or null
     */
    static get(key) {
        if (window.settingsManager) {
            return window.settingsManager.getSetting(key);
        }
        return null;
    }

    /**
     * Retrieves all settings from SettingsManager
     * @returns {Object|null} Copy of all settings, or null
     */
    static getAll() {
        if (window.settingsManager) {
            return window.settingsManager.getAllSettings();
        }
        return null;
    }
}

// #region Init
window.settingsManager = null;

document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

window.SettingsHelper = SettingsHelper;