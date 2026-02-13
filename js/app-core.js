//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

let leaderboardData = []; // For keeping current season data
let seasons = []; // Storing available seasons
let ranOnlyOnce = false; // Run only once (ie winners)

// DYNAMIC: Tells whenever the live update was finished and data is ready
// Better to use in pair with waitForDataReady(() => myFunction()); - automatic callback upon data load
let isDataReady = false;

// DYNAMIC: Indicates when user is logged in Network or not
let isLoggedIn = false;

// For debugging purposes
// Will use local paths for some files/fallbacks
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// For dynamic stats counters
let oldTotalRaids = 0;
let oldTotalKills = 0;
let oldTotalDeaths = 0;
let oldTotalDamage = 0;
let oldTotalKDR = 0;
let oldTotalSurvival = 0;
let oldValidPlayers = 0;
let oldTotalPlayers = 0;
let oldOnlinePlayers = 0;
let oldTotalPlayTime = 0;

// Paths
let seasonPath = '/api/data/seasons/season';
let seasonLocalPath = `fallbacks/`;
let currentSeason = `/api/data/seasons/season9.json?t=${Date.now()}`;
let seasonPathEnd = `.json?t=${Date.now()}`;
let lastRaidsPath = `/api/data/player_raids/`;
let profileAppearencePath = `/api/network/functions/get_player_customization.php`;
let weaponStatsPath = `/api/data/shared/weapon_counters.json?t=${Date.now()}`;
let profileComments = `/api/data/user-comments/player_`;
let profileCommentsEnd = `.json?t=${Date.now()}`;
let profileUrlPath = `https://sptlb.katrinfoxvr.com/#id=`;
let heartbeatsPath = `/api/main/heartbeat/heartbeats.json?t=${Date.now()}`;
let achievementsPath = `/api/data/shared/achievement_counters.json`;
let pmcPfpsPath = `/api/data/pmc_avatars/`;
let globalCounters = `/api/data/shared/global_counters.json`;
let adminsOnline = `/api/admins_online.json`;
let dripDataPath = `/api/network/functions/dripfest/drip_data.json?t=${Date.now()}`;

// Paths for local files if debug is on
if (isLocalhost) {
    pmcPfpsPath = `../fallbacks/pmc_avatars/`;
    currentSeason = `/fallbacks/season9.json`
    seasonPath = `../fallbacks/season`;
    profileAppearencePath = `http://localhost:3000/api/network/functions/get_player_customization.php`;
    weaponStatsPath = `../fallbacks/shared/weapon_counters.json?t=${Date.now()}`;
    profileComments = `fallbacks/user-comments/player_`;
    profileCommentsEnd = `.json?t=${Date.now()}`;
    profileUrlPath = `127.0.0.1:5500/#id=`;
    heartbeatsPath = `fallbacks/heartbeats.json?t=${Date.now()}`;
    achievementsPath = `../fallbacks/shared/achievement_counters.json`;
    lastRaidsPath = `../fallbacks/player_raids/`;
    globalCounters = `../fallbacks/shared/global_counters.json`;
    adminsOnline = `fallbacks/admins_online.json`;
    dripDataPath = `/fallbacks/drip_data.json`;
}

// Call main init on DOM load
document.addEventListener("DOMContentLoaded", async () => {
    // Load previous global stats from localStorage if can
    const savedStats = localStorage.getItem('leaderboardStats');
    if (savedStats) {
        try {
            const stats = JSON.parse(savedStats);
            oldTotalRaids = stats.raids || 0;
            oldTotalKills = stats.kills || 0;
            oldTotalDeaths = stats.deaths || 0;
            oldTotalDamage = stats.damage || 0;
            oldTotalKDR = stats.kdr || 0;
            oldTotalSurvival = stats.survival || 0;
            oldValidPlayers = stats.players || 0;
        } catch (e) {
            console.error('Failed to parse saved stats', e);
        }
    }

    await initAllSeasons();
    await loadAchievementsData();

});

/**
 * Checks if a season with the given number exists on the server
 * @param {number} seasonNumber - The season number to check
 * @returns {Promise<boolean>} - True if season exists, false otherwise
 */
async function checkSeasonExists(seasonNumber) {
    try {
        // Check server first
        const serverUrl = `${seasonPath}${seasonNumber}${seasonPathEnd}`;
        const serverResponse = await fetch(serverUrl);

        return serverResponse.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Detects all available seasons by calling checkSeasonExists(seasonNumber) until 404 is received
 * @returns {Promise<void>}
 */
async function initAllSeasons() {
    // Seasons start from 4
    // Clean up before initialize
    let seasonNumber = 4;
    seasons = [];

    try {
        while (true) {
            const exists = await checkSeasonExists(seasonNumber);
            if (!exists) break;

            seasons.push(seasonNumber);
            seasonNumber++;
        }
    } catch {
        console.error('Error checking number of seasons:', Error);
    } finally {
        // Sort from newest to oldest
        seasons.sort((a, b) => b - a);

        await prepareSeasonData()
        populateSeasonDropdown();
    }
}

/**
 * Proceeds the all seasons been initialized function
 * @returns {Promise<void>}
 */
async function prepareSeasonData() {
    // Load data if we found any seasons
    if (seasons.length > 0) {
        await Promise.all([loadSeasonData(seasons[0])]);

        // TODO: Enable this back next season
        // Load previous winners and run it only once
        if (!ranOnlyOnce) {
            ranOnlyOnce = true;
            await loadPreviousSeasonWinners();
        }

        saveCurrentStats();
    }
}

/**
 * Loads and displays winners from the previous season (if available)
 * @description
 * Fetches data for the previous season if there are more than 2 available seasons
 * @returns {Promise<void>} Doesn't return any value
 */
async function loadPreviousSeasonWinners() {
    if (seasons.length < 2) return;

    const previousSeason = seasons[1];

    try {
        let response = await fetch(`${seasonPath}${previousSeason}${seasonPathEnd}`);
        if (!response.ok && response.status === 404) {
            response = await fetch(`${seasonLocalPath}${previousSeason}.json`);
            if (!response.ok) return;
        } else if (!response.ok) {
            return;
        }

        const data = await response.json();
        const previousSeasonData = data.leaderboard || [];

        calculatePlaces(previousSeasonData);
        displayWinners(previousSeasonData);
    } catch (error) {
        console.error('Error loading previous season:', error);
    }
}

/**
 * For each existing season fills the dropdown menu where you can select seasons
 */
function populateSeasonDropdown() {
    const dropdown = document.getElementById('customSeasonDropdown');
    const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
    const dropdownSelected = dropdown.querySelector('.dropdown-selected');
    const dropdownItems = document.getElementById('dropdownItems');
    const dropdownMenu = dropdown.querySelector('.dropdown-menu');
    const hiddenSelect = document.getElementById('seasonSelect');

    let currentSeason = seasons[0];

    // Initialize hidden select for compatibility
    hiddenSelect.innerHTML = '';
    seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = `Season ${season}`;
        hiddenSelect.appendChild(option);
    });

    // Populate dropdown items
    function populateItems() {
        dropdownItems.innerHTML = '';

        seasons.forEach(season => {
            const item = document.createElement('div');
            item.className = `dropdown-item ${season === currentSeason ? 'selected' : ''}`;
            item.setAttribute('role', 'option');
            item.setAttribute('data-value', season);
            item.textContent = `Season ${season}`;

            item.addEventListener('click', () => {
                selectSeason(season);
                closeDropdown();
            });

            dropdownItems.appendChild(item);
        });
    }

    // Select season
    function selectSeason(season) {
        currentSeason = season;
        dropdownSelected.textContent = `Season ${season}`;

        // Update selected state
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('selected');
            if (item.getAttribute('data-value') === season) {
                item.classList.add('selected');
            }
        });

        // Update hidden select
        hiddenSelect.value = season;

        // Trigger change event
        const event = new Event('change');
        hiddenSelect.dispatchEvent(event);

        // Load season data
        loadSeasonData(season);

        // Update auto-update state
        if (season === seasons[0]) {
            AppState.setAutoUpdate(true);
        } else {
            AppState.setAutoUpdate(false);
            showToast('Live Data Flow was automatically disabled', 'info', 8000);
        }
    }

    // Toggle dropdown
    function toggleDropdown() {
        const isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
        dropdownToggle.setAttribute('aria-expanded', !isExpanded);

        if (!isExpanded) {
            dropdownMenu.classList.add('show');
        } else {
            closeDropdown();
        }
    }

    // Close dropdown
    function closeDropdown() {
        dropdownToggle.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
    }

    // Event listeners
    dropdownToggle.addEventListener('click', toggleDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // Initialize
    selectSeason(seasons[0]);
    populateItems();
}

/**
 * Loads and processes data for specified season called by other functions
 * @param {number} season - Season number to load
 * @returns {Promise<void>}
 */
async function loadSeasonData(season) {
    const emptyLeaderboardNotification = document.getElementById('emptyLeaderboardNotification');
    emptyLeaderboardNotification.style.display = 'none';
    isDataReady = false;

    try {
        // Try loading data from server first
        let response = await fetch(`${seasonPath}${season}${seasonPathEnd}`);

        const data = await response.json();
        leaderboardData = data.leaderboard || [];

        if (leaderboardData.length === 0 || (leaderboardData.length === 1 && Object.keys(leaderboardData[0]).length === 0)) {
            emptyLeaderboardNotification.style.display = 'block';
            await resetStats();
            return;
        }

        // Calculate places before initializing the leaderboard
        calculatePlaces(leaderboardData);

        // Run through this real quick before displaying
        addColorIndicators(leaderboardData);
        checkRecentPlayers(leaderboardData);
        calculateOverallStats(leaderboardData);
        initProfileWatchList(leaderboardData);
    } catch (error) {
        console.error('Error loading season data:', error);
        emptyLeaderboardNotification.style.display = 'block';
    } finally {
        // Data is fully ready
        if (SettingsHelper.get('lbToggle')) {
            await displaySimpleLeaderboard(leaderboardData);
        } else {
            await displayLeaderboard(leaderboardData);
        }

        // Mark data is ready for our callback
        isDataReady = true;
    }
}

/**
 * Renders player leaderboard data in a table
 * @param {Array<Object>} data - Leaderboard data with all the season entries
 * @returns {Promise<void>}
 */
async function displayLeaderboard(data) {
    const tempTableBody = document.createElement('tbody');
    tempTableBody.style.display = 'none';

    // Process players sequentially for proper ordering
    const fragment = document.createDocumentFragment();
    data.forEach(player => {
        const row = document.createElement('tr');
        let lastGame;

        // If user has enabled option to hide Casual Players - we hide them
        if (player.isCasual && SettingsHelper.get('casualToggle')) {
            return;
        }

        // Do not render perma banned players
        if (player.permBanned) return;

        // Check HeartbeatMonitor
        const playerStatus = window.heartbeatMonitor.getPlayerStatus(player.id);

        if (!player.banned) {
            const lastOnlineTime = heartbeatMonitor.isOnline(player.id)
                ? '<span class="player-status-lb-online">Online</span>'
                : window.heartbeatMonitor.getLastOnlineTime(playerStatus.lastUpdate || player.lastPlayed);

            // For lastGame
            if (window.heartbeatMonitor.isOnline(player.id)) {
                lastGame = `<span class="player-status-lb ${playerStatus.statusClass}">${playerStatus.statusText} <div id="blink"></div></span>`
            } else {
                lastGame = `<span class="last-online-time">${lastOnlineTime}</span>`;
            }
        } else {
            lastGame = `<span class="last-online-time">Banned</span>`;
        }

        // Add profile standing
        let badge;
        if (player.banned) {
            badge = `
            <div class="badge-lb tooltip">
                <em class="fa-solid fa-triangle-exclamation" style="color:rgba(255, 110, 100, 1);"></em>
                <span class="tooltiptext">Profile is banned</span>
            </div>`;
        } else if (player?.suspicious && !player.isCasual) {
            badge = `
            <div class="badge-lb tooltip">
                <em class="fa-solid fa-triangle-exclamation" style="color:rgb(255, 214, 100);"></em>
                <span class="tooltiptext">Marked as suspicious by SkillIssueDetector™ (Beta)</span>
            </div>`;
        } else {
            const boostValue = player.boostPerc || 0;
            const boostColor = boostValue >= 1 && boostValue <= 3 ? 'rgba(142, 255, 189, 1)' :
                boostValue > 3 ? 'rgba(100, 200, 255, 1)' :
                    boostValue < 0 ? 'rgba(255, 110, 100, 1)' : 'rgba(255, 255, 255, 1)';

            const boostIcon = boostValue > 0 ? 'fa-arrow-up' : 'fa-arrow-down';

            badge = `
            ${isPremium(player) ? `
            <div class="badge-lb tooltip" style="display: inline !important;">
                <em class='fa-solid fa-shield' style="color:rgb(100, 255, 165);"></em>
                <span class="tooltiptext" style="bottom: 170%;">Profile in good standing</span>
            </div>
            <div class="badge-lb tooltip badge-premium" style="display: inline !important;">
                <em class="fa-solid fa-bolt"></em>
                <span class="tooltiptext" style="bottom: 170%;">Premium BattlePass Owner</span>
            </div>
            <div class="boost-container tooltip">
                <span class="boost-value">${boostValue.toFixed(1)}%</span>
                <em class='fa-solid ${boostIcon}' style="color:${boostColor}; font-size:0.8em"></em>
                <span class="tooltiptext">
                    ${getBoostDescription(boostValue)}
                </span>
            </div>
            ` : `
            <div class="badge-lb tooltip">
                <em class='fa-solid fa-shield' style="color:rgb(100, 255, 165);"></em>
                <span class="tooltiptext">Profile in good standing</span>
            </div>
            <div class="boost-container tooltip">
                <span class="boost-value">${boostValue.toFixed(1)}%</span>
                <em class='fa-solid ${boostIcon}' style="color:${boostColor}; font-size:0.8em"></em>
                <span class="tooltiptext">
                    ${getBoostDescription(boostValue)}
                </span>
            </div> `}
            `
        }

        // Account type handling
        let accountIcon = '';
        let accountColor = '';
        let accountClass = '';

        // 1st prio - dev
        if (player.dev) {
            accountIcon = `<i class="fa-solid fa-user-shield promo-name" alt="Staff" style="font-size: 18px;"></i>`;
            accountColor = '#2486ff';
        }
        // 2nd prio - Tester
        else if (player.trusted && !player.banned) {
            accountIcon = `<img loading="lazy" src="/media/trusted.png" alt="Tester" class="account-icon">`;
            accountColor = '#ba8bdb';
        }
        // 3rd prio - twitch players
        else if (!player.banned && player.isUsingTP) {
            accountClass = 'gradient-tp-text';
            accountColor = '';
        }
        // 4th prio - account type
        else if (!player.banned && !player.isUsingTP) {
            switch (player.accountType) {
                case 'edge_of_darkness':
                    accountIcon = `<img loading="lazy" src="/media/EOD.png" alt="EOD" class="account-icon">`;
                    accountColor = '#be8301';
                    break;
                case 'unheard_edition':
                    accountIcon = `<img loading="lazy" src="/media/Unheard.png" alt="Unheard" class="account-icon">`;
                    accountColor = '#54d0e7';
                    break;
            }
        }
        // Banned - lowest prio
        else {
            accountColor = '#787878';
        }

        // Determine rank classes
        let rankClass = '';
        let nameClass = '';
        if (player.rank === 1) {
            rankClass = 'gold';
            nameClass = 'gold-name';
        } else if (player.rank === 2) {
            rankClass = 'silver';
            nameClass = 'silver-name';
        } else if (player.rank === 3) {
            rankClass = 'bronze';
            nameClass = 'bronze-name';
        }

        // PROMO
        let teamTagClass = '';
        if (player.teamTag === "SPTLB") {
            nameClass = 'promo-name';
            teamTagClass = 'promo-name'
        }

        let finalNameClass = '';
        if (nameClass) {
            finalNameClass = nameClass;
        } else if (accountClass) {
            finalNameClass = accountClass; // TP
        }

        // Winner or Premium - 1 priority
        if (player.isWinner === true) {
            finalNameClass = 'player-name-gold Legendary';
        } else if (isPremium(player)) {
            player.isPremium = true;
            finalNameClass = 'premium-name';
        }

        // Get Rank
        const playerRating = player.networkRaids ?? 0;
        const rank = getRank(playerRating);
        const rankHTML = `
            <div class="badge-lb tooltip">
                <img loading="lazy" src="${rank.image}" height="20" alt="Rank Image"> 
                <span class="tooltiptext">${rank.fullName}</span>
            </div>
        `

        // Prestige icon
        const prestigeImg = [1, 2, 3, 4, 5, 6].includes(player.prestige)
            ? `<img loading="lazy" src="media/leaderboard_icons/Prestige_Icon${player.prestige}.png" style="width: 25px; height: 25px" class="prestige-icon" alt="Prestige ${player.prestige}">`
            : '';

        // Skill rank label
        const rankLabel = player.isCasual ? 'Casual' : getRankLabel(player.totalScore);

        row.innerHTML = `
            <td class="rank ${rankClass}">${player.rank} ${player.medal}</td>
            <td class="teamtag ${teamTagClass}" data-team="${player.teamTag ? player.teamTag : ``}">${player.teamTag ? `[${player.teamTag}]` : ``}</td>
            <td class="player-name" ${accountColor && !finalNameClass ? `style="color: ${accountColor}"` : ''} data-player-id="${player.id || '0'}">
                <div class="lb-row-wrapper">${`<img loading="lazy" class="lb-profile-picture" src="${player.profilePicture || `/api/data/pmc_avatars/${player.permaLink}` || 'media/default_avatar.png'}" onerror="this.src='media/default_avatar.png';"  alt="Avatar"/>`}
                ${accountIcon} <span class="${finalNameClass}">${player.name}</span> ${prestigeImg} <div class="player-mode">${rankHTML}</div></div>
            </td>
            <td>${lastGame || 'N/A'}</td>
            <td><button style="share-button" onclick="copyProfile('${player.id}')"> Share <i class="fa-solid fa-share-from-square"></i> </button></td>
            <td>${badge}</td>
            <td>${`${player.pmcRaids} / ${player.scavRaids ?? 0} (${player.pmcRaids + player.scavRaids ?? 0})`}</td>
            <td class="${player.survivedToDiedRatioClass}">${player.survivalRate}%</td>
            <td class="${player.killToDeathRatioClass}">${player.killToDeathRatio}</td>
            <td class="${player.averageLifeTimeClass}">${formatSeconds(player.averageLifeTime)}</td>
            <td>${!player.totalScore || player.totalScore <= 0 ? 'Calibrating...' : player.totalScore.toFixed(3)} ${!player.totalScore || player.totalScore <= 0 ? '' : `(${rankLabel})`}</td>
            <td class="${player.versionStatus}">${player.sptVer}</td>
        `

        fragment.appendChild(row)
    });

    tempTableBody.appendChild(fragment);

    const mainTable = document.querySelector('#leaderboardTable');
    const currentTableBody = mainTable.querySelector('tbody');
    mainTable.replaceChild(tempTableBody, currentTableBody);
    tempTableBody.style.display = '';

    // Add click handlers for player names
    mainTable.addEventListener('click', (e) => {
        if (e.target.closest('.player-name')) {
            openProfile(e.target.closest('.player-name').dataset.playerId);
        }
        if (e.target.closest('.teamtag')) {
            openTeam(e.target.closest('.teamtag').dataset.team);
        }
    });

    isDataReady = true;
}

/**
 * Renders player leaderboard data in a table (no PFPs, or extra text/tags/icons)
 * @param {Array<Object>} data - Leaderboard data with all the season entries
 * @returns {Promise<void>}
 */
async function displaySimpleLeaderboard(data) {
    const tempTableBody = document.createElement('tbody');
    tempTableBody.style.display = 'none';

    // Process players sequentially for proper ordering
    const fragment = document.createDocumentFragment();
    data.forEach(player => {
        const row = document.createElement('tr');
        let lastGame;

        const nowInSeconds = Math.floor(Date.now() / 1000);
        const fifteenDaysInSeconds = 15 * 24 * 60 * 60;

        // Player was online for more 15 days, skip to render less jank
        // Top 50 will always be shown
        // Will not work when autoUpdater is off
        if (player.rank > 50 && player.absoluteLastTime < nowInSeconds - fifteenDaysInSeconds && AutoUpdater.getStatus()) {
            return;
        }

        // If user has enabled option to hide Casual Players - we hide them
        if (player.isCasual && SettingsHelper.get('casualToggle')) {
            return;
        }

        // Do not render perma banned players
        if (player.permBanned) return;

        // Check HeartbeatMonitor
        const playerStatus = window.heartbeatMonitor.getPlayerStatus(player.id);

        if (!player.banned) {
            const lastOnlineTime = window.heartbeatMonitor.isOnline(player.id)
                ? '<span class="player-status-lb-online">Online</span>'
                : window.heartbeatMonitor.getLastOnlineTime(playerStatus.lastUpdate || player.lastPlayed);

            // For lastGame
            if (window.heartbeatMonitor.isOnline(player.id)) {
                lastGame = `<span class="player-status-lb ${playerStatus.statusClass}">${playerStatus.statusText} <div id="blink"></div></span>`
            } else {
                lastGame = `<span class="last-online-time">${lastOnlineTime}</span>`;
            }
        } else {
            lastGame = `<span class="last-online-time">Banned</span>`;
        }

        // Add profile standing
        // Add profile standing
        let badge = '';
        if (player.banned) {
            badge = `
            <div class="badge-lb tooltip">
                <em class="fa-solid fa-triangle-exclamation" style="color:rgba(255, 110, 100, 1);"></em>
                <span class="tooltiptext">Profile is banned</span>
            </div>`;
        } else if (player?.suspicious && !player.isCasual) {
            badge = `
            <div class="badge-lb tooltip">
                <em class="fa-solid fa-triangle-exclamation" style="color:rgb(255, 214, 100);"></em>
                <span class="tooltiptext">Marked as suspicious by SkillIssueDetector™ (Beta)</span>
            </div>`;
        } else {
            const boostValue = player.boostPerc || 0;
            const boostColor = boostValue >= 1 && boostValue <= 3 ? 'rgba(142, 255, 189, 1)' :
                boostValue > 3 ? 'rgba(100, 200, 255, 1)' :
                    boostValue < 0 ? 'rgba(255, 110, 100, 1)' : 'rgba(255, 255, 255, 1)';

            const boostIcon = boostValue > 0 ? 'fa-arrow-up' :
                boostValue < 0 ? 'fa-arrow-down' : 'fa-arrows-to-dot';

            badge = `
            ${isPremium(player) ? `
            <div class="badge-lb tooltip" style="display: inline !important;">
                <em class='fa-solid fa-shield' style="color:rgb(100, 255, 165);"></em>
                <span class="tooltiptext" style="bottom: 170%;">Profile in good standing</span>
            </div>
            <div class="badge-lb tooltip badge-premium" style="display: inline !important;">
                <em class="fa-solid fa-bolt"></em>
                <span class="tooltiptext" style="bottom: 170%;">Premium BattlePass Owner</span>
            </div>
            <div class="boost-container tooltip">
                <span class="boost-value">${boostValue.toFixed(1)}%</span>
                <em class='fa-solid ${boostIcon}' style="color:${boostColor}; font-size:0.8em"></em>
                <span class="tooltiptext">
                    ${getBoostDescription(boostValue)}
                </span>
            </div>
            ` : `
            <div class="badge-lb tooltip">
                <em class='fa-solid fa-shield' style="color:rgb(100, 255, 165);"></em>
                <span class="tooltiptext">Profile in good standing</span>
            </div>
            <div class="boost-container tooltip">
                <span class="boost-value">${boostValue.toFixed(1)}%</span>
                <em class='fa-solid ${boostIcon}' style="color:${boostColor}; font-size:0.8em"></em>
                <span class="tooltiptext">
                    ${getBoostDescription(boostValue)}
                </span>
            </div> `}
            `
        }

        // Skill rank label
        const rankLabel = player.isCasual ? 'Casual' : getRankLabel(player.totalScore);
        row.innerHTML = `
            <td class="rank">${player.rank}</td>
            <td class="teamtag" data-team="${player.teamTag ? player.teamTag : ``}">${player.teamTag ? `[${player.teamTag}]` : ``}</td>
            <td class="player-name" style="height: 33px;" data-player-id="${player.id || '0'}">
                <span">${player.name}</span>
            </td>
            <td>${lastGame || 'N/A'}</td>
            <td><button style="share-button" onclick="copyProfile('${player.id}')"> Share <i class="fa-solid fa-share-from-square"></i> </button></td>
            <td>${badge}</td>
            <td>${`${player.pmcRaids} / ${player.scavRaids ?? 0} (${player.pmcRaids + player.scavRaids ?? 0})`}</td>
            <td>${player.survivalRate}%</td>
            <td>${player.killToDeathRatio}</td>
            <td>${formatSeconds(player.averageLifeTime)}</td>
            <td>${!player.totalScore || player.totalScore <= 0 ? 'Calibrating...' : player.totalScore.toFixed(3)} ${!player.totalScore || player.totalScore <= 0 ? '' : `(${rankLabel})`}</td>
            <td>${player.sptVer}</td>
        `

        fragment.appendChild(row)
    });

    tempTableBody.appendChild(fragment);

    const mainTable = document.querySelector('#leaderboardTable');
    const currentTableBody = mainTable.querySelector('tbody');
    mainTable.replaceChild(tempTableBody, currentTableBody);
    tempTableBody.style.display = '';

    // Add click handlers for player names
    mainTable.addEventListener('click', (e) => {
        if (e.target.closest('.player-name')) {
            openProfile(e.target.closest('.player-name').dataset.playerId);
        }
        if (e.target.closest('.teamtag')) {
            openTeam(e.target.closest('.teamtag').dataset.team);
        }
    });

    isDataReady = true;
}

/**
 * Returns an array of text (date) depending on when was Unix timestamp set to
 * @param {Array<Object>} unixTimestamp - Unix timestamp
 * @returns Array of text (date)
 * @example In game <div id="blink"></div> | 1d ago | 1m 2d ago
 *
 */
function formatLastPlayed(unixTimestamp) {
    if (typeof unixTimestamp !== 'number' || unixTimestamp <= 0) {
        return 'Unknown';
    }

    const date = new Date(unixTimestamp * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);

    if (diffInMinutes < 30) {
        return '<span class="player-status-lb player-status-lb-finished">Finished Raid <div id="blink"></div></span>';
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return '1d ago';
    }
    if (diffInDays < 30) {
        return `${diffInDays}d ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    const remainingDays = diffInDays % 30;
    if (diffInMonths < 12) {
        return `${diffInMonths}mo${remainingDays > 0 ? ` ${remainingDays}d` : ''} ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    const remainingMonths = diffInMonths % 12;
    return `${diffInYears}y${remainingMonths > 0 ? ` ${remainingMonths}mo` : ''} ago`;
}

// Add color indicators to player stats
function addColorIndicators(data) {
    data.forEach(player => {
        // SPT Version
        if (player.sptVer) {
            const playerParts = player.sptVer.split('.').map(Number);

            if (playerParts[0] === 4 && playerParts[1] === 0) {
                // 4.0.x
                player.versionStatus = 'good';
            } else if (playerParts[0] === 3 && playerParts[1] === 11) {
                // Versions 3.11.x (LTS)
                player.versionStatus = 'lts';
            } else {
                player.versionStatus = 'bad';
            }
        }

        // Survived/Died Ratio
        if (player.survivalRate < 30) {
            player.survivedToDiedRatioClass = 'bad'
        } else if (player.survivalRate < 55) {
            player.survivedToDiedRatioClass = 'average'
        } else if (player.survivalRate < 70) {
            player.survivedToDiedRatioClass = 'good'
        } else {
            player.survivedToDiedRatioClass = 'impressive'
        }

        // Kill/Death Ratio
        if (player.killToDeathRatio < 3) {
            player.killToDeathRatioClass = 'bad'
        } else if (player.killToDeathRatio < 5) {
            player.killToDeathRatioClass = 'average'
        } else if (player.killToDeathRatio < 15) {
            player.killToDeathRatioClass = 'good'
        } else {
            player.killToDeathRatioClass = 'impressive'
        }

        if (player.averageLifeTime < 550) {
            player.averageLifeTimeClass = 'bad';
        } else if (player.averageLifeTime < 600) {
            player.averageLifeTimeClass = 'average'
        } else if (player.averageLifeTime < 950) {
            player.averageLifeTimeClass = 'good'
        } else {
            player.averageLifeTimeClass = 'impressive'
        }
    })
}

// Convert time string to seconds
function convertTimeToSeconds(time) {
    if (!time) return 0
    const [minutes, seconds] = time.split(':').map(Number)
    return minutes * 60 + seconds
}

/**
 * Sorts data by totalScore of the player calculated on the server
 * @param {Array<Object>} data - Leaderboard data with all the season entries
 * @returns {void}
 *
 */
async function calculatePlaces(data) {
    data.forEach((player) => {
        if (player.banned) {
            player.totalScore = 0;
            player.damage = 0;
            player.killToDeathRatio = 0;
            player.averageLifeTime = 0;
            player.pmcRaids = 0;
            player.scavRaids = 0;
            player.survivalRate = 0;
            player.rank = "BANNED";
            player.medal = "";
            player.profilePicture = "media/default_banned.png";
            player.survivedToDiedRatio = 0;
            return;
        }

        if (player.isCasual) {
            player.rank = "Casual";
            player.medal = '';
        }
    });

    // Sorting only non banned players
    data.sort((a, b) => {
        if (a.banned && !b.banned) return 1;
        if (!a.banned && b.banned) return -1;

        return b.totalScore - a.totalScore;
    });

    let rankCounter = 1;

    data.forEach((player) => {
        if (player.banned || player.isCasual) {
            return;
        }

        player.rank = rankCounter;
        player.medal = ['🥇', '🥈', '🥉'][rankCounter - 1] || '';
        rankCounter++;
    });
}

// Get skill rank label
function getRankLabel(totalScore) {
    if (totalScore < 15) return 'L-';
    if (totalScore < 25) return 'L';
    if (totalScore < 35) return 'L+';
    if (totalScore < 45) return 'M-';
    if (totalScore < 55) return 'M';
    if (totalScore < 65) return 'M+';
    if (totalScore < 72) return 'H-';
    if (totalScore < 78) return 'H';
    if (totalScore < 84) return 'H+';
    if (totalScore < 90) return 'P-';
    if (totalScore < 94) return 'P';
    if (totalScore < 97) return 'P+';
    return 'G';
}

// Calculate all stats + dynamic update support
function calculateOverallStats(data) {
    // Save old values before calculating new ones
    const previousStats = {
        raids: oldTotalRaids,
        kills: oldTotalKills,
        deaths: oldTotalDeaths,
        damage: oldTotalDamage,
        kdr: oldTotalKDR,
        survival: oldTotalSurvival,
        players: oldValidPlayers,
        totalPlayers: oldTotalPlayers,
        onlinePlayers: oldOnlinePlayers,
        totalPlayTime: oldTotalPlayTime
    };

    // Reset counters
    let totalRaids = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalDamage = 0;
    let totalKDR = 0;
    let totalSurvival = 0;
    let validPlayers = 0;
    let onlinePlayers = window.heartbeatMonitor.getOnlineCount();
    let totalPlayTime = 0;

    data.forEach(player => {
        if (!player.banned && !player.isCasual) {
            const pmcRaids = player.pmcRaids || 0;
            const survivalRate = Math.min(100, Math.max(0, parseFloat(player.survivalRate) || 0));
            const rawKills = parseFloat(player.pmcKills) || 0;
            const rawKDR = parseFloat(player.killToDeathRatio);
            const kdr = isFinite(rawKDR) && rawKDR >= 0 ? rawKDR : 0;

            if (pmcRaids > 0 && rawKills >= 0) {
                const deaths = kdr > 0 ? rawKills / kdr : pmcRaids;

                totalRaids += pmcRaids;
                totalKills += rawKills;
                totalDeaths += deaths;
                totalDamage += parseFloat(player.damage) || 0;

                totalKDR += kdr;
                totalSurvival += survivalRate;
                validPlayers++;
            }
        }

        if (player.totalPlayTime) {
            totalPlayTime += Math.floor(player.totalPlayTime / 60);
        }
    })

    // Calculate averages
    const averageKDR = totalDeaths > 0 ? totalKills / totalDeaths : 0;
    const averageSurvival = validPlayers > 0 ? totalSurvival / validPlayers : 0;
    const totalPlayers = data.length;

    // Update old values for next animation
    oldTotalRaids = totalRaids;
    oldTotalKills = totalKills;
    oldTotalDeaths = totalDeaths;
    oldTotalDamage = totalDamage;
    oldTotalKDR = averageKDR;
    oldTotalSurvival = averageSurvival;
    oldValidPlayers = validPlayers;
    oldTotalPlayers = totalPlayers;
    oldOnlinePlayers = onlinePlayers;
    oldTotalPlayTime = totalPlayTime;

    // Animate from previous values
    animateNumber('totalRaids', totalRaids, 0, previousStats.raids);
    animateNumber('totalKills', Math.round(totalKills), 0, previousStats.kills);
    animateNumber('totalDeaths', Math.round(totalDeaths), 0, previousStats.deaths);
    animateNumber('totalDamage', totalDamage, 0, previousStats.damage);
    animateNumber('averageKDR', averageKDR, 2, previousStats.kdr);
    animateNumber('averageSurvival', averageSurvival, 2, previousStats.survival);
    animateNumber('totalPlayers', totalPlayers, 0, previousStats.totalPlayers);
    animateNumber('onlinePlayers', onlinePlayers, 0, previousStats.onlinePlayers);
    animateNumber('totalPlayTime', totalPlayTime, 0, previousStats.totalPlayTime);

    // Welcome images yes
    if (localStorage.getItem('welcomeClosed') !== 'true') {
        animateNumber('Raids', totalRaids, 0, previousStats.raids);
        animateNumber('Kills', Math.round(totalKills), 0, previousStats.kills);
        animateNumber('Players', totalPlayers, 0, previousStats.totalPlayers);
        animateNumber('Deaths', Math.round(totalDeaths), 0, previousStats.deaths);
    }
}

/**
 * Resets global statistic counters when called
 * @returns {Promise<void>}
 */
function resetStats() {
    animateNumber('totalDeaths', 0);
    animateNumber('totalRaids', 0);
    animateNumber('totalKills', 0);
    animateNumber('totalDamage', 0);
    animateNumber('averageKDR', 0, 2);
    animateNumber('averageSurvival', 0, 2);
}

function animateNumber(elementId, targetValue, decimals = 0, startValue = null) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const suffix = elementId === 'averageSurvival' ? '%' : '';

    // Parse current displayed value
    let currentDisplayValue = element.textContent.replace(/[^0-9.-]/g, '');

    if (suffix === '%') {
        currentDisplayValue = currentDisplayValue.replace('%', '');
    }

    let currentValue;

    try {
        currentValue = parseFloat(currentDisplayValue);
        if (isNaN(currentValue)) {
            currentValue = startValue !== null ? startValue : 0;
        }
    } catch (e) {
        currentValue = startValue !== null ? startValue : 0;
    }

    // Special case handling for KDR
    if (elementId === 'averageKDR' && currentValue > 100 && targetValue < 100) {
        currentValue = startValue !== null ? startValue : targetValue;
    }

    startValue = startValue !== null ? startValue : currentValue

    // Ensure no huge mismatch between values
    if (targetValue === 0 && startValue > 1000) {
        startValue = 0;
    }

    // Format value with decimals and suffix
    const formatValue = value => {
        return (decimals > 0 ? value.toFixed(decimals) : Math.round(value)) + suffix;
    };

    // Set initial value to avoid jumping from default
    element.innerHTML = formatValue(startValue);

    // Trigger odometer animation by setting target after short delay
    setTimeout(() => {
        element.innerHTML = formatValue(targetValue);
    }, 50); // slight delay to allow Odometer to detect change
}

// Save current stats to localStorage
function saveCurrentStats() {
    const stats = {
        raids: oldTotalRaids,
        kills: oldTotalKills,
        deaths: oldTotalDeaths,
        damage: oldTotalDamage,
        kdr: oldTotalKDR,
        survival: oldTotalSurvival,
        players: oldValidPlayers,
        totalPlayers: oldTotalPlayers,
        onlinePlayers: oldOnlinePlayers,
        totalPlayTime: oldTotalPlayTime
    };

    localStorage.setItem('leaderboardStats', JSON.stringify(stats));
}