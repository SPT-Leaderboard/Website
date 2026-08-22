//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// #region Main
async function endSeason() {
    try {
        const players = leaderboardData;
        const top3 = getTopPlayers(players, 3);
        const stats = calculateSeasonStats(players);

        const overlay = createSeasonOverlay(top3, stats);
        document.body.appendChild(overlay);

        setTimeout(() => {
            animateStats();
            animateFacts();
        }, 300);

        await playSeasonMusic();

    } catch (error) {
        console.error('Season end error:', error);
    }
}

function createSeasonOverlay(top3, stats) {
    const overlay = document.createElement('div');
    overlay.id = 'seasonOverlay';

    overlay.innerHTML = `
        <div class="season-end-container">
            <div class="video-background">
                <video autoplay muted loop playsinline>
                    <source src="media/season_end/test.mp4" type="video/mp4">
                </video>
                <div class="video-overlay-gradient"></div>
            </div>

            <div class="season-end-layout">
                <div class="season-stats-column">
                    <div class="season-header">
                        <h1>SEASON ${getCurrentSeason()} FINALE</h1>
                        <p class="season-end-subtitle">The battle is over... for now.</p>
                    </div>

                    <div class="season-end-stats-grid">
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalKills}">0</div>
                            <div class="season-end-stat-label">PMCs Killed</div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalDeaths}">0</div>
                            <div class="season-end-stat-label">Total Deaths</div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalDamage}">0</div>
                            <div class="season-end-stat-label">Damage Dealt</div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalRaids}">0</div>
                            <div class="season-end-stat-label">Raids Completed</div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalPlayTime}" data-type="time">0h 0m</div>
                            <div class="season-end-stat-label">Hours Played</div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value"  data-target="${stats.averageSurvivalRate}" data-type="percent">0%</div>
                            <div class="season-end-stat-label">Avg Survival Rate</div>
                        </div>
                    </div>

                    <div class="season-facts">
                        <div class="fact-item">
                            <span class="fact-text">Most kills: <strong>${stats.topKillsPlayer || 'N/A'}</strong> (${stats.topKills || 0})</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text">Deadliest weapon: <strong>${stats.topKillsWeapon || 'N/A'}</strong> (${stats.topKillsWeaponCount || 0} kills)</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text">Most played map: <strong>${stats.mostPopularMap || 'N/A'}</strong></span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text">Total sales: <strong>${formatSalesNum(stats.totalSalesSum || 0)} ₽</strong></span>
                        </div>
                    </div>

                    <div class="season-countdown">
                        <p>Our team is launching next season<span class="loading-dots"></span></p>
                    </div>
                </div>

                <!-- PMC -->
                <div class="season-pmc-column">
                    <div class="pmc-heroes-container">
                        ${top3.map((player, index) => {
                            const rank = getRank(player.networkRaids, 2000, 32);

                            const colorMatch = rank.textColor.match(/hsl\((\d+)/);
                            const hue = colorMatch ? parseInt(colorMatch[1]) : 200;
                            const glowColor = `hsla(${hue}, 100%, 70%, 0.3)`;
                            const glowColorHover = `hsla(${hue}, 100%, 80%, 0.5)`;
                            const glowColorStrong = `hsla(${hue}, 100%, 60%, 0.4)`;

                            return `
                                <div class="pmc-hero" 
                                    data-index="${index}"
                                    data-rank-hue="${hue}">
                                    <div class="pmc-rank-badge" style="background: ${rank.gradient}; border-color: ${rank.borderColor};">
                                        <span class="rank-number" style="color: ${rank.textColor};">
                                            #${index + 1}
                                        </span>
                                        <span class="rank-name" style="color: ${rank.textColor};">
                                            ${rank.name}
                                        </span>
                                        <span class="rank-level" style="color: ${rank.textColor}; opacity: 0.7;">
                                            LVL ${rank.level}
                                        </span>
                                    </div>
                                    <div class="pmc-image-wrapper">
                                        <img src="${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png" 
                                            alt="${escapeHtml(player.name)}"
                                            class="pmc-image"
                                            loading="lazy"
                                            style="filter: drop-shadow(0 0 3px rgba(${rank.RGB}, 0.5));"
                                            data-glow="${glowColor}"
                                            data-glow-hover="${glowColorHover}">
                                    </div>
                                    <div class="pmc-info">
                                        <div class="pmc-name">${renderUsernameHTML(player)}</div>
                                        <div class="pmc-stats">
                                            <span class="pmc-stat"><i class="fa-solid fa-skull-crossbones"></i> ${player.pmcKills || 0} KILLS</span>
                                            <span class="pmc-stat"><i class="fas fa-trophy"></i> ${(player.killToDeathRatio || 0).toFixed(1)} K/D</span>
                                            <span class="pmc-stat"><i class="fa-solid fa-user-clock"></i> ${formatPlayTimeShort(player.totalPlayTime || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

        setTimeout(() => {
        top3.forEach((player, index) => {
            const imgElement = overlay.querySelector(`.pmc-hero[data-index="${index}"] .pmc-image`);
            if (imgElement) {
                loadAndCropPlayerImageUtil(player, imgElement);
            }
        });
    }, 100);

    return overlay;
}

// #region Calculations
function calculateSeasonStats(players) {
    const stats = {
        totalKills: 0,
        totalDeaths: 0,
        totalPlayTime: 0,
        totalRaids: 0,
        totalDamage: 0,
        totalSurvived: 0,
        totalSalesSum: 0,
        totalScore: 0,
        topKills: 0,
        topKillsPlayer: null,
        topKillsWeapon: null,
        topKillsWeaponCount: 0,
        mostPopularMap: null,
        mostPopularMapCount: 0,
        averageSurvivalRate: 0,
        topScore: 0,
        topScorePlayer: null
    };

    const mapStats = {};
    const weaponStats = {};

    players.forEach(player => {
        if (player.banned || player.isCasual) return;

        stats.totalKills += player.pmcKills || 0;
        stats.totalDeaths += player.pmcDeaths || 0;
        stats.totalPlayTime += player.totalPlayTime || 0;
        stats.totalRaids += player.totalRaids || 0;
        stats.totalDamage += player.damage || 0;
        stats.totalSurvived += player.survived || 0;
        stats.totalSalesSum += player.totalSales || 0;
        stats.totalScore += player.totalScore || 0;

        if ((player.pmcKills || 0) > stats.topKills) {
            stats.topKills = player.pmcKills;
            stats.topKillsPlayer = player.name;
        }

        if ((player.totalScore || 0) > stats.topScore) {
            stats.topScore = player.totalScore;
            stats.topScorePlayer = player.name;
        }

        if (player.stattrack_weapons) {
            for (const [weaponHash, weaponData] of Object.entries(player.stattrack_weapons)) {
                for (const [weaponName, weaponInfo] of Object.entries(weaponData)) {
                    if (weaponInfo.stats && weaponInfo.stats.kills) {
                        const kills = weaponInfo.stats.kills || 0;
                        weaponStats[weaponName] = (weaponStats[weaponName] || 0) + kills;
                    }
                }
            }
        }

        // mapFatigue collection
        if (player.mapFatigue && player.mapFatigue.mapCounts) {
            const mapCounts = player.mapFatigue.mapCounts;
            for (const [mapKey, count] of Object.entries(mapCounts)) {
                mapStats[mapKey] = (mapStats[mapKey] || 0) + count;
            }
        }

        if (player.traderInfo) {
            for (const trader in player.traderInfo) {
                const data = player.traderInfo[trader];
                if (data.salesSum && data.salesSum > 0) {
                    stats.totalSalesSum += data.salesSum;
                }
            }
        }

    });

    let maxWeaponKills = 0;
    for (const [weapon, kills] of Object.entries(weaponStats)) {
        if (kills > maxWeaponKills) {
            maxWeaponKills = kills;
            stats.topKillsWeapon = weapon;
            stats.topKillsWeaponCount = kills;
        }
    }

    // Most popular map
    let maxMapCount = 0;
    let mostPopularMapKey = null;
    for (const [mapKey, count] of Object.entries(mapStats)) {
        if (count > maxMapCount) {
            maxMapCount = count;
            mostPopularMapKey = mapKey;
        }
    }

    if (mostPopularMapKey) {
        stats.mostPopularMap = getPrettyMapName(mostPopularMapKey);
        stats.mostPopularMapCount = maxMapCount;
    } else {
        stats.mostPopularMap = 'N/A';
        stats.mostPopularMapCount = 0;
    }

    stats.averageSurvivalRate = stats.totalRaids > 0
        ? ((stats.totalSurvived / stats.totalRaids) * 100).toFixed(1) + '%'
        : 0;

    return stats;
}

function getCurrentSeason() {
    return seasons[0] || '11';
}

function getTopPlayers(players, count = 3) {
    return players
        .filter(p => !p.banned && !p.isCasual && p.totalScore > 0)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, count);
}

// #region Anims
function animateStats() {
    document.querySelectorAll('.season-end-stat-value').forEach(el => {
        const target = el.dataset.target;
        if (!target) return;

        const isPercent = el.dataset.type === 'percent';
        const isTime = el.dataset.type === 'time';
        const isLargeNumber = el.dataset.type === 'large';

        let cleanTarget = parseFloat(target);
        if (isNaN(cleanTarget)) return;

        const duration = 2000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(cleanTarget * easeOutQuart);

            if (isPercent) {
                el.textContent = current + '%';
            } else if (isTime) {
                el.textContent = formatOnlineTime(current);
            } else if (isLargeNumber) {
                el.textContent = formatNumber(current);
            } else {
                el.textContent = current.toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                if (isPercent) {
                    el.textContent = cleanTarget + '%';
                } else if (isTime) {
                    el.textContent = formatOnlineTime(cleanTarget);
                } else if (isLargeNumber) {
                    el.textContent = formatNumber(cleanTarget);
                } else {
                    el.textContent = cleanTarget.toLocaleString();
                }
                el.classList.add('stat-complete');
            }
        }

        setTimeout(() => {
            requestAnimationFrame(update);
        }, Math.random() * 300);
    });
}

function animateFacts() {
    document.querySelectorAll('.fact-item').forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            item.style.transition = 'all 0.5s ease-out';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 700 + index * 100);
    });
}

// #region Music
async function playSeasonMusic() {
    try {
        const finalMusic = new Audio('media/sounds/season/season_end_final.mp3');
        finalMusic.volume = 0.5;
        finalMusic.play();

        finalMusic.addEventListener('ended', () => {
            const contMusic = new Audio('media/sounds/season/end_music.mp3');
            contMusic.volume = 0.3;
            contMusic.loop = true;


            window.seasonMusic = finalMusic;
            contMusic.play();
        });

    } catch (error) {
        console.warn('Music play failed:', error);
    }
}

function stopSeasonMusic() {
    if (window.seasonMusic) {
        window.seasonMusic.pause();
        window.seasonMusic.currentTime = 0;
        window.seasonMusic = null;
    }
}

function stopSeasonEffects() {
    if (seasonAnimationFrame) {
        clearInterval(seasonAnimationFrame);
        seasonAnimationFrame = null;
    }
}

// #region Utils
function cleanupSeasonEnd() {
    stopSeasonMusic();
    stopSeasonEffects();

    const overlay = document.getElementById('seasonOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 500);
    }
}

// Update timer and preload audio for season end
let audioElements = {};
let lastPlayed = null;

// Season end screen
function playAppropriateTrack(diff) {
    let trackToPlay = null;

    if (diff <= 30000) { // 0:30
        trackToPlay = 'season/season_end3';
    } else if (diff <= 85000) { // 1:25
        trackToPlay = 'season/season_end2';
    } else if (diff <= 145000) { // 2:25
        trackToPlay = 'season/season_end1';
    }

    // If track changed
    if (trackToPlay && lastPlayed !== trackToPlay) {
        // Stop all tracks
        Object.values(audioElements).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });

        lastPlayed = trackToPlay;
        audioElements[trackToPlay].play().catch(e => {
            console.warn(`Couldn't play ${trackToPlay}:`, e);
        });

    }
}