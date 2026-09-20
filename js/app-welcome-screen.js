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
        if (localStorage.getItem('SPTLBWelcome') !== 'true') {
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
                localStorage.setItem('SPTLBWelcome', 'true');
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
                    <img class="season-welcome-banner" src="/media/cord_breach/banner.jpg" alt="" aria-hidden="true">
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
                        ${showcasePlayers.map((player, index) => renderHeroElement(player, index)).join('')}
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

    setTimeout(() => {
        overlay.querySelectorAll('.pmc-hero').forEach((hero, index) => {
            setTimeout(() => {
                hero.classList.add('animate-in');
            }, 800 + index * 500);
        });
    }, 400);

    return overlay;
}

async function getPlayersWithImages(players, count = 3) {
    const validPlayers = players.filter(p => !p.banned && !p.isCasual && !p.dev);

    if (validPlayers.length === 0) {
        return [];
    }

    // Validate thumbnail
    // (system-season-end.js)
    let playersWithImages = [];
    try {
        playersWithImages = await filterPlayersWithImages(validPlayers);
    } catch (e) {
        console.warn('Image validation failed, falling back to all eligible players:', e);
        playersWithImages = validPlayers;
    }

    if (playersWithImages.length === 0) {
        playersWithImages = validPlayers;
    }

    const unseen = playersWithImages.filter(p => !lastShownPlayers.includes(p.id));
    const pickPool = unseen.length > 0 ? unseen : playersWithImages;

    const pickBest = (list) => list[0] || null;

    // Newcomer: first season, least played
    const newbieCandidates = pickPool
        .filter(p => (p.seasonsPlayed || 0) === 1)
        .sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0));
    let newbie = pickBest(newbieCandidates);

    if (!newbie) {
        newbie = pickBest([...pickPool].sort((a, b) => (a.totalPlayTime || 0) - (b.totalPlayTime || 0)));
    }

    // Veteran: 3+ seasons, most played
    const veteranCandidates = pickPool
        .filter(p => p.id !== newbie?.id && (p.seasonsPlayed || 0) >= 3)
        .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0));
    let veteran = pickBest(veteranCandidates);

    if (!veteran) {
        veteran = pickBest(pickPool
            .filter(p => p.id !== newbie?.id)
            .sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0)));
    }

    // Top score remaining
    const champion = pickBest(pickPool
        .filter(p => p.id !== newbie?.id && p.id !== veteran?.id)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)));

    const result = [newbie, veteran, champion].filter(Boolean);

    lastShownPlayers = result.map(p => p.id);

    return result.slice(0, count);
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