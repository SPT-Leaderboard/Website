let currentTable = 'boss';
const switchInterval = 30000;

function formatKills(kills) {
    if (!kills && kills !== 0) return '0';
    return kills.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getTopBossHunters() {
    if (!leaderboardData || !Array.isArray(leaderboardData)) {
        return [];
    }

    const hunters = [];

    leaderboardData.forEach((player) => {
        if (player.banned || player.IsCasual || !player.name) return;

        const kills = parseInt(player.event_pmc_boss_kills) || 0;
        if (kills > 0) {
            hunters.push({
                name: player.name,
                kills: kills
            });
        }
    });

    return hunters
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5);
}

function getTopPmcHunters() {
    if (!leaderboardData || !Array.isArray(leaderboardData)) {
        return [];
    }

    const hunters = [];

    leaderboardData.forEach((player) => {
        if (player.banned || player.IsCasual || !player.name) return;

        const kills = parseInt(player.event_scav_pmc_kills) || 0;
        if (kills > 0) {
            hunters.push({
                name: player.name,
                kills: kills
            });
        }
    });

    return hunters
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5);
}

function getWarStats() {
    if (!leaderboardData || !Array.isArray(leaderboardData)) {
        return { scavKills: 0, pmcKills: 0, total: 0 };
    }

    let scavKills = 0;
    let pmcKills = 0;

    leaderboardData.forEach((player) => {
        if (player.banned || player.IsCasual) return;

        scavKills += parseInt(player.event_scav_pmc_kills) || 0;
        pmcKills += parseInt(player.event_pmc_boss_kills) || 0;
    });

    const total = scavKills + pmcKills;

    return { scavKills, pmcKills, total };
}

function updateWarProgress() {
    const { scavKills, pmcKills, total } = getWarStats();

    if (total === 0) {
        document.getElementById('scavProgress').style.width = '50%';
        document.getElementById('pmcProgress').style.width = '50%';
        document.getElementById('scavCount').textContent = '0';
        document.getElementById('pmcCount').textContent = '0';
        document.getElementById('warStatus').textContent = 'Conflict has just began...';
        return;
    }

    const scavPercent = (scavKills / total) * 100;
    const pmcPercent = (pmcKills / total) * 100;

    document.getElementById('scavProgress').style.width = scavPercent + '%';
    document.getElementById('pmcProgress').style.width = pmcPercent + '%';

    document.getElementById('scavCount').textContent = formatKills(scavKills);
    document.getElementById('pmcCount').textContent = formatKills(pmcKills);

    let status;
    if (scavKills > pmcKills * 1.5) {
        status = 'SCAVs are dominating.';
    } else if (pmcKills > scavKills * 1.5) {
        status = 'PMC are controllig the situation.';
    } else if (Math.abs(scavKills - pmcKills) < total * 0.1) {
        status = 'Conflict reportedly goes even for both sides.';
    } else {
        status = 'Conflict cannot settle down yet.';
    }

    document.getElementById('warStatus').textContent = `${status} | Total Losses: ${formatKills(total)}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function animateLeaderboardItems(containerId) {
    const items = document.querySelectorAll(`#${containerId} .leaderboard-item`);
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

function updateBossHunters() {
    const container = document.getElementById('topHuntersList');
    const top5 = getTopBossHunters();

    if (top5.length === 0) {
        container.innerHTML = `<div class="leaderboard-loading">No boss kills yet.<br><span style="font-size:0.8rem;">Be the first.</span></div>`;
        return;
    }

    container.innerHTML = top5.map((player, index) => `
        <div class="leaderboard-item" data-kills="${player.kills}">
            <div class="leaderboard-rank">#${index + 1}</div>
            <div class="leaderboard-name" title="${escapeHtml(player.name)}">
                ${escapeHtml(truncateName(player.name, 20))}
            </div>
            <div class="leaderboard-kills">
                <span class="kills-number">${formatKills(player.kills)}</span>
            </div>
        </div>
    `).join('');
    animateLeaderboardItems('topHuntersList');
}

// Обновление таблицы PMC хантеров
function updatePmcHunters() {
    const container = document.getElementById('topPmcHuntersList');
    const top5 = getTopPmcHunters();

    if (top5.length === 0) {
        container.innerHTML = `<div class="leaderboard-loading">No PMC kills yet.<br><span style="font-size:0.8rem;">SCAVs are hiding...</span></div>`;
        return;
    }

    container.innerHTML = top5.map((player, index) => `
        <div class="leaderboard-item" data-kills="${player.kills}">
            <div class="leaderboard-rank">#${index + 1}</div>
            <div class="leaderboard-name" title="${escapeHtml(player.name)}">
                ${escapeHtml(truncateName(player.name, 20))}
            </div>
            <div class="leaderboard-kills">
                <span class="kills-number">${formatKills(player.kills)}</span>
            </div>
        </div>
    `).join('');
    animateLeaderboardItems('topPmcHuntersList');
}

function switchTables() {
    const bossTable = document.getElementById('bossHuntersTable');
    const pmcTable = document.getElementById('pmcHuntersTable');
    const dots = document.querySelectorAll('.switch-dot');

    if (currentTable === 'boss') {
        bossTable.classList.add('fade-out');
        setTimeout(() => {
            bossTable.style.display = 'none';
            pmcTable.style.display = 'block';
            setTimeout(() => pmcTable.classList.add('fade-in'), 50);
            dots[0].classList.remove('active');
            dots[1].classList.add('active');
        }, 250);
        currentTable = 'pmc';
    } else {
        pmcTable.classList.add('fade-out');
        setTimeout(() => {
            pmcTable.style.display = 'none';
            bossTable.style.display = 'block';
            setTimeout(() => bossTable.classList.add('fade-in'), 50);
            dots[1].classList.remove('active');
            dots[0].classList.add('active');
        }, 250);
        currentTable = 'boss';
    }
}

waitForDataReady(() => {
    updateWarProgress();
    updateBossHunters();
    updatePmcHunters();

    setInterval(() => {
        switchTables();
        updateWarProgress();
        updateBossHunters();
        updatePmcHunters();
    }, switchInterval);

    setInterval(() => {
        updateWarProgress();
        updateBossHunters();
        updatePmcHunters();
    }, 60000);
});
