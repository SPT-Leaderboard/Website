//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

const API = {
    players: '/api/network/functions/global-lb/players.php',
    sorts: '/api/network/functions/global-lb/sort_options.php',
};

const state = {
    sort: 'richest',
    limit: 25,
    q: '',
};

const COLUMN_CONFIG = {
    richest: { col6: 'Balance', col7: 'Raids / Survived' },
    total_balance: { col6: 'Total Balance', col7: 'Raids / Survived' },
    inventory_value: { col6: 'Inventory Value', col7: 'Items Held' },
    showcase_value: { col6: 'Showcase Value', col7: 'Raids / Survived' },
    most_kills: { col6: 'Total Kills', col7: 'PMC / SCAV' },
    pmc_kills: { col6: 'PMC Kills', col7: 'SCAV / Boss' },
    scav_kills: { col6: 'SCAV Kills', col7: 'PMC / Boss' },
    boss_kills: { col6: 'Boss Kills', col7: 'PMC / SCAV' },
    most_damage: { col6: 'Total Damage', col7: 'Raids / Survived' },
    most_raids: { col6: 'Total Raids', col7: 'Survived / Died' },
    survived: { col6: 'Raids Survived', col7: 'Total Raids' },
    max_streak: { col6: 'Best Streak', col7: 'Raids / Survived' },
    raid_time: { col6: 'Time in Raid', col7: 'Raids / Survived' },
    battlepass_exp: { col6: 'BP EXP', col7: 'Raids / Survived' },
    seasons: { col6: 'Seasons Played', col7: 'Raids / Survived' },
    net_worth: { col6: 'Net Worth', col7: 'Wallet / Inventory' },
};

const el = {
    tbody: document.querySelector('#leaderboardTable tbody'),
    sortSel: document.getElementById('sortSelect'),
    limitSel: document.getElementById('limitSelect'),
    search: document.getElementById('playerSearch'),
    clear: document.getElementById('clearSearch'),
};

const fmtNum = n => Number(n || 0).toLocaleString('en-US');

function timeAgo(ts) {
    if (!ts) return '—';
    const s = Math.floor(Date.now() / 1000) - ts;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
    if (s < 31536000) return `${Math.floor(s / 2592000)}mo ago`;
    return `${Math.floor(s / 31536000)}y ago`;
}

async function loadSortOptions() {
    const res = await fetch(API.sorts);
    const opts = await res.json();
    el.sortSel.innerHTML = opts
        .map(o => `<option value="${o.key}">${o.label}</option>`)
        .join('');
}

async function loadLeaderboard() {
    const params = new URLSearchParams({
        sort: state.sort,
        limit: state.limit,
        q: state.q,
    });

    el.tbody.innerHTML = `<tr><td colspan="7" class="loading">Loading…</td></tr>`;

    try {
        const res = await fetch(`${API.players}?${params}`);
        const data = await res.json();
        if (!data.ok) throw new Error('API error');

        renderRows(data.players);
    } catch (err) {
        console.error(err);
        el.tbody.innerHTML = `<tr><td colspan="7" class="error">Failed to load leaderboard.</td></tr>`;
    }
}

function renderRows(players) {
    if (!players.length) {
        el.tbody.innerHTML = `<tr><td colspan="7">No players found.</td></tr>`;
        return;
    }

    el.tbody.innerHTML = players.map(p => {
        const pfp = `<img class="lb-profile-picture" src="${p.pfp}" alt="" onerror="this.src='/media/default_avatar.png';"  alt="Avatar"/>`;

        return `
            <tr>
                <td class="rank">#${p.standing}</td>
                <td class="team">${p.teamTag ? `[${escapeHtml(p.teamTag)}]` : ''}</td>
                <td class="player-name-wrapper">
                        ${pfp}
                        <span class="player-name-wrapper-main">
                            <span data-text="${p.name}">
                                ${escapeHtml(p.name)}
                            </span>
                        </span>
                </td>
                <td class="last-seen">${timeAgo(p.lastActive)}</td>
                <td class="net-worth">${fmtNum(p.netWorth)} LC</td>
                <td class="standing">${valueForCol6(p)}</td>
                <td class="raids">${valueForCol7(p)}</td>
            </tr>
        `;
    }).join('');
}

function updateHeaders() {
    const cfg = COLUMN_CONFIG[state.sort] ?? COLUMN_CONFIG.richest;
    const ths = document.querySelectorAll('#leaderboardTable thead th');
    if (ths.length < 7) return;
    ths[5].textContent = cfg.col6;
    ths[6].textContent = cfg.col7;
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function valueForCol6(p) {
    switch (state.sort) {
        case 'richest': return fmtNum(p.balance) + ' LC';
        case 'net_worth': return fmtNum((p.totalBalance ?? p.balance) + (p.inventoryValue ?? 0)) + ' LC';
        case 'total_balance': return fmtNum(p.totalBalance ?? p.balance) + ' LC';
        case 'inventory_value': return fmtNum(p.inventoryValue) + ' LC';
        case 'showcase_value': return fmtNum(p.showcaseValue) + '  LC';
        case 'most_kills': return fmtNum(p.totalKills) + ' kills';
        case 'pmc_kills': return fmtNum(p.pmcKills) + ' PMCs';
        case 'scav_kills': return fmtNum(p.scavKills) + ' SCAVs';
        case 'boss_kills': return fmtNum(p.bossKills) + ' bosses';
        case 'most_damage': return fmtNum(p.totalDamage);
        case 'most_raids': return fmtNum(p.raids) + ' raids';
        case 'survived': return fmtNum(p.survived) + ' raids';
        case 'max_streak': return fmtNum(p.maxStreak);
        case 'raid_time': return Math.floor(p.raidTime / 3600) + 'h';
        case 'battlepass_exp': return fmtNum(p.bpExp);
        case 'seasons': return fmtNum(p.seasonsPlayed);
        default: return fmtNum(p.balance) + ' LC';
    }
}

function valueForCol7(p) {
    switch (state.sort) {
        case 'inventory_value':
        case 'net_worth': return `${fmtNum(p.totalBalance ?? p.balance)} / ${fmtNum(p.inventoryValue)}`;
        case 'most_kills': return `${fmtNum(p.pmcKills)} / ${fmtNum(p.scavKills)}`;
        case 'pmc_kills': return `${fmtNum(p.scavKills)} / ${fmtNum(p.bossKills)}`;
        case 'scav_kills': return `${fmtNum(p.pmcKills)} / ${fmtNum(p.bossKills)}`;
        case 'boss_kills': return `${fmtNum(p.pmcKills)} / ${fmtNum(p.scavKills)}`;
        case 'most_raids': return `${fmtNum(p.survived)} / ${fmtNum(p.died)}`;
        case 'survived': return fmtNum(p.raids);
        default: return `${fmtNum(p.raids)} / ${fmtNum(p.survived)}`;
    }
}

el.sortSel.addEventListener('change', e => {
    state.sort = e.target.value;
    loadLeaderboard();
});

el.limitSel.addEventListener('change', e => {
    state.limit = parseInt(e.target.value, 10);
    loadLeaderboard();
});

let searchTimer;
el.search.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.q = e.target.value.trim();
        loadLeaderboard();
    }, 250);
});

el.clear.addEventListener('click', () => {
    el.search.value = '';
    state.q = '';
    loadLeaderboard();
});

el.sortSel.addEventListener('change', e => {
    state.sort = e.target.value;
    updateHeaders();
    loadLeaderboard();
});

updateHeaders();

(async function init() {
    await loadSortOptions();
    el.sortSel.value = state.sort;
    el.limitSel.value = String(state.limit);
    loadLeaderboard();
})();