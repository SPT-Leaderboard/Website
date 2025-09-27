//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

function getPrettyMapName(entry) {
    const mapAliases = {
        "bigmap": "Customs",
        "factory4_day": "Factory",
        "factory4_night": "Night Factory",
        "interchange": "Interchange",
        "laboratory": "Labs",
        "RezervBase": "Reserve",
        "shoreline": "Shoreline",
        "woods": "Woods",
        "lighthouse": "Lighthouse",
        "TarkovStreets": "Streets of Tarkov",
        "Sandbox": "Ground Zero - Low",
        "Sandbox_high": "Ground Zero - High"
    };

    entry.toLowerCase();

    return mapAliases[entry] || entry; // returning raw if not found
}

// Get boost descriptions and details for tooltips
function getBoostDescription(boost) {
    if (boost >= 15) return 'Unreal Boost!';
    if (boost >= 10) return 'Extreme Boost.';
    if (boost >= 5) return 'Great Boost.';
    if (boost > 0) return 'Small Boost.';
    if (boost === 0) return 'Neutral.';
    return 'Penalty Applied.';
}

function getBoostDetails(boost) {
    const modsCount = Math.abs(boost);
    return boost > 0
        ? `From ~${modsCount} approved mod(s)`
        : boost < 0
            ? `From ~${modsCount} restricted mod(s)`
            : 'No mod effects';
}

// Welcome image moving on the background
document.addEventListener('DOMContentLoaded', function () {
    const featureCards = document.querySelectorAll('.feature-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const animation = entry.target.getAttribute('data-animation');
                entry.target.classList.add(animation);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    featureCards.forEach(card => {
        observer.observe(card);
    });

    // Wow image move 
    window.addEventListener('mousemove', function (e) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        const bg = document.querySelector('.welcome-bg-image');
        bg.style.transform = `translate(-${x * 50}px, -${y * 50}px)`;
    });
});

// Auto offset top by top-stats-bar height
// This is done so navbar doesn't get in the way when window is resized
function updateNavbarOffset() {
    const bar = document.querySelector('.top-stats-bar');
    if (bar) {
        document.documentElement.style.setProperty('--top-stats-height', bar.offsetHeight + 15 + 'px');
        document.documentElement.style.setProperty('--top-stats-height-variant', bar.offsetHeight - 50 + 'px');
    }
}

window.addEventListener('load', updateNavbarOffset);
window.addEventListener('resize', updateNavbarOffset);

// Ranks
function getRank(rating, maxRating = 1000) {
    const totalRanks = 30;
    const rankIndex = Math.min(totalRanks - 1, Math.floor((rating / maxRating) * totalRanks));
    
    const level = Math.floor(rankIndex / 6) + 1;
    const rankInLevel = (rankIndex % 6) + 1;
    
    const rankNames = [
        // Level 1
        ['Recruit', 'Private', 'Militia', 'Scavenger', 'Survivor', 'Trainee'],
        // Level 2
        ['Operative', 'Guard', 'Mercenary', 'Veteran', 'Enforcer', 'Ranger'],
        // Level 3
        ['Specialist', 'Commando', 'Assassin', 'Infiltrator', 'Saboteur', 'Tactician'],
        // Level 4
        ['Elite', 'Ghost', 'Reaper', 'Sentinel', 'Warden', 'Executioner'],
        // Level 5
        ['Legend', 'Warlord', 'Titan', 'Overlord', 'Nemesis', 'Apex']
    ];
    
    const rankName = rankNames[level - 1][rankInLevel - 1];
    
    return {
        image: `media/player_ranks/Rank${level}/${rankInLevel}@32px.png`,
        name: rankName,
        fullName: `${rankName} (Level ${level})`,
        level: level,
        rankInLevel: rankInLevel,
        progress: Math.round((rating / maxRating) * 100)
    };
}