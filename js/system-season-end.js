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

function endSeason() {
    const stats = calculateGlobalStats(leaderboardData);
    const endMusic = new Audio(`media/sounds/season/season_end_final.mp3`);
    endMusic.play();

    // When season end sound is over, play music and show video additional overlay + start showing names
    endMusic.addEventListener('ended', () => {
        const contMusic = new Audio('media/sounds/season/end_music.mp3');
        const videoBackground = document.querySelector('.video-background');

        contMusic.volume = 0.3;
        contMusic.loop = true;
        contMusic.play();

        videoBackground.style.opacity = '0.5';

        // Start showing player names after a short delay
        showAllPlayerNames(leaderboardData);

    });

    const roundedBillions = Math.round(stats.totalSalesSum / 1_000_000_000);
    const roundedDamage = Math.round(stats.totalDamage / 1_000_000);

    const overlay = document.createElement('div');
    overlay.id = 'seasonOverlay';
    overlay.innerHTML = `
        <div class="season-end-container animate__animated animate__fadeIn">
            <div class="video-background">
                <video autoplay muted loop playsinline>
                    <source src="media/season_end/test.mp4" type="video/mp4">
                </video>
            </div>

            <div class="video-background-overlay">
                <video autoplay muted loop playsinline>
                    <source src="media/season_end/season_end_overlay.mp4" type="video/mp4">
                </video>
            </div>

            <div class="season-header">
                <h1>SEASON ${seasons[0]} FINALE</h1>
                <p class="subtitle">The battle is over... for now.</p>
            </div>
            <div class="season-stats-grid">
                <!-- Left Block -->
                <div class="stats-block general-stats animate__animated animate__fadeInLeft">
                    <h2>Season ${seasons[0]} Statistics</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${leaderboardData.length}</div>
                            <div class="stat-label">WARRIORS</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.totalRaids.toLocaleString('en-EN')}</div>
                            <div class="stat-label">RAIDS</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.totalKills.toLocaleString('en-EN')}</div>
                            <div class="stat-label">KILLS</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${roundedDamage} MILLION</div>
                            <div class="stat-label">DAMAGE</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${formatTime(stats.totalPlayTime)}</div>
                            <div class="stat-label">SPENT IN RAID</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.averageSurvivalRate}%</div>
                            <div class="stat-label">AVG SURVIVAL</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.mostPopularMap}</div>
                            <div class="stat-label">HOTTEST MAP</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${roundedBillions} BILLION</div>
                            <div class="stat-label">RUBLES TRADED ACROSS</div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Block -->
                <div class="stats-block top-players animate__animated animate__fadeInRight">
                    <h2>Season MVPs</h2>
                    
                    <div class="player-card top-kd">
                        <div class="player-title">BEST K/D RATIO</div>
                        <div class="player-se-name">${stats.topKD.name}</div>
                        <div class="player-stats-se">
                            <span>KDR ${stats.topKD.killToDeathRatio.toFixed(0)}</span>
                        </div>
                        <div class="player-additional">
                            ${stats.topKD.teamTag ? `[${stats.topKD.teamTag}]` : ''}
                            Level ${stats.topKD.pmcLevel}
                        </div>
                    </div>
                    
                    <div class="player-card top-kills">
                        <div class="player-title">MOST KILLS</div>
                        <div class="player-se-name">${stats.topKills.name}</div>
                        <div class="player-stats-se">
                            <span>${stats.topKills.pmcKills.toLocaleString('en-EN')} PMC kills</span>
                        </div>
                        <div class="player-additional">
                            ${stats.topKills.weaponMastery ? `Favorite weapon: ${stats.topKills.weaponMastery}` : ''}
                        </div>
                    </div>
                    
                    <div class="player-card top-survivor">
                        <div class="player-title">MOST TIME PLAYED</div>
                        <div class="player-se-name">${stats.topPlayTime.name}</div>
                        <div class="player-stats-se">
                            <span>${formatTime(stats.topPlayTime.totalPlayTime)}</span>
                            <span>${stats.topPlayTime.survivalRate}% SR</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Extra -->
            <div class="additional-stats animate__animated animate__fadeInUp animate__delay-5s">
                <h3>Interesting Facts</h3>
                <div class="facts-grid">
                    <div class="fact-card">
                        <div class="fact-icon"><img src="media/season_end/Mastering.png" width="20px" height="25px" alt=""></div>
                        <div class="fact-text">${stats.topKillsWeapon} was the deadliest weapon with ${stats.topKillsWeaponCount} kills</div>
                    </div>
                    <div class="fact-card">
                        <div class="fact-icon"><img src="media/season_end/icon_unique_id.png" width="25px" height="25px" alt=""></div>
                        <div class="fact-text">${stats.kappaOwners} players achieved Kappa container</div>
                    </div>
                    <div class="fact-card">
                        <div class="fact-icon"><img src="media/season_end/icon_statscategory_combat_0.png" width="25px" height="25px" alt=""></div>
                        <div class="fact-text">Longest hit: ${stats.longestShot}m by ${stats.longestShotPlayer}</div>
                    </div>
                    <div class="fact-card">
                        <div class="fact-icon"><img src="media/season_end/standing_icon.png" width="25px" height="25px" alt=""></div>
                        <div class="fact-text">${stats.richestTrader} was the most profitable trader</div>
                    </div>
                </div>
            </div>
            
            <div class="season-countdown animate__animated animate__fadeInUp animate__delay-5s">
                <p>Preparing for update... <img src="media/loading_bar.gif" width="20px" height="20px" style="position: relative; top: 5px;" alt=""></p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const videoBackgroundOverlay = document.querySelector('.video-background-overlay');
    videoBackgroundOverlay.style.opacity = '0.09';
}

function calculateGlobalStats(players) {
    let totalKills = 0;
    let totalDeaths = 0;
    let totalPlayTime = 0;
    let totalDamage = 0;
    let totalRaids = 0;
    let totalSurvived = 0;
    let kappaOwners = 0;
    let totalSurvivalRate = 0;
    let validPlayersCount = 0;

    const weaponStats = {};
    const mapStats = {};
    const traderStats = {};

    let topKD = null;
    let topKills = null;
    let topPlayTime = null;
    let longestShot = 0;
    let longestShotPlayer = null;
    let totalSalesSum = 0;
    let topKillsWeapon = "Unknown";
    let topKillsWeaponCount = 0;

    players.forEach(player => {
        if (!player.banned && !player.isCasual) {
            const kd = player.killToDeathRatio || 0;
            const kills = player.pmcKills || 0;
            const deaths = player.pmcDeaths || 0;
            const playTime = player.totalPlayTime || 0;
            const raids = player.totalRaids || 0;
            const survived = player.pmcSurvived || 0;
            const damage = player.damage || 0;

            totalKills += kills;
            totalDeaths += deaths;
            totalPlayTime += playTime;
            totalRaids += raids;
            totalSurvived += survived;
            totalDamage += damage;

            if (player.traderInfo) {
                for (const trader in player.traderInfo) {
                    const data = player.traderInfo[trader];
                    if (data.salesSum && data.salesSum > 0) {
                        totalSalesSum += data.salesSum;
                    }
                }
            }

            if (player.weapons) {
                for (const profileId in player.weapons) {
                    const profileData = player.weapons[profileId];

                    if (!profileData.weapons) continue;

                    const weapons = profileData.weapons;

                    for (const weaponName in weapons) {
                        const weapon = weapons[weaponName];
                        const weaponKills = weapon.stats?.kills || 0;

                        if (weaponKills > 0) {
                            const weaponKey = weapon.originalId || weaponName;
                            weaponStats[weaponKey] = (weaponStats[weaponKey] || 0) + weaponKills;

                            if (weaponStats[weaponKey] > topKillsWeaponCount) {
                                topKillsWeaponCount = weaponStats[weaponKey];
                                topKillsWeapon = weaponName;
                            }
                        }
                    }
                }
            }

            if (player.lastRaidMap) {
                mapStats[player.lastRaidMap] = (mapStats[player.lastRaidMap] || 0) + 1;
            }

            if (player.traderInfo) {
                Object.entries(player.traderInfo).forEach(([trader, data]) => {
                    if (data.salesSum > 0) {
                        traderStats[trader] = (traderStats[trader] || 0) + data.salesSum;
                    }
                });
            }

            if (player.survivalRate !== undefined && player.survivalRate !== null) {
                totalSurvivalRate += player.survivalRate;
                validPlayersCount++;
            }

            if (player.hasKappa) kappaOwners++;

            if (player.longestShot > longestShot) {
                longestShot = player.longestShot;
                longestShotPlayer = player.name;
            }

            if (!topKD || kd > topKD.killToDeathRatio) topKD = player;
            if (!topKills || kills > topKills.pmcKills) topKills = player;
            if (!topPlayTime || playTime > topPlayTime.totalPlayTime) topPlayTime = player;
        }
    });

    let mostPopularMap = "Unknown";
    if (Object.keys(mapStats).length > 0) {
        mostPopularMap = Object.entries(mapStats).sort((a, b) => b[1] - a[1])[0][0];
    }

    let richestTrader = "Unknown";
    if (Object.keys(traderStats).length > 0) {
        richestTrader = Object.entries(traderStats).sort((a, b) => b[1] - a[1])[0][0];
    }

    const averageSurvivalRate = validPlayersCount > 0 ? totalSurvivalRate / validPlayersCount : 0;

    return {
        totalKills,
        totalDeaths,
        totalPlayTime,
        totalRaids,
        totalDamage,
        averageSurvivalRate: averageSurvivalRate.toFixed(1),
        kappaOwners,
        topKD,
        topKills,
        topPlayTime,
        topKillsWeapon,
        topKillsWeaponCount,
        totalWeapons: Object.keys(weaponStats).length,
        mostPopularMap,
        richestTrader,
        longestShot,
        longestShotPlayer,
        totalSalesSum
    };
}

function preloadAudio() {
    const files = [
        { name: 'season/season_end1', time: 145000 }, // 2:25
        { name: 'season/season_end2', time: 85000 },  // 1:25
        { name: 'season/season_end3', time: 30000 },  // 0:30
        { name: 'season/season_end_final', time: 0 }  // 0:00
    ];

    files.forEach(({ name, time }) => {
        const audio = new Audio(`media/sounds/${name}.mp3`);
        audio.timeThreshold = time;
        audio.volume = 0.4;
        audioElements[name] = audio;
    });

    // Ambience with no timer
    audioElements['season/season_end_ambience'] = new Audio(`media/sounds/season/season_end_ambience.mp3`);
    audioElements['season/season_end_ambience'].loop = true;
}

function showAllPlayerNames(players) {
    const overlay = document.getElementById('seasonOverlay');

    // Fade out
    const darkOverlay = document.createElement('div');
    darkOverlay.id = 'memoryOverlay';
    darkOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 999;
        opacity: 0;
        transition: opacity 2s ease-in-out;
    `;

    // "In Memory of..."
    // Lazy to move it to CSS.. So here you go, enjoy
    const memoryTitle = document.createElement('div');
    memoryTitle.id = 'memoryTitle';
    memoryTitle.textContent = 'In memory of our Fallen and Risen. Your sacrifice will not be forgotten.';
    memoryTitle.style.cssText = `
        position: fixed;
        top: 5%;
        left: 50%;
        transform: translateX(-50%);
        font-family: Rajdhani, sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: rgb(177 176 176);
        z-index: 1001;
        opacity: 1;
        transition: opacity 2s ease-in-out;
        text-align: center;
    `;

    const namesContainer = document.createElement('div');
    namesContainer.id = 'playerNamesOverlay';
    namesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
    `;

    overlay.appendChild(darkOverlay);
    overlay.appendChild(memoryTitle);
    overlay.appendChild(namesContainer);

    setTimeout(() => {
        darkOverlay.style.opacity = '1';
        memoryTitle.style.opacity = '1';
        namesContainer.style.opacity = '1';
    }, 100);

    const validPlayers = players.filter(player => !player.banned && player.name);

    // Start showign names
    validPlayers.forEach((player, index) => {
        setTimeout(() => {
            createFloatingName(player.name, namesContainer, 5000);
        }, index * 300);
    });

    // After showing start fading out names
    const totalDisplayTime = validPlayers.length * 500 + 4000; // 6 seconds after last name
    setTimeout(() => {
        fadeOutAllElements(darkOverlay, memoryTitle, namesContainer);
    }, totalDisplayTime);
}

function createFloatingName(playerName, container, delay) {
    const nameElement = document.createElement('div');
    nameElement.className = 'floating-player-name';
    nameElement.textContent = playerName;

    const posX = Math.random() * 80 + 10; // 15% - 85%
    const posY = Math.random() * 80 + 10; // 10% - 70%
    const fontSize = Math.random() * 20 + 18; // 18px - 38px
    const opacity = Math.random() * 0.2 + 0.4; // 40% - 100%

    nameElement.style.cssText = `
        position: absolute;
        left: ${posX}%;
        top: ${posY}%;
        font-family: 'Rajdhani', sans-serif;
        font-size: ${fontSize}px;
        font-weight: 600;
        color: rgba(255, 255, 255, ${opacity});
        text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.9);
        white-space: nowrap;
        transform: translate(-50%, -50%);
        opacity: 0;
        transition: opacity 1.5s ease-in-out, transform 2s ease-in-out;
        pointer-events: none;
        z-index: 1001;
    `;

    container.appendChild(nameElement);

    setTimeout(() => {
        nameElement.style.opacity = '1';
    }, 100);

    // Automatic remove name after 3-5 seconds
    const displayTime = 3000 + Math.random() * 2000;
    setTimeout(() => {
        nameElement.style.opacity = '0';
        setTimeout(() => {
            if (nameElement.parentNode) {
                nameElement.parentNode.removeChild(nameElement);
            }
        }, 1500);
    }, delay + displayTime);
}

function fadeOutAllElements(darkOverlay, memoryTitle, namesContainer) {
    memoryTitle.style.opacity = '0';

    // Remove all elements with fadeout
    setTimeout(() => {
        namesContainer.style.opacity = '0';
        darkOverlay.style.opacity = '0';

        setTimeout(() => {
            if (darkOverlay.parentNode) darkOverlay.parentNode.removeChild(darkOverlay);
            if (memoryTitle.parentNode) memoryTitle.parentNode.removeChild(memoryTitle);
            if (namesContainer.parentNode) namesContainer.parentNode.removeChild(namesContainer);
        }, 2000);
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    preloadAudio();
});