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

        // battlepass-rewards.js
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

        // Update mastery level
        const masteryLevel = document.querySelector(".mastery-level");
        const masteryLevelBadge = document.querySelector(".weapon-level-badge");
        if (masteryLevel) {
            masteryLevel.textContent = levelData.level || 0;
            masteryLevelBadge.textContent = `LVL ${levelData.level || 0}`
        }

        // Update exp progress bar
        const expPercentage = (levelData.currentExp / levelData.expForNextLevel) * 100;
        const progressBar = document.querySelector(".exp-progress");
        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, expPercentage))}%`;
        }

        // Update current exp
        const currentExp = document.querySelector(".current-exp");
        if (currentExp) {
            currentExp.textContent = (levelData.currentExp || 0).toLocaleString();
        }

        // Update next level exp
        const nextLevelExp = document.querySelector(".next-level-exp");
        if (nextLevelExp) {
            nextLevelExp.textContent = (levelData.expForNextLevel || 1000).toLocaleString();
        }

        // Update remaining exp
        const remainingExp = levelData.expForNextLevel - levelData.currentExp;
        const remainingValue = document.querySelector(".remaining-value");
        if (remainingValue) {
            remainingValue.textContent = Math.max(0, remainingExp).toLocaleString();
        }

    } catch (error) {
        console.error("Error in updatePlayerProfileMastery:", error);

        // Set default values on error
        const defaults = {
            '.mastery-level': '0',
            '.exp-progress': '0%',
            '.current-exp': '0',
            '.next-level-exp': '1000',
            '.remaining-value': '1000'
        };

        Object.entries(defaults).forEach(([selector, value]) => {
            const element = document.querySelector(selector);
            if (element) {
                if (selector === '.exp-progress') {
                    element.style.width = value;
                } else {
                    element.textContent = value;
                }
            }
        });
    }
}