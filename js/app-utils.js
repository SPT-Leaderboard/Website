//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
});

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
        "labyrinth": "The Labyrinth"
    };

    entry.toLowerCase();

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

// Ranks
function getRank(rating, maxRating = 2000, res = 32) {
    const totalRanks = 50;
    const rankIndex = Math.min(totalRanks - 1, Math.floor((rating / maxRating) * totalRanks));
    const level = rankIndex + 1;
    const levelGroup = Math.floor((level - 1) / 10);
    const groupProgress = ((level - 1) % 10) / 9;

    // Level inside rank group level (yes)
    const rankInGroup = ((level - 1) % 6) + 1;

    // Map the images (6 images per 10 ranks show smoothly)
    let imageIndex = Math.min(6, Math.floor((rankInGroup + 1) / 2));
    if (rankInGroup === 9) imageIndex = 5;
    if (rankInGroup === 10) imageIndex = 6;

    const rankNames = [
        // Level 1
        ['Recruit', 'Private', 'Private Second Class', 'Private First Class', 'Lance Corporal',
            'Specialist', 'Trooper', 'Rifleman', 'Grenadier', 'Combatant'],
        // Level 2
        ['Corporal', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant',
            'First Sergeant', 'Sergeant Major', 'Command Sergeant Major', 'Senior Enlisted Advisor', 'Chief Petty Officer'],
        // Level 3
        ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel',
            'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'],
        // Level 4
        ['General of the Army', 'Field Marshal', 'Marshal of the Air Force', 'Fleet Admiral',
            'Admiral of the Fleet', 'Supreme Commander', 'Chief of Defense', 'Generalissimo',
            'Grand Marshal', 'Arch-General'],
        // Level 5
        ['BEAR Commander', 'USEC Commander', 'TerraGroup Agent', 'High Commander',
            'Warlord', 'Marshal General', 'Ghost of Tarkov', 'Operator Supreme',
            'TerraGroup Operator', 'Tarkov Legend']
    ];

    const getGroupColor = (groupIndex, progress) => {
        const groupColors = [
            [100, 149, 237],  // Blue
            [50, 205, 50],    // Green
            [255, 165, 0],    // Orange
            [220, 20, 60],    // Crimson
            [138, 43, 226],   // Blue (second blue)
            [255, 215, 0]     // Gold
        ];

        if (groupIndex >= 5) {
            return groupColors[5];
        }

        // Same cubic easing from CSS, but in JS, behold :kek:
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

    const [r, g, b] = getGroupColor(levelGroup, groupProgress);

    // Dynamic coloring (wow)
    const borderColor = `rgba(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)}, 0.6)`;
    const textColor = `hsl(${Math.round((r + g + b) / 3)}, 100%, 95%)`;

    // Gradient
    const gradient = `linear-gradient(135deg, 
        rgba(${r}, ${g}, ${b}, 0.4), 
        rgba(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)}, 0.6))`;

    const rankName = rankNames[levelGroup][rankInGroup - 1];

    return {
        image: `media/player_ranks/Rank${levelGroup + 1}/${imageIndex}@${res}px.png`,
        name: rankName,
        fullName: `${rankName} (LVL ${level})`,
        level: level,
        rankInGroup: rankInGroup,
        levelGroup: levelGroup + 1,
        progress: Math.round((rating / maxRating) * 100),
        gradient: gradient,
        borderColor: borderColor,
        textColor: textColor
    };
}

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

// Clean weapon name helper
function cleanWeaponNameFunc(weaponName) {
    let cleaned = weaponName.replace(/<color=.*?>/g, "");

    cleaned = cleaned.replace(/<\/color>/g, "");
    cleaned = cleaned.replace(/[★☆]/g, "");
    cleaned = cleaned.replace(/"/g, "");

    return cleaned.trim();
}

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

// To 00:00
function formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
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

/**
 * Formats time of SCAV/PMC total playtime on the main profile section
 * @param {number} seconds - Amount of seconds
 * @returns {string}
 */
function formatOnlineTime(seconds) {
    if (!seconds)
        return '0m';

    let result = [];
    const minutes = Math.floor((seconds % 3600) / 60);
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);

    result.push(`${hours}h`);
    result.push(`${minutes}m`)

    return result.join(' ') || '0m';
}

/**
 * Format UNIX timestamp to return "Xm ago || Xd ago"
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

async function getCustomProfileSettings(profileId) {
    try {
        const response = await fetch(profileAppearencePath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ profileId: profileId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result.settings;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function waitForDataReady(callback, timeout = 15000) {
    const startTime = Date.now();
    const checkInterval = 300;

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

// Format number and add 'Bil', 'Mil, 'K' suffixes to it
function formatSalesNum(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'Bil';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'Mil';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Check if user actually owns premium
function isPremium(player) {
    const now = Math.floor(Date.now() / 1000);

    return !!(player.isPremium && player.premiumUntil && player.premiumUntil > now);
}

// Quick util for loading data from JSON
async function loadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return await response.json();
}