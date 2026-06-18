//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

const BASE_EXP_PER_LEVEL = 2200;
const MAX_LEVEL = 30;
const MIN_LEVEL = 1;

function initHOF(player, bestWeapon) {
    try {
        calculatePlayerLevel(player);

        if (player.isUsingStattrack) {
            updatePlayerProfileMastery(player, bestWeapon);
        }

        // rewardSystem.js
        refreshRewards(player);
    } catch (error) {
        console.error("Error in initHOF:", error);
        return 0;
    }
}

function calculatePlayerLevel(player) {
    player.battlePassLevel = getRank(player.networkRaids, 2000, 32).level;
}

function calculateMasteryLevel(player, bestWeapon) {
    try {
        // Don't calculate for those who don't have mod installed
        if (!player?.isUsingStattrack || !bestWeapon) {
            return {
                level: 0,
                currentExp: 0,
                expForNextLevel: 1000,
                totalExp: 0,
            };
        }

        const { totalShots = 0, kills = 0, headshots = 0 } = bestWeapon.stats || {};

        const expFromShots = Math.round((totalShots || 0) * 0.1);
        const expFromKills = (kills || 0) * 30;
        const expFromHeadshots = (headshots || 0) * 70;

        const totalExp = expFromShots + expFromKills + expFromHeadshots;
        const expPerLevel = 800;

        const level = Math.max(0, Math.floor(totalExp / expPerLevel));
        player.masteryLevel = level;

        const currentLevelExp = totalExp % expPerLevel;

        return {
            level,
            currentExp: Math.max(0, currentLevelExp),
            expForNextLevel: Math.max(0, expPerLevel),
            totalExp: Math.max(0, totalExp),
        };
    } catch (error) {
        console.error("Error in calculateMasteryLevel:", error);
        return {
            level: 0,
            currentExp: 0,
            expForNextLevel: 1000,
            totalExp: 0,
        };
    }
}

// EXP for weapon mastery
function updatePlayerProfileMastery(player, bestWeapon) {
    try {

        const levelData = calculateMasteryLevel(player, bestWeapon);

        // update level
        document.querySelector(".level-value-wp").textContent = levelData.level || 0;

        // update exp bar
        const expPercentage =
            (levelData.currentExp / levelData.expForNextLevel) * 100;
        document.querySelector(
            ".exp-progress-wp"
        ).style.width = `${Math.max(0, Math.min(100, expPercentage))}%`;

        // update exp values
        document.querySelector(".current-exp-wp").textContent = (levelData.currentExp || 0).toLocaleString();
        document.querySelector(".next-level-exp-wp").textContent = (levelData.expForNextLevel || 1000).toLocaleString();

        const remainingExp = levelData.expForNextLevel - levelData.currentExp;
        document.querySelector(".remaining-value-wp").textContent = Math.max(0, remainingExp).toLocaleString();
    } catch (error) {
        console.error("Error in updatePlayerProfileMastery:", error);
        document.querySelector(".level-value-wp").textContent = "0";
        document.querySelector(".exp-progress-wp").style.width = "0%";
        document.querySelector(".current-exp-wp").textContent = "0";
        document.querySelector(".next-level-exp-wp").textContent = "1000";
        document.querySelector(".remaining-value-wp").textContent = "1000";
    }
}