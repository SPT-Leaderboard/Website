//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// AutoUpdater.setEnabled(false);
// AutoUpdater.setInterval(10);
// AutoUpdater.forceUpdate();

/**
 * AutoUpdater module - Manages automatic data updates with configurable intervals and modes
 * @namespace AutoUpdater
 */
const AutoUpdater = (() => {
    let updateInterval = 8;
    let timeLeft = updateInterval;
    let autoUpdateEnabled = true;
    let updateMode = 'normal';
    let updateTimer;
    let timeToUpdateSpan;
    let autoUpdateToggle;
    let forceUpdateRadio;
    let heartbeatRadio;
    let normalRadio;
    let isUpdating = false;

    function startUpdateTimer() {
        clearInterval(updateTimer);
        updateTimeDisplay();

        updateTimer = setInterval(async () => {
            if (isUpdating) {
                return;
            }

            timeLeft--;
            updateTimeDisplay();

            if (timeLeft <= 0) {
                isUpdating = true;
                try {
                    await loadSeasonData(seasons[0]);
                } finally {
                    timeLeft = updateInterval;
                    isUpdating = false;
                    updateTimeDisplay();
                }
            }
        }, 1000);
    }

    function updateTimeDisplay() {
        if (!timeToUpdateSpan) return;

        if (isUpdating) {
            timeToUpdateSpan.textContent = "Updating...";
            return;
        }

        if (!autoUpdateEnabled) {
            timeToUpdateSpan.innerHTML = `Auto-update disabled`;
            return;
        }

        if (updateMode === 'heartbeat') {
            timeToUpdateSpan.innerHTML = `
                <span class="update-status">
                    <span class="status-dot heartbeat"></span>
                    Live updates via heartbeat
                </span>
            `;
        } else if (updateMode === 'force') {
            timeToUpdateSpan.innerHTML = `
                <span class="update-status">
                    <span class="status-dot force"></span>
                    Force update in: ${timeLeft}s
                </span>
            `;
        } else { // normal
            timeToUpdateSpan.innerHTML = `
                <span class="update-status">
                    <span class="status-dot normal"></span>
                    Next update in: ${timeLeft}s
                </span>
            `;
        }
    }

    // Public
    return {
        /**
         * Voodoo shit right there Carl. Initializes the AutoUpdater
         * @param {string} [updateToggleId='autoUpdateToggle'] - ID of the auto-update toggle checkbox
         * @param {string} [timeDisplayId='timeToUpdate'] - ID of the element displaying update time
         * @param {string} [forceRadioId='forceUpdateRadio'] - ID of the force update mode radio button
         * @param {string} [heartbeatRadioId='heartbeatRadio'] - ID of the heartbeat mode radio button
         * @param {string} [normalRadioId='normalRadio'] - ID of the normal update mode radio button
         */
        init(updateToggleId = 'autoUpdateToggle', timeDisplayId = 'timeToUpdate',
            forceRadioId = 'forceUpdateRadio', heartbeatRadioId = 'heartbeatRadio',
            normalRadioId = 'normalRadio') {
            autoUpdateToggle = document.getElementById(updateToggleId);
            forceUpdateRadio = document.getElementById(forceRadioId);
            heartbeatRadio = document.getElementById(heartbeatRadioId);
            normalRadio = document.getElementById(normalRadioId);
            timeToUpdateSpan = document.getElementById(timeDisplayId);

            autoUpdateEnabled = getCookie('autoUpdateEnabled') !== 'false';
            const savedMode = getCookie('updateMode');
            updateMode = (savedMode === 'force' || savedMode === 'heartbeat' || savedMode === 'normal')
                ? savedMode
                : 'normal';

            if (autoUpdateToggle) autoUpdateToggle.checked = autoUpdateEnabled;
            if (forceUpdateRadio) forceUpdateRadio.checked = (updateMode === 'force');
            if (heartbeatRadio) heartbeatRadio.checked = (updateMode === 'heartbeat');
            if (normalRadio) normalRadio.checked = (updateMode === 'normal');

            if (autoUpdateToggle) {
                autoUpdateToggle.addEventListener('change', (e) => {
                    this.setAutoUpdateEnabled(e.target.checked);
                });
            }

            if (forceUpdateRadio) {
                forceUpdateRadio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.setUpdateMode('force');
                    }
                });
            }

            if (heartbeatRadio) {
                heartbeatRadio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.setUpdateMode('heartbeat');
                    }
                });
            }

            if (normalRadio) {
                normalRadio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.setUpdateMode('normal');
                    }
                });
            }

            // Init timer
            if (autoUpdateEnabled && (updateMode === 'force' || updateMode === 'normal')) {
                startUpdateTimer();
            } else if (timeToUpdateSpan) {
                updateTimeDisplay();
            }
        },

        /**
         * Enables or disables the season data auto-update
         * @param {boolean} enabled - Whether auto-update should be enabled (true and false)
         */
        setAutoUpdateEnabled(enabled) {
            autoUpdateEnabled = enabled;
            setCookie('autoUpdateEnabled', enabled);
            if (autoUpdateToggle) autoUpdateToggle.checked = enabled;

            if (enabled && (updateMode === 'force' || updateMode === 'normal')) {
                timeLeft = updateInterval;
                startUpdateTimer();
            } else {
                clearInterval(updateTimer);
            }
            updateTimeDisplay();
        },

        /**
         * Sets the update mode for the AutoUpdater
         * @param {string} mode - Update mode (normal, force, heartbeat)
         */
        setUpdateMode(mode) {
            if (mode !== 'force' && mode !== 'heartbeat' && mode !== 'normal') return;

            updateMode = mode;
            setCookie('updateMode', mode);

            if (forceUpdateRadio) forceUpdateRadio.checked = (mode === 'force');
            if (heartbeatRadio) heartbeatRadio.checked = (mode === 'heartbeat');
            if (normalRadio) normalRadio.checked = (mode === 'normal');

            if (autoUpdateEnabled) {
                if (mode === 'force' || mode === 'normal') {
                    timeLeft = updateInterval;
                    startUpdateTimer();
                } else { // heartbeat
                    clearInterval(updateTimer);
                }
            }

            updateTimeDisplay();
            console.log(`Update mode changed to: ${mode}`);
        },

        setForceUpdateEnabled(enabled) {
            forceUpdateEnabled = enabled;
            setCookie('forceUpdateEnabled', enabled);
            if (forceUpdateToggle) forceUpdateToggle.checked = enabled;
        },

        setHeartbeatEnabled(enabled) {
            autoUpdateFromHeartbeats = enabled;
            setCookie('autoUpdateFromHeartbeats', enabled);
            if (forceHeartbeatToggle) forceHeartbeatToggle.checked = enabled;

            if (enabled) {
                clearInterval(updateTimer);
            } else if (autoUpdateEnabled) {
                timeLeft = updateInterval;
                startUpdateTimer();
            }

            updateTimeDisplay();
        },

        getUpdateMode() {
            return updateMode;
        },

        isNormalUpdateEnabled() {
            return updateMode === 'normal' && autoUpdateEnabled;
        },

        isForceUpdateEnabled() {
            return updateMode === 'force' && autoUpdateEnabled;
        },

        isHeartbeatEnabled() {
            return updateMode === 'heartbeat' && autoUpdateEnabled;
        },

        getStatus() {
            return autoUpdateEnabled;
        },

        async forceUpdate() {
            if (isUpdating) {
                return;
            }

            isUpdating = true;
            try {
                if (autoUpdateEnabled && updateMode === 'force') {
                    timeLeft = updateInterval;
                }

                await loadSeasonData(seasons[0]);
            } finally {
                isUpdating = false;
                updateTimeDisplay();
            }
        }
    };
})();