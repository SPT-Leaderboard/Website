//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  
let achievementsData = {};
let playerAchievements = {};
let totalPlayers = 0;
let achievementStats = {};
let isDataLoaded = false;

async function loadAchievementsData() {
    try {
        const [achievementsResponse, achievementsNewResponse, playersResponse] = await Promise.all([
            fetch('achievements/js/compiledAchData.json'),
            fetch('achievements/js/compiledAchDataNew.json'),
            fetch(`${achievementsPath}`)
        ]);

        if (!achievementsResponse.ok || !playersResponse.ok) {
            throw new Error('Failed to load achievements data');
        }

        const [oldAchievements, newAchievements, playersData] = await Promise.all([
            achievementsResponse.json(),
            achievementsNewResponse.json(),
            playersResponse.json()
        ]);

        achievementsData = {
            achievementCompiled: {
                ...oldAchievements.achievementCompiled,
                ...newAchievements.achievementCompiled
            }
        };

        playerAchievements = playersData;
        totalPlayers = Object.keys(playersData.achievements).length;
        achievementStats = calculateAchievementStats();

        isDataLoaded = true;

        return {
            achievementsData,
            playerAchievements: playersData,
            totalPlayers,
            achievementStats
        };
    } catch (error) {
        console.error('Error loading achievements data:', error);
        throw error;
    }
}

function calculateAchievementStats() {
    const stats = {};

    // Проверяем, что данные есть
    if (!achievementsData.achievementCompiled || !playerAchievements.achievements) {
        console.warn('Data not loaded yet');
        return stats;
    }

    // Initialize stats
    for (const achievementId in achievementsData.achievementCompiled) {
        stats[achievementId] = {
            obtained: 0,
            percent: 0
        };
    }

    // Count how many players have each achievement
    for (const playerId in playerAchievements.achievements) {
        const playerAchData = playerAchievements.achievements[playerId][0];

        for (const achievementId in playerAchData) {
            if (stats.hasOwnProperty(achievementId)) {
                stats[achievementId].obtained++;
            }
        }
    }

    // Calculate percentage for each achievement
    for (const achievementId in stats) {
        stats[achievementId].percent = totalPlayers > 0
            ? (stats[achievementId].obtained / totalPlayers * 100).toFixed(2)
            : 0;
    }

    return stats;
}

function getAchievementPercentage(achievementId) {
    // Проверяем, что статистика рассчитана
    if (!achievementStats[achievementId]) {
        console.warn(`Achievement stats not found for: ${achievementId}`);
        return 0;
    }
    return achievementStats[achievementId].percent || 0;
}

async function ensureDataLoaded() {
    if (!isDataLoaded) {
        await loadAchievementsData();
    }
}

async function formatAchievement(achievementId, timestamp, achievementData) {
    await ensureDataLoaded();

    const achievement = achievementData.achievementCompiled[achievementId] || {};

    let imageUrl = 0;
    try {
        imageUrl = achievement.imageUrl?.slice(1) || "files/achievement/Standard_35_1.png";
    } catch (error) {
        imageUrl = "files/achievement/Standard_35_1.png";
    }

    const globalPercentage = getAchievementPercentage(achievementId);

    return {
        id: achievementId,
        timestamp: formatLastPlayedRaid(timestamp),
        imageUrl: imageUrl,
        rarity: achievement.rarity || "Common",
        description: achievement.description || "No description",
        name: achievement.name || "Unknown Achievement",
        globalPercentage: parseFloat(globalPercentage) || 0
    };
}

async function processPlayerAchievements(player, options = {}) {
    await ensureDataLoaded();

    const achievementData = await fetchAchievementData();

    if (options.renderAll) {
        const allAchievements = await getAllAchievements(player, achievementData);
        if (options.container) {
            options.container.innerHTML = renderAllAchievements(allAchievements);
        }
        return allAchievements;
    } else {
        const latestAchievement = await getLatestAchievement(player, achievementData);
        if (options.container) {
            options.container.innerHTML = renderSingleAchievement(latestAchievement);
        }
        return latestAchievement;
    }
}

async function formatAchievement(achievementId, timestamp, achievementData) {
    const achievement = achievementData.achievementCompiled[achievementId] || {};

    let imageUrl = 0;
    try {
        imageUrl = achievement.imageUrl?.slice(1) || "files/achievement/Standard_35_1.png";
    } catch (error) {
        imageUrl = "files/achievement/Standard_35_1.png";
    }

    const globalPercentage = await getAchievementPercentage(achievementId);

    return {
        id: achievementId,
        timestamp: formatLastPlayedRaid(timestamp),
        imageUrl: imageUrl,
        rarity: achievement.rarity || "Common",
        description: achievement.description || "No description",
        name: achievement.name || "Unknown Achievement",
        globalPercentage: globalPercentage || 0
    };
}

async function getLatestAchievement(player, achievementData) {
    if (!player.allAchievements || Object.keys(player.allAchievements).length === 0) {
        return {
            id: 0,
            timestamp: 0,
            imageUrl: "files/achievement/Standard_35_1.png",
            rarity: "Common",
            description: "Nothing here yet",
            name: "No achievements",
            globalPercentage: 0
        };
    }

    const [latestId, latestTimestamp] = Object.entries(player.allAchievements).reduce(
        (latest, [id, timestamp]) => timestamp > latest[1] ? [id, timestamp] : latest,
        ["", 0]
    );

    if (!latestId) {
        return {
            id: 0,
            timestamp: 0,
            imageUrl: "files/achievement/Standard_35_1.png",
            rarity: "Common",
            description: "Nothing here yet",
            name: "No achievements",
            globalPercentage: 0
        };
    }

    return await formatAchievement(latestId, latestTimestamp, achievementData);
}

async function getAllAchievements(player, achievementData) {
    if (!player.allAchievements || Object.keys(player.allAchievements).length === 0) {
        return [];
    }

    const achievementsPromises = Object.entries(player.allAchievements)
        .map(async ([id, timestamp]) => await formatAchievement(id, timestamp, achievementData));

    let achievements = await Promise.all(achievementsPromises);

    achievements.sort((a, b) => {
        const rarityCompare = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
        if (rarityCompare !== 0) return rarityCompare;

        return b.timestamp - a.timestamp;
    });

    return achievements;;
}

function renderSingleAchievement(achievement) {
    return `
            <div class="achievement-title ${achievement.rarity}">
                Latest Achievement
            </div>
            <div class="achievement-content">
                <div class="achievement-icon ${achievement.rarity}">
                    <img src="${achievement.imageUrl}" alt="Achievement Icon"/>
                    <div class="achievement-time">
                        ${achievement.timestamp || "N/A"}
                    </div>
                </div>
                <div class="achievement-info">
                    <div class="achievement-title ${achievement.rarity}">
                        ${achievement.name}
                    </div>
                    <div class="achievement-description">
                        ${achievement.description}
                    </div>
                    ${achievement.globalPercentage > 0 ?
            `<div class="achievement-percentage">${achievement.globalPercentage}% of players have this achievement</div>` :
            ``}
                </div>
            </div>
    `;
}

function renderAllAchievements(achievements) {
    return achievements.map(ach => `
        <div class="user-achievements profile-section">
            <div class="achievement-content">
                <div class="achievement-icon ${ach.rarity}">
                    <img src="${ach.imageUrl}" alt="Achievement Icon"/>
                    <div class="achievement-time">
                        ${ach.timestamp || "N/A"}
                    </div>
                </div>
                <div class="achievement-info">
                    <div class="achievement-title ${ach.rarity}">
                        ${ach.name}
                    </div>
                    <div class="achievement-description">
                        ${ach.description}
                    </div>
                    ${ach.globalPercentage > 0 ?
                        `<div class="achievement-percentage ${ach.rarity}">${ach.globalPercentage}% of players have this achievement</div>` : ``
                    }
                </div>
            </div>
        </div>
    `).join('');
}

async function processPlayerAchievements(player, options = {}) {
    const achievementData = await fetchAchievementData();

    if (options.renderAll) {
        const allAchievements = await getAllAchievements(player, achievementData);

        if (options.container) {
            options.container.innerHTML = renderAllAchievements(allAchievements);
        }

        return allAchievements;
    } else {
        const latestAchievement = await getLatestAchievement(player, achievementData);

        if (options.container) {
            options.container.innerHTML = renderSingleAchievement(latestAchievement);
        }

        return latestAchievement;
    }
}