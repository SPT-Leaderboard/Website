let playerData = [];
let dripData = {};
let currentModalPlayer = null;
let currentUserPermaLink = '';

function initializePlayersGallery(leaderboardData) {
    const playersGrid = document.getElementById('playersGrid');
    const modal = document.getElementById('playerModal');
    const modalClose = document.getElementById('modalClose');
    const modalImage = document.getElementById('modalImage');
    const modalName = document.getElementById('modalName');
    const modalLikeCount = document.getElementById('modalLikeCount');
    const modalDislikeCount = document.getElementById('modalDislikeCount');

    // #region Rebase reactions data
    function getPlayerReactions(permaLink) {
        const playerReactions = dripData[permaLink];
        if (playerReactions) {
            return {
                likes: playerReactions.likes || 0,
                dislikes: playerReactions.dislikes || 0,
                reactedBy: playerReactions.reactedBy || []
            };
        }
        return { likes: 0, dislikes: 0, reactedBy: [] };
    }

    function hasUserVoted(playerPermaLink) {
        if (!currentUserPermaLink) return false;
        const reactions = getPlayerReactions(playerPermaLink);
        return reactions.reactedBy.includes(currentUserPermaLink);
    }

    // #region Render grid
    function renderPlayersGrid(players) {
        playersGrid.innerHTML = '';

        players.forEach(player => {
            const reactions = getPlayerReactions(player.permaLink);
            player.likes = reactions.likes;
            player.dislikes = reactions.dislikes;
            player.reactedBy = reactions.reactedBy;
            player.hasVoted = hasUserVoted(player.permaLink);

            const playerCard = createPlayerCard(player);
            playersGrid.appendChild(playerCard);
        });
    }

    function createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.playerId = player.id;
        card.dataset.playerPermaLink = player.permaLink;

        const hasVoted = player.hasVoted;

        card.innerHTML = `
            <div class="player-image-container">
                <img src="${pmcPfpsPath}${player.permaLink}_full.png" alt="${player.name}" 
                     class="player-image" loading="lazy"
                     onerror="this.onerror=null; this.src='${pmcPfpsPath}default.png'">
                <div class="player-image-overlay">
                    <span class="view-image-text">Zoom In</span>
                </div>
            </div>
            <div class="player-info">
                <h3 class="player-name">${player.name}</h3>
                <div class="player-actions">
                    <button class="action-btn dislike-btn ${hasVoted ? 'disabled' : ''}" 
                            data-action="dislike" ${hasVoted ? 'disabled' : ''}>
                        <i class="fa-solid fa-heart-crack"></i>
                        <span class="dislike-count">${player.dislikes || 0}</span>
                    </button>
                    <button class="action-btn like-btn ${hasVoted ? 'disabled' : ''}" 
                            data-action="like" ${hasVoted ? 'disabled' : ''}>
                        <i class="fa-solid fa-heart"></i>
                        <span class="like-count">${player.likes || 0}</span>
                    </button>
                </div>
                ${hasVoted ? '<div class="voted-badge">Already Voted</div>' : ''}
            </div>
        `;

        const imageContainer = card.querySelector('.player-image-container');
        const likeBtn = card.querySelector('.like-btn');
        const dislikeBtn = card.querySelector('.dislike-btn');

        imageContainer.addEventListener('click', () => openModal(player));

        if (!hasVoted) {
            likeBtn.addEventListener('click', (e) => handleVote(e, player, 'like'));
            dislikeBtn.addEventListener('click', (e) => handleVote(e, player, 'dislike'));
        }

        return card;
    }

    // #region Modals
    function openModal(player) {
        currentModalPlayer = player;

        const reactions = getPlayerReactions(player.permaLink);
        player.likes = reactions.likes;
        player.dislikes = reactions.dislikes;
        player.hasVoted = hasUserVoted(player.permaLink);

        modalImage.src = `${pmcPfpsPath}${player.permaLink}_full.png`;
        modalImage.alt = player.name;
        modalName.textContent = player.name;
        modalLikeCount.textContent = player.likes;
        modalDislikeCount.textContent = player.dislikes;

        const modalLikeBtn = modal.querySelector('.like-btn');
        const modalDislikeBtn = modal.querySelector('.dislike-btn');

        if (player.hasVoted) {
            modalLikeBtn.classList.add('disabled');
            modalDislikeBtn.classList.add('disabled');
            modalLikeBtn.disabled = true;
            modalDislikeBtn.disabled = true;
        } else {
            modalLikeBtn.classList.remove('disabled');
            modalDislikeBtn.classList.remove('disabled');
            modalLikeBtn.disabled = false;
            modalDislikeBtn.disabled = false;
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        currentModalPlayer = null;
    }

    async function handleVote(event, player, voteType) {
        event.stopPropagation();
        const button = event.currentTarget;

        if (hasUserVoted(player.permaLink)) {
            showToast('You have already voted for this player!', 'warning');
            return;
        }

        button.disabled = true;
        button.classList.add('processing');

        try {
            const result = await saveVote(player.permaLink, voteType);

            if (result && !result.error) {
                if (!dripData[player.permaLink]) {
                    dripData[player.permaLink] = {
                        likes: 0,
                        dislikes: 0,
                        reactedBy: []
                    };
                }

                if (result[player.permaLink]) {
                    dripData[player.permaLink].likes = result[player.permaLink].likes;
                    dripData[player.permaLink].dislikes = result[player.permaLink].dislikes;
                    dripData[player.permaLink].reactedBy = result[player.permaLink].reactedBy;
                }

                if (currentUserPermaLink && !dripData[player.permaLink].reactedBy.includes(currentUserPermaLink)) {
                    dripData[player.permaLink].reactedBy.push(currentUserPermaLink);
                }

                const likeCountSpan = button.querySelector('.like-count') ||
                    button.closest('.player-actions').querySelector('.like-count');
                const dislikeCountSpan = button.querySelector('.dislike-count') ||
                    button.closest('.player-actions').querySelector('.dislike-count');

                if (likeCountSpan) likeCountSpan.textContent = dripData[player.permaLink].likes;
                if (dislikeCountSpan) dislikeCountSpan.textContent = dripData[player.permaLink].dislikes;

                if (currentModalPlayer && currentModalPlayer.permaLink === player.permaLink) {
                    modalLikeCount.textContent = dripData[player.permaLink].likes;
                    modalDislikeCount.textContent = dripData[player.permaLink].dislikes;
                }

                button.classList.add(voteType === 'like' ? 'liked' : 'disliked');

                const playerCard = button.closest('.player-card');
                const likeBtn = playerCard.querySelector('.like-btn');
                const dislikeBtn = playerCard.querySelector('.dislike-btn');

                likeBtn.disabled = true;
                dislikeBtn.disabled = true;
                likeBtn.classList.add('disabled');
                dislikeBtn.classList.add('disabled');

                const playerInfo = playerCard.querySelector('.player-info');
                if (!playerCard.querySelector('.voted-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'voted-badge';
                    badge.textContent = 'Already Voted';
                    playerInfo.appendChild(badge);
                }

                showToast(`You ${voteType}d ${player.name}!`, 'success');

                if (currentModalPlayer && currentModalPlayer.permaLink === player.permaLink) {
                    const modalLikeBtn = modal.querySelector('.like-btn');
                    const modalDislikeBtn = modal.querySelector('.dislike-btn');
                    modalLikeBtn.disabled = true;
                    modalDislikeBtn.disabled = true;
                    modalLikeBtn.classList.add('disabled');
                    modalDislikeBtn.classList.add('disabled');
                }

            } else {
                showToast(result.error || 'Error saving vote', 'error');
                button.disabled = false;
                button.classList.remove('processing');
            }

        } catch (error) {
            console.error('Error handling vote:', error);
            showToast('Network error. Please try again.', 'error');
            button.disabled = false;
            button.classList.remove('processing');
        }

        setTimeout(() => {
            button.classList.remove('liked', 'disliked', 'processing');
        }, 1000);
    }

    // #region Like
    function handleLike(event, player) {
        event.stopPropagation();
        const button = event.currentTarget;
        const countSpan = button.querySelector('.action-count');

        player.likes = (player.likes || 0) + 1;

        countSpan.textContent = player.likes;
        button.classList.add('liked');

        if (!dripData[player.permaLink]) {
            dripData[player.permaLink] = {
                likes: 0,
                dislikes: 0,
                reactedBy: []
            };
        }
        dripData[player.permaLink].likes = player.likes;

        if (currentModalPlayer && currentModalPlayer.id === player.id) {
            modalLikeCount.textContent = player.likes;
        }

        saveVote(player.permaLink, 'like');

        setTimeout(() => {
            button.classList.remove('liked');
        }, 400);
    }

    // #region Dislike
    function handleDislike(event, player) {
        event.stopPropagation();

        const button = event.currentTarget;
        const countSpan = button.querySelector('.action-count');

        player.dislikes = (player.dislikes || 0) + 1;

        countSpan.textContent = player.dislikes;
        button.classList.add('disliked');

        if (!dripData[player.permaLink]) {
            dripData[player.permaLink] = {
                likes: 0,
                dislikes: 0,
                reactedBy: []
            };
        }
        dripData[player.permaLink].dislikes = player.dislikes;

        if (currentModalPlayer && currentModalPlayer.id === player.id) {
            modalDislikeCount.textContent = player.dislikes;
        }

        saveVote(player.permaLink, 'dislike');

        setTimeout(() => {
            button.classList.remove('disliked');
        }, 400);
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
                    voteType: voteType
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error saving vote:', error);
            showToast('Failed to save vote', 'error');
            return { error: error.message };
        }
    }

    // #region Modal Listeners
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
        if (currentModalPlayer) {
            const event = {
                currentTarget: modal.querySelector('.like-btn'),
                stopPropagation: () => { }
            };
            handleLike(event, currentModalPlayer);
        }
    });

    modal.querySelector('.dislike-btn').addEventListener('click', () => {
        if (currentModalPlayer) {
            const event = {
                currentTarget: modal.querySelector('.dislike-btn'),
                stopPropagation: () => { }
            };
            handleDislike(event, currentModalPlayer);
        }
    });

    // #region Player data mapping
    const players = leaderboardData.map((player, index) => {
        const reactions = getPlayerReactions(player.permaLink);

        return {
            id: player.id || `player-${index}-${player.permaLink}`,
            permaLink: player.permaLink,
            name: player.name || `Player ${index + 1}`,
            ...reactions
        };
    });

    renderPlayersGrid(players);
}

// #region Init
async function initializePlayers() {
    try {
        currentUserPermaLink = await getCurrentUserPermaLink();

        const playerDataResponse = await loadJSON(`${currentSeason}`);
        dripData = await loadJSON(`${dripDataPath}`) || {};

        playerData = playerDataResponse.leaderboard;

        initializePlayersGallery(playerData);
    } catch (error) {
        console.error('Error initializing players:', error);
        showToast('Failed to load player data', 'error');
    }
}

async function getCurrentUserPermaLink() {
    try {
        const response = await fetch('/api/network/functions/dripfest/getCurrentUser.php');
        if (response.ok) {
            const data = await response.json();
            return data.permaLink;
        }

        return '';
    } catch (error) {
        console.error('Error getting current user:', error);
        return '';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlayers);
} else {
    initializePlayers();
}