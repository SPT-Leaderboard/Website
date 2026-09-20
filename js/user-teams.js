//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

let currentTeamData = [];

function initTeamModal() {
    const modal = document.getElementById('teamModal');
    const closeBtn = modal.querySelector('.team-modal-close');
    const overlay = modal.querySelector('.team-modal-overlay');

    closeBtn.addEventListener('click', closeTeamModal);
    overlay.addEventListener('click', closeTeamModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeTeamModal();
        }
    });
}

function openTeam(tag) {
    const modal = document.getElementById('teamModal');
    const teamNameElement = document.getElementById('teamName');

    const seen = new Set();

    currentTeamData = leaderboardData
        .filter(player =>
            player.teamTag && player.teamTag.toLowerCase() === tag.toLowerCase()
        )
        .filter(player => {
            const key = (player.permaLink || player.id || '').toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map(player => ({
            ...player,
            rating: player.networkRaids || 0
        }))
        .sort((a, b) => b.rating - a.rating || (b.pmcLevel || 0) - (a.pmcLevel || 0));

    teamNameElement.textContent = tag;

    renderTeamStats();
    renderTeamPlayers();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderTeamStats() {
    const playerCount = currentTeamData.length;

    if (playerCount === 0) {
        setTeamStat('teamPlayersCount', 0);
        setTeamStat('teamAvgLevel', 0);
        setTeamStat('teamTotalRaids', 0);
        setTeamStat('teamTotalKills', 0);
        setTeamStat('teamAvgSurvival', '0%');
        setTeamStat('teamMembersCount', 0);
        return;
    }

    const totalLevel = currentTeamData.reduce((sum, p) => sum + (p.pmcLevel || 0), 0);
    const totalRaids = currentTeamData.reduce((sum, p) => sum + (p.pmcRaids || 0), 0);
    const totalKills = currentTeamData.reduce((sum, p) => sum + (p.pmcKills || 0), 0);
    const avgSurvival = Math.round(
        currentTeamData.reduce((sum, p) => sum + (p.survivalRate || 0), 0) / playerCount
    );

    setTeamStat('teamPlayersCount', playerCount.toLocaleString());
    setTeamStat('teamAvgLevel', Math.round(totalLevel / playerCount));
    setTeamStat('teamTotalRaids', totalRaids.toLocaleString());
    setTeamStat('teamTotalKills', totalKills.toLocaleString());
    setTeamStat('teamAvgSurvival', `${avgSurvival}%`);
    setTeamStat('teamMembersCount', playerCount);
}

function setTeamStat(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function renderTeamPlayers() {
    const container = document.getElementById('teamPlayersContainer');
    container.innerHTML = '';

    if (currentTeamData.length === 0) {
        container.innerHTML = `
            <div class="team-modal-empty">
                <i class="fa-solid fa-users-slash"></i>
                <p>No members found for this team.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    currentTeamData.forEach((player, index) => {
        const imagePath = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;
        const rank = player.rating > 0 ? getRank(player.rating) : null;

        const stats = [
            { label: 'PMC Raids', value: (player.pmcRaids || 0).toLocaleString() },
            { label: 'KDR', value: (player.killToDeathRatio || 0).toFixed(2) },
            { label: 'Survival', value: `${player.survivalRate || 0}%` },
            { label: 'Lifetime', value: formatSeconds(player.averageLifeTime || 0) }
        ];

        const card = document.createElement('div');
        card.className = 'player-card-team';
        card.style.animationDelay = `${Math.min(index * 0.04, 0.3)}s`;
        card.dataset.playerId = player.id || '';

        card.innerHTML = `
            <div class="player-card-image-wrap">
                <img src="${imagePath}"
                     alt="${escapeHtml(player.name || 'Player')}"
                     class="player-image-team"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='media/default_full_pmc_avatar.png';">
                <div class="player-card-level-badge">
                    ${rank ? `<img src="${rank.image}" alt="">` : ''}
                    LVL ${player.pmcLevel || 0}
                </div>
            </div>
            <div class="player-card-team-body">
                <div class="player-name-team">${player.name ? renderUsernameHTML(player) : escapeHtml('Unknown Player')}</div>
                <div class="player-card-team-stats">
                    ${stats.map(stat => `
                        <div class="player-stat-team">
                            <span class="player-stat-team-label">${stat.label}</span>
                            <span class="player-stat-team-value">${stat.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (card.dataset.playerId) {
                openProfile(card.dataset.playerId);
            }
        });

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

function closeTeamModal() {
    const modal = document.getElementById('teamModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', initTeamModal);