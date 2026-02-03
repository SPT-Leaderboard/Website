//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

let playerData = [];
let dripData = {};
let currentModalPlayer = null;
let currentUserPermaLink = '';
let reactionsCache = new Map();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlayers);
} else {
    initializePlayers();
}

function initializePlayersGallery(leaderboardData) {
    const modal = document.getElementById('playerModal');
    const modalClose = document.getElementById('modalClose');

    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    modalClose.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    modal.querySelector('.like-btn').addEventListener('click', () => {
        if (currentModalPlayer && !currentModalPlayer.hasVoted) {
            executeVote(currentModalPlayer, 'like');
        }
    });

    modal.querySelector('.dislike-btn').addEventListener('click', () => {
        if (currentModalPlayer && !currentModalPlayer.hasVoted) {
            executeVote(currentModalPlayer, 'dislike');
        }
    });

    const players = leaderboardData
        .map((player, index) => {
            const isBanned = player.banned === true || player.banned === 'true' || player.banned === 1;
            const hasFewRaids = (player.totalRaids || 0) < 5;

            if (isBanned || hasFewRaids) {
                return null;
            }

            return {
                id: player.id || `player-${index}-${player.permaLink}`,
                permaLink: player.permaLink,
                name: player.name || `Player ${index + 1}`,
                rank: player.rank || index + 1,
                totalScore: player.totalScore ? player.totalScore.toFixed(3) : '0.000',
                totalRaids: player.totalRaids || 0,
                banned: player.banned || false
            };
        })
        .filter(player => player !== null)
        .map((player, index) => ({
            ...player,
            rank: index + 1
        }));

    renderPlayersGrid(players);
}

// #region Render grid
function renderPlayersGrid(players) {
    const playersGrid = document.getElementById('playersGrid');
    playersGrid.innerHTML = '';

    const sortedPlayers = sortPlayersByLikes(players);

    const fragment = document.createDocumentFragment();

    sortedPlayers.forEach(player => {
        const reactions = getPlayerReactions(player.permaLink);
        player.likes = reactions.likes;
        player.dislikes = reactions.dislikes;
        player.reactedBy = reactions.reactedBy;
        player.hasVoted = hasUserVoted(player.permaLink);
        player.userVoteType = getUserVoteType(player.permaLink);

        const playerCard = createPlayerCard(player);
        fragment.appendChild(playerCard);
    });

    playersGrid.appendChild(fragment);
}

async function executeVote(player, voteType) {
    if (hasUserVoted(player.permaLink)) {
        showToast('You have already voted for this player!', 'warning');
        return;
    }

    try {
        const result = await saveVote(player.permaLink, voteType);

        if (result && !result.error) {
            const newReactions = {
                likes: result[player.permaLink]?.likes || 0,
                dislikes: result[player.permaLink]?.dislikes || 0,
                reactedBy: [...(dripData[player.permaLink]?.reactedBy || []), currentUserPermaLink].filter(Boolean)
            };

            updateReactionsCache(player.permaLink, newReactions);

            updatePlayerCardUI(player.permaLink, newReactions, voteType);

            if (currentModalPlayer && currentModalPlayer.permaLink === player.permaLink) {
                updateModalUI(newReactions, voteType);
            }

            const allPlayers = Array.from(playersGrid.children)
                .map(card => ({
                    permaLink: card.dataset.playerPermaLink,
                    name: card.querySelector('.player-name').textContent,
                    ...getPlayerReactions(card.dataset.playerPermaLink)
                }));

            resortPlayers(allPlayers);

            showToast(`You ${voteType}d ${player.name}!`, 'success');

        } else {
            showToast(result.error || 'Error saving vote', 'error');
        }

    } catch (error) {
        console.error('Error handling vote:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

function updatePlayerCardUI(permaLink, reactions, voteType) {
    const card = document.querySelector(`[data-player-perma-link="${permaLink}"]`);
    if (!card) return;

    const likeCount = card.querySelector('.like-count');
    const dislikeCount = card.querySelector('.dislike-count');
    const likeBtn = card.querySelector('.like-btn');
    const dislikeBtn = card.querySelector('.dislike-btn');
    const playerInfo = card.querySelector('.player-info');

    if (likeCount) likeCount.textContent = reactions.likes;
    if (dislikeCount) dislikeCount.textContent = reactions.dislikes;

    likeBtn.disabled = true;
    dislikeBtn.disabled = true;
    likeBtn.classList.add('disabled');
    dislikeBtn.classList.add('disabled');

    if (!card.querySelector('.voted-badge')) {
        const badge = document.createElement('div');
        badge.className = 'voted-badge';
        badge.textContent = `Voted!`;
        playerInfo.appendChild(badge);
    }

    likeBtn.classList.add(voteType === 'like' ? 'voted-like' : '');
    dislikeBtn.classList.add(voteType === 'dislike' ? 'voted-dislike' : '');
}

function updateModalUI(reactions, voteType) {
    const modalLikeCount = document.getElementById('modalLikeCount');
    const modalDislikeCount = document.getElementById('modalDislikeCount');
    const modal = document.getElementById('playerModal');

    modalLikeCount.textContent = reactions.likes;
    modalDislikeCount.textContent = reactions.dislikes;

    const modalLikeBtn = modal.querySelector('.like-btn');
    const modalDislikeBtn = modal.querySelector('.dislike-btn');

    modalLikeBtn.disabled = true;
    modalDislikeBtn.disabled = true;
    modalLikeBtn.classList.add('disabled');
    modalDislikeBtn.classList.add('disabled');

    const voteInfo = modal.querySelector('.user-vote-info');
    if (voteInfo) {
        voteInfo.textContent = `Your vote: ${voteType === 'like' ? 'Like' : 'Dislike'}`;
        voteInfo.style.display = 'block';
    }
}

function resortPlayers(players) {
    const sortedPlayers = sortPlayersByLikes(players);
    const currentCards = Array.from(playersGrid.children);

    const positionMap = new Map();
    sortedPlayers.forEach((player, index) => {
        positionMap.set(player.permaLink, index);
    });

    currentCards.sort((a, b) => {
        const aPos = positionMap.get(a.dataset.playerPermaLink) || 0;
        const bPos = positionMap.get(b.dataset.playerPermaLink) || 0;
        return aPos - bPos;
    });

    currentCards.forEach(card => {
        playersGrid.appendChild(card);
    });
}

function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.dataset.playerId = player.id;
    card.dataset.playerPermaLink = player.permaLink;

    const hasVoted = player.hasVoted;
    const userVoteType = player.userVoteType;

    card.innerHTML = `
        <div class="player-image-container">
            <img src="${pmcPfpsPath}${player.permaLink}_full.png?t=${Date.now()}" alt="${player.name}" 
                 class="player-image" loading="lazy"
                 onerror="this.onerror=null; this.src='${pmcPfpsPath}default.png'">
        </div>
        <div class="player-info">
            <h3 class="player-name">${player.name}</h3>
            <div class="player-stats">
                <span class="rank-badge">#${player.rank || 'N/A'}</span>
                <span class="score-badge">${player.totalScore || 0} SS</span>
            </div>
            <div class="player-actions">
                <button class="action-btn dislike-btn ${hasVoted ? 'disabled' : ''} ${userVoteType === 'dislike' ? 'voted-dislike' : ''}" 
                        data-action="dislike" ${hasVoted ? 'disabled' : ''}>
                    <i class="fa-solid fa-heart-crack"></i>
                    <span class="dislike-count">${player.dislikes || 0}</span>
                </button>
                <button class="action-btn like-btn ${hasVoted ? 'disabled' : ''} ${userVoteType === 'like' ? 'voted-like' : ''}" 
                        data-action="like" ${hasVoted ? 'disabled' : ''}>
                    <i class="fa-solid fa-heart"></i>
                    <span class="like-count">${player.likes || 0}</span>
                </button>
            </div>
            ${hasVoted && userVoteType ? `<div class="voted-badge">Voted!</div>` : ''}
            ${!hasVoted && userVoteType ? `<div class="voted-badge">Previously voted!</div>` : ''}
        </div>
    `;

    const imageContainer = card.querySelector('.player-image-container');
    const likeBtn = card.querySelector('.like-btn');
    const dislikeBtn = card.querySelector('.dislike-btn');

    imageContainer.addEventListener('click', () => openModal(player));

    if (!hasVoted) {
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            executeVote(player, 'like');
        });
        dislikeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            executeVote(player, 'dislike');
        });
    }

    return card;
}

// #region AJAX
async function saveVote(permaLink, voteType) {
    try {
        const response = await fetch('/api/network/functions/dripfest/vote.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerPermaLink: permaLink,
                voteType: voteType,
                userPermaLink: currentUserPermaLink
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error saving vote:', error);
        return { error: error.message };
    }
}

function getPlayerReactions(permaLink) {
    if (reactionsCache.has(permaLink)) {
        return reactionsCache.get(permaLink);
    }

    const playerReactions = dripData[permaLink];
    const reactions = playerReactions ? {
        likes: playerReactions.likes || 0,
        dislikes: playerReactions.dislikes || 0,
        reactedBy: playerReactions.reactedBy || []
    } : { likes: 0, dislikes: 0, reactedBy: [] };

    reactionsCache.set(permaLink, reactions);
    return reactions;
}

function getUserVoteType(playerPermaLink) {
    if (!currentUserPermaLink) return null;

    const playerData = dripData[playerPermaLink];
    if (!playerData || !playerData.votes) return null;

    return playerData.votes[currentUserPermaLink] || null;
}

function updateReactionsCache(permaLink, newReactions) {
    reactionsCache.set(permaLink, newReactions);
    dripData[permaLink] = newReactions;
}

function hasUserVoted(playerPermaLink) {
    if (!currentUserPermaLink) return false;
    const reactions = getPlayerReactions(playerPermaLink);
    return reactions.reactedBy.includes(currentUserPermaLink);
}

function sortPlayersByLikes(players) {
    return [...players].sort((a, b) => {
        const aReactions = getPlayerReactions(a.permaLink);
        const bReactions = getPlayerReactions(b.permaLink);

        if (bReactions.likes !== aReactions.likes) {
            return bReactions.likes - aReactions.likes;
        }
        return aReactions.dislikes - bReactions.dislikes;
    });
}

// #region Modals
function openModal(player) {
    if (!player) {
        console.error('No player provided to openModal');
        return;
    }

    const modalImage = document.getElementById('modalImage');
    const modalName = document.getElementById('modalName');
    const modalLikeCount = document.getElementById('modalLikeCount');
    const modalDislikeCount = document.getElementById('modalDislikeCount');
    const modal = document.getElementById('playerModal');

    currentModalPlayer = player;

    const reactions = getPlayerReactions(player.permaLink);
    const likes = reactions?.likes ?? 0;
    const dislikes = reactions?.dislikes ?? 0;
    const hasVoted = hasUserVoted(player.permaLink);
    const userVoteType = getUserVoteType(player.permaLink); // NEW

    player.likes = likes;
    player.dislikes = dislikes;
    player.hasVoted = hasVoted;

    modalImage.onerror = () => {
        modalImage.src = `${pmcPfpsPath}default.png`;
    };

    modalImage.src = `${pmcPfpsPath}${player.permaLink}_full.png`;

    modalName.textContent = player.name || 'Unknown Player';

    modalLikeCount.textContent = likes;
    modalDislikeCount.textContent = dislikes;

    const modalLikeBtn = modal.querySelector('.like-btn');
    const modalDislikeBtn = modal.querySelector('.dislike-btn');

    if (modalLikeBtn && modalDislikeBtn) {
        modalLikeBtn.disabled = hasVoted;
        modalDislikeBtn.disabled = hasVoted;
        modalLikeBtn.classList.toggle('disabled', hasVoted);
        modalDislikeBtn.classList.toggle('disabled', hasVoted);
        modalLikeBtn.classList.toggle('voted-like', userVoteType === 'like');
        modalDislikeBtn.classList.toggle('voted-dislike', userVoteType === 'dislike');
        modalLikeBtn.querySelector('.like-count').textContent = likes;
        modalDislikeBtn.querySelector('.dislike-count').textContent = dislikes;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('playerModal');

    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentModalPlayer = null;
}

async function getCurrentUserPermaLink() {
    try {
        const response = await fetch('/api/network/functions/dripfest/get_current_user.php');

        if (response.ok) {
            const data = await response.json();
            return data.permaLink || '';
        }

        return '';
    } catch (error) {
        console.error('Error getting current user:', error);
        return '';
    }
}


// #region Init
async function initializePlayers() {
    try {
        [currentUserPermaLink, playerDataResponse, dripData] = await Promise.all([
            getCurrentUserPermaLink(),
            loadJSON(`${currentSeason}`),
            loadJSON(`${dripDataPath}`).catch(() => ({}))
        ]);

        playerData = playerDataResponse.leaderboard || [];

        initializePlayersGallery(playerData);

    } catch (error) {
        console.error('Error initializing players:', error);
        showToast('Failed to load player data', 'error');

        // Fallback UI
        const playersGrid = document.getElementById('playersGrid');
        playersGrid.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to load players. Please refresh the page.</p>
                <button onclick="initializePlayers()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}