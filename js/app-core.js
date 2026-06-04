//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

let leaderboardData = []; // For keeping current season data
let oldLeaderboardData = [];
let seasons = []; // Storing available seasons
let ranOnlyOnce = false; // Run only once (ie winners)
let leaderboardConfig = []; // Storing main config off API
let seasonNumber = 10;

// DYNAMIC: Tells whenever the live update was finished and data is ready
// Better to use in pair with waitForDataReady(() => myFunction()); - automatic callback upon data load
let isDataReady = false;

// DYNAMIC: Indicates when user is logged in Network or not
let isLoggedIn = false;

// For debugging purposes
// Will use local paths for some files/fallbacks
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// For dynamic stats counters
const PrevStats = {
    raids: 0,
    kills: 0,
    deaths: 0,
    damage: 0,
    kdr: 0,
    survival: 0,
    validPlayers: 0,
    totalPlayers: 0,
    onlinePlayers: 0,
    playTime: 0
};

// Paths
const ApiPaths = {
    seasonPath: '/api/data/seasons/season',
    seasonLocalPath: 'fallbacks/',
    currentSeason: '/api/data/seasons/season10.json',
    seasonPathEnd: '.json',
    lastRaidsPath: '/api/data/player_raids/',
    profileAppearencePath: '/api/network/functions/get_player_customization.php',
    weaponStatsPath: `/api/data/shared/weapon_counters.json?t=${Date.now()}`,
    profileComments: '/api/data/user-comments/player_',
    profileCommentsEnd: '.json',
    profileUrlPath: 'https://sptlb.katrinfoxvr.com/#id=',
    heartbeatsPath: '../api/main/heartbeat/heartbeats.json',
    achievementsPath: '/api/data/shared/achievement_counters.json',
    pmcPfpsPath: '/api/data/pmc_avatars/',
    globalCounters: '/api/data/shared/global_counters.json',
    adminsOnline: '/api/admins_online.json',
    dripDataPath: `/api/network/functions/dripfest/drip_data.json?t=${Date.now()}`,
    achievementsDataPath: `achievements/js/compiledAchData.json`,
    achievementsCustomDataPath: `achievements/js/compiledAchSEData.json`
};

// Paths for local files if debug is on
if (isLocalhost) {
    ApiPaths.pmcPfpsPath = `../fallbacks/pmc_avatars/`;
    ApiPaths.currentSeason = `/fallbacks/season10.json`;
    ApiPaths.seasonPath = `../fallbacks/season`;
    ApiPaths.profileAppearencePath = `http://localhost:3000/api/network/functions/get_player_customization.php`;
    ApiPaths.weaponStatsPath = `../fallbacks/shared/weapon_counters.json?t=${Date.now()}`;
    ApiPaths.profileComments = `fallbacks/user-comments/player_`;
    ApiPaths.profileCommentsEnd = `.json?t=${Date.now()}`;
    ApiPaths.profileUrlPath = `127.0.0.1:5500/#id=`;
    ApiPaths.heartbeatsPath = `../fallbacks/heartbeats.json`;
    ApiPaths.achievementsPath = `../fallbacks/shared/achievement_counters.json`;
    ApiPaths.lastRaidsPath = `../fallbacks/player_raids/`;
    ApiPaths.globalCounters = `../fallbacks/shared/global_counters.json`;
    ApiPaths.adminsOnline = `fallbacks/admins_online.json`;
    ApiPaths.dripDataPath = `/fallbacks/drip_data.json`;
}

// Call main init on DOM load
document.addEventListener("DOMContentLoaded", async () => {
    // Load previous global stats from localStorage if can
    const savedStats = localStorage.getItem('leaderboardStats');
    if (savedStats) {
        try {
            const stats = JSON.parse(savedStats);
            PrevStats.raids = stats.raids || 0;
            PrevStats.kills = stats.kills || 0;
            PrevStats.deaths = stats.deaths || 0;
            PrevStats.damage = stats.damage || 0;
            PrevStats.kdr = stats.kdr || 0;
            PrevStats.survival = stats.survival || 0;
            PrevStats.validPlayers = stats.players || 0;
        } catch (e) {
            console.error('Failed to parse saved stats', e);
        }
    }

    // app-utils.js
    initNavbar();

    await initSeasonList();

    await loadAchievementsData();
});

/**
 * Checks if a season JSON file exists on the server by making a fetch request.
 * @param {number} seasonNumber - The season number to check (e.g. 4, 5, 6)
 * @returns {Promise<boolean>} Resolves to true if the season file exists and returns valid data, false otherwise
 * @deprecated See initSeasonList()
 */
async function checkSeasonExists(seasonNumber) {
    const serverUrl = `${ApiPaths.seasonPath}${seasonNumber}${ApiPaths.seasonPathEnd}`;
    const data = await apiFetch(serverUrl, { showErrorToast: false, cacheBust: false });
    return data !== null;
}

/**
 * Discovers all available seasons by probing the server.
 * Increments the season number and calls {@link checkSeasonExists} until a missing season is found.
 * @returns {Promise<void>}
 * @throws {Error} When an unexpected network or parsing error occurs during season probing
 * @deprecated See initSeasonList()
 */
async function initAllSeasons() {
    seasons = [];

    try {
        while (true) {
            const exists = await checkSeasonExists(seasonNumber);
            if (!exists) break;

            seasons.push(seasonNumber);
            seasonNumber++;
        }
    } catch (error) {
        console.error('Error checking number of seasons:', error);
    } finally {
        // Sort from newest to oldest
        seasons.sort((a, b) => b - a);

        await prepareSeasonData();
        populateSeasonDropdown();
    }
}

function parseSeasonConfig(config) {
    if (!config || typeof config !== 'object') {
        return [];
    }

    const seasonSet = new Set();

    if (Array.isArray(config.seasons_range) && config.seasons_range.length > 0) {
        config.seasons_range.forEach((entry) => {
            const season = Number(entry);
            if (!Number.isNaN(season) && season > 0) {
                seasonSet.add(season);
            }
        });
    }

    const minSeason = Number(config.min_season ?? config.minSeason ?? 1);
    const maxSeason = Number(config.max_season ?? config.maxSeason ?? config.current_season ?? config.currentSeason ?? config.total_seasons ?? config.totalSeasons);

    if (!Number.isNaN(minSeason) && !Number.isNaN(maxSeason) && maxSeason >= minSeason) {
        for (let season = minSeason; season <= maxSeason; season++) {
            seasonSet.add(season);
        }
    }

    if (seasonSet.size === 0 && !Number.isNaN(maxSeason) && maxSeason > 0) {
        for (let season = 1; season <= maxSeason; season++) {
            seasonSet.add(season);
        }
    }

    return Array.from(seasonSet).sort((a, b) => b - a);
}

async function initSeasonList() {
    leaderboardConfig = await apiFetch('api/network/functions/get_lb_config.php', { method: 'GET', showErrorToast: true, cacheBust: false });

    if (leaderboardConfig) {
        seasons = parseSeasonConfig(leaderboardConfig);
    }

    // fallback to legacy discovery
    if (!Array.isArray(seasons) || seasons.length === 0) {
        await initAllSeasons();
        return;
    }

    await prepareSeasonData();
    populateSeasonDropdown();
}

/**
 * Loads the latest season's leaderboard data and performs one-time initialization tasks.
 * Called after {@link initSeasonList} has populated the seasons array.
 * @returns {Promise<void>}
 */
async function prepareSeasonData() {
    // Load data if we found any seasons
    if (seasons.length > 0) {
        await loadSeasonData(seasons[0]);

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

    // Try server first, fall back to local
    let data = await apiFetch(`${ApiPaths.seasonPath}${previousSeason}${ApiPaths.seasonPathEnd}`, { showErrorToast: false });
    if (!data) {
        data = await apiFetch(`${ApiPaths.seasonLocalPath}${previousSeason}.json`, { showErrorToast: false });
    }
    if (!data) return;

    const previousSeasonData = data.leaderboard || [];
    calculatePlaces(previousSeasonData);
    displayWinners(previousSeasonData);
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
            item.className = `season-dropdown-item ${season === currentSeason ? 'selected' : ''}`;
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
        document.querySelectorAll('.season-dropdown-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.getAttribute('data-value'), 10) === season) {
                item.classList.add('selected');
            }
        });

        // Update hidden select
        hiddenSelect.value = season;

        // Trigger change event
        const event = new Event('change');
        hiddenSelect.dispatchEvent(event);

        loadSeasonData(season).then(r => {
            // Update auto-update state
            if (season === seasons[0]) {
                AppState.setAutoUpdate(true);
            } else {
                AppState.setAutoUpdate(false);

                if (!AppState.isAutoUpdateEnabled) {
                    showToast('Live Data Flow was automatically disabled', 'info', 8000);
                }
            }
        });
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

    function closeDropdown() {
        dropdownToggle.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
    }

    dropdownToggle.addEventListener('click', toggleDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    selectSeason(seasons[0]);
    populateItems();
}

/**
 * Fetches leaderboard data for a given season from the server, processes it, and renders it.
 * Calculates player rankings via {@link calculatePlaces}
 * Delegates rendering to either {@link displaySimpleLeaderboard} or {@link displayLeaderboard}
 * based on the user's toggle setting. Sets the global {@link isDataReady} flag when complete.
 * @param {number} season - The season number to load
 * @returns {Promise<void>}
 * @throws {Error} When the fetch request or data processing fails unexpectedly
 */
async function loadSeasonData(season = seasons[0]) {
    if (!season) {
        console.warn('loadSeasonData called without a valid season');
        return;
    }

    const emptyLeaderboardNotification = document.getElementById('emptyLeaderboardNotification');
    if (emptyLeaderboardNotification) emptyLeaderboardNotification.style.display = 'none';

    isDataReady = false;

    let newLeaderboardData = null;

    try {
        const data = await apiFetch(`${ApiPaths.seasonPath}${season}${ApiPaths.seasonPathEnd}`);

        if (!data) {
            if (emptyLeaderboardNotification) emptyLeaderboardNotification.style.display = 'block';
            await resetStats();
            return;
        }

        newLeaderboardData = data.leaderboard || [];

        if (newLeaderboardData.length === 0 || (newLeaderboardData.length === 1 && Object.keys(newLeaderboardData[0]).length === 0)) {
            if (emptyLeaderboardNotification) emptyLeaderboardNotification.style.display = 'block';
            await resetStats();
            return;
        }

        // Update everything
        leaderboardData = newLeaderboardData;
        calculatePlaces(leaderboardData);
        addColorIndicators(leaderboardData);
        calculateOverallStats(leaderboardData);

        // raid-notifications.js
        checkRecentPlayers(leaderboardData);

        // ui-navigation.js
        initProfileWatchList(leaderboardData);
    } catch (error) {
        console.error('Error loading season data:', error);
        if (emptyLeaderboardNotification) emptyLeaderboardNotification.style.display = 'block';

        return;
    } finally {
        if (!newLeaderboardData || newLeaderboardData.length === 0) {
            return;
        }

        const updateMode = AutoUpdater.getUpdateMode();
        const isAutoUpdateEnabled = AutoUpdater.getStatus();

        const shouldSkipUpdate =
            areLeaderboardsEqual(oldLeaderboardData, newLeaderboardData) &&
            isAutoUpdateEnabled &&
            updateMode === 'normal';

        if (shouldSkipUpdate) {
            console.log(`[loadSeasonData] Skipping update - normal mode, data unchanged`);
        } else {
            if (!areLeaderboardsEqual(oldLeaderboardData, newLeaderboardData)) {
                console.log(`[loadSeasonData] Data changed, updating...`);
            } else if (updateMode === 'force') {
                console.log(`[loadSeasonData] Force mode enabled, updating even without changes...`);
            } else if (updateMode === 'heartbeat') {
                console.log(`[loadSeasonData] Called from HeartbeatManager, updating...`);
            } else if (!isAutoUpdateEnabled) {
                console.log(`[loadSeasonData] Auto-update disabled.`);
            }

            if (SettingsHelper.get('lbToggle')) {
                await displaySimpleLeaderboard(leaderboardData);
            } else {
                await displayLeaderboard(leaderboardData);
            }
            oldLeaderboardData = [...leaderboardData];
        }

        isDataReady = true;
    }
}

function areLeaderboardsEqual(oldData, newData) {
    if (!oldData || !newData) return false;
    if (oldData.length !== newData.length) return false;

    const oldHash = oldData.map(p => `${p.name}_${p.absoluteLastTime}_${p.pmcKills}`).join('|');
    const newHash = newData.map(p => `${p.name}_${p.absoluteLastTime}_${p.pmcKills}`).join('|');

    return oldHash === newHash;
}

/**
 * Renders the full leaderboard table with batched processing
 * @param {Array<Object>} data - Array of player objects for the current season (aka leaderboardData)
 * @returns {Promise<void>}
 */
async function displayLeaderboard(data) {
    // Pre-filter
    const validPlayers = data.filter(player => {
        if (player.isCasual && SettingsHelper.get('casualToggle')) return false;
        if (player.permBanned) return false;
        return true;
    });

    const BATCH_SIZE = 50;
    let currentIndex = 0;

    const tempTableBody = document.createElement('tbody');
    tempTableBody.style.display = 'none';

    // Batching
    const processBatches = () => {
        return new Promise((resolve) => {
            const processNextBatch = () => {
                const startTime = performance.now();
                const endIndex = Math.min(currentIndex + BATCH_SIZE, validPlayers.length);

                for (let i = currentIndex; i < endIndex; i++) {
                    const player = validPlayers[i];
                    const row = createPlayerRow(player);
                    tempTableBody.appendChild(row);
                }

                currentIndex = endIndex;

                // Check if we should yield to event loop
                const elapsed = performance.now() - startTime;

                if (currentIndex < validPlayers.length) {
                    if (elapsed > 16) { // Took longer than 1 frame, yield
                        setTimeout(processNextBatch, 0);
                    } else {
                        processNextBatch();
                    }
                } else {
                    resolve();
                }
            };

            processNextBatch();
        });
    };

    // Wait for all batches to complete
    await processBatches();

    // render
    const mainTable = document.querySelector('#leaderboardTable');
    const currentTableBody = mainTable.querySelector('tbody');
    mainTable.replaceChild(tempTableBody, currentTableBody);
    tempTableBody.style.display = '';

    const tableClickHandler = (e) => {
        if (e.target.closest('.player-name-wrapper')) {
            openProfile(e.target.closest('.player-name-wrapper').dataset.playerId);
        }
        if (e.target.closest('.teamtag')) {
            openTeam(e.target.closest('.teamtag').dataset.team);
        }
    };

    mainTable.removeEventListener('click', tableClickHandler);
    mainTable.addEventListener('click', tableClickHandler);

    isDataReady = true;
}

// Extracted row rendering
function createPlayerRow(player) {
    const row = document.createElement('tr');
    let lastGame;

    // Check HeartbeatMonitor
    const playerStatus = window.heartbeatMonitor.getPlayerStatus(player.id);

    if (!player.banned) {
        const lastOnlineTime = heartbeatMonitor.isOnline(player.id)
            ? '<span class="player-status-lb-online">Online</span>'
            : window.heartbeatMonitor.getLastOnlineTime(playerStatus.lastUpdate || player.lastPlayed);

        if (heartbeatMonitor.isOnline(player.id)) {
            const isInRaid = playerStatus.status === 'in_raid' || playerStatus.status === 'in_transit';

            if (isInRaid) {
                lastGame = `<span class="player-status-lb ${playerStatus.statusClass}">
            ${playerStatus.statusText} 
            <span class="raid-dots">
                <span class="r-dot"></span>
                <span class="r-dot"></span>
                <span class="r-dot"></span>
            </span>
        </span>`;
            } else {
                lastGame = `<span class="player-status-lb ${playerStatus.statusClass}">
            ${playerStatus.statusText} 
            <span id="blink"></span>
        </span>`;
            }
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

        const boostIcon = boostValue > 0 ? 'fa-arrow-up' : boostValue < 0 ? 'fa-arrow-down' : 'fa-arrows-to-dot';

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
    const name = renderUsernameHTML(player);

    // Get Rank
    const playerRating = player.networkRaids ?? 0;
    const rank = getRank(playerRating);
    const rankHTML = `
        <div class="badge-lb tooltip player-rank-leaderboard">
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
        <td class="rank">${player.rank}</td>
        <td class="teamtag" data-team="${escapeHtml(player.teamTag ? player.teamTag : ``)}">${player.teamTag ? `[${escapeHtml(player.teamTag)}]` : ``}</td>
        <td class="player-name-wrapper" data-player-id="${player.id || '0'}">
                ${`<img loading="lazy" class="lb-profile-picture" src="${player.profilePicture || `/api/data/pmc_avatars/${player.permaLink}` || 'media/default_avatar.png'}" onerror="this.src='media/default_avatar.png';"  alt="Avatar"/>`}
                ${name} ${prestigeImg} ${rankHTML}
        </td>
        <td>${lastGame || 'N/A'}</td>
        <td><button class="main-button" onclick="copyProfile('${player.id}')"> Share <i class="fa-solid fa-share-from-square"></i> </button></td>
        <td>${badge}</td>
        <td>${player.pmcRaids} / ${player.scavRaids ?? 0} (${player.pmcRaids + player.scavRaids ?? 0})</td>
        <td class="${player.survivedToDiedRatioClass}">${player.survivalRate}%</td>
        <td class="${player.killToDeathRatioClass}">${player.killToDeathRatio}</td>
        <td class="${player.averageLifeTimeClass}">${formatSeconds(player.averageLifeTime)}</td>
        <td>${!player.totalScore || player.totalScore <= 0 ? 'Calibrating...' : player.totalScore.toFixed(3)} ${!player.totalScore || player.totalScore <= 0 ? '' : `(${rankLabel})`}</td>
        <td class="${player.versionStatus}">${escapeHtml(player.sptVer)}</td>
    `;

    return row;
}

/**
 * Renders a simplified leaderboard table without profile pictures, account type icons,
 * prestige badges, or rank decorations.
 * @param {Array<Object>} data - Array of player objects for the current season
 * @returns {Promise<void>}
 */
async function displaySimpleLeaderboard(data) {
    const tempTableBody = document.createElement('tbody');
    tempTableBody.style.display = 'none';

    // Process players sequentially for proper ordering
    const fragment = document.createDocumentFragment();
    data.forEach(player => {
        const row = document.createElement('tr');

        const nowInSeconds = Math.floor(Date.now() / 1000);
        const fifteenDaysInSeconds = 15 * 24 * 60 * 60;

        // Player was online for more 15 days, skip to render less jank
        // Top 50 will always be shown
        // Will not work when autoUpdater is off
        if (player.rank > 50 && player.absoluteLastTime < nowInSeconds - fifteenDaysInSeconds && AutoUpdater.getStatus()) {
            return;
        }

        if (player.isCasual && SettingsHelper.get('casualToggle')) {
            return;
        }

        if (player.permBanned) return;

        // Check HeartbeatMonitor
        const playerStatus = window.heartbeatMonitor.getPlayerStatus(player.id);

        let lastGame;
        if (!player.banned) {
            // For lastGame
            if (window.heartbeatMonitor.isOnline(player.id)) {
                lastGame = `<span class="player-status-lb ${playerStatus.statusClass}">${playerStatus.statusText} <div id="blink"></div></span>`
            } else {
                const lastOnlineTime = !heartbeatMonitor.isOnline(player.id) && window.heartbeatMonitor.getLastOnlineTime(playerStatus.lastUpdate || player.lastPlayed);

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

            const boostIcon = boostValue > 0 ? 'fa-arrow-up' : boostValue < 0 ? 'fa-arrow-down' : 'fa-arrows-to-dot';

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
            <td class="teamtag" data-team="${escapeHtml(player.teamTag ? player.teamTag : ``)}">${player.teamTag ? `[${escapeHtml(player.teamTag)}]` : ``}</td>
            <td class="player-name" style="height: 33px;" data-player-id="${player.id || '0'}">
                <span>${escapeHtml(player.name)}</span>
            </td>
            <td>${lastGame || 'N/A'}</td>
            <td><button class="main-button" onclick="copyProfile('${player.id}')"> Share <i class="fa-solid fa-share-from-square"></i> </button></td>
            <td>${badge}</td>
            <td>${player.pmcRaids} / ${player.scavRaids ?? 0} (${player.pmcRaids + player.scavRaids ?? 0})</td>
            <td>${player.survivalRate}%</td>
            <td>${player.killToDeathRatio}</td>
            <td>${formatSeconds(player.averageLifeTime)}</td>
            <td>${!player.totalScore || player.totalScore <= 0 ? 'Calibrating...' : player.totalScore.toFixed(3)} ${!player.totalScore || player.totalScore <= 0 ? '' : `(${rankLabel})`}</td>
            <td>${escapeHtml(player.sptVer)}</td>
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
        if (e.target.closest('.player-name-wrapper')) {
            openProfile(e.target.closest('.player-name-wrapper').dataset.playerId);
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
 * Sorts leaderboard data by totalScore (descending) and assigns rank numbers and medal emojis.
 * Banned players have their stats zeroed out, are pushed to the bottom of the sort order.
 * @param {Array<Object>} data - Array of player objects to rank. Each object is mutated with
 *   updated rank (number|string), medal (string), and for banned players, zeroed stat fields
 * @returns {Promise<void>}
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
            player.profilePicture = "media/default_banned.png";
            player.survivedToDiedRatio = 0;
            return;
        }

        if (player.forbidNameChange) {
            player.profilePicture = "media/default_banned.png";
        }

        if (player.isCasual) {
            player.rank = "Casual";
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

        rankCounter++;
    });
}

// Get skill rank label
function getRankLabel(totalScore) {
    const thresholds = [
        { value: 15, label: 'L-' },
        { value: 25, label: 'L' },
        { value: 35, label: 'L+' },
        { value: 45, label: 'M-' },
        { value: 55, label: 'M' },
        { value: 65, label: 'M+' },
        { value: 72, label: 'H-' },
        { value: 78, label: 'H' },
        { value: 84, label: 'H+' },
        { value: 90, label: 'P-' },
        { value: 94, label: 'P' },
        { value: 97, label: 'P+' }
    ];

    const result = thresholds.find(t => totalScore < t.value);
    return result ? result.label : 'G';
}

// Calculate all stats + dynamic update support
function calculateOverallStats(data) {
    // Save old values before calculating new ones
    const previousStats = {
        raids: PrevStats.raids,
        kills: PrevStats.kills,
        deaths: PrevStats.deaths,
        damage: PrevStats.damage,
        kdr: PrevStats.kdr,
        survival: PrevStats.survival,
        players: PrevStats.validPlayers,
        totalPlayers: PrevStats.totalPlayers,
        onlinePlayers: PrevStats.onlinePlayers,
        totalPlayTime: PrevStats.playTime
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
    });

    // Calculate averages
    const averageKDR = totalDeaths > 0 ? totalKills / totalDeaths : 0;
    const averageSurvival = validPlayers > 0 ? totalSurvival / validPlayers : 0;
    const totalPlayers = data.length;

    // Update old values for next animation
    PrevStats.raids = totalRaids;
    PrevStats.kills = totalKills;
    PrevStats.deaths = totalDeaths;
    PrevStats.damage = totalDamage;
    PrevStats.kdr = averageKDR;
    PrevStats.survival = averageSurvival;
    PrevStats.validPlayers = validPlayers;
    PrevStats.totalPlayers = totalPlayers;
    PrevStats.onlinePlayers = onlinePlayers;
    PrevStats.playTime = totalPlayTime;

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

    // Welcome screen yes
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

/**
 * Animates the number(s) if called using odometer.js
 * 
 * @returns {Promise<void>}
 */
function animateNumber(elementId, targetValue, decimals = 0, startValue = null) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const suffix = elementId === 'averageSurvival' ? '%' : '';
    const formatValue = value => {
        return (decimals > 0 ? value.toFixed(decimals) : Math.round(value)) + suffix;
    };

    element.innerHTML = formatValue(startValue);
    element.innerHTML = formatValue(targetValue);
}

// Save current stats to localStorage
function saveCurrentStats() {
    const stats = {
        raids: PrevStats.raids,
        kills: PrevStats.kills,
        deaths: PrevStats.deaths,
        damage: PrevStats.damage,
        kdr: PrevStats.kdr,
        survival: PrevStats.survival,
        players: PrevStats.validPlayers,
        totalPlayers: PrevStats.totalPlayers,
        onlinePlayers: PrevStats.onlinePlayers,
        totalPlayTime: PrevStats.playTime
    };

    localStorage.setItem('leaderboardStats', JSON.stringify(stats));
}