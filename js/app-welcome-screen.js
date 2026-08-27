//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

let lastShownPlayers = [];
const phrases = [
    'love from developers.',
    'competitive SPT community.',
    'connection with players worldwide.',
    'welcome for everyone.',
    'tracking of your progress.',
    'glory of yours.',
    'legends born here.'
]

async function initWelcomeScreen() {
    try {
        if (localStorage.getItem('WelcomeSplashScreen') !== 'true') {
            const players = leaderboardData;
            const showcasePlayers = await getPlayersWithImages(players, 3);
            const stats = calculateSeasonStats(players);

            const overlay = createWelcomeOverlay(showcasePlayers, stats);
            document.body.appendChild(overlay);

            const continueBtn = document.getElementById('continueBtn');
            const welcomePopup = document.getElementById('welcomePopup');

            const el = document.getElementById('journey-text')
            if (el) {
                const fx = new Fun(el)
                let counter = 0

                const next = () => {
                    fx.setText(phrases[counter]).then(() => {
                        setTimeout(next, 2000)
                    })
                    counter = (counter + 1) % phrases.length
                }

                setTimeout(next, 1000)
            }


            continueBtn.addEventListener('click', function () {
                welcomePopup.style.opacity = '0';
                welcomePopup.style.transform = 'translateY(-20px)';
                welcomePopup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                localStorage.setItem('WelcomeSplashScreen', 'true');
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
                        <p class="season-end-subtitle">With everlasting <span class="animated-text-glitch" id="journey-text"> </span></p>
                        <div class="welcome-description">
                            <p>Join, Explore, Trade, Team Up, Engage and Compete. For you. For free.</p>
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

    const imageCache = new Map();

    const checkImageExists = async (url) => {
        if (imageCache.has(url)) return imageCache.get(url);
        try {
            const response = await apiFetch(url, { method: 'HEAD' });
            const exists = response.ok;
            imageCache.set(url, exists);
            return exists;
        } catch {
            imageCache.set(url, false);
            return false;
        }
    };

    const getPlayerWithImage = async (playerPool, excludeIds = []) => {
        if (!playerPool || playerPool.length === 0) return null;

        const freshPool = playerPool.filter(p => !lastShownPlayers.includes(p.id) && !excludeIds.includes(p.id));
        const poolToCheck = freshPool.length > 0 ? freshPool : playerPool.filter(p => !excludeIds.includes(p.id));

        const shuffled = [...poolToCheck].sort(() => Math.random() - 0.5);

        for (const player of shuffled) {
            if (!player.permaLink) continue;
            const imageUrl = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;
            const exists = await checkImageExists(imageUrl);
            if (exists) {
                return player;
            }
        }
        return null;
    };

    const top20ByScore = [...validPlayers]
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, 20);

    // seasonsPlayed = 1, >totalPlayTime
    const newbieCandidates = validPlayers
        .filter(p => (p.seasonsPlayed || 0) === 1)
        .sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0));

    let newbie = await getPlayerWithImage(newbieCandidates);
    if (!newbie) {
        // seasonsPlayed = 1
        newbie = newbieCandidates[0];
    }
    if (!newbie) {
        // >totalPlayTime
        const fallbackNewbie = validPlayers
            .sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0));
        newbie = await getPlayerWithImage(fallbackNewbie);
    }
    if (!newbie) {
        newbie = validPlayers.sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0))[0];
    }

    // seasonsPlayed >= 3, <totalPlayTime
    const veteranCandidates = validPlayers
        .filter(p => p.id !== newbie?.id && (p.seasonsPlayed || 0) >= 3)
        .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0));

    let veteran = await getPlayerWithImage(veteranCandidates);
    if (!veteran) {
        // seasonsPlayed >= 3
        veteran = veteranCandidates[0];
    }
    if (!veteran) {
        // totalPlayTime
        const fallbackVeteran = validPlayers
            .filter(p => p.id !== newbie?.id)
            .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0));
        veteran = await getPlayerWithImage(fallbackVeteran);
    }
    if (!veteran) {
        veteran = validPlayers
            .filter(p => p.id !== newbie?.id)
            .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0))[0];
    }

    const championCandidates = top20ByScore
        .filter(p => p.id !== newbie?.id && p.id !== veteran?.id);

    let champion = await getPlayerWithImage(championCandidates);
    if (!champion) {
        champion = championCandidates[0];
    }
    if (!champion) {
        const fallbackChampion = validPlayers
            .filter(p => p.id !== newbie?.id && p.id !== veteran?.id)
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        champion = await getPlayerWithImage(fallbackChampion);
    }
    if (!champion) {
        champion = validPlayers
            .filter(p => p.id !== newbie?.id && p.id !== veteran?.id)
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))[0];
    }

    const result = [newbie, veteran, champion].filter(Boolean);

    lastShownPlayers = result.map(p => p.id);

    if (result.length < 3) {
        const remaining = top20ByScore
            .filter(p => !result.some(r => r.id === p.id));

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

    return result.slice(0, 3);
}

// Make text animated (from NVV)
class Fun {
    constructor(el) {
        this.el = el
        this.chars = '!<>-_\\/[]{}—=+*^?#________'
        this.update = this.update.bind(this)
    }
    setText(newText) {
        const oldText = this.el.innerText
        const length = Math.max(oldText.length, newText.length)
        const promise = new Promise((resolve) => this.resolve = resolve)
        this.queue = []
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || ''
            const to = newText[i] || ''
            const start = Math.floor(Math.random() * 40)
            const end = start + Math.floor(Math.random() * 40)
            this.queue.push({ from, to, start, end })
        }
        cancelAnimationFrame(this.frameRequest)
        this.frame = 0
        this.update()
        return promise
    }
    update() {
        let output = ''
        let complete = 0
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i]
            if (this.frame >= end) {
                complete++
                output += to
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar()
                    this.queue[i].char = char
                }
                output += `<span class="dud">${char}</span>`
            } else {
                output += from
            }
        }
        this.el.innerHTML = output
        if (complete === this.queue.length) {
            this.resolve()
        } else {
            this.frameRequest = requestAnimationFrame(this.update)
            this.frame++
        }
    }
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)]
    }
}