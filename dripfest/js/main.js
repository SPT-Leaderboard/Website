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

    // #region Render grid
    function renderPlayersGrid(players) {
        playersGrid.innerHTML = '';

        players.forEach(player => {
            const reactions = getPlayerReactions(player.permaLink);
            player.likes = reactions.likes;
            player.dislikes = reactions.dislikes;
            player.reactedBy = reactions.reactedBy;

            const playerCard = createPlayerCard(player);
            playersGrid.appendChild(playerCard);
        });
    }

    function createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.playerId = player.id;

        const canVote = true;

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
                    <button class="action-btn dislike-btn" data-action="dislike">
                        <i class="fa-solid fa-heart-crack"></i>
                        <span class="dislike-count">0</span>
                    </button>
                    <button class="action-btn like-btn" data-action="like">
                        <i class="fa-solid fa-heart"></i>
                        <span class="like-count">0</span>
                    </button>
                </div>
            </div>
        `;

        const imageContainer = card.querySelector('.player-image-container');
        const likeBtn = card.querySelector('.like-btn');
        const dislikeBtn = card.querySelector('.dislike-btn');

        imageContainer.addEventListener('click', () => openModal(player));

        if (canVote) {
            likeBtn.addEventListener('click', (e) => handleLike(e, player));
            dislikeBtn.addEventListener('click', (e) => handleDislike(e, player));
        }

        return card;
    }

    // #region Modals
    function openModal(player) {
        currentModalPlayer = player;

        modalImage.src = `${pmcPfpsPath}${player.permaLink}_full.png`;
        modalImage.alt = player.name;
        modalName.textContent = player.name;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        currentModalPlayer = null;
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
            const response = await fetch('/api/network/functions/vote.php', {
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
                throw new Error('Errorr');
            }

            const result = await response.json();

        } catch (error) {

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
        const playerDataResponse = await loadJSON(`${currentSeason}`);
        dripData = await loadJSON(`${dripDataPath}`) || {};

        playerData = playerDataResponse.leaderboard;

        initializePlayersGallery(playerData);
    } catch (error) {
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlayers);
} else {
    initializePlayers();
}