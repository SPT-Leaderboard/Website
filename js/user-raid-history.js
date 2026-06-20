//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// #region Constants
const RAID_STATUSES = {
    SURVIVED: {
        class: 'survived',
        icon: 'fa-solid fa-person-walking',
        label: 'Survived'
    },
    DIED: {
        class: 'died',
        icon: 'fa-solid fa-skull-crossbones',
        label: 'Killed in Action'
    },
    RUN_THROUGH: {
        class: 'run-through',
        icon: 'fa-solid fa-person-walking',
        label: 'Runner'
    },
    DISCONNECTED: {
        class: 'disconnected',
        icon: 'fa-solid fa-plug-circle-xmark',
        label: 'Left'
    },
    TRANSIT: {
        class: 'transit',
        icon: 'fa-solid fa-arrows-spin fa-spin',
        label: 'In Transit'
    }
};

const RAID_STAT_KEYS = [
    { key: 'raidKills', label: 'PMC Kills', format: 'number' },
    { key: 'scavsKilled', label: 'SCAV Kills', format: 'number' },
    { key: 'bossesKilled', label: 'Boss Kills', format: 'number' },
    { key: 'raidDamage', label: 'Damage', format: 'number' },
    { key: 'lastRaidHits', label: 'Player Hits', format: 'number' },
    { key: 'lastRaidEXP', label: 'Loot EXP', format: 'number' }
];

const DISPLAY_BATCH_SIZE = 50; // Show 50 at a time
let currentDisplayOffset = 0;
let allRaids = [];
let isLoadingMore = false;
let hasMoreToDisplay = true;
let currentPlayerIdGlobal = null;
let isFullyLoaded = false;

// #region Init
async function initLastRaids(playerId, permaLink) {
    const statsContainer = document.getElementById('raids-stats-container');
    const mapStatsContainer = document.getElementById('maps-container');
    const recentStatsContainer = document.getElementById('recent-raids-stats');

    if (!statsContainer) {
        return;
    }

    currentPlayerIdGlobal = playerId;

    // Reset state
    currentDisplayOffset = 0;
    allRaids = [];
    hasMoreToDisplay = true;
    isLoadingMore = false;
    isFullyLoaded = false;

    // Show loader
    statsContainer.innerHTML = `
        <div class="loader-dots" id="main-profile-loader">
            <div class="shimmer-bg"></div>
            <div class="dots-container">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <p class="dots-text">Fetching Raids...</p>
        </div>
    `;

    recentStatsContainer.innerHTML = `
        <div class="loader-dots">
            <div class="shimmer-bg"></div>
            <div class="dots-container">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <p class="dots-text">Awaiting Summary...</p>
        </div>
    `;

    mapStatsContainer.innerHTML = `
        <div class="loader-dots">
            <div class="shimmer-bg"></div>
            <div class="dots-container">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <p class="dots-text">Awaiting Map Stats...</p>
        </div>
    `;

    try {
        // Load ALL raids first (but in background, without blocking UI)
        await loadAllRaids(permaLink);

        if (!allRaids.length) {
            statsContainer.innerHTML = `
                <div class="no-stats-message">
                    <h3>No raids recorded</h3>
                    <p>This player doesn't have any raids recorded yet.</p>
                </div>`;
            return;
        }

        // Render summary
        renderRaidsSummary(allRaids, playerId, leaderboardData);
        renderMapStats(allRaids);

        // Display first batch
        renderDisplayBatch();

        // Render player hits
        initBodyHitsSelector();
        updateBodyHitsFromRaidHistory(allRaids, 10);
    } catch (error) {
        statsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>Failed to load raid data</h3>
                <p>Error: ${error.message}</p>
            </div>`;
    }
}

// #region Load all raids
async function loadAllRaids(permaLink) {
    try {
        // load index first
        const indexUrl = `${ApiPaths.lastRaidsPath}${permaLink}_index.json`;
        let indexData = null;

        try {
            indexData = await apiFetch(indexUrl);
        } catch (e) {
            // Fallback
        }

        if (indexData && indexData.total_raids > 0) {
            const allBlobs = [...(indexData.blobs || [])];

            // Add current blob if not already in blobs array
            if (indexData.current_blob !== undefined && !allBlobs.some(b => b.blob_index === indexData.current_blob)) {
                allBlobs.push({
                    blob_index: indexData.current_blob,
                    raid_count: 1000
                });
            }

            allBlobs.sort((a, b) => a.blob_index - b.blob_index);

            const statsContainer = document.getElementById('raids-stats-container');
            let loadedBlobs = 0;

            // Load each blob file
            for (const blobInfo of allBlobs) {
                const blobUrl = `${ApiPaths.lastRaidsPath}${permaLink}_blob_${blobInfo.blob_index}.json`;
                try {
                    const blobData = await apiFetch(blobUrl);
                    if (blobData?.raids) {
                        allRaids = [...allRaids, ...blobData.raids];
                    }

                    loadedBlobs++;

                    if (statsContainer.querySelector('#main-profile-loader')) {
                        const progressPercent = Math.round((loadedBlobs / allBlobs.length) * 100);
                        statsContainer.querySelector('#main-profile-loader .dots-text').textContent =
                            `Loading raids... ${progressPercent}%`;
                    }
                } catch (e) {
                    console.error(`Failed to load blob ${blobInfo.blob_index}:`, e);
                }
            }

            // Sort all raids by date (newest first)
            allRaids = sortRaidsByDate(allRaids);
            isFullyLoaded = true;

        } else {
            // Fallback to old file
            const playerRaidsUrl = `${ApiPaths.lastRaidsPath}${permaLink}.json`;
            const data = await apiFetch(playerRaidsUrl);

            if (data?.raids?.length) {
                allRaids = sortRaidsByDate(data.raids);
                isFullyLoaded = true;
            }
        }

    } catch (error) {
        console.error('Error loading all raids:', error);
        throw error;
    }
}

// Display current batch of raids
function renderDisplayBatch() {
    const statsContainer = document.getElementById('raids-stats-container');

    const startIdx = currentDisplayOffset;
    const endIdx = Math.min(currentDisplayOffset + DISPLAY_BATCH_SIZE, allRaids.length);
    const batchToDisplay = allRaids.slice(startIdx, endIdx);

    if (currentDisplayOffset === 0) {
        // First batch
        statsContainer.innerHTML = batchToDisplay.map(raid =>
            createRaidCard(raid, currentPlayerIdGlobal, leaderboardData)
        ).join('');
    } else {
        // Subsequent batches
        const newRaidsHtml = batchToDisplay.map(raid =>
            createRaidCard(raid, currentPlayerIdGlobal, leaderboardData)
        ).join('');

        statsContainer.insertAdjacentHTML('beforeend', newRaidsHtml);
    }

    currentDisplayOffset = endIdx;
    hasMoreToDisplay = currentDisplayOffset < allRaids.length;

    attachEventListeners();

    // Remove loading
    const loader = document.getElementById('raids-loading-more');
    if (loader) loader.remove();

    // Add "Show More" button
    if (hasMoreToDisplay) {
        addShowMoreButton();
    } else {
        // All raids loaded
        const showMoreContainer = document.getElementById('show-more-btn-container');
        if (showMoreContainer) showMoreContainer.remove();

        if (allRaids.length > DISPLAY_BATCH_SIZE) {
            // Remove "all loaded"
            const existingAllLoaded = document.querySelector('.all-raids-loaded');
            if (existingAllLoaded) existingAllLoaded.remove();

            statsContainer.insertAdjacentHTML('beforeend', `
                <div class="all-raids-loaded" style="animation: notificationSlideOutToTop 300ms ease-in-out forwards; animation-delay: 5s;">
                    Displaying all ${allRaids.length} raids!
                </div>
            `);
        }
    }
}

function addShowMoreButton() {
    // Remove existing button if any
    const existingContainer = document.getElementById('show-more-btn-container');
    if (existingContainer) existingContainer.remove();

    // Remove any existing "all loaded" message
    const existingAllLoaded = document.querySelector('.all-raids-loaded');
    if (existingAllLoaded) existingAllLoaded.remove();

    const statsContainer = document.getElementById('raids-stats-container');
    const remainingRaids = allRaids.length - currentDisplayOffset;

    const buttonHtml = `
        <div id="show-more-btn-container" class="show-more-container">
            <button id="show-more-raids" class="show-more-btn">
                <i class="fa-solid fa-arrow-down"></i>
                Show More Raids (${remainingRaids} remaining)
            </button>
        </div>
    `;

    statsContainer.insertAdjacentHTML('beforeend', buttonHtml);

    const showMoreBtn = document.getElementById('show-more-raids');
    if (showMoreBtn) {
        showMoreBtn.removeEventListener('click', handleShowMore);
        showMoreBtn.addEventListener('click', handleShowMore);
    }
}

function handleShowMore() {
    const button = document.getElementById('show-more-raids');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    }

    setTimeout(() => {
        renderDisplayBatch();
    }, 100);
}

// #region Render raid history
function renderCurrentBatch(currentPlayerId) {
    const statsContainer = document.getElementById('raids-stats-container');

    if (currentRaidOffset === 0) {
        // First batch - replace content
        statsContainer.innerHTML = allRaids.map(raid =>
            createRaidCard(raid, currentPlayerIdGlobal, leaderboardData)
        ).join('');
    } else {
        // Subsequent batches - append
        const newRaidsHtml = allRaids.slice(currentRaidOffset).map(raid =>
            createRaidCard(raid, currentPlayerIdGlobal, leaderboardData)
        ).join('');

        statsContainer.insertAdjacentHTML('beforeend', newRaidsHtml);
    }

    currentRaidOffset = allRaids.length;
    attachEventListeners();

    // Remove loader if present
    const loader = document.getElementById('raids-loading-more');
    if (loader) loader.remove();
}

function createRaidCard(raid, currentPlayerId, leaderboardData) {
    const raidStatus = getRaidStatus(raid);
    const shouldShowStats = shouldDisplayStats(raid);
    const crossProfileIndicator = createCrossProfileIndicator(raid, currentPlayerId, leaderboardData);

    return `
        <div class="last-raid-feed ${raidStatus.class}-bg">
            ${createBackgroundImage(raid)}
            
            <div class="raid-header">
                <h3 class="section-title ${raidStatus.class}">
                    ${formatDateTime(raid.absoluteLastTime)}
                    ${crossProfileIndicator}
                </h3>
            </div>
            
            <div class="raid-overview">
                ${createVisualSection(raid, raidStatus)}
                ${createRaidInfo(raid, raidStatus)}
            </div>
            
            ${shouldShowStats ? createStatsGrid(raid) : ''}
        </div>
    `;
}

function createVisualSection(raid, raidStatus) {
    const killerInfo = createKillerInfo(raid);
    const raidBadges = createRaidBadges(raid);

    return `
        <div class="raid-visual-section">
            ${createMapSection(raid, raidStatus)}
            <div class="map-info">
                <h4 class="map-name">${raid.lastRaidMap || 'Unknown Map'}</h4>
                <div class="map-details">
                    <span class="map-faction ${raid.lastRaidAs === 'PMC' ? 'pmc-faction' : 'scav-faction'}">
                        <i class='fa-solid ${raid.lastRaidAs === 'PMC' ? 'fa-shield-halved' : 'fa-person-rifle'}'></i>
                        ${raid.lastRaidAs === 'PMC' ? 'PMC' : 'SCAV'}
                    </span>
                    <span class="meta-item">
                        <i class="fa-solid fa-stopwatch"></i>
                        ${formatSeconds(raid.raidTime)}
                    </span>
                    ${killerInfo || ''}
                    <span class="meta-item">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        ${formatLastPlayedRaid(raid.absoluteLastTime)}
                    </span>

                    ${raidBadges || ''}
                </div>
            </div>
        </div>
    `;
}

function createRaidBadges(raid) {
    if (raid.discFromRaid) {
        return '';
    }

    const badges = [];

    if (raid.raidKills >= 10) {
        badges.push({
            type: 'kills',
            icon: 'fa-solid fa-gun',
            text: `Map Wipe (${raid.raidKills} kills!)`,
            color: 'warning'
        });
    } else if (raid.bossesKilled > 5) {
        badges.push({
            type: 'boss-killer',
            icon: 'fa-solid fa-crosshairs',
            text: `Boss Hunter (${raid.bossesKilled} killed!)`,
            color: 'purple'
        });
    }

    if (raid.foundLedx) {
        badges.push({
            type: 'ledx',
            icon: 'fa-solid fa-syringe',
            text: 'Found LEDX!',
            color: 'ledx'
        });
    }

    if (raid.foundIntel) {
        badges.push({
            type: 'intel',
            icon: 'fa-solid fa-file-contract',
            text: 'Found Intel Folder!',
            color: 'info'
        });
    }

    if (raid.foundGPU) {
        badges.push({
            type: 'gpu',
            icon: 'fa-solid fa-microchip',
            text: 'Found GPU!',
            color: 'gpu'
        });
    }

    if (raid.foundBitcoin) {
        badges.push({
            type: 'bitcoin',
            icon: 'fa-brands fa-bitcoin',
            text: 'Found Bitcoin!',
            color: 'bitcoin'
        });
    }

    if (raid.lastRaidProfit > 15000000) {
        badges.push({
            type: 'rich',
            icon: 'fa-solid fa-sack-dollar',
            text: 'Richest Raid',
            color: 'gold'
        });
    }

    return badges.map(badge => `
        <span class="meta-item badge-${badge.color}">
            <i class="${badge.icon}"></i>
            ${badge.text}
        </span>
    `).join('');
}

function getRaidStatus(raid) {
    if (raid.isTransition) return RAID_STATUSES.TRANSIT;
    if (raid.lastRaidSurvived) return RAID_STATUSES.SURVIVED;
    if (raid.lastRaidRanThrough) return RAID_STATUSES.RUN_THROUGH;
    if (raid.discFromRaid) return RAID_STATUSES.DISCONNECTED;

    return RAID_STATUSES.DIED;
}

function shouldDisplayStats(raid) {
    return !(raid.raidKills === 0 &&
        raid.scavsKilled === 0 &&
        raid.bossesKilled === 0 &&
        raid.raidDamage < 300 &&
        raid.lastRaidHits < 10 &&
        raid.lastRaidEXP < 500);
}

// #region Cross-profile
function createCrossProfileIndicator(raid, currentPlayerId, leaderboardData) {
    if (!raid.lastRaidSessionID || raid.lastRaidSessionID === currentPlayerId) return '';

    const otherPlayer = leaderboardData?.find(p => p.id === raid.lastRaidSessionID);

    if (otherPlayer) {
        return `
            <div class="cross-profile-indicator">
                <div class="cross-profile-badge">
                    <i class="fa-solid fa-user-clock"></i>
                    Played on: 
                    <button data-player-id="${otherPlayer.id}" class="cross-profile-link">
                        <img src="${otherPlayer.profilePicture || 'media/default_avatar.png'}" 
                             alt="${escapeHtml(otherPlayer.name)}"
                             loading="lazy"
                             class="cross-profile-avatar"
                             onerror="this.src='media/default_avatar.png';">
                        ${escapeHtml(otherPlayer.name)}
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="cross-profile-indicator">
            <div class="cross-profile-badge unknown">
                <i class="fa-solid fa-user-xmark"></i>
                Played on another profile
            </div>
        </div>
    `;
}

function createBackgroundImage(raid) {
    return `
        <div class="last-raid-full-background">
            <img src="media/leaderboard_icons/maps/${raid.lastRaidMap}.png" 
                loading="lazy"
                alt="${raid.lastRaidMap} background">
        </div>
    `;
}

function formatDateTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

function createMapSection(raid, raidStatus) {
    return `
        <div class="last-raid-map ${raidStatus.class}-border">
            <img src="media/leaderboard_icons/maps/${raid.lastRaidMap}.png" 
                 alt="${raid.lastRaidMap}"
                 loading="lazy">
            <div class="map-hover-info">
                ${raid.lastRaidMap}
            </div>
        </div>
    `;
}

function createRaidInfo(raid, raidStatus) {
    return `
        <div class="raid-info-fullwidth">
            <div class="raid-info-header">
                <div class="raid-status-group">
                    ${createRaidResult(raid, raidStatus)}
                    ${createProfitSection(raid)}
                </div>
                
                ${createScoreSection(raid)}
            </div>
        </div>
    `;
}

function createRaidResult(raid, raidStatus) {
    const transitInfo = raid.isTransition && raid.lastRaidTransitionTo
        ? ` <span class="transit-arrow"><i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i></span> ${raid.lastRaidTransitionTo}`
        : '';

    return `
        <div class="raid-result ${raidStatus.class}">
            <i class="${raidStatus.icon}"></i>
            <span>${raidStatus.label}${transitInfo}</span>
        </div>
    `;
}

function createProfitSection(raid) {
    if (raid.lastRaidProfit === -1) return '';

    const profitClass = raid.lastRaidProfit > 0 ? 'stat-positive' : 'stat-negative';
    const profitIcon = raid.lastRaidProfit > 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down';

    return `
        <div class="raid-profit ${profitClass}">
            <i class="fa-solid fa-money-bill-trend-up"></i>
            <i class="${profitIcon}"></i>
            <span>${formatSalesNum(raid.lastRaidProfit)} ₽</span>
        </div>
    `;
}

function createScoreSection(raid) {
    if (raid.lcPointsEarned === 0 && (!raid.TotalScoreDiff || raid.TotalScoreDiff === 0)) return '';

    return `
        <div class="raid-score-section">
            ${raid.lcPointsEarned ? `
                <div class="lb-coins">
                    <i class="fa-solid fa-coins"></i>
                    +${raid.lcPointsEarned} LC
                </div>
            ` : ''}
            
            ${raid.TotalScoreDiff ? `
                <div class="score-diff ${raid.TotalScoreDiff >= 0 ? 'stat-positive' : 'stat-negative'}">
                    <i class='${raid.TotalScoreDiff >= 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'}'></i>
                    ${raid.TotalScoreDiff > 0 ? '+' : ''}${raid.TotalScoreDiff} SS
                </div>
            ` : ''}
        </div>
    `;
}

function createKillerInfo(raid) {
    if (raid.lastRaidSurvived || raid.lastRaidRanThrough ||
        raid.discFromRaid || raid.isTransition || !raid.agressorName) {
        return '';
    }

    const editionHTML = decodeAgressorEdition(raid.killedByEdition);
    const bodyPartHTML = decodeAgressorBodyPart(raid.agressorKilledToBodyPart);

    return `
        <span class="meta-item">
            <i class="fa-solid fa-skull-crossbones"></i> Killed by 
            <span class="raid-killer" style="color: ${editionHTML} !important">
                ${escapeHtml(raid.agressorName)} ${bodyPartHTML}
            </span>
        </span>
    `;
}

/**
 * Decodes body part to readable name
 * @param {number} killerBodyPart - EBodyPartColliderType enum value
 * @returns {string} HTML string with body part icon and name
 */
function decodeAgressorBodyPart(killerBodyPart) {
    if (!killerBodyPart) {
        return '';
    }

    const bodyParts = {
        // Head parts
        'HeadCommon': '(head, front)',
        'ParietalHead': '(head, lobe)',
        'BackHead': '(head, nape)',
        'Ears': '(head, ears)',
        'Eyes': '(head, eyes)',
        'Jaw': '(head, jaw)',

        // Neck parts
        'NeckFront': '(neck, front)',
        'NeckBack': '(neck, back)',

        // Chest parts
        'RibcageUp': '(thorax)',
        'RibcageLow': '(thorax, lower ribcage)',
        'RightSideChestUp': '(thorax, right upper chest)',
        'LeftSideChestUp': '(thorax, left upper chest)',
        'RightSideChestDown': '(thorax, right lower chest)',
        'LeftSideChestDown': '(thorax, left lower chest)',
        'SpineTop': '(thorax, upper spine)',
        'SpineDown': '(thorax, lower spine)',

        // Pelvis/Stomach
        'Pelvis': '(pelvis)',
        'PelvisBack': '(lower back)',

        // Left Arm
        'LeftUpperArm': '(left arm, shoulder)',
        'LeftForearm': '(left forearm)',

        // Right Arm
        'RightUpperArm': '(right arm, shoulder)',
        'RightForearm': '(arm, right forearm)',

        // Left Leg
        'LeftThigh': '(leg, left Thigh)',
        'LeftCalf': '(leg, left Calf)',

        // Right Leg
        'RightThigh': '(leg, right thigh)',
        'RightCalf': '(leg, right calf)'
    };

    if (bodyParts[killerBodyPart]) {
        return bodyParts[killerBodyPart];
    }

    // If unknown, format nicely
    const formatted = killerBodyPart
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();

    return `(${formatted})`;
}

/**
 * Decodes killer edition string to readable format with icon and color
 * @param {string} killerEdition - Edition string (e.g., "UniqueID", "Developer", "Unheard")
 * @returns {string} HTML string with icon and colored name
 */
function decodeAgressorEdition(killerEdition) {
    if (!killerEdition) return '';

    // Edition configurations
    const editions = {
        'Default': { name: 'Standard', color: '#94a3b8' },
        'Developer': { name: 'Developer', color: '#3b82f6' },
        'UniqueId': { name: 'Edge of Darkness', color: '#d18f00' },
        'UniqueID': { name: 'Edge of Darkness', color: '#d18f00' },
        'Sherpa': { name: 'Sherpa', color: '#86aa7c' },
        'Emissary': { name: 'Emissary', color: '#a78bfa' },
        'Unheard': { name: 'Unheard Edition', color: '#54d0e7' }
    };

    const edition = editions[killerEdition] || editions['Default'];

    return `${edition.color}`;
}

function createStatsGrid(raid) {
    const statsHTML = RAID_STAT_KEYS.map(({ key, label, format }) => {
        const value = raid[key] || 0;
        const formattedValue = format === 'number'
            ? value.toLocaleString()
            : value;

        return `
            <div class="raid-stat-block">
                <span class="profile-stat-label">${label}</span>
                <span class="profile-stat-value">${formattedValue}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="raid-stats-grid">
            ${statsHTML}
        </div>
    `;
}

function attachEventListeners() {
    if (window.raidEventController) {
        window.raidEventController.abort();
    }
    window.raidEventController = new AbortController();
    const { signal } = window.raidEventController;

    document.querySelectorAll('.cross-profile-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const playerId = link.dataset.playerId;
            if (playerId) {
                openProfile(playerId, true);
            }
        }, { signal });
    });

    document.querySelectorAll('.last-raid-feed').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.cross-profile-link')) {
                card.classList.toggle('expanded');
            }
        }, { signal });
    });
}

// #region Render stats by map
function renderMapStats(raids) {
    const mapStatsContainer = document.getElementById('maps-container');
    const mapStats = calculateMapStats(raids);

    let mapStatsHtml = '';
    if (mapStats.length > 0) {
        mapStatsHtml = `
            <div class="maps-stats-grid">
                ${mapStats.map(map => `
                    <div class="map-stat-card ${map.isFavourite ? 'favourite-map' : ''}">
                        <div class="map-header">
                            <div class="map-image">
                                <img loading="lazy" src="media/leaderboard_icons/maps/${map.map}.png" alt="${map.map}" 
                                    onerror="this.src='media/leaderboard_icons/maps/Default.png'">
                            </div>
                            <div class="map-info">
                                <h4 class="map-name">
                                    ${map.map}
                                    ${map.isFavourite ? '<span class="favourite-badge">FAVOURITE</span>' : ''}
                                </h4>
                                <div class="map-raids-count">
                                    ${map.totalRaids} raids
                                </div>
                            </div>
                        </div>
                        
                        <div class="map-stats-grid">
                            <div class="map-stat-item progress-stat">
                                <div class="stat-header">
                                    <div class="map-stat-label">Raid Duration</div>
                                    <div class="map-stat-value">${map.formattedTime}</div>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill time-progress ${getTimeQuality(map.avgTime)}" 
                                            style="width: ${getTimeProgress(map.avgTime)}%">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="map-stat-item progress-stat">
                                <div class="stat-header">
                                    <div class="map-stat-label">Survival Rate</div>
                                    <div class="map-stat-value ${map.survivalRate >= 40 ? 'stat-positive' : 'stat-negative'}">
                                        ${map.survivalRate}%
                                    </div>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill survival-progress ${map.survivalRate >= 50 ? 'high' : map.survivalRate >= 30 ? 'medium' : 'low'}" 
                                            style="width: ${map.survivalRate}%">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="map-stat-item progress-stat">
                                <div class="stat-header">
                                    <div class="map-stat-label">Kills per Raid</div>
                                    <div class="map-stat-value">${map.avgKills}</div>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill kills-progress ${map.avgKills >= 10 ? 'high' : map.avgKills >= 3 ? 'medium' : 'low'}" 
                                            style="width: ${Math.min(map.avgKills * 20, 100)}%">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="map-stat-item">
                                <div class="map-stat-label">Avg. EXP</div>
                                <div class="map-stat-value">${map.avgEXP.toLocaleString()}</div>
                            </div>

                            <div class="map-stat-item">
                                <div class="map-stat-label">Avg. Profit</div>
                                <div class="map-stat-value ${map.avgProfit >= 30000 ? 'stat-positive' : 'stat-negative'}">
                                    ${map.avgProfit >= 0 ? '+' : ''}${map.formattedProfit} ₽
                                </div>
                            </div>
                            
                            <div class="map-stat-item">
                                <div class="map-stat-label">Total Profit</div>
                                <div class="map-stat-value ${map.totalProfit >= 0 ? 'stat-positive' : 'stat-negative'}">
                                    ${map.totalProfit >= 0 ? '+' : ''}${formatSalesNum(map.totalProfit)} ₽
                                </div>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            `;
    } else {
        mapStatsHtml = `
            <div class="no-stats-message">
                <h3>No Map Statistics Available</h3>
                <p>This player hasn't played any map yet, or it wasn't recorded.</p>
            </div>
        `
    }

    mapStatsContainer.innerHTML = mapStatsHtml;
}

// #region Render raids summary 
function renderRaidsSummary(raids, currentPlayerId, leaderboardData) {
    const recentStatsContainer = document.getElementById('recent-raids-stats');
    const recentStats = calculateRecentStats(raids);

    // Find player
    const extraPlayerData = leaderboardData.find(player => player.id === currentPlayerId);

    recentStatsContainer.innerHTML = `
        <div class="recent-stats-header">
            <h3>Last ${raids.length} Raids Summary</h3>
        </div>
        <div class="recent-stats-grid">
            <div class="stat-card">
                <div class="stat-value">${recentStats.survivalRate}%</div>
                <div class="stat-label">Survival Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${recentStats.avgKills}</div>
                <div class="stat-label">Avg Kills/Raid</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${recentStats.totalKills}</div>
                <div class="stat-label">Total Kills</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${recentStats.avgDamage}</div>
                <div class="stat-label">Avg Damage</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${recentStats.totalEXP}</div>
                <div class="stat-label">Total EXP</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${recentStats.totalLC}</div>
                <div class="stat-label">Total LC Earned</div>
            </div>
            <div class="stat-card">
                <div class="stat-value ${recentStats.totalProfit >= 0 ? 'stat-positive' : 'stat-negative'}">${formatSalesNum(recentStats.totalProfit)} ₽</div>
                <div class="stat-label">Total Profit</div>
            </div>
            <div class="stat-card">
                <div class="stat-value ${extraPlayerData.longestHeadshot == null ? '' : extraPlayerData.longestHeadshot >= 350 ? 'stat-positive' : 'stat-negative'}">${extraPlayerData.longestHeadshot ?? 0}</div>
                <div class="stat-label">Longest HS (M)</div>
            </div>
        </div>
    `;
}

function calculateRecentStats(raids) {
    const stats = {
        totalKills: 0,
        totalDamage: 0,
        totalEXP: 0,
        totalLC: 0,
        totalProfit: 0,
        survived: 0,
        runs: raids.length
    };

    raids.forEach(raid => {
        stats.totalKills += (raid.raidKills || 0) + (raid.scavsKilled || 0) + (raid.bossesKilled || 0);
        stats.totalDamage += raid.raidDamage || 0;
        stats.totalEXP += raid.lastRaidEXP || 0;
        stats.totalLC += raid.lcPointsEarned || 0;
        stats.totalProfit += raid.lastRaidProfit || 0;

        if (raid.lastRaidSurvived || raid.lastRaidRanThrough || raid.discFromRaid || raid.isTransition) {
            stats.survived++;
        }
    });

    return {
        survivalRate: Math.round((stats.survived / stats.runs) * 100),
        avgKills: (stats.totalKills / stats.runs).toFixed(1),
        totalKills: stats.totalKills.toLocaleString(),
        avgDamage: Math.round(stats.totalDamage / stats.runs).toLocaleString(),
        totalEXP: stats.totalEXP.toLocaleString(),
        totalLC: stats.totalLC.toLocaleString(),
        totalProfit: stats.totalProfit
    };
}

function calculateMapStats(raids) {
    const mapStats = {};

    raids.forEach(raid => {
        const map = raid.lastRaidMap || 'Unknown';

        if (!mapStats[map]) {
            mapStats[map] = {
                map: map,
                totalRaids: 0,
                totalTime: 0,
                totalProfit: 0,
                survived: 0,
                totalKills: 0,
                totalEXP: 0
            };
        }

        const stats = mapStats[map];
        stats.totalRaids++;
        stats.totalTime += raid.raidTime || 0;
        stats.totalProfit += raid.lastRaidProfit || 0;
        stats.totalKills += (raid.raidKills || 0) + (raid.scavsKilled || 0) + (raid.bossesKilled || 0);
        stats.totalEXP += raid.lastRaidEXP || 0;

        if (raid.lastRaidSurvived || raid.lastRaidRanThrough || raid.discFromRaid || raid.isTransition) {
            stats.survived++;
        }
    });

    // Calculate averages
    const result = Object.values(mapStats).map(stats => {
        const avgTime = stats.totalRaids > 0 ? Math.round(stats.totalTime / stats.totalRaids) : 0;
        const avgProfit = stats.totalRaids > 0 ? Math.round(stats.totalProfit / stats.totalRaids) : 0;
        const avgKills = stats.totalRaids > 0 ? (stats.totalKills / stats.totalRaids).toFixed(1) : 0;
        const survivalRate = stats.totalRaids > 0 ? Math.round((stats.survived / stats.totalRaids) * 100) : 0;
        const avgEXP = stats.totalRaids > 0 ? Math.round(stats.totalEXP / stats.totalRaids) : 0;

        return {
            ...stats,
            avgTime,
            avgProfit,
            avgKills,
            survivalRate,
            avgEXP,
            formattedTime: formatSeconds(avgTime),
            formattedProfit: formatSalesNum(avgProfit)
        };
    });

    const sorted = result.sort((a, b) => b.totalRaids - a.totalRaids);

    return sorted.map((stats, index) => ({
        ...stats,
        rank: index + 1,
        isFavourite: index < 3 && stats.totalRaids >= 40
    }));
}

function getTimeProgress(currentTime, minTime = 1, maxTime = 4300) {
    const clamped = Math.max(minTime, Math.min(currentTime, maxTime));
    return ((clamped - minTime) / (maxTime - minTime)) * 100;
}

function getTimeQuality(time) {
    if (time < 600) return 'low';
    if (time < 1000) return 'medium';
    if (time < 1200) return 'good';
    return 'excellent';
}

function sortRaidsByDate(raids) {
    return raids.sort((a, b) => b.absoluteLastTime - a.absoluteLastTime);
}