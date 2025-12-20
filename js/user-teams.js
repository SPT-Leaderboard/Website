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

    currentTeamData = leaderboardData.filter(player =>
        player.teamTag && player.teamTag.toLowerCase() === tag.toLowerCase()
    );

    currentTeamData.sort((a, b) => b.pmcLevel - a.pmcLevel);
    teamNameElement.textContent = tag;

    const playerCount = currentTeamData.length;
    const totalLevel = currentTeamData.reduce((sum, player) => sum + (player.pmcLevel || 0), 0);
    const totalWins = currentTeamData.reduce((sum, player) => sum + (player.survived || 0), 0);
    const averageLevel = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;

    animateNumber('teamPlayersCount', playerCount, 0, 0);
    animateNumber('teamAvgLevel', averageLevel, 0, 0);
    animateNumber('teamTotalWins', totalWins, 0, 0);

    renderTeamPlayers();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderTeamPlayers() {
    const container = document.getElementById('teamPlayersContainer');
    container.innerHTML = '';

    const displayData = currentTeamData.slice(0, 5);

    displayData.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card-team';
        playerCard.style.animationDelay = `${index * 0.15}s`;

        const imagePath = `${pmcPfpsPath}${player.permaLink}_full.png`;

        playerCard.innerHTML = `
            <img src="${imagePath}" 
                 alt="${player.name || 'Player'}" 
                 class="player-image-team"
                 data-player-id="${player.id || ''}"
                 loading="lazy"
                 this.src='media/default_full_pmc_avatar.png';">
            
            <div class="team-player-stats-wrapper">
                <div class="player-name-team" data-player-id="${player.id || ''}">
                    ${player.name || 'Unknown Player'}
                </div>
            </div>
            <div class="player-level-team">LVL ${player.pmcLevel || 0}</div>
            <div class="player-wins-team">${player.survived || 0} Extractions</div>
        `;

        playerCard.addEventListener('click', (e) => {
            let playerId = player.id;
            const clickedElement = e.target;

            if (clickedElement.classList.contains('player-image-team') ||
                clickedElement.classList.contains('player-name-team')) {
                playerId = clickedElement.dataset.playerId;
            }

            // Open profile on click
            if (playerId) {
                openProfile(playerId);
            }
        });

        playerCard.addEventListener('mouseenter', () => {
            const img = playerCard.querySelector('.player-image-team');
            if (img) {
                img.style.transform = 'scale(1.08)';
                img.style.filter = 'drop-shadow(0 15px 30px rgba(99, 102, 241, 0.3))';
            }
        });

        playerCard.addEventListener('mouseleave', () => {
            const img = playerCard.querySelector('.player-image-team');
            if (img) {
                img.style.transform = 'scale(1)';
                img.style.filter = 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4))';
            }
        });

        container.appendChild(playerCard);
    });

    if (currentTeamData.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'team-empty-state';
        emptyState.innerHTML = `
            <div style="font-size: 1.5rem; color: var(--text-light); margin-bottom: 10px;">
                No Team Members Found
            </div>
            <div style="color: var(--text-muted);">
                This team doesn't have any registered players yet
            </div>
        `;
        emptyState.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            border: 2px dashed rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            background: rgba(30, 41, 59, 0.3);
        `;
        container.appendChild(emptyState);
    }
}

function closeTeamModal() {
    const modal = document.getElementById('teamModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', initTeamModal);

