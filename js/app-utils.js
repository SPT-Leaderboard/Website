//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

/**
 * Escapes HTML special characters in a string to prevent XSS injection.
 * @param {string} str - The string to escape
 * @returns {string} The escaped string with &, <, >, ", and ' replaced by HTML entities.
 *   Returns the input unchanged if it is not a string.
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPrettyMapName(entry) {
    const mapAliases = {
        "bigmap": "Customs",
        "factory4_day": "Factory",
        "factory4_night": "Night Factory",
        "interchange": "Interchange",
        "laboratory": "Labs",
        "RezervBase": "Reserve",
        "shoreline": "Shoreline",
        "Woods": "Woods",
        "lighthouse": "Lighthouse",
        "TarkovStreets": "Streets of Tarkov",
        "Sandbox": "Ground Zero - Low",
        "Sandbox_high": "Ground Zero - High",
        "labyrinth": "The Labyrinth"
    };

    return mapAliases[entry] || entry; // returning raw if not found
}

// Get boost descriptions and details for tooltips
function getBoostDescription(boost) {
    if (boost >= 2) return 'Great Boost';
    if (boost > 0) return 'Small Boost';
    if (boost === 0) return 'Neutral';
    return 'Penalty Applied.';
}

// Auto offset top by top-stats-bar height
// This is done so navbar doesn't get in the way when window is resized
function initNavbar() {
    function updateNavbarOffset() {
        const bar = document.querySelector('.top-stats-bar');
        if (bar) {
            document.documentElement.style.setProperty('--top-stats-height', bar.offsetHeight + 15 + 'px');
            document.documentElement.style.setProperty('--top-stats-height-variant', bar.offsetHeight - 50 + 'px');
        }
    }

    window.addEventListener('load', updateNavbarOffset);
    window.addEventListener('resize', updateNavbarOffset);

    // Navbar dropdowns
    const dropdowns = document.querySelectorAll('.compact-dropdown');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.compact-toggle');
        const menu = dropdown.querySelector('.compact-menu');

        if (toggle && menu) {
            // Toggling...
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                // Close
                document.querySelectorAll('.compact-dropdown').forEach(other => {
                    if (other !== dropdown) {
                        other.querySelector('.compact-toggle')?.setAttribute('aria-expanded', 'false');
                        other.querySelector('.compact-menu')?.classList.remove('show');
                    }
                });

                // Toggle menu
                this.setAttribute('aria-expanded', !isExpanded);
                menu.classList.toggle('show', !isExpanded);
            });
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.compact-dropdown')) {
            document.querySelectorAll('.compact-dropdown').forEach(dropdown => {
                dropdown.querySelector('.compact-toggle')?.setAttribute('aria-expanded', 'false');
                dropdown.querySelector('.compact-menu')?.classList.remove('show');
            });
        }
    });

    document.querySelectorAll('.compact-item').forEach(item => {
        item.addEventListener('click', function () {
            const dropdown = this.closest('.compact-dropdown');
            if (dropdown) {
                setTimeout(() => {
                    dropdown.querySelector('.compact-toggle')?.setAttribute('aria-expanded', 'false');
                    dropdown.querySelector('.compact-menu')?.classList.remove('show');
                }, 100);
            }
        });
    });
}

/**
 * Calculates a player's rank details from their rating, including rank name, level,
 * image path, and dynamically interpolated color values for UI rendering.
 * Ranks are divided into 5 groups of 10 levels (50 total), with 6 rank images per group.
 * @param {number} rating - The player's current rating score
 * @param {number} [maxRating=2000] - The maximum possible rating (to normalize rank calculation)
 * @param {number} [res=32] - The image resolution suffix in pixels (e.g. 32 for @32px.png)
 * @returns {{
 *   image: string,
 *   name: string,
 *   fullName: string,
 *   level: number,
 *   rankInGroup: number,
 *   levelGroup: number,
 *   progress: number,
 *   gradient: string,
 *   borderColor: string,
 *   textColor: string
 * }} Rank data object with display properties
 * @example
 * const rank = getRank(500, 2000, 32);
 * // rank.name => "Corporal"
 * // rank.level => 13
 * // rank.image => "media/player_ranks/Rank2/1@32px.png"
 * // rank.progress => 25
 */
function getRank(rating, maxRating = 2000, res = 32) {
    const totalRanks = 50;
    let rankIndex = Math.floor((rating / maxRating) * totalRanks);
    rankIndex = Math.min(totalRanks - 1, Math.max(0, rankIndex));
    const level = rankIndex + 1;
    const levelGroup = Math.floor((level - 1) / 10);
    const groupPosition = (level - 1) % 10;
    const groupProgress = groupPosition / 9;
    const rankInGroup = groupPosition + 1;
    const isElite = level >= 41;
    const isLegendary = level === 50;

    // Map images
    let imageIndex;
    if (rankInGroup <= 2) imageIndex = 1;
    else if (rankInGroup <= 4) imageIndex = 2;
    else if (rankInGroup <= 6) imageIndex = 3;
    else if (rankInGroup <= 8) imageIndex = 4;
    else imageIndex = 5;

    if (isLegendary) imageIndex = 6;

    const rankNames = [
        ['Recruit', 'Private', 'Private Second Class', 'Private First Class', 'Lance Corporal',
            'Specialist', 'Trooper', 'Rifleman', 'Grenadier', 'Combatant'],
        ['Corporal', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant',
            'First Sergeant', 'Sergeant Major', 'Command Sergeant Major', 'Senior Enlisted Advisor', 'Chief Petty Officer'],
        ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel',
            'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'],
        ['General of the Army', 'Field Marshal', 'Marshal of the Air Force', 'Fleet Admiral',
            'Admiral of the Fleet', 'Supreme Commander', 'Chief of Defense', 'Generalissimo',
            'Grand Marshal', 'Arch-General'],
        ['BEAR Commander', 'USEC Commander', 'TerraGroup Agent', 'High Commander',
            'Warlord', 'Marshal General', 'Ghost of Tarkov', 'Operator Supreme',
            'TerraGroup Operator', 'Legend']
    ];

    const getGroupColor = (groupIndex, progress) => {
        const groupColors = [
            [100, 149, 237],  // Blue
            [50, 205, 50],    // Green
            [255, 165, 0],    // Orange
            [220, 20, 60],    // Crimson
            [138, 43, 226],   // Purple
            [255, 215, 0]     // Gold
        ];

        if (groupIndex >= 5) {
            return groupColors[5];
        }

        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const easedProgress = easeInOutCubic(progress);
        const color1 = groupColors[groupIndex];
        const color2 = groupColors[groupIndex + 1];

        return [
            Math.round(color1[0] + (color2[0] - color1[0]) * easedProgress),
            Math.round(color1[1] + (color2[1] - color1[1]) * easedProgress),
            Math.round(color1[2] + (color2[2] - color1[2]) * easedProgress)
        ];
    };

    let [r, g, b] = getGroupColor(levelGroup, groupProgress);

    if (isElite) {
        const intensity = 1 + (level - 40) / 10; // 1.1 to 2.0
        r = Math.min(255, Math.floor(r * intensity));
        g = Math.min(255, Math.floor(g * intensity));
        b = Math.min(255, Math.floor(b * intensity));
    }

    const borderColor = `rgba(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)}, 0.6)`;
    const textColor = `hsl(${Math.round((r + g + b) / 3)}, 100%, 95%)`;

    let gradient;
    if (isLegendary) {
        gradient = `linear-gradient(135deg, 
            rgba(255, 215, 0, 0.6), 
            rgba(255, 165, 0, 0.8),
            rgba(255, 215, 0, 0.6))`;
    } else if (isElite) {
        const glowIntensity = 0.4 + (level - 40) / 25;
        gradient = `linear-gradient(135deg, 
            rgba(${r}, ${g}, ${b}, ${glowIntensity}), 
            rgba(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)}, 0.8),
            rgba(${r}, ${g}, ${b}, ${glowIntensity}))`;
    } else {
        gradient = `linear-gradient(135deg, 
            rgba(${r}, ${g}, ${b}, 0.4), 
            rgba(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)}, 0.6))`;
    }

    const rankName = rankNames[levelGroup][groupPosition];

    return {
        image: `media/player_ranks/Rank${levelGroup + 1}/${imageIndex}@${res}px.png`,
        name: rankName,
        fullName: `${rankName} (LVL ${level})`,
        level: level,
        rankInGroup: rankInGroup,
        levelGroup: levelGroup + 1,
        progress: Math.min(100, Math.round((rating / maxRating) * 100)),
        gradient: gradient,
        borderColor: borderColor,
        textColor: textColor,
        RGB: `${r}, ${g}, ${b}`,
        isElite: isElite,
        isLegendary: isLegendary,
        // Animation properties
        glowIntensity: isElite ? 0.5 + (level - 40) / 20 : 0
    };
}

/**
 * Returns a placement label for the top 3 leaderboard winners.
 * @param {number} rank - The player's placement (1, 2, or 3)
 * @returns {string} A display string (e.g. "First place"), or empty string for ranks outside top 3
 */
function getRankText(rank) {
    switch (rank) {
        case 1: return 'First place';
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

// Clean weapon name helper
function cleanWeaponNameFunc(weaponName) {
    let cleaned = weaponName.replace(/<color=.*?>/g, "");

    cleaned = cleaned.replace(/<\/color>/g, "");
    cleaned = cleaned.replace(/[★☆]/g, "");

    return cleaned.replace(/"/g, "").trim();
}

/**
 * Formats a Unix timestamp into a human-readable relative time string (e.g. "5 minutes ago", "2 days ago").
 * @param {number} unixTimestamp - Unix timestamp in seconds
 * @returns {string} A relative time string, or "Unknown" if the timestamp is invalid or non-positive
 */
function formatLastPlayedRaid(unixTimestamp) {
    if (typeof unixTimestamp !== "number" || unixTimestamp <= 0) {
        return "Unknown";
    }

    const date = new Date(unixTimestamp * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);

    if (diffInMinutes < 5) {
        return "Just Now";
    }

    if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) {
        return "1 hour ago";
    }
    if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return "1 day ago";
    }
    if (diffInDays < 30) {
        return `${diffInDays} days ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths === 1) {
        return "1 month ago";
    }
    if (diffInMonths < 12) {
        return `${diffInMonths} months ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    if (diffInYears === 1) {
        return "1 year ago";
    }

    return `${diffInYears} years ago`;
}

/**
 * Formats a duration in seconds to a MM:SS string with zero-padding.
 * @param {number} seconds - Total number of seconds
 * @returns {string} Formatted time string (e.g. "05:30")
 */
function formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

/**
 * Formats a Date object into a readable string like "January 5 2026, 14:30".
 * @param {Date|null|undefined} date - The Date object to format
 * @returns {string} Formatted date string, or "Unknown" if the date is falsy
 */
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

/**
 * Formats a duration in seconds into a compact hours-and-minutes string for profile playtime display.
 * @param {number} seconds - Total number of seconds of playtime
 * @returns {string} Formatted string (e.g. "3h 25m"), or "0m" if seconds is falsy
 */
function formatOnlineTime(seconds) {
    if (!seconds || seconds < 0) return '0h 0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
}

/**
 * Format UNIX timestamp to return "Xm ago || Xd ago"
 * @deprecated Use formatLastPlayedRaid() instead
 * @returns {string}
 * @param timestamp
 */
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

/**
 * Formats a duration in seconds into a compact multi-unit string (e.g. "2mo 5d 3h 15m").
 * @param {number} seconds - Total number of seconds
 * @returns {string} Formatted duration string, or "0m" if all units are zero
 */
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

/**
 * Formats a duration in seconds into a compact multi-unit string that to the date in the future
 * Minutes are omitted when months are present.
 * @param {number} seconds - Total number of seconds
 * @returns {string} Formatted duration string
 */
function howMuchUntilFutureDateWeHaveLeft(timestamp) {
    const now = Date.now();
    const target = timestamp * 1000;
    const diff = target - now;

    if (diff <= 0) {
        return "Already passed";
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;

    if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;

    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;

    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;

    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}


// Capitalize first character
function capitalize(str, locale = 'en-EN') {
    if (!str) return str;
    return str[0].toLocaleUpperCase(locale) + str.slice(1).toLocaleLowerCase(locale);
}

/**
 * Fetches custom profile appearance settings for a player from the server.
 * @param {string} profileId - The player's profile ID
 * @returns {Promise<Object|null>} The profile appearance settings object, or null on failure
 */
async function getCustomProfileSettings(profileId) {
    const data = await apiFetch(ApiPaths.profileAppearencePath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: { profileId: profileId },
        cacheBust: false,
        showErrorToast: false,
        timeout: 10000
    });

    return data;
}

/**
 * Callback for various operation to ensure data is not in the proccess of loading
 * @param {function} callback - The function we callback to
 * @param {timeout} timeout - Timeout for the callback if for some reason data doesn't load or function never calls back
 * @returns {void}
 */
function waitForDataReady(callback, timeout = 15000) {
    const startTime = Date.now();
    const checkInterval = 500;

    const intervalId = setInterval(() => {
        if (isDataReady) {
            clearInterval(intervalId);
            setTimeout(callback, 100);
        }

        else if (Date.now() - startTime > timeout) {
            clearInterval(intervalId);
            showToast(`There was an error.`, 'error');
        }
    }, checkInterval);
}

/**
 * Format number and add 'Bil', 'Mil, 'K' suffixes to it
 */
function formatSalesNum(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }

    return num.toString();
}


/**
 * Check if user actually owns premium
 */
function isPremium(player) {
    const now = Math.floor(Date.now() / 1000);

    return !!(player.isPremium && player.premiumUntil && player.premiumUntil > now);
}

/**
 * Quick util for loading data from JSON
 */
async function loadJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        console.error(`Failed to load ${url}: ${response.status}`);
    }

    return await response.json();
}

/**
 * Find player object by id
 */
window.findPlayer = function (playerId) {
    const player = leaderboardData.find((p) => p.id === playerId);

    return player;
}

/**
 * Find player object by permaLink
 */
window.findPlayerByPermaLink = function (permaLink) {
    const player = leaderboardData.find((p) => p.permaLink === permaLink);

    return player;
}

/**
 * Gets classes or icons for the name in ready HTML format, depending on the custom roles, or something else.
 * @param {Array<Object>} player - Player object
 * @returns {string} Formatted HTML
 */
function renderUsernameHTML(player, shouldRenderTeamTag = null) {
    const styleRules = [
        {
            condition: () => player.banned,
            icon: null,
            color: '#787878',
            className: 'banned-name',
            priority: 100
        },
        // Dev
        {
            condition: () => player.dev,
            icon: `<i class="fa-solid fa-user-shield" alt="Staff"></i>`,
            color: '#2486ff',
            className: 'dev-name',
            priority: 95
        },
        // Tester (trusted)
        {
            condition: () => player.trusted && !player.banned,
            icon: `<img loading="lazy" src="/media/trusted.png" alt="Tester" class="account-icon">`,
            color: '#ba8bdb',
            className: 'tester-name',
            priority: 80
        },
        // SPTLB Team
        {
            condition: () => player.teamTag === "SPTLB",
            icon: null,
            color: null,
            className: 'promo-name',
            priority: 75
        },
        // Winner
        {
            condition: () => player.isWinner === true,
            icon: null,
            color: null,
            className: 'gold-name',
            priority: 70
        },
        // Premium
        {
            condition: () => isPremium(player),
            icon: null,
            color: null,
            className: 'premium-name',
            priority: 65
        },
        // Twitch Players
        {
            condition: () => player.isUsingTP && !player.banned,
            icon: null,
            color: null,
            className: 'gradient-tp-text',
            priority: 60
        },
        // EOD Edition
        {
            condition: () => player.accountType === 'edge_of_darkness' && !player.banned && !player.isUsingTP,
            icon: `<img loading="lazy" src="/media/EOD.png" alt="EOD" class="account-icon">`,
            color: null,
            className: 'eod-name',
            priority: 50
        },
        // Unheard Edition
        {
            condition: () => player.accountType === 'unheard_edition' && !player.banned && !player.isUsingTP,
            icon: `<img loading="lazy" src="/media/Unheard.png" alt="Unheard" class="account-icon">`,
            color: '#54d0e7',
            className: 'unheard-name',
            priority: 50
        },
        // Rank-based
        {
            condition: () => player.rank === 1,
            icon: null,
            color: null,
            className: 'gold-name',
            priority: 99
        },
        {
            condition: () => player.rank === 2,
            icon: null,
            color: null,
            className: 'silver-name',
            priority: 92
        },
        {
            condition: () => player.rank === 3,
            icon: null,
            color: null,
            className: 'bronze-name',
            priority: 91
        }
    ];

    const appliedStyles = styleRules
        .sort((a, b) => b.priority - a.priority)
        .filter(rule => rule.condition())
        .reduce((acc, rule) => {
            if (rule.icon && !acc.icon) {
                acc.icon = rule.icon;
            }
            if (rule.color && !acc.color) {
                acc.color = rule.color;
            }
            if (rule.className) {
                acc.classes.push(rule.className);
            }
            return acc;
        }, { icon: null, color: null, classes: [] });

    const iconHTML = appliedStyles.icon ?
        `<span class="username-icon">${appliedStyles.icon}</span>` : '';

    const colorStyle = appliedStyles.color ?
        `style="color: ${appliedStyles.color}"` : '';

    const classesString = appliedStyles.classes.length > 0 ?
        `class="${appliedStyles.classes.join(' ')}"` : '';

    return `
        <span class="player-name-wrapper-main">
            ${iconHTML}
            <span data-text="${player.name}" ${classesString} ${colorStyle}>
                ${shouldRenderTeamTag && player.teamTag ? `[${escapeHtml(player.teamTag)}] ` : ''}${escapeHtml(player.name)}
            </span>
        </span>
    `;
}

function getPlayerEdition(edition) {
    if (!edition || typeof edition !== 'string') {
        return `<span class="status-badge status-suspicious"><i class="fa-solid fa-triangle-exclamation"></i> Unknown Edition: ${escapeHtml(edition)}</span>`;
    }

    const normalizedEdition = edition.toLowerCase().trim();

    const editionMap = {
        'unheard_edition': 'Unheard',
        'edge_of_darkness': 'Edge of Darkness',
        'prepare_for_escape': 'Prepare for Escape',
        'left_behind': 'Left Behind',
        'standard': 'Standard'
    };

    if (editionMap[normalizedEdition]) {
        return `<span class="info-value"> ${editionMap[normalizedEdition]} </span>`;
    }

    for (const [key, value] of Object.entries(editionMap)) {
        if (normalizedEdition.includes(key) || key.includes(normalizedEdition)) {
            return `<span class="info-value"> ${value} </span>`;
        }
    }

    return `<span class="status-badge status-suspicious"><i class="fa-solid fa-triangle-exclamation"></i> Unknown Edition: ${escapeHtml(edition)}</span>`;
}

function truncateName(name, maxLength = 15) {
    if (!name || name.length <= maxLength) return name || 'Unknown';
    return name.substring(0, maxLength) + '...';
}

async function imageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function loadAndCropPlayerImageUtil(player, imgElement) {
    if (!player || !imgElement) return;

    let imageUrl = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;

    if (SettingsHelper.get('cacheBypassToggle')) {
        imageUrl += `?t=${Date.now()}`;
    }

    const fallbackUrl = 'media/default_full_pmc_avatar.png';

    try {
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        tempImg.onload = async () => {
            try {
                const croppedImage = await autoCropTransparent(tempImg);
                imgElement.src = croppedImage.src;
            } catch {
                imgElement.src = imageUrl;
            }
            imgElement.classList.add('loaded');
        };

        tempImg.onerror = () => {
            imgElement.src = fallbackUrl;
            imgElement.classList.add('loaded');
        };

        tempImg.src = imageUrl;
    } catch {
        imgElement.src = fallbackUrl;
        imgElement.classList.add('loaded');
    }
}

/**
 * Quick util for loading data from JSON
 */
class KeepAliveService {
    #keepAliveInterval = null;
    #isActive = false;
    #retryCount = 0;
    #maxRetries = 3;
    #heartbeatInterval = 30000;
    #heartbeatEndpoint = 'api/main/heartbeat/keepalive.php';

    start() {
        if (this.#isActive) {
            console.warn('KeepAliveService is already running');
            return;
        }

        this.#isActive = true;
        this.#retryCount = 0;

        this.#sendHeartbeat().then(r => {
            this.#keepAliveInterval = setInterval(
                () => this.#sendHeartbeat(),
                this.#heartbeatInterval
            );

            console.info('KeepAliveService started');
        });
    }

    stop() {
        if (!this.#isActive) {
            return;
        }

        this.#isActive = false;

        if (this.#keepAliveInterval) {
            clearInterval(this.#keepAliveInterval);
            this.#keepAliveInterval = null;
        }

        this.#retryCount = 0;
        console.info('KeepAliveService stopped');
    }

    async #sendHeartbeat() {
        if (!this.#isActive) {
            return;
        }

        try {
            await apiFetch(this.#heartbeatEndpoint, {
                method: 'POST',
                cacheBust: false,
                showErrorToast: false,
                timeout: 10000,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            this.#retryCount = 0;

        } catch (error) {
            console.error('Heartbeat failed:', error.message);
            await this.#handleHeartbeatFailure();
        }
    }

    async #handleHeartbeatFailure() {
        this.#retryCount++;

        if (this.#retryCount >= this.#maxRetries) {
            await this.#handleConnectionLost();
            return;
        }

        const backoffDelay = Math.min(1000 * Math.pow(2, this.#retryCount), 30000);

        console.warn(
            `Retry ${this.#retryCount}/${this.#maxRetries} in ${backoffDelay}ms`
        );

        setTimeout(() => {
            if (this.#isActive) {
                this.#sendHeartbeat();
            }
        }, backoffDelay);
    }

    async #handleConnectionLost() {
        this.stop();

        const event = new CustomEvent('connectionLost', {
            detail: {
                message: 'Connection to server lost',
                timestamp: Date.now()
            }
        });

        window.dispatchEvent(event);
        console.error('Connection to server lost');
    }

    // Unused
    isActive() {
        return this.#isActive;
    }

    setHeartbeatInterval(interval) {
        if (interval < 10000) {
            throw new Error('Heartbeat interval must be at least 10 seconds');
        }

        this.#heartbeatInterval = interval;

        // Restart
        if (this.#isActive) {
            this.stop();
            this.start();
        }
    }
}

window.keepAliveService = new KeepAliveService();
window.keepAliveService.start();