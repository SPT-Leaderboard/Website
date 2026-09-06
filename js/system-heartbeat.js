//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

/**
 * @class HeartbeatMonitor
 * @description Polls the server for player heartbeat data at regular intervals  and
 * provides online/offline status, activity state (in raid, in menu, trading, etc.)
 */
class HeartbeatMonitor {
    constructor() {
        this.heartbeatData = {};
        this.previousHeartbeatData = {};
        this.onlineThreshold = 300;
        this.updateCallbacks = new Set();

        this.fetchTime = 1000;
    }

    /**
     * Fetches the latest heartbeat data for all players from the server API.
     * @returns {Promise<boolean>} True if data was successfully fetched, false otherwise
     */
    async fetchHeartbeats() {
        const data = await apiFetch(`${ApiPaths.heartbeatsPath}`, { showErrorToast: false });
        if (!data) return false;

        this.previousHeartbeatData = { ...this.heartbeatData };
        this.heartbeatData = data;

        return true;
    }

    /**
     * Counts the number of players whose last heartbeat is within the online threshold.
     * @returns {number} The number of currently online players
     */
    getOnlineCount() {
        const currentTime = Date.now() / 1000;
        let onlineCount = 0;

        for (const id in this.heartbeatData) {
            const heartbeat = this.heartbeatData[id];
            const timeDiff = currentTime - heartbeat.timestamp;

            if (timeDiff <= this.onlineThreshold) {
                onlineCount++;
            }
        }

        return onlineCount;
    }

    /**
     * Checks whether a specific player is currently online based on their last heartbeat timestamp.
     * @param {string} id - The player's unique ID
     * @returns {boolean} True if the player's last heartbeat is within the online threshold
     */
    isOnline(id) {
        const heartbeat = this.heartbeatData[id];
        if (!heartbeat) return false;

        const currentTime = Date.now() / 1000;
        const timeDiff = currentTime - heartbeat.timestamp;

        // onlineThreshold check
        return timeDiff <= this.onlineThreshold;
    }

    /**
     * Returns the full status object for a player including online state, activity type,
     * CSS class, display text, and raid details if applicable.
     * @param {string} playerId - The player's unique ID
     * @returns {{isOnline: boolean, status: string, statusClass: string, statusText: string, isRecentlyInRaid: boolean, lastUpdate: number|null, raidDetails: Object|null}} Player status object
     */
    getPlayerStatus(playerId) {
        const heartbeat = this.heartbeatData[playerId];
        const currentTime = Date.now() / 1000;

        // no Heartbeat or last online > 30m - offline
        const isOnline = heartbeat && (currentTime - heartbeat.timestamp <= this.onlineThreshold);

        if (isOnline) {
            const isRecentlyInRaid = (heartbeat.type === 'in_raid' && (currentTime - heartbeat.timestamp) < 3000);

            const raidDetails = heartbeat.type === 'in_raid' ? {
                map: heartbeat.map || 'Unknown',
                side: heartbeat.side || 'Unknown',
                gameTime: heartbeat.gameTime || 'Unknown'
            } : null;


            return {
                isOnline: true,
                status: heartbeat.type,
                statusClass: this._getStatusClass(heartbeat.type),
                statusText: this._getStatusText(heartbeat.type),
                isRecentlyInRaid: isRecentlyInRaid,
                lastUpdate: heartbeat.timestamp,
                raidDetails: raidDetails
            };
        }

        return {
            isOnline: false,
            status: 'offline',
            statusClass: 'player-status-lb-offline',
            statusText: 'Offline',
            lastUpdate: heartbeat?.timestamp || null,
            raidDetails: null
        };
    }

    /**
     * Formats a Unix timestamp into a human-readable "time ago" string.
     * @param {number|null} timestamp - Unix timestamp in seconds
     * @returns {string} Relative time string (e.g. "5m ago", "3h ago", "2d ago") or "Never online"
     */
    getLastOnlineTime(timestamp) {
        if (!timestamp) return "Never online";

        const now = Date.now() / 1000;
        const diff = now - timestamp;

        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
        return `${Math.floor(diff / 2592000)}mo ago`;
    }

    _getStatusClass(statusType) {
        const classes = {
            'online': 'player-status-lb-online',
            'in_menu': 'player-status-lb-menu',
            'in_hideout': 'player-status-lb-hideout',
            'in_raid': 'player-status-lb-raid',
            'in_transit': 'player-status-lb-transit',
            'in_stash': 'player-status-lb-stash',
            'in_flea': 'player-status-lb-flea',
            'in_modding': 'player-status-lb-modding',
            'in_trading': 'player-status-lb-trading',
            'raid_end': 'player-status-lb-finished'
        };
        return classes[statusType] || 'player-status-lb-offline';
    }

    _getStatusText(statusType) {
        const texts = {
            'online': 'Online',
            'in_menu': 'In Menu',
            'in_hideout': 'In Hideout',
            'in_raid': 'In Raid',
            'in_transit': 'In Transit',
            'in_stash': 'Gearing Up',
            'in_flea': 'Browsing Flea',
            'in_modding': 'Modding Weapon',
            'in_trading': 'Trading',
            'raid_end': 'Finished Raid'
        };
        return texts[statusType] || 'Offline';
    }
}

window.heartbeatMonitor = new HeartbeatMonitor();

setInterval(() => {
    heartbeatMonitor.fetchHeartbeats();
}, heartbeatMonitor.fetchTime);

// Load this bad boy
heartbeatMonitor.fetchHeartbeats();