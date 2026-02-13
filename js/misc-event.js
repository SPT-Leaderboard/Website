function formatKills(kills) {
    if (!kills && kills !== 0) return '0';
    return kills.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getTopBossHunters() {
    if (!leaderboardData || !Array.isArray(leaderboardData)) {
        console.warn('leaderboardData not available');
        return [];
    }

    const hunters = [];

    leaderboardData.forEach((player, index) => {
        if (player.banned) {
            return;
        }

        if (player.IsCasual) {
            return;
        }

        if (!player.name) {
            return;
        }

        const kills = parseInt(player.boss_event_kills) || 0;

        if (kills > 0) {
            hunters.push({
                name: player.name,
                kills: kills,
                originalData: player,
                index: index
            });
        }
    });

    if (hunters.length === 0) {
        return [];
    }

    const top5 = hunters
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5);

    return top5;
}


function updateTopHunters() {
    const container = document.getElementById('topHuntersList');
    if (!container) {
        return;
    }

    const top5 = getTopBossHunters();

    if (top5.length === 0) {
        container.innerHTML = `
            <div class="leaderboard-loading">
                No boss kills confirmed yet.<br>
                <span style="font-size: 0.8rem; opacity: 0.5;">Be the first.</span>
            </div>
        `;
        return;
    }

    const itemsHTML = top5.map((player, index) => {
        const rank = index + 1;

        return `
            <div class="leaderboard-item rank" 
                 data-kills="${player.kills}"
                 data-name="${escapeHtml(player.name)}">
                
                <div class="leaderboard-rank">
                    #${rank}
                </div>
                
                <div class="leaderboard-name" title="${escapeHtml(player.name)}">
                    ${escapeHtml(truncateName(player.name, 20))}
                </div>
                
                <div class="leaderboard-kills">
                    <span class="kills-number">${formatKills(player.kills)}</span>
                    <span class="kills-label">BOSS KILLS</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = itemsHTML;
    animateLeaderboardItems();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function animateLeaderboardItems() {
    const items = document.querySelectorAll('.leaderboard-item');
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-10px)';

        setTimeout(() => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, index * 100);
    });
}

waitForDataReady(() => {
    updateTopHunters();
});