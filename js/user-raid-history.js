//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

async function initLastRaids(playerId, permaLink) {
    const statsContainer = document.getElementById('raids-stats-container');
    const mapStatsContainer = document.getElementById('maps-container');

    if (!statsContainer) {
        console.error('Container element not found');
        return;
    }

    // Show loader
    statsContainer.innerHTML = `
                        <div class="loader-glass">
                        <div class="loader-content" id="main-profile-loader">
                            <img src="media/loading_bar.gif" width="30" height="30" class="loader-icon">
                            <h3 class="loader-text">Crunching latest data for you...</h3>
                            <div class="loader-progress">
                                <div class="progress-bar"></div>
                            </div>
                        </div>
                    </div>`;

    try {
        const playerRaidsPath = `${lastRaidsPath}${permaLink}.json?t=${Date.now()}`;
        const response = await fetch(playerRaidsPath);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.raids?.length) {
            closeLoader();
            statsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>Failed to load last raid data</h3>
                <p>This player doesn't have any raids recorded, or there was an error.</p>
            </div>`;

            return;
        }

        const sortedRaids = data.raids.sort((a, b) =>
            b.absoluteLastTime - a.absoluteLastTime
        );

        renderRaidsStats(sortedRaids, playerId, leaderboardData);
    } catch (error) {
        closeLoader();
        statsContainer.innerHTML = `
        <div class="no-stats-message">
                <h3>Failed to load last raid data</h3>
                <p>This player doesn't have any raids recorded, or there was an error.</p>
        </div>`;
        mapStatsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>No Map Statistics Available</h3>
                <p>This player hasn't played any map yet, or it wasn't recorded.</p>
            </div>
        `
    }
}

// Render raids
function renderRaidsStats(raids, currentPlayerId, leaderboardData) {
    if (!raids?.length) {
        statsContainer.innerHTML = '<p class="error-raid-load">No raid data available</p>';
        return;
    }

    const statsContainer = document.getElementById('raids-stats-container');
    const recentStatsContainer = document.getElementById('recent-raids-stats');
    const mapStatsContainer = document.getElementById('maps-container');
    const mapStats = calculateMapStats(raids);
    const recentStats = calculateRecentStats(raids);

    let html = '';
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
        </div>
    `;

    let mapStatsHtml = '';
    if (mapStats.length > 0) {
        mapStatsHtml = `
                <div class="maps-stats-grid">
                    ${mapStats.map(map => `
                    <div class="map-stat-card">
                        <div class="map-header">
                            <div class="map-image">
                                <img src="media/leaderboard_icons/maps/${map.map}.png" alt="${map.map}" 
                                    onerror="this.src='media/leaderboard_icons/maps/Default.png'">
                            </div>
                            <div class="map-info">
                                <h4 class="map-name">${map.map}</h4>
                                <div class="map-raids-count">${map.totalRaids} raids</div>
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
                                    ${map.totalProfit >= 0 ? '+' : ''}${formatProfit(map.totalProfit)} ₽
                                </div>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            `;
    }

    raids.forEach(raid => {
        const lastRaidDuration = formatSeconds(raid.raidTime);
        const lastRaidAgo = formatLastPlayedRaid(raid.absoluteLastTime);
        let shouldShowStats = true;

        if (raid.raidKills == 0 && raid.scavsKilled == 0 && raid.bossesKilled == 0 && raid.raidDamage < 300 && raid.lastRaidHits < 10 && raid.lastRaidEXP < 500) {
            shouldShowStats = false;
        }

        const isCrossProfileRaid = raid.lastRaidSessionID && raid.lastRaidSessionID !== currentPlayerId;
        let crossProfileIndicator = '';
        let otherPlayerInfo = null;

        if (isCrossProfileRaid && leaderboardData) {
            otherPlayerInfo = leaderboardData.find(player => player.id === raid.lastRaidSessionID);

            if (otherPlayerInfo) {
                crossProfileIndicator = `
                    <div class="cross-profile-indicator">
                        <div class="cross-profile-badge">
                            <i class='bx bxs-user-badge'></i>
                            Played on: 
                            <button onclick="openProfile(${otherPlayerInfo.id}, true)" class="cross-profile-link">
                                <img src="${otherPlayerInfo.profilePicture || 'media/default_avatar.png'}" alt="${otherPlayerInfo.name}" class="cross-profile-avatar">
                                ${otherPlayerInfo.name}
                            </button>
                        </div>
                    </div>
                `;
            } else {
                crossProfileIndicator = `
                    <div class="cross-profile-indicator">
                        <div class="cross-profile-badge unknown">
                            <i class='bx bxs-user-x'></i>
                            Played on another profile
                        </div>
                    </div>
                `;
            }
        }

        html += `
                <div class="last-raid-feed ${raid.lastRaidRanThrough ? 'run-through-bg' : raid.discFromRaid ? 'disconnected-bg' : raid.isTransition ? 'transit-bg' : raid.lastRaidSurvived ? 'survived-bg' : 'died-bg'}">
                    
                    <div class="last-raid-full-background">
                        <img src="media/leaderboard_icons/maps/${raid.lastRaidMap}.png">
                    </div>

                    <h3 class="section-title ${raid.lastRaidRanThrough ? 'run-through' : raid.discFromRaid ? 'disconnected' : raid.isTransition ? 'transit' : raid.lastRaidSurvived ? 'survived' : 'died'}" style="margin-top: 0;">
                        Raid on ${new Date(raid.absoluteLastTime * 1000).toLocaleString()} ${crossProfileIndicator}
                    </h3>

                    <div style="margin-bottom: 10px;">
                        <div class="last-raid-map ${raid.lastRaidRanThrough ? 'run-through-border' : raid.discFromRaid ? 'disconnected-border' : raid.isTransition ? 'transit-border' : raid.lastRaidSurvived ? 'survived-border' : 'died-border'}">
                            <img src="media/leaderboard_icons/maps/${raid.lastRaidMap}.png">
                        </div>

                        <span class="raid-result ${raid.lastRaidRanThrough ? 'run-through' : raid.discFromRaid ? 'disconnected' : raid.isTransition ? 'transit' : raid.lastRaidSurvived ? 'survived' : 'died'}" style="font-weight: bold;">
                            ${raid.lastRaidRanThrough ? `<i class='bx bxs-walking'></i> Runner` : raid.discFromRaid ? `<i class='bx bxs-arrow-out-left-square-half'></i> Left` : raid.isTransition ? `<span> <i class='bx bxs-refresh-cw bx-spin'></i> </span> In Transit (${raid.lastRaidMap}
                            <em class="fa-solid fa-person-walking-arrow-right"></em> ${raid.lastRaidTransitionTo || 'Unknown'})` : raid.lastRaidSurvived ? `<i class='bx bxs-walking'></i> Survived` : `
                            <i class="fa-solid fa-skull-crossbones"></i> Killed in Action`}
                        </span>

                        <div class="raid-profit"> Raid Profit:<span class="${raid.lastRaidProfit > 50000 ? `good` : `bad`}"> ${raid.lastRaidProfit ? raid.lastRaidProfit.toLocaleString() : 0} RUB</span></div>

                        <span class="raid-meta">
                            ${raid.lastRaidMap || 'Unknown'} • ${raid.lastRaidAs || 'N/A'} • ${lastRaidDuration || '00:00'} • LC Earned: <span class="lb-coins">+${raid.lcPointsEarned ? raid.lcPointsEarned : 0}</span> • ${lastRaidAgo || 'Just Now'} ${raid.lastRaidSurvived || raid.lastRaidRanThrough || raid.discFromRaid || raid.isTransition || raid.agressorName == null ? `` : `• Killed by <span class="raid-killer">${raid.agressorName}</span>`}
                        </span>
                    </div>

                ${shouldShowStats ?
                `<div class="raid-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        <div class="raid-stat-block">
                            <span class="profile-stat-label">PMC Kills:</span>
                            <span class="profile-stat-value">${raid.raidKills.toLocaleString() ?? 0}</span>
                        </div>
                        <div class="raid-stat-block">
                            <span class="profile-stat-label">SCAV Kills:</span>
                            <span class="profile-stat-value">${raid.scavsKilled.toLocaleString() ?? 0}</span>
                        </div>
                        <div class="raid-stat-block">
                            <span class="profile-stat-label">Boss Kills:</span>
                            <span class="profile-stat-value">${raid.bossesKilled.toLocaleString() ?? 0}</span>
                        </div>
                        <div class="raid-stat-block">
                            <span class="profile-stat-label">Damage:</span>
                            <span class="profile-stat-value">${raid.raidDamage.toLocaleString() ?? 0}</span>
                        </div>
                        <div class="raid-stat-block">
                            <span class="profile-stat-label">Player Hits:</span>
                            <span class="profile-stat-value">${raid.lastRaidHits.toLocaleString() ?? 0}</span>
                        </div>
                        <div class="raid-stat-block">
                            <span class="profile-stat-label">Loot EXP:</span>
                            <span class="profile-stat-value">${raid.lastRaidEXP.toLocaleString() ?? 0}</span>
                        </div>
                    </div>`
                : ``}
                </div>
            `;
    });

    statsContainer.innerHTML = html;
    recentStatsContainer.innerHTML = recentStatsHtml;
    mapStatsContainer.innerHTML = mapStatsHtml;
}

function calculateRecentStats(raids) {
    const stats = {
        totalKills: 0,
        totalDamage: 0,
        totalEXP: 0,
        totalLC: 0,
        survived: 0,
        runs: raids.length
    };

    raids.forEach(raid => {
        stats.totalKills += (raid.raidKills || 0) + (raid.scavsKilled || 0) + (raid.bossesKilled || 0);
        stats.totalDamage += raid.raidDamage || 0;
        stats.totalEXP += raid.lastRaidEXP || 0;
        stats.totalLC += raid.lcPointsEarned || 0;

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
        totalLC: stats.totalLC.toLocaleString()
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
    return Object.values(mapStats).map(stats => {
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
}

function formatProfit(profit) {
    if (profit >= 1000000) {
        return (profit / 1000000).toFixed(1) + 'M';
    } else if (profit >= 1000) {
        return (profit / 1000).toFixed(0) + 'K';
    }
    return profit.toLocaleString('ru-RU');
}

function getTimeProgress(currentTime, minTime = 1, maxTime = 1800) {
    const clamped = Math.max(minTime, Math.min(currentTime, maxTime));
    return ((clamped - minTime) / (maxTime - minTime)) * 100;
}

function getTimeQuality(time) {
    if (time < 600) return 'low';
    if (time < 800) return 'medium';
    if (time < 1200) return 'good';
    return 'excellent';
}