//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// #region Constants
const RAID_STATUSES = {
    SURVIVED: {
        class: 'survived',
        icon: 'bx bxs-walking',
        label: 'Survived'
    },
    DIED: {
        class: 'died',
        icon: 'fa-solid fa-skull-crossbones',
        label: 'Killed in Action'
    },
    RUN_THROUGH: {
        class: 'run-through',
        icon: 'bx bxs-walking',
        label: 'Runner'
    },
    DISCONNECTED: {
        class: 'disconnected',
        icon: 'bx bxs-arrow-out-left-square-half',
        label: 'Left'
    },
    TRANSIT: {
        class: 'transit',
        icon: 'bx bxs-refresh-cw bx-spin',
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

// #region Init
async function initLastRaids(playerId, permaLink) {
    const statsContainer = document.getElementById('raids-stats-container');
    const mapStatsContainer = document.getElementById('maps-container');
    const recentStatsContainer = document.getElementById('recent-raids-stats');

    if (!statsContainer) {
        statsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>Failed to load last raid data</h3>
                <p>This player doesn't have any raids recorded, or there was an error. Container element not found</p>
            </div>`;

        return;
    }

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
        const playerRaidsPath = `${lastRaidsPath}${permaLink}.json?t=${Date.now()}`;
        const response = await fetch(playerRaidsPath);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.raids?.length) {
            statsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>Failed to load last raid data</h3>
                <p>This player doesn't have any raids recorded, or there was an error.</p>
            </div>`;

            return;
        }

        const sortedRaids = sortRaidsByDate(data.raids);

        renderRaidHistory(sortedRaids, playerId, leaderboardData);
        renderRaidsSummary(sortedRaids, playerId, leaderboardData);
        renderMapStats(sortedRaids)
    } catch (error) {
        closeLoader();
        statsContainer.innerHTML = `
        <div class="no-stats-message">
                <h3>Failed to load last raid data</h3>
                <p>This player doesn't have any raids recorded, or there was an error. Code - ${error.message}</p>
        </div>`;
    }
}

// #region Render raid history
function renderRaidHistory(raids, currentPlayerId, leaderboardData) {
    const statsContainer = document.getElementById('raids-stats-container');

    statsContainer.innerHTML = raids.map(raid =>
        createRaidCard(raid, currentPlayerId, leaderboardData)
    ).join('');

    attachEventListeners();
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
                        <i class='bx ${raid.lastRaidAs === 'PMC' ? 'bxs-shield' : 'bxs-user-voice'}'></i>
                        ${raid.lastRaidAs === 'PMC' ? 'PMC' : 'SCAV'}
                    </span>
                    <span class="meta-item">
                        <i class='bx bxs-wrist-watch'></i>
                        ${formatSeconds(raid.raidTime)}
                    </span>
                    ${killerInfo || ''}
                    <span class="meta-item">
                        <i class='bx bxs-history'></i>
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
    return !(raid.raidKills == 0 &&
        raid.scavsKilled == 0 &&
        raid.bossesKilled == 0 &&
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
                    <i class='bx bxs-user-badge'></i>
                    Played on: 
                    <button data-player-id="${otherPlayer.id}" class="cross-profile-link">
                        <img  src="${otherPlayer.profilePicture || 'media/default_avatar.png'}" 
                             alt="${otherPlayer.name}" 
                             loading="lazy"
                             class="cross-profile-avatar"
                             onerror="this.src='media/default_avatar.png';">
                        ${otherPlayer.name}
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="cross-profile-indicator">
            <div class="cross-profile-badge unknown">
                <i class='bx bxs-user-x'></i>
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
    return new Date(timestamp * 1000).toLocaleString('en-EN');
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
    const profitIcon = raid.lastRaidProfit > 0 ? 'bx  bx-trending-up' : 'bx  bx-trending-down';

    return `
        <div class="raid-profit ${profitClass}">
            <i class='bx  bxs-currency-notes'></i> 
            <i class="${profitIcon}"></i>
            <span>${formatProfit(raid.lastRaidProfit)} ₽</span>
        </div>
    `;
}

function createScoreSection(raid) {
    if (raid.lcPointsEarned === 0 && (!raid.TotalScoreDiff || raid.TotalScoreDiff === 0)) return '';

    return `
        <div class="raid-score-section">
            ${raid.lcPointsEarned ? `
                <div class="lb-coins">
                    <i class='bx bxs-coin'></i>
                    +${raid.lcPointsEarned} LC
                </div>
            ` : ''}
            
            ${raid.TotalScoreDiff ? `
                <div class="score-diff ${raid.TotalScoreDiff >= 0 ? 'stat-positive' : 'stat-negative'}">
                    <i class='bx ${raid.TotalScoreDiff >= 0 ? 'bx-trending-up' : 'bx-trending-down'}'></i>
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

    return `
        <span class="meta-item">
            <i class="fa-solid fa-skull-crossbones"></i> Killed by <span class="raid-killer">${raid.agressorName}</span>
        </span>
    `;
}

function createStatsGrid(raid) {
    const statsHTML = RAID_STAT_KEYS.map(({ key, label, format }) => {
        const value = raid[key] || 0;
        const formattedValue = format === 'number'
            ? value.toLocaleString('en-EN')
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
    document.querySelectorAll('.cross-profile-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openProfile(link.dataset.playerId, true);
        });
    });

    // Add click to expand/collapse stats
    document.querySelectorAll('.last-raid-feed').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.cross-profile-link')) {
                card.classList.toggle('expanded');
            }
        });
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
                                <div class="map-stat-value">${map.avgEXP.toLocaleString('en-EN')}</div>
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
                                    ${map.totalProfit >= 0 ? '+' : ''}${formatProfit(map.totalProfit)} ₽
                                </div>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            `;
    } else {
        mapStatsContainer.innerHTML = `
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

    let recentStatsHtml = `
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
                <div class="stat-value ${recentStats.totalProfit >= 0 ? 'stat-positive' : 'stat-negative'}">${formatProfit(recentStats.totalProfit)} ₽</div>
                <div class="stat-label">Total Profit Made</div>
            </div>
            <div class="stat-card">
                <div class="stat-value ${extraPlayerData.longestHeadshot >= 350 ? 'stat-positive' : 'stat-negative'}">${extraPlayerData.longestHeadshot}</div>
                <div class="stat-label">Longest Headshot (M)</div>
            </div>
        </div>
    `;

    recentStatsContainer.innerHTML = recentStatsHtml;
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
        totalKills: stats.totalKills.toLocaleString('en-EN'),
        avgDamage: Math.round(stats.totalDamage / stats.runs).toLocaleString('en-EN'),
        totalEXP: stats.totalEXP.toLocaleString('en-EN'),
        totalLC: stats.totalLC.toLocaleString('en-EN'),
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
            formattedProfit: formatProfit(avgProfit)
        };
    });

    const sorted = result.sort((a, b) => b.totalRaids - a.totalRaids);

    return sorted.map((stats, index) => ({
        ...stats,
        rank: index + 1,
        isFavourite: index < 3 || stats.totalRaids >= 50
    }));
}

function formatProfit(profit) {
    if (!profit)
        return 0;

    const absoluteProfit = Math.abs(profit);

    if (absoluteProfit >= 1000000000) {
        return (profit / 1000000000).toFixed(1) + 'B';
    } else if (absoluteProfit >= 1000000) {
        return (profit / 1000000).toFixed(1) + 'M';
    } else if (absoluteProfit >= 1000) {
        return (profit / 1000).toFixed(0) + 'K';
    }
    return profit.toLocaleString('en-EN');
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