//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

function getPrettyMapName(entry) {
    const mapAliases = {
        "bigmap": "Customs",
        "factory4_day": "Factory",
        "factory4_night": "Night Factory",
        "interchange": "Interchange",
        "laboratory": "Labs",
        "RezervBase": "Reserve",
        "shoreline": "Shoreline",
        "woods": "Woods",
        "lighthouse": "Lighthouse",
        "TarkovStreets": "Streets of Tarkov",
        "Sandbox": "Ground Zero - Low",
        "Sandbox_high": "Ground Zero - High",
        "unknown": "Labyrinth"
    };

    entry.toLowerCase();

    return mapAliases[entry] || entry; // returning raw if not found
}

// Get boost descriptions and details for tooltips
function getBoostDescription(boost) {
    if (boost >= 4) return 'Great Boost.';
    if (boost > 0) return 'Small Boost.';
    if (boost === 0) return 'Neutral.';
    return 'Penalty Applied.';
}

// Auto offset top by top-stats-bar height
// This is done so navbar doesn't get in the way when window is resized
function updateNavbarOffset() {
    const bar = document.querySelector('.top-stats-bar');
    if (bar) {
        document.documentElement.style.setProperty('--top-stats-height', bar.offsetHeight + 15 + 'px');
        document.documentElement.style.setProperty('--top-stats-height-variant', bar.offsetHeight - 50 + 'px');
    }
}

window.addEventListener('load', updateNavbarOffset);
window.addEventListener('resize', updateNavbarOffset);

// Ranks
function getRank(rating, maxRating = 1000, res = 32) {
    const totalRanks = 30;
    const rankIndex = Math.min(totalRanks - 1, Math.floor((rating / maxRating) * totalRanks));
    const level = rankIndex + 1;
    const levelGroup = Math.floor((level - 1) / 6);

    // Level inside rank group level (yes)
    const rankInGroup = ((level - 1) % 6) + 1;

    const rankNames = [
        // Level 1
        ['Recruit', 'Private', 'Private First Class', 'Specialist', 'Trooper', 'Agent'],
        // Level 2
        ['Corporal', 'Sergeant', 'Staff Sergeant', 'Petty Officer', 'Detective', 'Operator'],
        // Level 3
        ['Gunnery Sergeant', 'Master Sergeant', 'Lieutenant', 'Warrant Officer', 'Specialist Elite', 'Tactician'],
        // Level 4
        ['Captain', 'Major', 'Commander', 'Lieutenant Commander', 'Elite Operative', 'Vanguard'],
        // Level 5
        ['Colonel', 'Brigadier General', 'General', 'Marshal', 'Commander Elite', 'Legend']
    ];

    const rankName = rankNames[levelGroup][rankInGroup - 1];

    return {
        image: `media/player_ranks/Rank${levelGroup + 1}/${rankInGroup}@${res}px.png`,
        name: rankName,
        fullName: `${rankName} (Level ${level})`,
        level: level,
        rankInGroup: rankInGroup,
        levelGroup: levelGroup + 1,
        progress: Math.round((rating / maxRating) * 100)
    };
}

// Keepalive
class KeepAliveService {
    constructor() {
        this.keepAliveInterval = null;
        this.isActive = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.sendKeepAlive();

        this.keepAliveInterval = setInterval(() => {
            this.sendKeepAlive();
        }, 60000);
    }

    stop() {
        this.isActive = false;
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        this.retryCount = 0;
    }

    async sendKeepAlive() {
        try {
            const response = await fetch('../api/main/heartbeat/keepalive.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            this.retryCount = 0;
        } catch (error) {
            console.error('Keepalive error:', error);
            this.retryCount++;

            if (this.retryCount >= this.maxRetries) {
                console.warn('Max retries reached, stopping keepalive');
                this.stop();
                this.handleConnectionLost();
            }
        }
    }

    handleConnectionLost() {
        console.error('Connection lost');
    }
}

//const keepAliveService = new KeepAliveService();

//document.addEventListener('DOMContentLoaded', () => {
//    keepAliveService.start();
//});

/**
 * Returns text based on player ranking for displayWinners() e.g player.rank = 1 -> '👑 First place 👑'
 * @param {Array<Object>} rank - 3 winners determined by displayWinners() - player.rank
 */
function getRankText(rank) {
    switch (rank) {
        case 1: return '👑 First place 👑';
        case 2: return 'Second place';
        case 3: return 'Third place';
        default: return '';
    }
}

// Saver functions
function setCookie(name, value) {
    localStorage.setItem(name, value);
    document.cookie = `${name}=${value}; path=/; max-age=31536000`;
}

function getCookie(name) {
    // Try to grab setting from localstorage
    const fromStorage = localStorage.getItem(name);
    if (fromStorage !== null) {
        return fromStorage;
    }

    // If not, find a cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
            const value = cookie.substring(name.length + 1);
            localStorage.setItem(name, value);
            return value;
        }
    }

    return '';
}

// format date
function formatDate(date) {
    if (!date)
        return `Unknown`;

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month} ${day} ${year}, ${hours}:${minutes}`;
}

function formatLastSeen(timestamp) {
    if (!timestamp) return 'Long time ago';

    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatTime(seconds) {
    const months = Math.floor(seconds / (3600 * 24 * 30));
    const days = Math.floor((seconds % (3600 * 24 * 30)) / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let result = [];
    if (months > 0) result.push(`${months}mo`);
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0 && months === 0) result.push(`${minutes}m`);

    return result.join(' ') || '0m';
}

// Capitalize first character
function capitalize(str, locale = 'en-EN') {
    if (!str) return str;
    return str[0].toLocaleUpperCase(locale) + str.slice(1).toLocaleLowerCase(locale);
}

async function getCustomProfileSettings(playerId) {
    try {
        const response = await fetch(`/api/network/profile/profiles/${playerId}.json?t=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return data[playerId] || null;
    } catch (error) {
        console.error('Failed to load profile settings:', error);
        return null;
    }
}