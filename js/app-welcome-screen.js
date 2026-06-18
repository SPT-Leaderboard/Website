//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

async function initWelcomeScreen() {
    try {
        if (localStorage.getItem('WelcomeScreenC') !== 'true') {
            const players = leaderboardData;
            const showcasePlayers = await getPlayersWithImages(players, 3);
            const stats = calculateSeasonStats(players);

            const overlay = createWelcomeOverlay(showcasePlayers, stats);
            document.body.appendChild(overlay);

            setTimeout(() => {
                animateStats();
                animatePMCs();
            }, 300);

            const continueBtn = document.getElementById('continueBtn');
            const welcomePopup = document.getElementById('welcomePopup');

            continueBtn.addEventListener('click', function () {
                welcomePopup.style.opacity = '0';
                welcomePopup.style.transform = 'translateY(-20px)';
                welcomePopup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                localStorage.setItem('WelcomeScreenC', 'true');
                setTimeout(() => {
                    welcomePopup.remove();
                }, 400);
            });
        }
    } catch (error) {
        console.error('Welcome screen error:', error);
    }
}

function createWelcomeOverlay(showcasePlayers, stats) {
    const overlay = document.createElement('div');
    overlay.id = 'welcomePopup';

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
                        <h1>Welcome to SPTLB</h1>
                        <p class="season-end-subtitle">Your journey starts here.</p>
                        <div class="welcome-description">
                            <p>Join, Explore, Trade, Engage and Compete. Everything is open, just for you, player.</p>
                        </div>
                    </div>

                    <div class="action-section">
                        <button class="action-btn primary animate__animated animate__fadeIn" id="continueBtn">
                            <i class="fas fa-arrow-right"></i> Enter Leaderboard 
                            <span class="btn-glow"></span>
                        </button>
                        <div class="secondary-actions">
                            <button class="action-btn secondary" onclick="window.open('https://forge.sp-tarkov.com/mod/2101/spt-leaderboard', '_blank')">
                                <i class="fa-solid fa-download"></i> Get Latest Release 
                            </button>
                            <button class="action-btn secondary" onclick="window.open('https://discord.gg/UrRkqwdgnd', '_blank')">
                                <i class="fab fa-discord"></i> Join Discord 
                            </button>
                            <button class="action-btn secondary" onclick="window.location.href = '../insights/';">
                                <i class="fas fa-chart-bar"></i> Global Statistics 
                            </button>
                        </div>
                    </div>
                </div>

                <div class="season-pmc-column">
                    <div class="pmc-heroes-container">
                        ${showcasePlayers.map((player, index) => {
                            const rank = getRank(player.networkRaids || 0, 2000, 32);
                            const colorMatch = rank.textColor.match(/hsl\((\d+)/);
                            const hue = colorMatch ? parseInt(colorMatch[1]) : 200;
                            const glowColor = `hsla(${hue}, 100%, 70%, 0.3)`;
                            const glowColorHover = `hsla(${hue}, 100%, 80%, 0.5)`;
                            const glowColorStrong = `hsla(${hue}, 100%, 60%, 0.4)`;

                            let playerType = '';
                            let playerTypeIcon = '';
                            if (index === 0) {
                                playerType = 'Newcomer';
                            } else if (index === 1) {
                                playerType = 'Veteran';
                            } else {
                                playerType = 'Champion';
                            }

                            return `
                                <div class="pmc-hero"
                                    data-index="${index}"
                                    data-rank-hue="${hue}">
                                    <div class="pmc-rank-badge" style="background: ${rank.gradient}; border-color: ${rank.borderColor};">
                                        <span class="rank-name" style="color: ${rank.textColor};">
                                            ${playerType}
                                        </span>
                                        <span class="rank-level" style="color: ${rank.textColor}; opacity: 0.7;">
                                            ${rank.name}
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
                                        <div class="pmc-name" style="color: ${rank.textColor};">${renderUsernameHTML(player)}</div>
                                        <div class="pmc-stats">
                                            <span class="pmc-stat"><i class="fa-solid fa-skull-crossbones"></i> ${player.pmcKills || 0} KILLS</span>
                                            <span class="pmc-stat"><i class="fas fa-trophy"></i> ${(player.killToDeathRatio || 0).toFixed(1)} K/D</span>
                                            <span class="pmc-stat"><i class="fa-solid fa-user-clock"></i> ${formatPlayTimeShort(player.totalPlayTime || 0)}</span>
                                            ${index === 0 ? `<span class="pmc-stat"><i class="fa-solid fa-seedling"></i> New</span>` : ''}
                                            ${index === 1 ? `<span class="pmc-stat"><i class="fa-solid fa-clock"></i> ${player.seasonsPlayed || 0} Seasons</span>` : ''}
                                            ${index === 2 ? `<span class="pmc-stat"><i class="fa-solid fa-crown"></i> #${player.rank || 'N/A'}</span>` : ''}
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
        showcasePlayers.forEach((player, index) => {
            const imgElement = overlay.querySelector(`.pmc-hero[data-index="${index}"] .pmc-image`);
            if (imgElement) {
                loadAndCropPlayerImageUtil(player, imgElement);
            }
        });
    }, 100);

    return overlay;
}


async function getPlayersWithImages(players, count = 3) {
    const validPlayers = players.filter(p => !p.banned && !p.isCasual && !p.dev);
    
    if (validPlayers.length < 3) {
        return validPlayers.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)).slice(0, count);
    }

    const getPlayerWithImage = async (playerPool) => {
        const shuffled = [...playerPool].sort(() => Math.random() - 0.5);
        
        for (const player of shuffled) {
            if (!player.permaLink) continue;
            const imageUrl = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;
            const exists = await imageExists(imageUrl);
            if (exists) {
                return player;
            }
        }
        return null;
    };

    const newbieCandidates = validPlayers
        .filter(p => (p.seasonsPlayed || 0) === 1)
        .sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0));
    
    let newbie = await getPlayerWithImage(newbieCandidates);
    if (!newbie) {
        const fallbackNewbie = validPlayers
            .sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0))
            .slice(0, 10);
        newbie = await getPlayerWithImage(fallbackNewbie);
    }
    if (!newbie) {
        newbie = validPlayers.sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0))[0];
    }

    
    const veteranCandidates = validPlayers
        .filter(p => p.id !== newbie?.id)
        .sort((a, b) => (b.seasonsPlayed || 0) - (a.seasonsPlayed || 0));
    
    let veteran = await getPlayerWithImage(veteranCandidates);
    if (!veteran) {
        // Just grab by totalPlayTime if no veterans found
        const fallbackVeteran = validPlayers
            .filter(p => p.id !== newbie?.id)
            .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0))
            .slice(0, 10);
        veteran = await getPlayerWithImage(fallbackVeteran);
    }
    if (!veteran) {
        veteran = validPlayers
            .filter(p => p.id !== newbie?.id)
            .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0))[0];
    }

    // Highest totalscore
    const championCandidates = validPlayers
        .filter(p => p.id !== newbie?.id && p.id !== veteran?.id)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    
    let champion = await getPlayerWithImage(championCandidates);
    if (!champion) {
        champion = championCandidates[0];
    }

    const result = [newbie, veteran, champion].filter(Boolean);

    if (result.length < 3) {
        const remaining = validPlayers.filter(p => !result.some(r => r.id === p.id));
        for (const player of remaining) {
            if (result.length >= 3) break;
            if (!player.permaLink) continue;
            const imageUrl = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;
            const exists = await imageExists(imageUrl);
            if (exists) {
                result.push(player);
            }
        }
    }

    while (result.length < 3) {
        const extra = validPlayers
            .filter(p => !result.some(r => r.id === p.id))
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))[0];
        if (extra) result.push(extra);
        else break;
    }

    return result.slice(0, 3);
}