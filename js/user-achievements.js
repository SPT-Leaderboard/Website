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
        const [newAchievements, seAchievements, playersData] = await Promise.all([
            apiFetch(`${ApiPaths.achievementsDataPath}`),
            apiFetch(`${ApiPaths.achievementsCustomDataPath}`),
            apiFetch(`${ApiPaths.achievementsPath}`)
        ]);

        if (!newAchievements || !playersData) {
            console.error('Failed to load achievements data');
        }

        achievementsData = {
            achievementCompiled: {
                ...(newAchievements?.achievementCompiled || {}),
                ...(seAchievements?.achievementCompiled || {})
            }
        };

        playerAchievements = playersData || {};
        totalPlayers = Object.keys(playerAchievements.achievements || {}).length;
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
        return {
            achievementsData: { achievementCompiled: {} },
            playerAchievements: { achievements: {} },
            totalPlayers: 0,
            achievementStats: {}
        };
    }
}

function calculateAchievementStats() {
    const stats = {};

    if (!achievementsData?.achievementCompiled || !playerAchievements?.achievements) {
        console.warn('Data not loaded yet');
        return stats;
    }

    try {
        // Initialize stats
        for (const achievementId in achievementsData.achievementCompiled) {
            stats[achievementId] = {
                obtained: 0,
                percent: 0
            };
        }

        // Count how many players have each achievement
        for (const playerId in playerAchievements.achievements) {
            const playerAchData = playerAchievements.achievements[playerId]?.[0] || {};

            for (const achievementId in playerAchData) {
                if (stats.hasOwnProperty(achievementId)) {
                    stats[achievementId].obtained++;
                }
            }
        }

        // Calculate percentage for each achievement
        for (const achievementId in stats) {
            stats[achievementId].percent = totalPlayers > 0
                ? parseFloat((stats[achievementId].obtained / totalPlayers * 100).toFixed(2))
                : 0;
        }
    } catch (error) {
        console.error('Error calculating achievement stats:', error);
    }

    return stats;
}

function getAchievementPercentage(achievementId) {
    if (!achievementStats[achievementId]) {
        console.warn(`Achievement stats not found for: ${achievementId}`);
        return 0;
    }

    return parseFloat(achievementStats[achievementId].percent) || 0;
}

async function ensureDataLoaded() {
    if (!isDataLoaded) {
        await loadAchievementsData();
    }
}

async function formatAchievement(achievementId, timestamp, achievementData) {
    try {
        await ensureDataLoaded();

        const achievement = achievementData?.achievementCompiled?.[achievementId] || {};

        let imageUrl = await loadAchievementImage(achievement, achievementId);

        const globalPercentage = getAchievementPercentage(achievementId);

        return {
            id: achievementId || "0",
            timestamp: formatLastPlayedRaid(timestamp) || "Unknown",
            imageUrl: imageUrl,
            rarity: achievement.rarity || "Common",
            description: achievement.description || "No description available",
            name: achievement.name || "Unknown Achievement",
            globalPercentage: parseFloat(globalPercentage) || 0
        };
    } catch (error) {
        console.error('Error formatting achievement:', error);
    }
}

async function processPlayerAchievements(player, options = {}) {
    try {
        await ensureDataLoaded();

        const achievementData = await loadAchievementsData();

        if (options.renderAll) {
            const allAchievements = await getAllAchievements(player, achievementData.achievementsData);
            if (options.container) {
                options.container.innerHTML = await renderAllAchievements(allAchievements);
            }
            return allAchievements;
        } else {
            const latestAchievement = await getLatestAchievement(player, achievementData.achievementsData);
            if (options.container) {
                options.container.innerHTML = await renderSingleAchievement(latestAchievement);
            }
            return latestAchievement;
        }
    } catch (error) {
        console.error('Error processing player achievements:', error);
        const errorAchievement = {
            id: "0",
            timestamp: "Error",
            imageUrl: "media/player-achievements/Standard_35_1.png",
            rarity: "Common",
            description: "Failed to load achievements",
            name: "Error",
            globalPercentage: 0
        };

        if (options.container) {
            options.container.innerHTML = options.renderAll
                ? await renderAllAchievements([])
                : await renderSingleAchievement(errorAchievement);
        }

        return options.renderAll ? [] : errorAchievement;
    }
}

async function getLatestAchievement(player, achievementData) {
    try {
        if (!player?.allAchievements || Object.keys(player.allAchievements).length === 0) {
            return {
                id: "0",
                timestamp: "Never",
                imageUrl: "media/player-achievements/Standard_35_1.png",
                rarity: "Common",
                description: "Nothing here yet. This player doesn't have any achievements.",
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
                id: "0",
                timestamp: "Never",
                imageUrl: "media/player-achievements/Standard_35_1.png",
                rarity: "Common",
                description: "Nothing here yet. This player doesn't have any achievements.",
                name: "No achievements",
                globalPercentage: 0
            };
        }

        return await formatAchievement(latestId, latestTimestamp, achievementData);
    } catch (error) {
        console.error('Error getting latest achievement:', error);
        return {
            id: "0",
            timestamp: "Error",
            imageUrl: "media/player-achievements/Standard_35_1.png",
            rarity: "Common",
            description: "Failed to load latest achievement",
            name: "Error",
            globalPercentage: 0
        };
    }
}

async function getAllAchievements(player, achievementData) {
    try {
        if (!player?.allAchievements || Object.keys(player.allAchievements).length === 0) {
            return [];
        }

        const achievementsPromises = Object.entries(player.allAchievements)
            .map(async ([id, timestamp]) => await formatAchievement(id, timestamp, achievementData));

        let achievements = await Promise.all(achievementsPromises);

        achievements = achievements.filter(ach => ach && ach.id !== "0");

        const RARITY_ORDER = {
            "Common": 0,
            "Epic": 1,
            "Legendary": 2
        };

        achievements.sort((a, b) => {
            const rarityCompare = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
            if (rarityCompare !== 0) return rarityCompare;

            return (b.timestamp || "") > (a.timestamp || "") ? 1 : -1;
        });

        return achievements;
    } catch (error) {
        console.error('Error getting all achievements:', error);
        return [];
    }
}

async function renderSingleAchievement(achievement) {
    try {
        if (!achievement) {
            return `
                <h3>Latest Achievement</h3>
                <div class="achievement-content">
                    <div class="achievement-icon Common">
                        <img src="/media/player-achievements/Standard_35_1.png" alt="Achievement Icon"/>
                        <div class="achievement-time">N/A</div>
                    </div>
                    <div class="achievement-info">
                        <div class="achievement-title Common">No achievements</div>
                        <div class="achievement-description">Complete tasks to earn achievements</div>
                    </div>
                </div>
            `;
        }

        return `
            <h3>Latest Achievement</h3>
            <div class="achievement-content">
                <div class="achievement-icon ${achievement.rarity || 'Common'}">
                    <img src="${await loadAchievementImage(achievement, achievement.id)}" alt="Achievement Icon"/>
                    <div class="achievement-time">
                        ${achievement.timestamp || "N/A"}
                    </div>
                </div>
                <div class="achievement-info">
                    <div class="achievement-title ${achievement.rarity || 'Common'}">
                        ${achievement.name || "Unknown Achievement"}
                    </div>
                    <div class="achievement-description">
                        ${achievement.description || "No description available"}
                    </div>
                    ${(achievement.globalPercentage || 0) > 0 ?
                `<div class="achievement-percentage">${achievement.globalPercentage}% of players have this achievement</div>` :
                ''}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error rendering single achievement:', error);
        return `
            <h3>Latest Achievement</h3>
            <div class="achievement-content">
                <div class="achievement-icon Common">
                    <img src="/media/player-achievements/Standard_35_1.png" alt="Achievement Icon"/>
                    <div class="achievement-time">Error</div>
                </div>
                <div class="achievement-info">
                    <div class="achievement-title Common">Error</div>
                    <div class="achievement-description">Failed to load achievement data</div>
                </div>
            </div>
        `;
    }
}

async function renderAllAchievements(achievements) {
    try {
        if (!achievements || !Array.isArray(achievements) || achievements.length === 0) {
            return `
            <div class="no-stats-message">
                <h3>No Achievements Available</h3>
                <p>This player doesn't have any achievements, or they haven't been recorded yet.</p>
            </div>
        `;
        }

        const imagePromises = achievements.map(ach =>
            ach ? loadAchievementImage(ach, ach.id) : Promise.resolve(null)
        );

        const imageUrls = await Promise.allSettled(imagePromises);

        let html;

        for (let i = 0; i < achievements.length; i++) {
            const ach = achievements[i];
            if (!ach) continue;

            const imageResult = imageUrls[i];
            let imageUrl = "media/player-achievements/Standard_35_1.png";

            if (imageResult.status === 'fulfilled' && imageResult.value) {
                imageUrl = imageResult.value;
            }

            html += `
            <div class="user-achievements profile-section">
            <div class="achievement-progress-bg" style="width: ${ach.globalPercentage || 0}%;"></div>
                <div class="achievement-content">
                    <div class="achievement-icon ${ach.rarity || 'Common'}">
                        <img src="${imageUrl}" alt="Achievement Icon"
                             onerror="this.onerror=null; this.src='media/player-achievements/Standard_35_1.png'"/>
                        <div class="achievement-time">
                            ${ach.timestamp || "N/A"}
                        </div>
                    </div>
                    <div class="achievement-info">
                        <div class="achievement-title ${ach.rarity || 'Common'}">
                            ${ach.name || "Unknown Achievement"}
                        </div>
                        <div class="achievement-description">
                            ${ach.description || "No description available"}
                        </div>
                        ${(ach.globalPercentage || 0) > 0 ?
                    `<div class="achievement-percentage ${ach.rarity || 'Common'}">${ach.globalPercentage}% of players have this achievement</div>` :
                    ''}
                    </div>
                </div>
            </div>
            `;
        }

        if (!html) {
            return `
            <div class="no-stats-message">
                <h3>No Achievements Available</h3>
                <p>This player doesn't have any achievements, or they haven't been recorded yet.</p>
            </div>
        `;
        }

        return html;

    } catch (error) {
        console.error('Error rendering all achievements:', error);
        return `
            <div class="no-stats-message">
                <h3>Error Loading Achievements</h3>
                <p>Failed to load achievement data. Please try again later.</p>
            </div>
        `;
    }
}

// A more robust way to get achievement icons for everyone
async function loadAchievementImage(achievement, achievementId) {
    // Check CDN
    if (achievementId) {
        const cdnUrl = `https://assets.tarkov.dev/achievement-${achievementId}-icon.webp`;

        try {
            const cdnSuccess = await testImageLoad(cdnUrl, 1000);

            if (cdnSuccess) {
                return cdnUrl;
            } else {
                return getLocalImagePath(achievement);
            }
        } catch (error) {
            // Whoops, get the local image
            return getLocalImagePath(achievement);
        }
    }

    return getLocalImagePath(achievement);
}

function getLocalImagePath(achievement) {
    // JSON path
    if (achievement?.imageUrl) {
        let path = achievement.imageUrl.startsWith('/')
            ? achievement.imageUrl.slice(1)
            : achievement.imageUrl;

        // If this local, return
        if (path) {
            return path;
        }
    }

    return "media/player-achievements/Standard_35_1.png";
}

function testImageLoad(url, timeout = 2000) {
    return new Promise((resolve) => {
        const img = new Image();
        let timer;

        img.onload = () => {
            clearTimeout(timer);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };

        timer = setTimeout(() => {
            img.src = '';
            resolve(false);
        }, timeout);

        img.src = url;
    });
}