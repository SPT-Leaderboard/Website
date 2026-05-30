//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

/**
 * Displays top 3 winners in the UI
 * @param {Array<Object>} data - Leaderboard entries of previous season from loadPreviousSeasonWinners()
 */
function displayWinners(data) {
    const winnersTab = document.getElementById('winners');

    if (!data || data.length === 0) {
        return;
    }

    const top3Players = data.filter(player => player.rank <= 3);

    const orderedPlayers = [
        top3Players.find(p => p.rank === 2),
        top3Players.find(p => p.rank === 1),
        top3Players.find(p => p.rank === 3)
    ].filter(Boolean);

    winnersTab.innerHTML = `
    <div class="winners-wrapper-center">
        <div class="winners-horizontal-container">
            ${orderedPlayers.map(player => `
                <div class="winner-horizontal-card ${player.rank === 1 ? 'first-place' : ''}">
                    <div class="winner-avatar-container">
                        <img src="${player.profilePicture || 'media/default_avatar.png'}" 
                             class="winner-avatar" 
                             loading="lazy"
                             onerror="this.src='media/default_avatar.png'"
                             alt="${escapeHtml(player.name)}">
                    </div>
                    <div class="winner-info">
                        <div class="winner-name" title="${escapeHtml(player.name)}">
                            ${escapeHtml(player.name.length > 15 ? player.name.substring(0, 12) + '...' : player.name)}
                        </div>
                        <div class="winner-rank-badge">${getRankText(player.rank)}</div>
                        <div class="winner-score">${player.totalScore.toFixed(0)} SS</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
}

function getMedalClass(rank) {
    switch (rank) {
        case 1: return 'medal-gold';
        case 2: return 'medal-silver';
        case 3: return 'medal-bronze';
        default: return '';
    }
}