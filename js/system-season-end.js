//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// Update timer and preload audio for season end
const imageCache = new Map(); // permaLink -> bool
let audioElements = {};
let lastPlayed = null;
let playerRotationInterval = null;
let rotationIndex = 3; // Start from 4th player (index 3)
let isSwapping = false;

// #region Main
async function endSeason() {
    try {
        const players = leaderboardData;
        const top3 = getTopPlayers(players, 3);
        const stats = calculateSeasonStats(players);

        await createSeasonOverlay(top3, stats);

        setTimeout(() => {
            animateStats();
            animateFacts();
        }, 300);

        await playSeasonMusic();

    } catch (error) {
        console.error('Season end error:', error);
    }
}

async function createSeasonOverlay(top3, stats) {
    const overlay = document.createElement('div');
    overlay.id = 'seasonOverlay';

    // Get all eligible players, sorted by score
    const allEligiblePlayers = leaderboardData
        .filter(p => !p.banned && !p.isCasual && p.permaLink)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    // Pre-validate images (excluding top3)
    const top3Links = new Set(top3.map(p => p.permaLink));
    const candidatesForRotation = allEligiblePlayers.filter(p => !top3Links.has(p.permaLink));

    overlay.innerHTML = `
        <div class="season-end-container">
            <div class="video-background">
                <video autoplay muted loop playsinline>
                    <source src="media/season_end/test.mp4" type="video/mp4">
                </video>
                <div class="video-overlay-gradient"></div>
            </div>
            <div class="season-loading">
                <div class="loading-spinner"></div>
                <p>Preparing season finale...</p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Validate all
    let validRotationPlayers = [];
    try {
        validRotationPlayers = await filterPlayersWithImages(candidatesForRotation);
    } catch (e) {
        console.warn('Image validation failed, using empty rotation pool:', e);
    }

    const top3Validated = [];
    for (const player of top3) {
        const hasImage = await checkPMCExists(player);
        console.log(`[Season] Player ${player.name} (${player.permaLink}): image valid = ${hasImage}`);
        if (hasImage) {
            top3Validated.push(player);
        } else {
            const replacement = validRotationPlayers.shift();
            if (replacement) {
                console.log(`[Season] Replacing ${player.name} with ${replacement.name}`);
                top3Validated.push(replacement);
            } else {
                console.warn(`[Season] No replacement for ${player.name}, dropping them`);
            }
        }
    }

    // Store for rotation
    window.seasonRotationPlayers = validRotationPlayers;
    window.seasonTopPlayers = top3Validated;

    overlay.innerHTML = renderSeasonOverlayContent(top3Validated, stats);

    setTimeout(() => {
        top3Validated.forEach((player, index) => {
            const imgElement = overlay.querySelector(`.pmc-hero[data-index="${index}"] .pmc-image`);
            if (imgElement) {
                loadAndCropPlayerImageUtil(player, imgElement);
            }
        });
    }, 100);

    setTimeout(() => {
        const heroes = overlay.querySelectorAll('.pmc-hero');
        heroes.forEach((hero, index) => {
            setTimeout(() => {
                hero.classList.add('animate-in');
            }, index * 2000); // 2s apart - card 0 at 0s, card 1 at 2s, card 2 at 4s
        });
    }, 400);

    if (validRotationPlayers.length > 0) {
        const initialDelay = 400 + (top3Validated.length * 2000) + 3000; // entrance + 3s hold
        setTimeout(() => {
            startPlayerRotation(overlay);
        }, initialDelay);
    }

    return overlay;
}

function renderSeasonOverlayContent(top3, stats) {
    return `
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
                        <h1>SEASON ${CURRENT_SEASON} FINALE</h1>
                        <p class="season-end-subtitle">The battle is over... for now.</p>
                    </div>

                    <div class="season-end-stats-grid">
                        <div class="season-end-stats-stat-card stat-card-featured">
                            <div class="season-end-stat-value" data-target="${stats.totalKills}">0</div>
                            <div class="season-end-stat-label">Total Kills</div>
                            <div class="season-end-stat-divider"></div>
                            <div class="stat-featured-sub">
                                <span class="stat-featured-sub-label">with Avg Survival Rate</span>
                                <span class="stat-featured-sub-value" data-target="${stats.averageSurvivalRate}" data-type="percent">0%</span>
                            </div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalRaids}">0</div>
                            <div class="season-end-stat-label">Raids Completed</div>
                        </div>
                        <div class="season-end-stats-stat-card">
                            <div class="season-end-stat-value" data-target="${stats.totalPlayTime}" data-type="time">0h 0m</div>
                            <div class="season-end-stat-label">Hours Played</div>
                        </div>
                    </div>

                    <div class="season-facts">
                        <div class="fact-item">
                            <span class="fact-text"><strong>Top fragger:</strong> ${stats.topKillsPlayer || 'N/A'} (${stats.topKills || 0} kills)</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text"><strong>Deadliest weapon:</strong> ${stats.topKillsWeapon || 'N/A'} (${stats.topKillsWeaponCount || 0} kills)</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text"><strong>Most played map:</strong> ${stats.mostPopularMap || 'N/A'}</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text"><strong>Trade volume:</strong> ${formatSalesNum(stats.totalSalesSum || 0)} ₽</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text"><strong>Season survivor:</strong> ${stats.topSurvivalPlayer || 'N/A'} (${stats.topSurvival || 0}% survival)</span>
                        </div>
                        <div class="fact-item">
                            <span class="fact-text"><strong>Season grinder:</strong> ${stats.topPlayTimePlayer || 'N/A'} (${formatPlayTimeShort(stats.topPlayTime || 0)})</span>
                        </div>
                    </div>

                    <div class="season-countdown">
                        <p>Our team is launching next season<span class="loading-dots"></span></p>
                    </div>
                </div>

                <div class="season-pmc-column">
                    <div class="pmc-heroes-container">
                        ${top3.map((player, index) => renderHeroElement(player, index)).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// #region Player Rotation
function startPlayerRotation(overlay) {
    const players = window.seasonRotationPlayers;
    if (!players || players.length === 0) return;

    shuffleArray(players);

    playerRotationInterval = setInterval(async () => {
        if (isSwapping) return;
        isSwapping = true;
        try {
            await swapRandomPlayer(overlay, players);
        } catch (e) {
            console.warn('Swap failed:', e);
        } finally {
            isSwapping = false;
        }
    }, 5000);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function swapRandomPlayer(overlay, remainingPlayers) {
    if (!remainingPlayers || remainingPlayers.length === 0) return;

    // Pick random slot
    const slotIndex = Math.floor(Math.random() * 3);
    const heroElement = overlay.querySelector(`.pmc-hero[data-index="${slotIndex}"]`);
    if (!heroElement) return;

    // Don't show a player who's already in another slot
    const displayedIds = new Set(
        Array.from(overlay.querySelectorAll('.pmc-hero'))
            .map(h => h.dataset.playerId)
            .filter(id => id)
    );

    // Find next and not already displayed
    let newPlayer = null;
    let attempts = 0;
    while (attempts < remainingPlayers.length) {
        const candidate = remainingPlayers.shift();
        remainingPlayers.push(candidate); // cycle back
        attempts++;
        if (!displayedIds.has(candidate.permaLink)) {
            newPlayer = candidate;
            break;
        }
    }

    if (!newPlayer) return;

    await animatePlayerOut(heroElement);
    updateHeroContent(heroElement, newPlayer, slotIndex);

    const imgElement = heroElement.querySelector('.pmc-image');
    if (imgElement) {
        await new Promise(resolve => {
            loadAndCropPlayerImageUtil(newPlayer, imgElement);
            // loadAndCropPlayerImageUtil doesn't return a promise so we wait a lil
            setTimeout(resolve, 300);
        });
    }

    // Animate in
    await animatePlayerIn(heroElement);
}

function animatePlayerOut(heroElement) {
    return new Promise(resolve => {
        heroElement.getAnimations().forEach(a => a.cancel());
        heroElement.classList.remove('animate-in');

        const anim = heroElement.animate(
            [
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-30px)' }
            ],
            { duration: 800, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
        );
        anim.onfinish = () => resolve();
    });
}

function animatePlayerIn(heroElement) {
    return new Promise(resolve => {
        heroElement.getAnimations().forEach(a => a.cancel());

        const anim = heroElement.animate(
            [
                { opacity: 0, transform: 'translateY(30px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 800, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
        );
        anim.onfinish = () => resolve();
    });
}

function updateHeroContent(heroElement, player, slotIndex) {
    const rank = getRank(player.networkRaids, 2000, 32);
    const colorMatch = rank.textColor.match(/hsl\((\d+)/);
    const hue = colorMatch ? parseInt(colorMatch[1]) : 200;
    const glowColor = `hsla(${hue}, 100%, 70%, 0.3)`;

    heroElement.dataset.playerId = player.permaLink;
    heroElement.dataset.rankHue = hue;

    const rankBadge = heroElement.querySelector('.pmc-rank-badge');
    if (rankBadge) {
        rankBadge.style.background = rank.gradient;
        rankBadge.style.borderColor = rank.borderColor;

        const rankNumber = rankBadge.querySelector('.rank-number');
        const rankName = rankBadge.querySelector('.rank-name');
        const rankLevel = rankBadge.querySelector('.rank-level');

        if (rankNumber) {
            rankNumber.style.color = rank.textColor;
            rankNumber.textContent = `#${slotIndex + 1}`;
        }
        if (rankName) {
            rankName.style.color = rank.textColor;
            rankName.textContent = rank.name;
        }
        if (rankLevel) {
            rankLevel.style.color = rank.textColor;
            rankLevel.textContent = `LVL ${rank.level}`;
        }
    }

    const imgElement = heroElement.querySelector('.pmc-image');
    if (imgElement) {
        imgElement.src = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;
        imgElement.alt = escapeHtml(player.name);
        imgElement.style.filter = `drop-shadow(0 0 3px rgba(${rank.RGB}, 0.5))`;
        imgElement.dataset.glow = glowColor;
    }

    const nameElement = heroElement.querySelector('.pmc-name');
    if (nameElement) {
        nameElement.innerHTML = renderUsernameHTML(player);
    }

    const statsElement = heroElement.querySelector('.pmc-stats');
    if (statsElement) {
        statsElement.innerHTML = `
            <span class="pmc-stat"><i class="fa-solid fa-skull-crossbones"></i> ${player.pmcKills || 0} KILLS</span>
            <span class="pmc-stat"><i class="fas fa-trophy"></i> ${(player.killToDeathRatio || 0).toFixed(1)} K/D</span>
            <span class="pmc-stat"><i class="fa-solid fa-user-clock"></i> ${formatPlayTimeShort(player.totalPlayTime || 0)}</span>
        `;
    }
}

function stopPlayerRotation() {
    if (playerRotationInterval) {
        clearInterval(playerRotationInterval);
        playerRotationInterval = null;
    }
}

function renderHeroElement(player, index) {
    const rank = getRank(player.networkRaids, 2000, 32);
    const colorMatch = rank.textColor.match(/hsl\((\d+)/);
    const hue = colorMatch ? parseInt(colorMatch[1]) : 200;
    const glowColor = `hsla(${hue}, 100%, 70%, 0.3)`;

    return `
        <div class="pmc-hero" 
            data-index="${index}"
            data-rank-hue="${hue}"
            data-player-id="${player.permaLink}">
            <div class="pmc-rank-badge" style="background: ${rank.gradient}; border-color: ${rank.borderColor};">
                <span class="rank-number" style="color: ${rank.textColor};">#${index + 1}</span>
                <span class="rank-name" style="color: ${rank.textColor};">${rank.name}</span>
                <span class="rank-level" style="color: ${rank.textColor}; opacity: 0.7;">LVL ${rank.level}</span>
            </div>
            <div class="pmc-image-wrapper">
                <img src="${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png" 
                    alt="${escapeHtml(player.name)}"
                    class="pmc-image"
                    loading="lazy"
                    style="filter: drop-shadow(0 0 3px rgba(${rank.RGB}, 0.5));"
                    data-glow="${glowColor}">
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
        topScorePlayer: null,
        topSurvival: 0,
        topSurvivalPlayer: null,
        topPlayTime: 0,
        topPlayTimePlayer: null
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

        if ((player.survivalRate || 0) > stats.topSurvival && (player.totalRaids || 0) > 30) {
            stats.topSurvival = player.survivalRate;
            stats.topSurvivalPlayer = player.name;
        }

        if ((player.totalPlayTime || 0) > stats.topPlayTime) {
            stats.topPlayTime = player.totalPlayTime;
            stats.topPlayTimePlayer = player.name;
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

function getTopPlayers(players, count = 3) {
    return players
        .filter(p => !p.banned && !p.isCasual && p.totalScore > 0)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, count);
}

// #region Anims
function animateStats() {
    document.querySelectorAll('.season-end-stat-value, .stat-featured-sub-value').forEach(el => {
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
    stopPlayerRotation();
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

function playAppropriateTrack(diff) {
    let trackToPlay = null;

    if (diff <= 30000) {
        trackToPlay = 'season/season_end3';
    } else if (diff <= 85000) {
        trackToPlay = 'season/season_end2';
    } else if (diff <= 145000) {
        trackToPlay = 'season/season_end1';
    }

    if (trackToPlay && lastPlayed !== trackToPlay) {
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

function checkPMCExists(player) {
    return new Promise((resolve) => {
        const permaLink = player.permaLink;
        const url = `${ApiPaths.pmcPfpsPath}${permaLink}_full.png`;
        //console.log(`[ImageCheck] Trying: ${url}`);

        //console.log('permaLink type:', typeof player.permaLink);
        //console.log('permaLink value:', player.permaLink);
        //console.log('player keys:', Object.keys(player));

        if (imageCache.has(permaLink)) {
            resolve(imageCache.get(permaLink));
            return;
        }

        const img = new Image();
        const timeout = setTimeout(() => {
            //console.warn(`[ImageCheck] TIMEOUT for ${url}`);
            img.src = '';
            imageCache.set(permaLink, false);
            resolve(false);
        }, 5000);

        img.onload = () => {
            clearTimeout(timeout);
            //console.log(`[ImageCheck] LOADED ${url} — ${img.naturalWidth}x${img.naturalHeight}`);
            const isValid = img.naturalWidth > 10 && img.naturalHeight > 10;
            imageCache.set(permaLink, isValid);
            resolve(isValid);
        };

        img.onerror = (e) => {
            clearTimeout(timeout);
            //console.error(`[ImageCheck] ERROR for ${url}`, e);
            imageCache.set(permaLink, false);
            resolve(false);
        };

        img.src = url;
    });
}

async function filterPlayersWithImages(players) {
    const results = await Promise.all(
        players.map(async (player) => {
            const hasImage = await checkPMCExists(player);
            return hasImage ? player : null;
        })
    );
    return results.filter(p => p !== null);
}