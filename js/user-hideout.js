//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// user-hideout.js
const HIDEOUT_MODULES = {
    "Vents": { name: "Vents", image: "vents.png", maxLevel: 3 },
    "Security": { name: "Security", image: "security.png", maxLevel: 3 },
    "WaterCloset": { name: "Lavatory", image: "watercloset.png", maxLevel: 3 },
    "Stash": { name: "Stash", image: "stash.png", maxLevel: 4 },
    "Generator": { name: "Generator", image: "generators.png", maxLevel: 3 },
    "Heating": { name: "Heating", image: "heating.png", maxLevel: 3 },
    "WaterCollector": { name: "Water Collector", image: "WaterCollector.png", maxLevel: 3 },
    "MedStation": { name: "Medstation", image: "medstation.png", maxLevel: 3 },
    "Kitchen": { name: "Nutrition Unit", image: "kitchen.png", maxLevel: 3 },
    "RestSpace": { name: "Rest Space", image: "restplace.png", maxLevel: 3 },
    "Workbench": { name: "Workbench", image: "workbench.png", maxLevel: 3 },
    "IntelligenceCenter": { name: "Intelligence Center", image: "intelligence_center.png", maxLevel: 3 },
    "ShootingRange": { name: "Shooting Range", image: "shooting_range.png", maxLevel: 3 },
    "Library": { name: "Library", image: "library.png", maxLevel: 1 },
    "ScavCase": { name: "Scav Case", image: "scav_case.png", maxLevel: 1 },
    "Illumination": { name: "Illumination", image: "illumination.png", maxLevel: 3 },
    "PlaceOfFame": { name: "Place of Fame", image: "placeoffame.png", maxLevel: 3 },
    "AirFilteringUnit": { name: "Air Filtering Unit", image: "afu.png", maxLevel: 1 },
    "SolarPower": { name: "Solar Power", image: "solarpower.png", maxLevel: 1 },
    "BoozeGenerator": { name: "Booze Generator", image: "boozegen.png", maxLevel: 1 },
    "BitcoinFarm": { name: "Bitcoin Farm", image: "bitcoinfarm.png", maxLevel: 3 },
    "EmergencyWall": { name: "Emergency Wall", image: "wall.png", maxLevel: 6 },
    "Gym": { name: "Gym", image: "gym.png", maxLevel: 1 },
    "WeaponStand": { name: "Weapon Rack", image: "weapon_stand.png", maxLevel: 3 },
    "EquipmentPresetsStand": { name: "Equipment Presets", image: "presets-stand.png", maxLevel: 3 },
    "CircleOfCultists": { name: "Circle of Cultists", image: "Cultist Zone.png", maxLevel: 1 }
};

function loadHideoutData(hideoutData) {
    const container = document.getElementById('hideout-container');

    if (!container) {
        console.error('Hideout container not found');
        return;
    }

    if (!hideoutData || Object.keys(hideoutData).length === 0) {
        container.innerHTML = `
            <div class="no-stats-message">
                <h3>No Hideout Data</h3>
                <p>Hideout information is not available for this player.</p>
            </div>
        `;
        return;
    }

    const builtModules = Object.entries(hideoutData)
        .filter(([_, level]) => level > 0)
        .sort(([aLevel], [bLevel]) => bLevel - aLevel);

    const notBuiltModules = Object.entries(hideoutData)
        .filter(([_, level]) => level === 0);

    const modulesHTML = createModulesHTML(builtModules, notBuiltModules);

    container.innerHTML = `
        <div class="hideout-grid">
            ${modulesHTML}
        </div>
    `;
}

function createModulesHTML(builtModules, notBuiltModules) {
    const builtHTML = builtModules.map(([key, level]) =>
        createModuleCard(key, level, true)
    ).join('');

    const notBuiltHTML = notBuiltModules.map(([key, level]) =>
        createModuleCard(key, level, false)
    ).join('');

    return builtHTML + notBuiltHTML;
}

function createModuleCard(moduleKey, level, isBuilt) {
    const module = HIDEOUT_MODULES[moduleKey];

    if (!module) {
        console.warn(`Unknown hideout module: ${moduleKey}`);
        return '';
    }

    const status = isBuilt ? 'built' : 'not-built';
    const statusText = isBuilt ? `Level ${level}/${module.maxLevel}` : 'Not Built';

    return `
        <div class="hideout-module ${status}" data-module="${moduleKey}">
            <div class="module-image">
                <img src="media/player_hideout/${module.image}" alt="${module.name}">
            </div>
            <div class="module-info">
                <h3 class="module-name">${module.name}</h3>
                <div class="module-status ${status}">
                    ${statusText}
                </div>
            </div>
        </div>
    `;
}