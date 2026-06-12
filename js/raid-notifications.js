//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

const playerNotificationData = new Map();
const processedNewPlayers = new Set();
const notificationStack = [];
const NOTIFICATION_DELAY = 1600;
const MAX_NOTIFICATIONS = 5;
let lastNotificationTime = 0;
let isBanSoundPlaying = false;

async function showPlayerNotification(player) {
    if (!player.absoluteLastTime) {
        console.debug(`[NOTIFY] Skipping player ${player.name} – no absoluteLastTime data.`);
        return;
    }

    // Player was banned and already shown to user
    if (player.banned && wasBanRecentlyShown(player.id)) {
        console.debug(`[NOTIFY] Skipping banned player ${player.name}, recently shown.`);
        return;
    }

    // Due to some unknown to me fuckery invoking showPlayerNotification multiple times, we have to add a check here, or the page would explode.
    if (player.isNew && wasNewPlayerRecentlyShown(player.id)) {
        console.debug(`[NOTIFY] Skipping new player ${player.name}, already shown.`);
        return;
    }

    // Throttle notifications
    if (notificationStack.length >= MAX_NOTIFICATIONS) {
        const oldestNotification = notificationStack.shift();
        oldestNotification.style.animation = 'notificationSlideOut 0.2s ease-in forwards';

        console.debug(`[NOTIFY] Throttling ${player.name}.`);

        setTimeout(() => {
            oldestNotification.remove();
            updateNotificationPositions();
        }, 200);

        return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastNotificationTime;

    if (timeSinceLast < NOTIFICATION_DELAY) {
        console.debug(`[NOTIFY] Throttling ${player.name}.`);
        await new Promise(resolve => setTimeout(resolve, NOTIFICATION_DELAY - timeSinceLast));
    }

    lastNotificationTime = Date.now();

    const lastRaidTime = player.absoluteLastTime;
    const currentData = playerNotificationData.get(player.id);

    if (currentData) {
        if (currentData.lastRaidTime === lastRaidTime &&
            (!player.isNew || currentData.isNewShown)) {
            console.debug(`[NOTIFY] Player ${player.name} already shown for this raid at ${lastRaidTime}.`);
            return;
        }
    }

    playerNotificationData.set(player.id, {
        lastRaidTime: lastRaidTime
    });

    // New player
    if (player.isNew && !player.banned) {
        console.debug(`[NOTIFY] Showing new player ${player.name}.`);
        await showNewPlayerWelcome(player);
        return;
    }

    // Ban notification
    if (player.banned && !isBanSoundPlaying) {
        console.debug(`[NOTIFY] Showing banned player ${player.name}.`);

        await showBanNotification(player);
        return;
    }

    // Regular raid notification
    const name = renderUsernameHTML(player, true);
    const streakContent = generateKillstreakContent({
        player,
        kills: player.lastRaidKills,
        plRank: getRank(player.networkRaids, 2000, 32),
        isOnRaidStreak: false,
        shouldShowProfit: false,
        useUpgraded: player?.special_props?.includes("upgradedKillstreak") && getRank(player.networkRaids, 2000, 32).level >= 1
    });

    // Handle raid streak
    let raidStreakContent = null;
    if (player.currentWinstreak > 5 && !player.banned) {
        const pmcRaid = new Audio('media/sounds/raidstreak/5raidstreak.wav');
        pmcRaid.volume = 0.05;
        pmcRaid.play();
        raidStreakContent = {
            type: 'raid-streak',
            text: `ON A ${player.currentWinstreak} RAID WIN STREAK!`
        };
    }

    // Handle profit
    let profitContent = null;
    if (player?.lastProfitGain && !player.isCasual) {
        const profit = Number(player.lastProfitGain);
        if (profit >= 2500000) {
            playSound('media/sounds/earnings/profit.mp3', 0.2);
            profitContent = {
                type: 'profit',
                text: `${player.name} just got out with ${profit.toLocaleString()} ₽!`
            };
        } else if (!player.lastRaidSurvived && profit <= -1500000) {
            playSound('media/sounds/earnings/profit_lost.mp3', 0.05);
            profitContent = {
                type: 'loss',
                text: `${player.name} just lost ${Math.abs(profit).toLocaleString()} ₽!`
            };
        }
    }

    // Play raid sounds
    playRaidSound(player);

    // Create notification
    const notification = createNotificationElement(player, name, {
        streakContent,
        raidStreakContent,
        profitContent
    });

    const container = document.getElementById('notifications-container-r') || createNotificationsContainer();
    container.appendChild(notification);
    notificationStack.push(notification);
    updateNotificationPositions();

    scheduleNotificationRemoval(notification, player.name);
}

function createNotificationElement(player, name, contents) {
    const raidStatus = getRaidStatusNotify(player);
    const notification = document.createElement('div');

    notification.className = `notification-r notification--${raidStatus.type}`;

    const killedBy = !player.lastRaidSurvived && !player.discFromRaid && player.agressorName
        ? `
        <span class="notification__dot">•</span>
        <span class="notification__killed-by">Killed by ${escapeHtml(player.agressorName)}</span>`
        : '';

    if (player.lastRaidMap) {
        notification.style.setProperty(
            '--map-bg',
            `url('media/leaderboard_icons/maps/${player.lastRaidMap}.png')`
        );
    }

    const highlights = [contents.streakContent, contents.raidStreakContent, contents.profitContent]
        .filter(Boolean)
        .map(content => `
            <div class="notification__highlight notification__highlight--${content.type}">
                ${content.text}
            </div>
        `).join('');

    notification.innerHTML = `
        <div class="notification__content">
            <div class="notification__header">
                <div class="notification__avatar-wrapper">
                    <img src="${player.profilePicture}" 
                         alt="${escapeHtml(player.name)}" 
                         class="notification__avatar"
                         onerror="this.src='media/default_avatar.png';"
                         onclick="openProfile('${player.id}')">
                </div>
                <div class="notification__info">
                    <div class="notification__name">${name}</div>
                    <div class="notification__meta">
                        ${player.isCasual ? 'Casual Mode' : `Rank #${player.rank}`}
                        <span class="notification__dot">•</span>
                        ${formatLastPlayedRaid(player.absoluteLastTime)}
                    </div>
                </div>
            </div>

            <div class="notification__raid-info">
                <div class="notification__status notification__status--${raidStatus.type}">
                    ${createIcon(raidStatus.icon, raidStatus.isSpin)}
                    <span>${raidStatus.text}</span>
                    ${raidStatus.type === 'transit' ? `
                        <span class="notification__transit-details">
                            (${player.lastRaidMap} <i class="fa-solid fa-arrow-right-from-bracket"></i> ${escapeHtml(player.lastRaidTransitionTo || 'Unknown')})
                        </span>
                    ` : ''}
                </div>

                <div class="notification__details">
                    <span class="notification__map">${player.lastRaidMap || 'Unknown'}</span>
                    <span class="notification__dot">•</span>
                    <span>${player.lastRaidAs || 'N/A'}</span>
                    ${killedBy}
                    <span class="notification__dot">•</span>
                    <span class="notification__exp">${player.lastRaidEXP} EXP</span>
                </div>

                ${highlights}
            </div>
        </div>
    `;

    return notification;
}

async function showBanNotification(player) {
    isBanSoundPlaying = true;

    const introMusic = new Audio('media/sounds/ban/ban_reveal.mp3');
    introMusic.volume = 0.10;
    await new Promise((resolve) => {
        introMusic.addEventListener('ended', resolve, { once: true });
        introMusic.play();
    });

    const mainBanSound = new Audio('media/sounds/ban/ban.mp3');
    mainBanSound.volume = 0.15;
    mainBanSound.play();
    mainBanSound.addEventListener('ended', () => {
        isBanSoundPlaying = false;
    });

    setBanNotificationCookie(player.id);

    const notification = document.createElement('div');
    notification.className = 'notification-r notification--banned';

    const banDate = new Date(player.banTime * 1000);
    const formattedBanDate = formatDate(banDate);
    const formattedBanExpires = player.permBanned ? 'Permanent' : formatDate(new Date(player.banExpires * 1000));

    notification.innerHTML = `
        <div class="notification__content">
            <div class="notification__header">
                <div class="notification__avatar-wrapper">
                    <img src="media/default_avatar.png" 
                         alt="${escapeHtml(player.name)}" 
                         class="notification__avatar notification__avatar--banned">
                </div>
                <div class="notification__info">
                    <div class="notification__name notification__name--banned">
                        ${player.teamTag ? `[${escapeHtml(player.teamTag)}] ` : ''}${escapeHtml(player.name)}
                    </div>
                    <div class="notification__meta notification__meta--banned">
                        Banned from Leaderboard
                    </div>
                </div>
            </div>

            <div class="notification__raid-info">
                <div class="notification__status notification__status--banned">
                    ${createIcon('fa-gavel')}
                    <span>${player.permBanned ? 'PERMANENTLY BANNED' : 'BANNED'}</span>
                </div>

                <div class="notification__ban-details">
                    <div class="notification__ban-reason">
                        <span class="notification__ban-label">Reason:</span>
                        ${escapeHtml(player.banReason)}
                    </div>
                    <div class="notification__ban-meta">
                        <div>
                            <span class="notification__ban-label">Banned at:</span>
                            ${formattedBanDate}
                        </div>
                        <div>
                            <span class="notification__ban-label">Until:</span>
                            ${formattedBanExpires}
                        </div>
                        <div>
                            <span class="notification__ban-label">By:</span>
                            ${escapeHtml(player.tookAction)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('notifications-container-r') || createNotificationsContainer();
    container.appendChild(notification);
    notificationStack.push(notification);
    updateNotificationPositions();

    setTimeout(() => {
        notification.classList.add('notification--removing');
    }, 27000);

    setTimeout(() => {
        notification.remove();
        const index = notificationStack.indexOf(notification);
        if (index > -1) notificationStack.splice(index, 1);
        updateNotificationPositions();
    }, 27300);
}

async function showNewPlayerWelcome(player) {
    if (processedNewPlayers.has(player.id)) {
        console.debug(`[NOTIFY] New player ${player.name} already processed in this session`);
        return;
    }

    processedNewPlayers.add(player.id);

    try {
        const firstBloodSound = new Audio('media/sounds/killstreak/firstblood.wav');
        firstBloodSound.volume = 0.08;
        await firstBloodSound.play();
    } catch (error) {
        console.log('First blood sound play failed:', error);
    }

    setNewPlayerCookie(player.id);
    playerNotificationData.set(player.id, {
        lastRaidTime: player.absoluteLastTime,
        isNewShown: true
    });

    const notification = document.createElement('div');
    notification.className = 'notification-r notification--new-player';

    notification.innerHTML = `
        <div class="notification__content">
            <div class="notification__header">
                <div class="notification__avatar-wrapper">
                    <img src="${player.profilePicture}" 
                         alt="${escapeHtml(player.name)}" 
                         class="notification__avatar notification__avatar--new"
                         onerror="this.src='media/default_avatar.png';">
                    <div class="notification__new-badge">NEW</div>
                </div>
                <div class="notification__info">
                    <div class="notification__name notification__name--new">
                        Welcome to SPT Leaderboard!
                    </div>
                    <div class="notification__meta notification__meta--new">
                        ${escapeHtml(player.name)} just joined SPTLB
                    </div>
                </div>
            </div>

            <div class="notification__raid-info">
                <div class="notification__new-stats">
                    <div class="notification__new-stat">
                        ${createIcon('fa-arrow-trend-up')}
                        <span>Joined at <strong>Rank #${player.rank}</strong></span>
                    </div>
                    <div class="notification__new-stat">
                        ${createIcon('fa-clock')}
                        <span>${player.networkRaids < 2 ? `First raid recorded` : `${player.networkRaids}th raid on record`}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('notifications-container-r') || createNotificationsContainer();
    container.appendChild(notification);
    notificationStack.push(notification);
    updateNotificationPositions();

    setTimeout(() => {
        notification.classList.add('notification--removing');
    }, 27000);

    setTimeout(() => {
        notification.remove();
        const index = notificationStack.indexOf(notification);
        if (index > -1) notificationStack.splice(index, 1);
        updateNotificationPositions();
    }, 27300);
}

function scheduleNotificationRemoval(notification, playerName) {
    setTimeout(() => {
        notification.classList.add('notification--removing');
        console.debug(`[NOTIFY] Notification fade started for ${playerName}`);
    }, 12000);

    setTimeout(() => {
        notification.remove();
        const index = notificationStack.indexOf(notification);
        if (index > -1) notificationStack.splice(index, 1);
        updateNotificationPositions();
        console.debug(`[NOTIFY] Notification removed for ${playerName}`);
    }, 12300);
}

function updateNotificationPositions() {
    const gap = 12;
    let topOffset = 0;

    notificationStack.forEach((notif, index) => {
        notif.style.top = `${topOffset}px`;
        notif.style.right = '0';
        notif.style.zIndex = 1000 - index;
        topOffset += notif.offsetHeight + gap;
    });
}

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.id = 'notifications-container-r';
    document.body.appendChild(container);
    console.debug(`[NOTIFY] Notification container created.`);
    return container;
}

function checkRecentPlayers(leaderboardData) {
    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = currentTime - 300;
    const twoHoursAgo = currentTime - 7200;

    const sortedPlayers = [...leaderboardData].sort((a, b) =>
        (b.absoluteLastTime || 0) - (a.absoluteLastTime || 0));

    let shownCount = 0;
    const MAX_INITIAL_NOTIFICATIONS = 3;

    for (const player of sortedPlayers) {
        if (shownCount >= MAX_INITIAL_NOTIFICATIONS) break;

        if (!player.absoluteLastTime) continue;

        if ((player.absoluteLastTime > fiveMinutesAgo) ||
            (player.banned && player.banTime > twoHoursAgo)) {

            shownCount++;
            setTimeout(() => showPlayerNotification(player), shownCount * NOTIFICATION_DELAY);
        }
    }
}

function setBanNotificationCookie(playerId) {
    const now = new Date();
    now.setTime(now.getTime() + (61 * 60 * 1000));
    document.cookie = `banNotify_${playerId}=1; expires=${now.toUTCString()}; path=/`;
}

function wasNewPlayerRecentlyShown(playerId) {
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const cookieValue = cookies.find(row => row.startsWith(`newPlayer_${playerId}=`));
    return !!cookieValue;
}

function wasBanRecentlyShown(playerId) {
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const cookieValue = cookies.find(row => row.startsWith(`banNotify_${playerId}=`));
    return !!cookieValue;
}

function setNewPlayerCookie(playerId) {
    const now = new Date();
    now.setTime(now.getTime() + (24 * 60 * 60 * 1000));
    document.cookie = `newPlayer_${playerId}=1; expires=${now.toUTCString()}; path=/; SameSite=Lax; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
}

function playSound(src, volume = 0.1) {
    try {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
        console.log('Could not play sound:', e);
    }
}

function playRaidSound(player) {
    if (player.banned) return;

    const soundMap = {
        'PMC_true': { src: 'media/sounds/pmc-raid-run.ogg', volume: 0.05 },
        'PMC_false': { src: 'media/sounds/pmc-raid-died.wav', volume: 0.05 },
        'SCAV_true': { src: 'media/sounds/scav-raid-run.mp3', volume: 0.2 },
        'SCAV_false': { src: 'media/sounds/scav-raid-died.wav', volume: 0.15 }
    };

    const key = `${player.lastRaidAs}_${player.lastRaidSurvived}`;
    const sound = soundMap[key];
    if (sound) playSound(sound.src, sound.volume);
}

function getRaidStatusNotify(player) {
    console.debug(`[NOTIFY] Getting raid status for ${player.name}:`, {
        banned: player.banned,
        lastRaidRanThrough: player.lastRaidRanThrough,
        discFromRaid: player.discFromRaid,
        isTransition: player.isTransition,
        lastRaidSurvived: player.lastRaidSurvived
    });

    if (player.banned) return { type: 'banned', icon: 'fa-gavel', text: 'BANNED' };
    if (player.lastRaidRanThrough) return { type: 'runner', icon: 'fa-person-walking', text: 'Run Through' };
    if (player.discFromRaid) return { type: 'disconnected', icon: 'fa-arrow-right-from-bracket', text: 'Disconnected' };
    if (player.isTransition) return { type: 'transit', icon: 'fa-arrows-rotate', text: 'IN Transit', isSpin: true };
    if (player.lastRaidSurvived) return { type: 'survived', icon: 'fa-shield-halved', text: 'Survived' };

    return { type: 'died', icon: 'fa-skull-crossbones', text: 'Killed in Action' };
}

function createIcon(iconClass, isSpin = false) {
    return `<i class="fa-solid ${iconClass} ${isSpin ? 'fa-spin' : ''}"></i>`;
}

function generateKillstreakContent(options) {
    const { player, kills, plRank, isOnRaidStreak, shouldShowProfit, useUpgraded } = options;

    const result = {
        text: '',
        type: 'kill-streak',
        soundFile: ''
    };

    if (isOnRaidStreak || shouldShowProfit) return null;
    if (player.banned || !player.lastRaidSurvived || kills <= 1) return null;

    if (useUpgraded) {
        const upgradedKillstreakHandler = new UpgradedKillstreakHandler();
        result.text = upgradedKillstreakHandler.generateKillstreakText(player, kills);
        result.soundFile = upgradedKillstreakHandler.getKillstreakSoundFile(kills);
    } else {
        const standardHandler = new StandardKillstreakHandler();
        result.text = standardHandler.generateKillstreakText(player, kills);
        result.soundFile = standardHandler.getKillstreakSoundFile(kills);
    }

    if (result.soundFile) {
        const killStreak = new Audio(`media/sounds/killstreak/${result.soundFile}`);
        killStreak.volume = 0.06;
        killStreak.play().catch(e => console.error('Audio play failed:', e));
    }

    return result;
}

class StandardKillstreakHandler {
    generateKillstreakText(player, kills) {
        switch (true) {
            case kills === 2: return `${player.name} just made double kill`;
            case kills > 2 && kills <= 4: return `${player.name} is on killing spree`;
            case kills >= 5 && kills < 8: return `${player.name} IS WICKED WITH ${kills} KILLS!`;
            case kills >= 8 && kills < 10: return `${player.name} IS UNSTOPPABLE! — ${kills} KILLS!`;
            case kills >= 10 && kills < 12: return `${player.name} IS A TARKOV DEMON! — ${kills} KILLS!`;
            case kills >= 13 && kills < 14: return `${player.name} IS GODLIKE! — ${kills} KILLS!`;
            case kills > 15: return `SOMEONE STOP THIS MACHINE! — ${kills} KILLS IN ONE RAID!`;
            default: return '';
        }
    }

    getKillstreakSoundFile(kills) {
        switch (true) {
            case kills === 2: return '2.wav';
            case kills > 2 && kills <= 4: return '3.wav';
            case kills >= 5 && kills < 8: return '6.wav';
            case kills >= 8 && kills < 10: return '8.wav';
            case kills >= 10 && kills < 12: return '10.wav';
            case kills >= 13 && kills < 14: return '12.wav';
            case kills >= 15: return '15.wav';
            default: return '';
        }
    }
}

class UpgradedKillstreakHandler {
    generateKillstreakText(player, kills) {
        switch (true) {
            case kills === 2: return `${player.name} just made double kill`;
            case kills === 3 || kills < 6: return `${player.name} is on a <font color='#00FF40'><b>killing spree</b></font>`;
            case kills === 6: return `${player.name} is <font color='#808000'><b>WICKED SICK</b></font>`;
            case kills === 7: return `${player.name} is <font color='#00e1ff'><b>UNSTOPPABLE</b></font>`;
            case kills === 8: return `${player.name} IS GODLIKE! — ${kills} KILLS!`;
            case kills >= 9 && kills <= 10: return `SOMEONE STOP ${player.name} with ${kills} kills!`;
            case kills >= 11 && kills <= 12: return `${player.name} is a Legend with ${kills} kills!`;
            case kills === 13: return `${player.name} is BEYOND <font color='#ff9900'><b>GODLIKE</b> with ${kills} kills!!`;
            case kills > 13: return `${player.name} is on a <span class="rampage-text">RAMPAGE</span> with ${kills} kills!!!`;
            default: return '';
        }
    }

    getKillstreakSoundFile(kills) {
        switch (true) {
            case kills === 2: return '2.wav';
            case kills === 3 || kills < 6: return '3.wav';
            case kills === 6: return '6.wav';
            case kills === 7: return '8.wav';
            case kills === 8: return '10.wav';
            case kills >= 9 && kills <= 10: return '10.wav';
            case kills >= 11 && kills <= 12: return '12.wav';
            case kills === 13: return '15.wav';
            case kills > 13: return 'rampage.mp3';
            default: return '';
        }
    }
}