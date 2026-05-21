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

// Sound throttling
const banSoundQueue = {
    isPlaying: false,
    queue: [],

    async playBanSounds() {
        if (this.isPlaying) {
            return new Promise((resolve) => {
                this.queue.push(resolve);
            });
        }

        this.isPlaying = true;

        try {
            const introMusic = new Audio('media/sounds/ban/ban_reveal.mp3');
            introMusic.volume = 0.10;

            await new Promise((resolve, reject) => {
                introMusic.onended = resolve;
                introMusic.onerror = reject;
                introMusic.play().catch(reject);
            });

            const mainBanSound = new Audio('media/sounds/ban/ban.mp3');
            mainBanSound.volume = 0.15;

            await new Promise((resolve, reject) => {
                mainBanSound.onended = resolve;
                mainBanSound.onerror = reject;
                mainBanSound.play().catch(reject);
            });
        } catch (e) {
            console.error('Ban sound playback error:', e);
        }

        this.isPlaying = false;

        // Next in queue
        if (this.queue.length > 0) {
            const nextResolve = this.queue.shift();

            nextResolve();
            this.playBanSounds();
        }
    },
};

const recentBanPlays = new Map();

function shouldPlayBanSound(playerId) {
    const now = Date.now();
    const lastPlay = recentBanPlays.get(playerId);

    if (lastPlay && (now - lastPlay) < 30000) {
        // console.debug(`[BAN SOUND] Throttling ban sound for player ${playerId} - played ${Math.floor((now - lastPlay) / 1000)}s ago`);
        return false;
    }

    recentBanPlays.set(playerId, now);

    setTimeout(() => {
        recentBanPlays.delete(playerId);
    }, 60000);

    return true;
}

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
        oldestNotification.remove();
    }

    const now = Date.now();
    const timeSinceLast = now - lastNotificationTime;

    if (timeSinceLast < NOTIFICATION_DELAY) {
        await new Promise(resolve => setTimeout(resolve, NOTIFICATION_DELAY - timeSinceLast));
    }

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
        await showNewPlayerWelcome(player);
        return;
    }

    const name = renderUsernameHTML(player, true);

    // Raidstreak/Killstreaks
    let isOnRaidStreak = false;
    let streakNotificationKillText = '';

    if (player.currentWinstreak > 5 && !player.banned) {
        isOnRaidStreak = true;
        const pmcRaid = new Audio('media/sounds/raidstreak/5raidstreak.wav');
        pmcRaid.volume = 0.05;
        pmcRaid.play();

        streakNotificationKillText = `ON A ${player.currentWinstreak} RAID WIN STREAK!`;
    }

    // Profit
    let shouldShowProfit = false;
    let hasLostProfit = false;
    let profitText = '';

    if (player?.lastProfitGain !== undefined && player?.lastProfitGain !== null && !player.isCasual) {
        const profit = Number(player.lastProfitGain);

        // +2.5MIL
        if (profit >= 2500000) {
            try {
                const profitRaid = new Audio('media/sounds/earnings/profit.mp3');
                profitRaid.volume = 0.20;
                profitRaid.play();
            } catch (e) {
                console.log('Could not play profit sound:', e);
            }

            profitText = `${player.name} just got out with ${profit.toLocaleString()} ₽!`;
            shouldShowProfit = true;
            console.log(`Showing profit for ${player.name}: +${profit} ₽`);
        }
        // -2MIL
        else if (!player.lastRaidSurvived && profit <= -2000000) {
            try {
                const profitRaid = new Audio('media/sounds/earnings/profit_lost.mp3');
                profitRaid.volume = 0.05;
                profitRaid.play();
            } catch (e) {
                console.log('Could not play sound:', e);
            }

            profitText = `${player.name} just lost ${Math.abs(profit).toLocaleString()} ₽!`;
            hasLostProfit = true;
            shouldShowProfit = true;
            console.log(`Showing loss for ${player.name}: ${profit} ₽`);
        }
    }

    // Killstreak
    const kills = player.lastRaidKills;
    if (!isOnRaidStreak && !shouldShowProfit && player.lastRaidSurvived && player.lastRaidKills > 1 && !player.banned) {
        let killStreak;
        let soundFile = '';
        let notificationText;

        switch (true) {
            case kills === 2:
                notificationText = `${player.name} just made double kill!`;
                soundFile = '2.wav';
                break;
            case kills === 3:
                notificationText = `${player.name} is on triple kill!`;
                soundFile = '3.wav';
                break;
            case kills >= 6 && kills < 8:
                notificationText = `${player.name} IS WICKED WITH ${kills} KILLS!`;
                soundFile = '6.wav';
                break;
            case kills >= 8 && kills < 10:
                notificationText = `${player.name} IS UNSTOPPABLE!<br>${kills} KILLS!`;
                soundFile = '8.wav';
                break;
            case kills >= 10 && kills < 12:
                notificationText = `${player.name} IS A TARKOV DEMON!<br>${kills} KILLS!`;
                soundFile = '10.wav';
                break;
            case kills >= 12 && kills < 15:
                notificationText = `${player.name} IS GODLIKE!<br>${kills} KILLS!`;
                soundFile = '12.wav';
                break;
            case kills >= 15:
                notificationText = `SOMEONE STOP THIS MACHINE!<br>${kills} KILLS IN ONE RAID!`;
                soundFile = '15.wav';
                break;
            default:
                return;
        }

        streakNotificationKillText = notificationText;
        if (soundFile) {
            killStreak = new Audio(`media/sounds/killstreak/${soundFile}`);
            killStreak.volume = 0.04;
            killStreak.play().then().catch(e => console.error('Audio play failed:', e));
        }
    }

    // Sounds
    if (!player.banned) {
        if (player.lastRaidAs === "PMC" && player.lastRaidSurvived) {
            const pmcRaid = new Audio('media/sounds/pmc-raid-run.ogg');
            pmcRaid.volume = 0.05;
            pmcRaid.play();
        } else if (player.lastRaidAs === "PMC" && !player.lastRaidSurvived) {
            const pmcRaidDied = new Audio('media/sounds/pmc-raid-died.wav');
            pmcRaidDied.volume = 0.05;
            pmcRaidDied.play();
        } else if (player.lastRaidAs === "SCAV" && player.lastRaidSurvived) {
            const pmcRaid = new Audio('media/sounds/scav-raid-run.mp3');
            pmcRaid.volume = 0.20;
            pmcRaid.play();
        } else if (player.lastRaidAs === "SCAV" && !player.lastRaidSurvived) {
            const pmcRaidDied = new Audio('media/sounds/scav-raid-died.wav');
            pmcRaidDied.volume = 0.15;
            pmcRaidDied.play();
        }
    }

    // Create notification element
    const notification = document.createElement('div');

    // Set backgrounds based on the game/ban
    if (player.banned) {
        notification.className = `player-notification-r died-bg border-died`;
    } else {
        notification.className = `player-notification-r ${player.discFromRaid ? 'disconnected-bg border-died' : player.isTransition ? 'transit-bg border-transit' : player.lastRaidSurvived ? 'survived-bg border-survived' : 'died-bg border-died'}`;
    }

    if (player.banned) {
        if (shouldPlayBanSound(player.id)) {
            banSoundQueue.playBanSounds().catch(e => console.error('sound queue error:', e));
        } else {
            console.debug(`[SOUND] sound throttled for ${player.name} (${player.id})`);
        }

        createBanNotification(player);
        setBanNotificationCookie(player.id);

        return;
    } else {
        notification.innerHTML = `
        <div class="notification-content-r">
            <div class="notification-header-r">
                <img src="${player.profilePicture}" alt="${escapeHtml(player.name)}'s avatar" onclick="openProfile(${player.id})" class="notification-avatar-r" onerror="this.src='media/default_avatar.png';">
                <div class="notification-text-r">
                    ${name}
                    <span class="notification-info-r">
                        Finished raid • ${formatLastPlayedRaid(player.absoluteLastTime)} • ${!player.isCasual ? `<span>Rank #${player.rank}</span>` : `Casual Mode`}
                    </span>
                </div>
            </div>
            <div class="raid-overview-notify">
                <span class="raid-result-r ${player.lastRaidRanThrough ? 'run-through' : player.discFromRaid ? 'disconnected' : player.isTransition ? 'transit' : player.lastRaidSurvived ? 'survived' : 'died'}">
                    ${player.lastRaidRanThrough ? `<i class="fa-solid fa-person-walking"></i> Runner` : player.discFromRaid ? `<i class="fa-solid fa-arrow-right-from-bracket"></i> Left` : player.isTransition ? `<i class="fa-solid fa-arrows-rotate fa-spin"></i>  Transit (${player.lastRaidMap}
                    <i class='fa-solid fa-person-walking-arrow-right'></i>  ${escapeHtml(player.lastRaidTransitionTo || 'Unknown')})` : player.lastRaidSurvived ? `<i class="fa-solid fa-person-walking"></i> Survived` : `
                    <i class="fa-solid fa-skull-crossbones"></i> Killed in Action`}
                </span>
                <span class="raid-meta-notify">
                    ${player.lastRaidMap || 'Unknown'} • ${player.lastRaidAs || 'N/A'} ${player.lastRaidSurvived ? `` : `• Killed by ${escapeHtml(player.agressorName)}`} • ${player.lastRaidEXP} EXP
                </span>
                ${(kills > 5 && !shouldShowProfit) ? `
                    <span class="notification-last-raid-streak">
                        ${streakNotificationKillText}
                    </span>
                    ` : `
                    <span class="notification-last-raid-streak-common">
                        ${streakNotificationKillText}
                    </span>
                    `}
                ${shouldShowProfit ? `
                    <span class="notification-last-raid-profit ${hasLostProfit ? `last-raid-lost-profit` : ``}">
                        ${profitText}
                    </span>
                    ` : ``}
            </div>
        </div>
    `;
    }

    const container = document.getElementById('notifications-container-r') || createNotificationsContainer();
    container.appendChild(notification);

    notificationStack.push(notification);
    updateNotificationPositions();

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s forwards';
        console.debug(`[NOTIFY] Notification fade started for ${player.name}`);
    }, 12000);

    setTimeout(() => {
        notification.remove();
        const index = notificationStack.indexOf(notification);
        if (index > -1) {
            notificationStack.splice(index, 1);
        }
        updateNotificationPositions();
        console.debug(`[NOTIFY] Notification removed for ${player.name}`);
    }, 15000);
}

function updateNotificationPositions() {
    const offset = 10;
    let topPosition = 100;

    notificationStack.forEach((notif, index) => {
        notif.style.top = `${topPosition}px`;
        notif.style.right = '10px';
        notif.style.zIndex = 1000 + index;
        topPosition += notif.offsetHeight + offset;
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

    // Sort notifications by the newest ones first
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
    now.setTime(now.getTime() + (61 * 60 * 1000)); // 61 mins
    document.cookie = `banNotify_${playerId}=1; expires=${now.toUTCString()}; path=/`;
}

function createBanNotification(player) {
    const notification = document.createElement('div');
    notification.className = `player-notification-r died-bg border-died`;

    const banDate = new Date(player.banTime * 1000);
    let bannedUntil = new Date(player.banExpires * 1000);

    const formattedBanDate = formatDate(banDate);
    const formattedBanExpires = player.permBanned ? 'Permanent' : formatDate(bannedUntil);

    notification.innerHTML = `
        <div class="notification-content-r">
            <div class="notification-header-r">
                <img src="media/default_avatar.png" alt="${escapeHtml(player.name)}'s avatar" class="notification-avatar-r">
                <div class="notification-text">
                    <span class="notification-name-r">
                        ${player.teamTag ? `[${escapeHtml(player.teamTag)}]` : ``} ${escapeHtml(player.name)}
                    </span>
                </div>
            </div>
            <div class="raid-overview-notify">
                <span class="notification-ban">
                    Was ${player.permBanned ? `permanently` : ``} banned from Leaderboard.
                </span>
                <span class="ban-text">
                    Reason: ${escapeHtml(player.banReason)}<br>
                    Banned at: ${formattedBanDate}<br>
                    Banned until: ${formattedBanExpires}
                </span>
                <span class="ban-issued">
                    Banned by ${escapeHtml(player.tookAction)}
                </span>
            </div>
        </div>
    `;

    const container = document.getElementById('notifications-container-r') || createNotificationsContainer();
    container.appendChild(notification);
    notificationStack.push(notification);
    updateNotificationPositions();

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s forwards';
    }, 27000);

    setTimeout(() => {
        notification.remove();
        const index = notificationStack.indexOf(notification);
        if (index > -1) {
            notificationStack.splice(index, 1);
        }
        updateNotificationPositions();
    }, 30000);
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
    notification.className = `player-notification-r`;

    notification.innerHTML = `
        <div class="notification-content-r">
            <div class="notification-header-r">
                <div class="new-player-avatar-wrapper">
                    <img src="${player.profilePicture}" alt="${escapeHtml(player.name)}'s avatar" class="notification-avatar-r new-player-avatar" onerror="this.src='media/default_avatar.png';" />
                    <div class="new-player-badge">NEW</div>
                </div>
                <div class="notification-text">
                    <span class="notification-name-r new-player-name">
                        Welcome to SPT Leaderboard!
                    </span>
                    <span class="notification-info-r new-player-subtitle">
                        ${escapeHtml(player.name)} just joined SPTLB
                    </span>
                </div>
            </div>
            <div class="raid-overview-notify">
                <div class="new-player-stats">
                    <span class="new-player-stat">
                        <i class="fa-solid fa-arrow-trend-up"></i>
                        Joined us at #${player.rank} rank
                    </span>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('notifications-container-r') || createNotificationsContainer();
    container.appendChild(notification);
    notificationStack.push(notification);
    updateNotificationPositions();

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s forwards';
    }, 27000);

    setTimeout(() => {
        notification.remove();
        const index = notificationStack.indexOf(notification);
        if (index > -1) {
            notificationStack.splice(index, 1);
        }
        updateNotificationPositions();
    }, 30000);
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