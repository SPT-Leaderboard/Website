//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

const BASE_EXP_PER_LEVEL = 2200;
const MAX_LEVEL = 30;
const MIN_LEVEL = 1;

async function initHOF(player, bestWeapon) {
    try {
        updatePlayerProfile(player);

        if (shouldHideUnsupportedMods)
            updatePlayerProfileMastery(player, bestWeapon);

        // rewardSystem.js
        refreshRewards(player);
    } catch (error) {
        console.error("Error in initHOF:", error);
        return 0;
    }
}

function calculatePlayerLevel(player) {
    try {
        const expFromPmcRaids = (player.pmcRaids || 0) * 60;
        const expFromPmcKills = (player.pmcKills || 0) * 25;
        const expFromScavRaids = (player.scavRaids || 0) * 30;
        const expFromScavKills = (player.scavKills || 0) * 15;

        const survivalMultiplier = 1 + (player.survivalRate || 0) / 100;
        const expFromSurvival = (player.survived || 0) * 120 * survivalMultiplier;

        const expFromLifeTime = Math.floor((player.averageLifeTime || 0) / 60) * 5;

        const expFromDamage = Math.floor((player.damage || 0) / 1500);

        // Get all EXP
        const totalExp = Math.floor(
            expFromPmcRaids +
            expFromPmcKills +
            expFromScavRaids +
            expFromScavKills +
            expFromSurvival +
            expFromLifeTime +
            expFromDamage
        );

        // Calculate level with minimum level protection
        let level = Math.floor(totalExp / BASE_EXP_PER_LEVEL);
        level = Math.max(MIN_LEVEL, Math.min(level, MAX_LEVEL));

        // Dynamic
        const currentLevelExp = totalExp - level * BASE_EXP_PER_LEVEL;
        const expForNextLevel = BASE_EXP_PER_LEVEL - currentLevelExp;

        player.battlePassLevel = level;
        setRankImage(player.battlePassLevel);

        return {
            level: level,
            currentExp: Math.max(0, currentLevelExp),
            expForNextLevel: Math.max(0, expForNextLevel),
            totalExp: Math.max(0, totalExp),
        };
    } catch (error) {
        console.error("Error in calculatePlayerLevel:", error);
        return {
            level: MIN_LEVEL,
            currentExp: 0,
            expForNextLevel: BASE_EXP_PER_LEVEL,
            totalExp: 0,
        };
    }
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
async function updatePlayerProfileMastery(player, bestWeapon) {
    try {
        if (shouldHideUnsupportedMods)
            return;

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

// EXP for leaderboard level
async function updatePlayerProfile(player) {
    try {
        const levelData = calculatePlayerLevel(player);

        // update level
        document.querySelector(".level-value").textContent = levelData.level || MIN_LEVEL;

        // update exp bar
        const expPercentage = levelData.level >= MAX_LEVEL ? 100 : (levelData.currentExp / BASE_EXP_PER_LEVEL) * 100;

        const expProgress = document.querySelector(".exp-progress");
        expProgress.style.width = `${Math.max(0, Math.min(100, expPercentage))}%`;

        if (levelData.level >= MAX_LEVEL) {
            expProgress.classList.add('max-level');
        } else {
            expProgress.classList.remove('max-level');
        }

        // update exp values
        document.querySelector(".current-exp").textContent =
            levelData.level >= MAX_LEVEL ? "MAX" : (levelData.currentExp || 0).toLocaleString();

        document.querySelector(".next-level-exp").textContent =
            levelData.level >= MAX_LEVEL ? "MAX" : (levelData.expForNextLevel || BASE_EXP_PER_LEVEL).toLocaleString();

        const remainingExp =
            levelData.level >= MAX_LEVEL ? 0 : levelData.expForNextLevel;

        document.querySelector(".remaining-value").textContent =
            levelData.level >= MAX_LEVEL ? "MAX" : Math.max(0, remainingExp).toLocaleString();
    } catch (error) {
        console.error("Error in updatePlayerProfile:", error);
        document.querySelector(".level-value").textContent = MIN_LEVEL.toString();
        document.querySelector(".exp-progress").style.width = "0%";
        document.querySelector(".current-exp").textContent = "0";
        document.querySelector(".next-level-exp").textContent = BASE_EXP_PER_LEVEL.toLocaleString();
        document.querySelector(".remaining-value").textContent = BASE_EXP_PER_LEVEL.toLocaleString();
    }
}

async function setRankImage(playerLevel) {
    try {
        const level = Math.min(Math.max(MIN_LEVEL, playerLevel || MIN_LEVEL), 80);
        const rankLevel = Math.floor(level / 5) * 5;
        const finalRankLevel = rankLevel < 5 ? 5 : rankLevel;

        let rankBackground = document.querySelector(".rank-background");
        if (!rankBackground) {
            rankBackground = document.createElement("div");
            rankBackground.className = "rank-background";
            document.querySelector(".battlepass-level").appendChild(rankBackground);
        }

        rankBackground.style.backgroundImage = `url('media/profile_ranks/rank${finalRankLevel}.png')`;
    } catch (error) {
        console.error("Error in setRankImage:", error);
    }
}