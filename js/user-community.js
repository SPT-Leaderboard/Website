//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

/**
 * @class FriendManager
 * @description Manages the friend system for player profiles, including friend status checks,
 * friend request sending, friend list rendering, and real-friend vs local-friend tagging.
 */
class FriendManager {

    // what a fucking shithole

    constructor() {
        this.container = document.getElementById('friends-container');
        this.section = document.getElementById('friend-list');
        this.buttonContainer = null;
        this.currentPlayer = null;
        this.isLoggedIn = isLoggedIn;
        this.friends = [];
        this.realFriends = new Map();
        this._onDocumentClick = null;
        this._friendStatusCache = new Map();
        this._cacheTimeout = 5 * 60 * 1000;
    }

    /**
     * Initializes the friend manager for a given player
     * @param {Object} player - The player object whose profile is being viewed
     * @param {string} player.id - The player's unique ID
     */
    async init(player) {
        this.currentPlayer = player;
        this.buttonContainer = document.querySelector('.friend-button-container');

        // Attach global click-away listener once
        this._onDocumentClick = (e) => {
            const dropdown = this.buttonContainer?.querySelector('.friend-dropdown');
            const button = this.buttonContainer?.querySelector('.friend-button.unfriend');
            if (dropdown && button && !button.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        };
        document.addEventListener('click', this._onDocumentClick);

        await this.handleFriendButton();
        await this.renderFriendList();
    }

    destroy() {
        if (this._onDocumentClick) {
            document.removeEventListener('click', this._onDocumentClick);
            this._onDocumentClick = null;
        }

        // Clear cache
        this._friendStatusCache.clear();

        // Clear references
        this.friends = [];
        this.realFriends.clear();
        this.currentPlayer = null;
        this.buttonContainer = null;
    }

    async handleFriendButton() {
        if (!this.isLoggedIn) {
            this.renderLoginButton();
            return;
        }

        try {
            const status = await this.checkFriendStatus();
            this.renderFriendButton(status);
        } catch (error) {
            console.error('Error checking friend status:', error);
            this.renderErrorButton();
        }
    }

    /**
     * Checks the friendship status between the logged-in user and the current player.
     * Uses caching to avoid redundant API calls.
     * @returns {Promise<string>} One of "canAdd", "isFriend", "requestPending", "cannotAdd", or "error"
     */
    async checkFriendStatus() {
        const cacheKey = this.currentPlayer.id;
        const cached = this._friendStatusCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this._cacheTimeout) {
            return cached.status;
        }

        try {
            const data = await apiFetch('/api/network/functions/community/is_friend.php', {
                method: 'POST',
                cacheBust: false,
                showErrorToast: false,
                timeout: 10000,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: { profileId: this.currentPlayer.id }
            });

            const status = data === null ? 'cannotAdd' : data.status;

            // Cache the result
            this._friendStatusCache.set(cacheKey, {
                status: status,
                timestamp: Date.now()
            });

            return status;
        } catch (error) {
            console.error('Error checking friend status:', error);
            return 'cannotAdd';
        }
    }

    renderLoginButton() {
        this.buttonContainer.innerHTML = `
            <button class="friend-button login-required" onclick="ProfileState.friendManager.goToLoginPage()">
                <i class="fa-solid fa-sign-in-alt"></i>
                <span>Login to add friends</span>
            </button>
        `;
    }

    goToLoginPage() {
        window.location.href = '/api/login/';
    }

    /**
     * Renders the appropriate friend action button based on friendship status.
     * @param {string} status - ("isFriend", "requestPending", "canAdd", or other)
     */
    renderFriendButton(status) {
        let buttonHtml;

        if (status === 'isFriend') {
            buttonHtml = `
            <div class="friend-button-wrapper">
                <button class="friend-button unfriend" data-player-id="${this.currentPlayer.id}">
                    <i class="fa-solid fa-user-check stat-positive"></i>
                    <span>Friends</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="friend-dropdown">
                    <button class="dropdown-item unfriend-action">
                        <i class="fa-solid fa-user-minus"></i> Unfriend
                    </button>
                </div>
            </div>
        `;
        } else if (status === 'requestPending') {
            buttonHtml = `
            <button class="friend-button pending" disabled>
                <i class="fa-solid fa-hourglass-half"></i>
                <span>Friend Request Pending</span>
            </button>
        `;
        } else if (status === 'canAdd') {
            buttonHtml = `
            <button class="friend-button add" data-player-id="${this.currentPlayer.id}">
                <i class="fa-solid fa-user-plus"></i>
                <span>Add Friend</span>
            </button>
        `;
        } else {
            buttonHtml = `
            <button class="friend-button disabled" disabled>
                <i class="fa-solid fa-ban"></i>
                <span>Cannot Add</span>
            </button>
        `;
        }

        this.buttonContainer.innerHTML = buttonHtml;
        this.attachButtonListeners();
    }

    renderErrorButton() {
        this.buttonContainer.innerHTML = `
            <button class="friend-button error" disabled>
                <i class="fa-solid fa-exclamation-triangle"></i>
                <span>Error loading status</span>
            </button>
        `;
    }

    attachButtonListeners() {
        const addButton = this.buttonContainer.querySelector('.friend-button.add');
        if (addButton) {
            addButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sendFriendRequest();
            });
        }

        const unfriendButton = this.buttonContainer.querySelector('.friend-button.unfriend');
        if (unfriendButton) {
            unfriendButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        const unfriendAction = this.buttonContainer.querySelector('.unfriend-action');
        if (unfriendAction) {
            unfriendAction.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFriend();
            });
        }
    }

    toggleDropdown() {
        const dropdown = this.buttonContainer.querySelector('.friend-dropdown');
        dropdown.classList.toggle('show');
    }

    /**
     * Sends a friend request to the current player via the API
     */
    async sendFriendRequest() {
        try {
            const button = this.buttonContainer.querySelector('.friend-button.add');
            button.classList.add('loading');
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

            const data = await apiFetch('/api/network/functions/community/send_friend_request.php', {
                method: 'POST',
                cacheBust: false,
                showErrorToast: false,
                timeout: 10000,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                },
                body: { profileId: this.currentPlayer.id }
            });

            if (data && data.success) {
                button.classList.remove('loading');
                button.classList.add('success');
                button.innerHTML = '<i class="fa-solid fa-check"></i> Request Sent!';

                setTimeout(() => {
                    this.handleFriendButton();
                }, 2000);
            } else {
                throw new Error(data?.message || 'Request failed');
            }

        } catch (error) {
            console.error('Error sending friend request:', error);
            await this.handleFriendButton();
        }
    }

    async removeFriend() {
        try {
            // TODO
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.handleFriendButton();

        } catch (error) {
            console.error('Error removing friend:', error);
        }
    }

    /**
     * Fetches the list of "real" (non-local) friends IDs for the current player from the API.
     * @returns {Promise<Array<string>>} Array of friend IDs
     */
    async fetchRealFriends() {
        try {
            const response = await apiFetch('/api/network/functions/community/get_friends.php', {
                method: 'POST',
                credentials: 'include',
                cacheBust: false,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profileId: this.currentPlayer.id })
            });

            if (!response) return new Map();

            const data = response;

            if (!data.friends || data.friends.length === 0) {
                return new Map();
            }

            const basicFriends = data.friends.map(friend => ({
                id: friend.id,
                name: friend.name,
                profilePicture: friend.profilePicture || 'media/default_avatar.png',
                teamTag: friend.teamTag || '',
                absoluteLastTime: friend.absoluteLastTime || null,
                added_at: friend.added_at,
                permaLink: friend.permaLink  // for lookup
            }));

            const enrichedFriends = await this.enrichFriendsWithLeaderboardData(basicFriends);

            const friendsMap = new Map();
            enrichedFriends.forEach(friend => {
                friendsMap.set(friend.id, {
                    ...friend,
                    isRealFriend: true
                });
            });

            return friendsMap;
        } catch (error) {
            console.error('Error fetching real friends:', error);
            return new Map();
        }
    }

    /**
     * Gets local friends (based on permaLink/teamTag) from leaderboard data
     * @returns {Array<Object>} Array of local friend objects
     */
    getLocalFriends() {
        const localFriends = [];
        const friendLink = this.currentPlayer.permaLink;
        const teamTag = this.currentPlayer.teamTag;

        if (!friendLink && !teamTag) {
            return localFriends;
        }

        for (const playerId in leaderboardData) {
            const p = leaderboardData[playerId];

            // Don't include yourself, dumbass
            if (p.id === this.currentPlayer.id) continue;

            // Don't include if they're already a real friend (will be filtered later)
            if (this.realFriends.has(p.id)) continue;

            if ((friendLink && p.permaLink === friendLink) ||
                (teamTag && p.teamTag === teamTag)) {
                localFriends.push({
                    id: p.id,
                    name: p.name,
                    profilePicture: p.profilePicture,
                    teamTag: p.teamTag,
                    absoluteLastTime: p.absoluteLastTime,
                    isRealFriend: false
                });
            }
        }

        return localFriends;
    }

    /**
     * Fetches and merges the player's friend list, tagging each friend as real or local.
     * @returns {Promise<Array<Object>>} friend objects with `isRealFriend` flag
     */
    async checkFriends() {
        this.realFriends = await this.fetchRealFriends();

        const localFriends = this.getLocalFriends();
        const realFriendsArray = Array.from(this.realFriends.values());
        const allFriends = [...realFriendsArray, ...localFriends];

        const uniqueFriends = new Map();
        allFriends.forEach(friend => {
            const key = friend.id || friend.permaLink || friend.name;
            if (!uniqueFriends.has(key) || (friend.isRealFriend && !uniqueFriends.get(key).isRealFriend)) {
                uniqueFriends.set(key, friend);
            }
        });

        const uniqueFriendsArray = Array.from(uniqueFriends.values());

        // Sort friends
        uniqueFriendsArray.sort((a, b) => {
            // Real friends first
            if (a.isRealFriend && !b.isRealFriend) return -1;
            if (!a.isRealFriend && b.isRealFriend) return 1;

            if (a.isRealFriend && b.isRealFriend) {
                return (b.added_at || 0) - (a.added_at || 0);
            }

            return (a.name || '').localeCompare(b.name || '');
        });

        return uniqueFriendsArray;
    }

    /**
     * Enrich friends data with current leaderboard info
     * @param {Array} friends - Friend objects from API
     * @returns {Promise<Array>} friends array
     */
    async enrichFriendsWithLeaderboardData(friends) {
        if (!friends || friends.length === 0) return [];

        return friends.map(friend => {
            let playerData = null;

            if (friend.permaLink) {
                playerData = window.findPlayerByPermaLink(friend.permaLink);
            }
            if (!playerData && friend.id) {
                playerData = window.findPlayer(friend.id);
            }

            // COME OVER HERE, HIIIAAAAA
            if (playerData) {
                return {
                    id: playerData.id,
                    name: playerData.name || friend.name,
                    profilePicture: playerData.profilePicture || friend.profilePicture || 'media/default_avatar.png',
                    teamTag: playerData.teamTag || '',
                    absoluteLastTime: playerData.absoluteLastTime || playerData.lastPlayed,
                    added_at: friend.added_at,
                    isRealFriend: true,
                    permaLink: playerData.permaLink || friend.permaLink
                };
            }

            //return defaults
            return {
                id: friend.id,
                name: friend.name,
                profilePicture: friend.profilePicture || 'media/default_avatar.png',
                teamTag: friend.teamTag || '',
                absoluteLastTime: null,
                added_at: friend.added_at,
                isRealFriend: true,
                permaLink: friend.permaLink || null
            };
        });
    }

    /**
     * Fetches the friend list
     */
    async renderFriendList() {
        if (!this.container || !this.section) return;

        try {
            const friends = await this.checkFriends();
            this.friends = friends;

            // Hide friend list section if no friends
            if (friends.length === 0) {
                this.section.style.display = 'none';
                return;
            }

            this.section.style.display = 'block';

            const fragment = document.createDocumentFragment();

            friends.forEach(friend => {
                const playerStatus = heartbeatMonitor?.getPlayerStatus?.(friend.id) || {};
                const isOnline = playerStatus.isOnline || false;
                const lastUpdateTime = playerStatus.lastUpdate || friend.absoluteLastTime || null;

                let lastGame = this.getLastGameHTML(isOnline, playerStatus, lastUpdateTime);

                const friendClass = friend.isRealFriend ? 'real-friend' : 'local-friend';
                const friendBadge = !friend.isRealFriend
                    ? '<i class="fa-solid fa-users-between-lines local-badge" title="Local friend"></i>'
                    : '<i class="fa-solid fa-user-check real-badge" title="Friend"></i>';

                const friendDiv = document.createElement('div');
                friendDiv.className = `friend-item ${friendClass}`;
                friendDiv.setAttribute('data-player-id', friend.id || '0');
                friendDiv.innerHTML = `
                    <div class="friend-avatar-wrapper">
                        <img src="${friend.profilePicture || 'media/default_avatar.png'}"
                             class="friend-avatar"
                             onerror="this.src='media/default_avatar.png';"
                             alt="Friend Avatar">
                        ${friendBadge}
                        ${isOnline ? '<span class="online-dot"></span>' : ''}
                    </div>
                    <div class="friend-info">
                        <div class="friend-name">
                            ${friend.teamTag ? `<span class="friend-team-tag">[${this.escapeHtml(friend.teamTag)}]</span>` : ''}
                            ${this.escapeHtml(friend.name || 'Unknown')}
                        </div>
                        <div class="friend-status-text">
                            ${lastGame}
                        </div>
                    </div>
                `;

                fragment.appendChild(friendDiv);
            });

            this.container.innerHTML = '';
            this.container.appendChild(fragment);
            this.attachFriendListListeners();
        } catch (error) {
            console.error('Error loading friends:', error);
            this.container.innerHTML = `
            <div class="friends-error">
                <i class="fa-solid fa-exclamation-triangle"></i>
                Error loading friends
            </div>
        `;
        }
    }

    /**
     * Generates HTML for the last game status.
     */
    getLastGameHTML(isOnline, playerStatus, lastUpdateTime) {
        if (isOnline) {
            const isInRaid = playerStatus?.status === 'in_raid' || playerStatus?.status === 'in_transit';

            if (isInRaid) {
                return `<span class="player-status-lb ${playerStatus.statusClass || ''}">
                    ${playerStatus.statusText || 'In Raid'}
                    <span class="raid-dots">
                        <span class="r-dot"></span>
                        <span class="r-dot"></span>
                        <span class="r-dot"></span>
                    </span>
                </span>`;
            } else {
                return `<span class="player-status-lb ${playerStatus.statusClass || ''}">
                    ${playerStatus.statusText || 'Online'}
                    <span id="blink"></span>
                </span>`;
            }
        } else {
            // Offline - show last online time
            const lastOnlineTime = window.heartbeatMonitor?.getLastOnlineTime?.(lastUpdateTime) || window.formatLastPlayed(lastUpdateTime);
            return `<span class="last-online-time">${lastOnlineTime}</span>`;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachFriendListListeners() {
        this.container.querySelectorAll('.friend-item').forEach(element => {
            element.addEventListener('click', () => {
                const playerId = element.dataset.playerId;
                if (playerId) {
                    // We're using a bypass here (2nd argument) to open a profile within a profile, because otherwise it wouldn't open.
                    // Really FUCKY, and GARBAGE implementation, but I have NO idea why it triggers multiple times.
                    openProfile(playerId, true);
                }
            });
        });
    }
}
// #endregion

// #region Comments Manager
/**
 * @class CommentsManager
 * @description Handles the profile comment system including posting, loading, paginating,
 * and rendering comments on a player's profile page.
 */
class CommentsManager {
    /**
     * @param {Object} [config={}]
     * @param {number} [config.commentsPerPage=5] - Number of comments to display per page
     */
    constructor(config = {}) {
        this.pagination = {
            allComments: [],
            currentPage: 1,
            commentsPerPage: config.commentsPerPage || 5,
            totalPages: 1
        };

        // DOM
        this.elements = {
            commentSubmit: null,
            commentInput: null,
            commentsList: null,
            paginationInfo: null,
            prevBtn: null,
            nextBtn: null,
            pageIndicators: null,
            paginationControls: null,
            commentsCount: null
        };

        // State
        this.isLoggedIn = isLoggedIn;
        this.currentUser = global_user_data || null;

        this.permaLink = null;
        this.playerId = null;

        this.apiEndpoints = {
            sendComment: '/api/network/functions/comment/send_comment.php',
            loadComments: '/api/data/user-comments/',
            likeComment: '/api/network/functions/comment/like_comment.php',
            deleteComment: '/api/network/functions/comment/delete_comment.php',
            replyComment: '/api/network/functions/comment/reply_comment.php'
        };
    }

    /**
     * Initializes the comments system for a specific player profile.
     * @param {string} permaLink - Target profile permaLink
     * @param {string} playerId - Target profile profile ID
     */
    init(permaLink, playerId) {
        this.targetPermaLink = permaLink;
        this.targetPlayerId = playerId;

        this.currentUser = window.global_user_data || null;

        this.initElements();
        this.initPaginationControls();
        this.attachEventListeners();
        this.loadComments();

        if (!this.isLoggedIn) {
            this.disableCommentForm();
        }
    }

    isAuthor(authorId) {
        if (!this.isLoggedIn || !this.currentUser) return false;

        return this.currentUser.profileId === authorId;
    }

    canDeleteComment(comment) {
        if (!this.isLoggedIn || !this.currentUser) return false;

        if (this.isAuthor(comment.author_id)) return true;

        if (this.currentUser.role > 5) return true;

        return false;
    }

    getCurrentUserId() {
        return this.currentUser?.profileId || null;
    }

    getCurrentPermaLink() {
        return this.currentUser?.permaLink || null;
    }

    initElements() {
        this.elements.commentSubmit = document.getElementById('submit-comment');
        this.elements.commentInput = document.getElementById('comment-text');
        this.elements.commentsList = document.getElementById('comments-list');
        this.elements.paginationInfo = document.getElementById('pagination-info');
        this.elements.prevBtn = document.getElementById('prev-page');
        this.elements.nextBtn = document.getElementById('next-page');
        this.elements.pageIndicators = document.getElementById('page-indicators');
        this.elements.paginationControls = document.getElementById('pagination-controls');
        this.elements.commentsCount = document.getElementById('comments-count');
    }

    disableCommentForm() {
        if (this.elements.commentInput) {
            this.elements.commentInput.disabled = true;
            this.elements.commentInput.placeholder = "Please log in to comment...";
        }

        if (this.elements.commentSubmit) {
            this.elements.commentSubmit.disabled = true;
            this.elements.commentSubmit.innerHTML = '<i class="fa-solid fa-key"></i> Login Required';
        }
    }

    attachEventListeners() {
        if (this.elements.commentSubmit) {
            this.elements.commentSubmit.addEventListener('click', () => this.handleCommentSubmit());
        }

        if (this.elements.commentInput) {
            this.elements.commentInput.addEventListener('keypress', (e) => this.handleCommentKeypress(e));
        }
    }

    // Handle comment submission
    handleCommentSubmit() {
        if (!this.isLoggedIn) {
            this.showLoginPrompt();
            return;
        }

        if (!this.elements.commentInput || this.elements.commentInput.value.trim() === '') {
            this.elements.commentInput?.focus();
            return;
        }

        this.submitComment();
    }

    // Handle Enter key in comment input
    handleCommentKeypress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.elements.commentSubmit?.click();
        }
    }

    // Initialize pagination controls
    initPaginationControls() {
        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => {
                if (this.pagination.currentPage > 1) {
                    this.goToPage(this.pagination.currentPage - 1);
                }
            });
        }

        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => {
                if (this.pagination.currentPage < this.pagination.totalPages) {
                    this.goToPage(this.pagination.currentPage + 1);
                }
            });
        }
    }

    /**
     * Navigates to a specific comment page, re-renders the visible comments,
     * and smoothly scrolls the comment list into view.
     * @param {number} pageNumber - The 1-based page number to navigate to
     */
    goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.pagination.totalPages) {
            return;
        }

        this.pagination.currentPage = pageNumber;
        this.renderCurrentPage();
        this.updatePaginationUI();

        if (this.elements.commentsList) {
            this.elements.commentsList.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // Render comments for current page
    renderCurrentPage() {
        if (!this.elements.commentsList) return;

        const startIndex = (this.pagination.currentPage - 1) * this.pagination.commentsPerPage;
        const endIndex = startIndex + this.pagination.commentsPerPage;
        const pageComments = this.pagination.allComments.slice(startIndex, endIndex);

        while (this.elements.commentsList.firstChild) {
            this.elements.commentsList.removeChild(this.elements.commentsList.firstChild);
        }

        this.elements.commentsList.classList.add('page-transition');

        if (pageComments.length === 0) {
            this.displayNoComments();
        } else {
            // just DOM insert
            const fragment = document.createDocumentFragment();
            pageComments.forEach(comment => {
                const commentElement = this.createCommentElement(comment);
                fragment.appendChild(commentElement);
            });
            this.elements.commentsList.appendChild(fragment);
        }

        setTimeout(() => {
            this.elements.commentsList.classList.remove('page-transition');
        }, 400);
    }

    // Update pagination UI elements
    updatePaginationUI() {
        if (this.pagination.allComments.length > this.pagination.commentsPerPage) {
            if (this.elements.paginationControls) {
                this.elements.paginationControls.style.display = 'flex';
            }
        } else if (this.elements.paginationControls) {
            this.elements.paginationControls.style.display = 'none';
        }

        if (this.elements.paginationInfo) {
            this.elements.paginationInfo.textContent = `Page ${this.pagination.currentPage} of ${this.pagination.totalPages}`;
        }

        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.pagination.currentPage === 1;
        }

        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = this.pagination.currentPage === this.pagination.totalPages;
        }

        if (this.elements.commentsCount) {
            this.elements.commentsCount.textContent = this.pagination.allComments.length.toLocaleString();
        }

        this.generatePageIndicators();
    }

    // Generate page number indicators
    generatePageIndicators() {
        if (!this.elements.pageIndicators) return;

        this.elements.pageIndicators.innerHTML = '';

        if (this.pagination.totalPages <= 1) return;

        const maxVisiblePages = 5;
        let startPage, endPage;

        if (this.pagination.totalPages <= maxVisiblePages) {
            startPage = 1;
            endPage = this.pagination.totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
            const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

            if (this.pagination.currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxVisiblePages;
            } else if (this.pagination.currentPage + maxPagesAfterCurrent >= this.pagination.totalPages) {
                startPage = this.pagination.totalPages - maxVisiblePages + 1;
                endPage = this.pagination.totalPages;
            } else {
                startPage = this.pagination.currentPage - maxPagesBeforeCurrent;
                endPage = this.pagination.currentPage + maxPagesAfterCurrent;
            }
        }

        // First page
        if (startPage > 1) {
            this.addPageIndicator(1);
            if (startPage > 2) {
                this.addEllipsis();
            }
        }

        // Add pages in range
        for (let i = startPage; i <= endPage; i++) {
            this.addPageIndicator(i);
        }

        // Last page if needed
        if (endPage < this.pagination.totalPages) {
            if (endPage < this.pagination.totalPages - 1) {
                this.addEllipsis();
            }
            this.addPageIndicator(this.pagination.totalPages);
        }
    }

    // Add individual page indicator
    addPageIndicator(pageNumber) {
        if (!this.elements.pageIndicators) return;

        const indicator = document.createElement('button');
        indicator.className = `page-indicator ${pageNumber === this.pagination.currentPage ? 'active' : ''}`;
        indicator.textContent = pageNumber;
        indicator.addEventListener('click', () => this.goToPage(pageNumber));
        this.elements.pageIndicators.appendChild(indicator);
    }

    // Add ellipsis to page indicators
    addEllipsis() {
        if (!this.elements.pageIndicators) return;

        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-indicator ellipsis';
        ellipsis.textContent = '...';
        this.elements.pageIndicators.appendChild(ellipsis);
    }

    // Show login prompt animation
    showLoginPrompt() {
        if (this.elements.commentInput) {
            this.elements.commentInput.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                this.elements.commentInput.style.animation = '';
            }, 500);
        }
    }

    /**
     * Submits the comment to the server, adds the returned comment to the UI on success
     */
    async submitComment() {
        const originalText = this.elements.commentSubmit.innerHTML;

        try {
            this.elements.commentSubmit.disabled = true;

            const response = await apiFetch(this.apiEndpoints.sendComment, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    comment: this.elements.commentInput.value.trim(),
                    receiverId: this.targetPlayerId,
                    receiverPermaLink: this.targetPermaLink
                }
            });

            if (!response) {
                showToast(`There was an error sending your comment.`, 'error');
            }

            this.elements.commentInput.value = '';

            // Add comment visually
            this.addCommentToUI({
                id: response.id,
                text: response.text,
                author: response.author,
                author_id: response.author_id,
                avatar: response.avatar,
                date: response.date,
                timestamp: response.timestamp,
                likes: [],
                replies: [],
                is_deleted: false
            });

            this.showCommentSuccess();

        } catch (error) {
            showToast('Error sending comment:', error);
            this.showCommentError(error.message);
        } finally {
            this.elements.commentSubmit.disabled = false;
        }
    }

    /**
     * Prepends a new comment to the internal comments array and re-renders the first page.
     * @param {Object} comment - The comment data object returned from the server
     * @param {string} comment.id - Comment ID
     * @param {string} comment.text - Comment body text
     * @param {string} comment.author - Author display name
     * @param {number} comment.timestamp - Unix timestamp of the comment
     */
    addCommentToUI(comment) {
        this.pagination.allComments.unshift(comment);
        this.pagination.totalPages = Math.ceil(this.pagination.allComments.length / this.pagination.commentsPerPage);

        const noComments = document.querySelector('.no-comments');
        if (noComments) {
            noComments.remove();
        }

        this.pagination.currentPage = 1;
        this.renderCurrentPage();
        this.updatePaginationUI();

        if (this.elements.commentsList?.firstChild) {
            this.elements.commentsList.firstChild.classList.add('new-comment');

            setTimeout(() => {
                if (this.elements.commentsList.firstChild) {
                    this.elements.commentsList.firstChild.classList.remove('new-comment');
                }
            }, 600);
        }
    }

    // Show success message
    showCommentSuccess() {
        if (!this.elements.commentSubmit) return;

        const originalHtml = this.elements.commentSubmit.innerHTML;

        this.elements.commentSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Sent!';
        this.elements.commentSubmit.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))';
        this.elements.commentSubmit.style.borderColor = 'rgba(16, 185, 129, 0.3)';

        setTimeout(() => {
            this.elements.commentSubmit.innerHTML = originalHtml;
            this.elements.commentSubmit.style.background = '';
            this.elements.commentSubmit.style.borderColor = '';
        }, 2000);
    }

    /**
     * Temporarily shows an error message on the submit button
     * @param {string} errorMessage - The error text to display
     */
    showCommentError(errorMessage) {
        if (!this.elements.commentSubmit) return;

        const originalHtml = this.elements.commentSubmit.innerHTML;

        this.elements.commentSubmit.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${errorMessage}`;
        this.elements.commentSubmit.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))';
        this.elements.commentSubmit.style.borderColor = 'rgba(239, 68, 68, 0.3)';

        setTimeout(() => {
            this.elements.commentSubmit.innerHTML = originalHtml;
            this.elements.commentSubmit.style.background = '';
            this.elements.commentSubmit.style.borderColor = '';
        }, 3000);
    }

    /**
     * Fetches comments from the server JSON and renders the first page with pagination controls.
     */
    async loadComments() {
        try {
            const url = `${this.apiEndpoints.loadComments}player_${this.targetPermaLink}.json`;
            const response = await apiFetch(url, {
                cacheBust: true,
                showErrorToast: false
            });

            if (!response) {
                console.error('Failed to load comments');

                this.displayNoComments();

                return;
            }

            this.pagination.allComments = response;
            this.pagination.allComments.sort((a, b) => b.timestamp - a.timestamp);

            // Get rid of bad comments by ANY means
            this.pagination.allComments = this.pagination.allComments.filter(comment =>
                comment && comment.timestamp && comment.text
            );

            this.pagination.totalPages = Math.ceil(this.pagination.allComments.length / this.pagination.commentsPerPage);
            this.pagination.currentPage = 1;

            this.renderCurrentPage();
            this.updatePaginationUI();

        } catch (error) {
            console.error('Error loading comments:', error);
            this.displayNoComments();
        }
    }

    /**
     * Creates a DOM element for a single comment with avatar, author name, date, and text.
     * @param {Object} comment - The comment data object
     * @param {number} comment.timestamp - Unix timestamp (seconds) of the comment
     * @param {string} comment.text - The comment body (HTML-entity-encoded)
     * @param {string} comment.permaLink - The permaLink to match with leaderboard data
     * @param {string} [comment.author] - Author name (falls back to leaderboard data)
     * @param {string} [comment.avatar] - URL to the author's avatar image (falls back to leaderboard data)
     * @returns {HTMLDivElement} The constructed comment DOM element
     */
    createCommentElement(comment, isReply = false) {
        const commentDiv = document.createElement('div');
        commentDiv.className = `comment ${isReply ? 'reply-comment' : ''}`;
        commentDiv.dataset.commentId = comment.id;

        let playerData = null;
        let profileId = null;
        let isOnline = false;

        const commentPermaLink = comment.permaLink;

        if (commentPermaLink) {
            playerData = window.findPlayerByPermaLink(commentPermaLink);
            if (playerData) {
                profileId = playerData.id;
            }
        }

        let authorName = comment.author || 'Anonymous';
        let avatarUrl = comment.avatar || 'media/default_avatar.png';
        let hasPlayerData = false;
        let playerRaidCount = 0;
        let isStaff = false;
        let isTrusted = false;
        let isCasual = false;

        if (playerData) {
            hasPlayerData = true;
            authorName = playerData.name || authorName;
            avatarUrl = playerData.profilePicture || avatarUrl;
            profileId = playerData.id || profileId;
            playerRaidCount = playerData.networkRaids || playerData.totalRaids || 0;
            isStaff = playerData.dev === true;
            isTrusted = playerData.trusted === true;
            isCasual = playerData.isCasual === true;
            isOnline = window.heartbeatMonitor?.isOnline?.(profileId) || false;
        }

        const isAuthor = this.isAuthor(comment.author_id);
        const canDelete = this.canDeleteComment(comment);
        const isDeleted = comment.is_deleted || false;
        const userProfileId = this.getCurrentUserId();
        const isLiked = comment.likes && comment.likes.includes(userProfileId);
        const likeCount = comment.likes ? comment.likes.length : 0;

        const decodedText = this.decodeHtmlEntities(comment.text);
        const pmcSideHtml = hasPlayerData ? window.getPlayerSideImageHTML(playerData) : '';
        const roleBadgesHtml = this.getRoleBadgesHtml({ isStaff, isTrusted, isCasual });
        const onlineStatusHtml = hasPlayerData ? `
            <div class="online-status-indicator ${isOnline ? 'online' : 'offline'}"
                title="${isOnline ? 'Currently Online' : 'Last seen recently'}">
                <span class="status-dot"></span>
            </div>
        ` : '';

        let actionButtonsHtml = `
            <div class="comment-actions">
                <button class="action-cm-btn like-btn ${isLiked ? 'liked' : ''}" data-comment-id="${comment.id}">
                    <i class="fa-solid fa-heart"></i>
                    <span class="like-count">${likeCount}</span>
                </button>
        `;

        if (!isReply && !isDeleted) {
            actionButtonsHtml += `
                <button class="action-cm-btn reply-btn" data-comment-id="${comment.id}">
                    <i class="fa-solid fa-reply"></i>
                    <span>Reply</span>
                </button>
            `;
        }

        if (canDelete && !isDeleted) {
            actionButtonsHtml += `
                <button class="action-cm-btn delete-btn" data-comment-id="${comment.id}">
                    <i class="fa-solid fa-trash-can"></i>
                    <span>Delete</span>
                </button>
            `;
        }

        if (isDeleted) {
            actionButtonsHtml += `
                <span class="deleted-badge">
                    <i class="fa-solid fa-trash-can"></i> Deleted
                </span>
            `;
        }

        actionButtonsHtml += `</div>`;

        let userInfoHtml = '';

        if (profileId) {
            userInfoHtml = `
                <div class="user-info">
                    <div class="user-name-wrapper">
                        <a href="javascript:void(0)"
                        onclick="openProfile('${this.escapeHtml(profileId)}', true)"
                        class="user-name-link ${hasPlayerData ? 'verified-user' : ''}">
                            ${isDeleted ? '[Deleted]' : this.escapeHtml(authorName)}
                        </a>
                        ${hasPlayerData && !isDeleted ? `
                            <div class="player-stats-comment">
                                <span class="verified-badge">
                                    <i class="fa-solid fa-user-check"></i>
                                </span>
                                ${roleBadgesHtml}
                                ${playerRaidCount > 0 ? `
                                    <span class="raid-count-badge">
                                        <i class="fa-solid fa-gamepad"></i> ${playerRaidCount.toLocaleString()} Raids
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="comment-date">${window.formatLastPlayedRaid(comment.timestamp)}</div>
                </div>
            `;
        } else {
            userInfoHtml = `
                <div class="user-info">
                    <div class="user-name-wrapper">
                        <span class="user-name ${hasPlayerData ? 'verified-user' : 'guest-user'}">
                            ${isDeleted ? '[Deleted]' : this.escapeHtml(authorName)}
                        </span>
                        ${!hasPlayerData && !isDeleted ? '<span class="guest-badge">Guest</span>' : ''}
                    </div>
                    <div class="comment-date">${window.formatLastPlayedRaid(comment.timestamp)}</div>
                </div>
            `;
        }

        commentDiv.innerHTML = `
            <div class="comment-header">
                <div class="avatar-wrapper ${hasPlayerData ? 'has-player-data' : ''}" 
                    ${profileId ? `onclick="openProfile('${this.escapeHtml(profileId)}', true)"` : ''}>
                    <img src="${this.escapeHtml(avatarUrl)}"
                        alt="User Avatar" class="user-avatar"
                        loading="lazy"
                        onerror="this.src='media/default_avatar.png'">
                    ${pmcSideHtml ? `<div class="pmc-side-wrapper-comment">${pmcSideHtml}</div>` : ''}
                    ${onlineStatusHtml}
                </div>
                ${userInfoHtml}
            </div>
            ${!isDeleted ? `
                <div class="comment-content">
                    ${this.escapeHtml(decodedText)}
                </div>
            ` : `
                <div class="comment-content deleted-content">
                    <em>This comment has been deleted</em>
                </div>
            `}
            <div class="comment-footer">
                ${actionButtonsHtml}
            </div>
        `;

        setTimeout(() => {
            const likeBtn = commentDiv.querySelector('.like-btn');
            if (likeBtn) {
                likeBtn.addEventListener('click', () => this.handleLike(comment.id));
            }

            const replyBtn = commentDiv.querySelector('.reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', () => this.handleReply(comment.id));
            }

            const deleteBtn = commentDiv.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.handleDelete(comment.id));
            }
        }, 0);

        if (comment.replies && comment.replies.length > 0 && !isReply) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'replies-container';

            comment.replies.forEach(reply => {
                if (!reply.is_deleted || (reply.is_deleted && this.isAuthor(reply.author_id))) {
                    const replyElement = this.createCommentElement(reply, true);
                    repliesContainer.appendChild(replyElement);
                }
            });

            commentDiv.appendChild(repliesContainer);
        }

        return commentDiv;
    }

    async handleLike(commentId) {
        if (!this.isLoggedIn) {
            this.showLoginPrompt();
            return;
        }

        try {
            const response = await apiFetch(this.apiEndpoints.likeComment, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    comment_id: commentId,
                    permaLink: this.targetPermaLink,
                    liker_profile_id: this.getCurrentUserId()
                }
            });

            if (!response) {
                throw new Error('Failed to like comment');
            }

            if (response.success) {
                const comment = this.findComment(commentId);
                if (comment) {
                    if (response.liked) {
                        if (!comment.likes) comment.likes = [];
                        comment.likes.push(this.getCurrentUserId());
                    } else {
                        comment.likes = comment.likes.filter(id => id !== this.getCurrentUserId());
                    }

                    // UI
                    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
                    if (commentElement) {
                        const likeBtn = commentElement.querySelector('.like-btn');
                        const likeCount = commentElement.querySelector('.like-count');
                        if (likeBtn) {
                            likeBtn.classList.toggle('liked', response.liked);
                        }
                        if (likeCount) {
                            likeCount.textContent = comment.likes.length;
                        }
                    }
                }
            }
        } catch (error) {
            showToast('Failed to like comment', 'error');
        }
    }

    async handleReply(commentId) {
        if (!this.isLoggedIn) {
            this.showLoginPrompt();
            return;
        }

        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;

        // remove existing reply form
        const existingForm = commentElement.querySelector('.reply-form');
        if (existingForm) {
            existingForm.remove();
            return;
        }

        const replyForm = document.createElement('div');
        replyForm.className = 'reply-form';
        replyForm.innerHTML = `
            <div class="reply-form-content">
                <input class="reply-input" placeholder="Write a reply..." rows="2"></input>
                <div class="reply-form-actions">
                    <button class="reply-submit-btn">Reply</button>
                    <button class="reply-cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        const repliesContainer = commentElement.querySelector('.replies-container') || commentElement;
        repliesContainer.appendChild(replyForm);

        const textarea = replyForm.querySelector('.reply-input');
        const submitBtn = replyForm.querySelector('.reply-submit-btn');
        const cancelBtn = replyForm.querySelector('.reply-cancel-btn');

        textarea.focus();

        submitBtn.addEventListener('click', async () => {
            const text = textarea.value.trim();
            if (!text) return;

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';

                const response = await apiFetch(this.apiEndpoints.replyComment, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        parent_id: commentId,
                        receiverPermaLink: this.targetPermaLink,
                        comment: text,
                        receiverId: this.targetPlayerId
                    }
                });

                if (!response) {
                    throw new Error('Failed to send reply');
                }

                if (response.success) {
                    const parentComment = this.findComment(commentId);
                    if (parentComment) {
                        if (!parentComment.replies) parentComment.replies = [];
                        parentComment.replies.push(response.reply);

                        this.rebuildCommentElement(commentId);
                    }
                }
            } catch (error) {
                showToast('Failed to send reply', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reply';
            }
        });

        cancelBtn.addEventListener('click', () => {
            replyForm.remove();
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitBtn.click();
            }
            if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });
    }

    async handleDelete(commentId) {
        if (!this.isLoggedIn) return;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await apiFetch(this.apiEndpoints.deleteComment, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    comment_id: commentId,
                    permaLink: this.targetPermaLink
                }
            });

            if (!response) {
                showToast('Failed to delete comment', 'error');
            }

            if (response.success) {
                const comment = this.findComment(commentId);
                if (comment) {
                    comment.is_deleted = true;
                    comment.deleted_at = Date.now();
                    this.rebuildCommentElement(commentId);
                }
            }
        } catch (error) {
            showToast('Failed to delete comment', 'error');
        }
    }

    findComment(commentId) {
        for (const comment of this.pagination.allComments) {
            if (comment.id === commentId) return comment;
            if (comment.replies) {
                for (const reply of comment.replies) {
                    if (reply.id === commentId) return reply;
                }
            }
        }
        return null;
    }

    rebuildCommentElement(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentElement) {
            const comment = this.findComment(commentId);
            if (comment) {
                const newElement = this.createCommentElement(comment);
                commentElement.replaceWith(newElement);
            }
        } else {
            this.loadComments();
        }
    }

    isAuthor(authorId) {
        return this.currentUserId === authorId;
    }

    /**
     * Generate HTML for role badges based on player flags
     * @param {Object} roles - Object with role flags
     * @returns {string} HTML
     */
    getRoleBadgesHtml(roles) {
        const badges = [];

        // Staff badge
        if (roles.isStaff) {
            badges.push(`
                <span class="role-badge staff-badge" title="Staff Member">
                    <i class="fa-solid fa-user-shield promo-name"></i> Staff
                </span>
            `);
        }

        // Staff badge
        if (roles.isCasual) {
            badges.push(`
                <span class="role-badge casual-badge" title="Casual Player">
                    <i class="fa-solid fa-star-half"></i> Casual
                </span>
            `);
        } else {
            badges.push(`
                <span class="role-badge ranked-badge" title="Ranked Player">
                    <i class="fa-solid fa-star-half-stroke"></i> Ranked
                </span>
            `);
        }

        // Trusted
        if (roles.isTrusted) {
            badges.push(`
                <span class="role-badge trusted-badge" title="Trusted Member/Tester">
                    <i class="fa-solid fa-earth-americas"></i> Trusted
                </span>
            `);
        }

        return badges.join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Display "no comments" message
    displayNoComments() {
        if (this.elements.commentsList) {
            this.elements.commentsList.innerHTML = `
                <div class="no-comments">
                    <i class="fa-solid fa-comment"></i>
                    <p>No comments yet</p>
                    <span>Be the first to leave a comment!</span>
                </div>
            `;
        }

        if (this.elements.paginationControls) {
            this.elements.paginationControls.style.display = 'none';
        }

        if (this.elements.commentsCount) {
            this.elements.commentsCount.textContent = '0';
        }
    }

    // Format date for display
    /**
     * Formats a Date object into a localized date string.
     * @param {Date} date - The date to format
     * @returns {string} The formatted date string
     */
    formatDate(date) {
        return date.toLocaleDateString();
    }

    /**
     * Decodes safe HTML entities (apostrophes, quotes, ampersands, less-than, greater-than) back to characters.
     * Intentionally does NOT decode complex entities to prevent XSS.
     * @param {string} text - The HTML-entity-encoded string
     * @returns {string} The decoded string with safe entities restored
     */
    decodeHtmlEntities(text) {
        const entities = {
            '&#39;': "'",
            '&quot;': '"',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>'
        };

        return text.replace(/&#?\w+;/g, match => entities[match] || match);
    }

    destroy() {
        if (this.elements.commentSubmit) {
            const newSubmit = this.elements.commentSubmit.cloneNode(true);
            this.elements.commentSubmit.parentNode?.replaceChild(newSubmit, this.elements.commentSubmit);
            this.elements.commentSubmit = newSubmit;
        }

        if (this.elements.commentInput) {
            const newInput = this.elements.commentInput.cloneNode(true);
            this.elements.commentInput.parentNode?.replaceChild(newInput, this.elements.commentInput);
            this.elements.commentInput = newInput;
        }

        if (this.elements.prevBtn) {
            const newPrevBtn = this.elements.prevBtn.cloneNode(true);
            this.elements.prevBtn.parentNode?.replaceChild(newPrevBtn, this.elements.prevBtn);
            this.elements.prevBtn = newPrevBtn;
        }

        if (this.elements.nextBtn) {
            const newNextBtn = this.elements.nextBtn.cloneNode(true);
            this.elements.nextBtn.parentNode?.replaceChild(newNextBtn, this.elements.nextBtn);
            this.elements.nextBtn = newNextBtn;
        }

        if (this.elements.pageIndicators) {
            this.elements.pageIndicators.innerHTML = '';
        }

        if (this.timeouts) {
            this.timeouts.forEach(timeout => clearTimeout(timeout));
            this.timeouts = [];
        }

        // Clear references
        this.pagination.allComments = [];
        this.elements = {};
        this.isLoggedIn = false;
        this.permaLink = null;
        this.playerId = null;

        console.log('CommentsManager destroyed');
    }
}
// #endregion

// #region Profile Heartbeat Animator
/**
 * @class RaidTimeAnimator
 * @description Animates in-game raid time on a player's profile using requestAnimationFrame.
 * Advances a displayed HH:MM:SS clock at an accelerated rate (default 7x real-time) to
 * simulate the in-raid time progression between heartbeat updates.
 */
class RaidTimeAnimator {
    /**
     * @param {HTMLElement} timeElement - The DOM element whose textContent will be updated with the animated time
     * @param {number} [timeMultiplier=7] - Speed multiplier for time advancement (e.g. 7 = 7x real-time)
     */
    constructor(timeElement, timeMultiplier = 7) {
        this.timeElement = timeElement;
        this.timeMultiplier = timeMultiplier;
        this.animationFrame = null;
        this.lastUpdate = null;
        this.currentTime = null;
    }

    /**
     * Starts the time animation from an initial HH:MM:SS string. Stops any existing animation first.
     * @param {string} initialTime - Time string in "Time: HH:MM:SS" or "HH:MM:SS" format
     */
    start(initialTime) {
        this.stop();

        // Parse format HH:MM:SS
        const timeStr = initialTime.replace('Time: ', '');
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);

        // Convert
        this.currentTime = hours * 3600 + minutes * 60 + seconds;
        this.lastDisplayTime = this.currentTime; // Track last displayed time

        this.animate();
    }

    animate() {
        if (!this.currentTime) return;

        const now = Date.now();

        if (this.lastUpdate) {
            const deltaSeconds = (now - this.lastUpdate) / 1000;
            this.currentTime += deltaSeconds * this.timeMultiplier;
        }

        this.lastUpdate = now;

        // Only update display if at least 1 second has passed since last display
        if (Math.floor(this.currentTime) > Math.floor(this.lastDisplayTime)) {
            this.updateDisplay();
            this.lastDisplayTime = this.currentTime;
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.lastUpdate = null;
    }

    updateDisplay() {
        if (!this.currentTime) return;

        const totalSeconds = Math.floor(this.currentTime) % (24 * 3600);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formattedTime = [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');

        this.timeElement.textContent = `Time: ${formattedTime}`;
    }
}
// #endregion

// #region Profile Player Equipment
/**
 * @class PlayerEquipmentDisplay
 * @description Renders a player's equipped gear (headwear, armor, weapons, backpack) as
 * a visual overlay with CDN-sourced item icons. Supports weapon attachment tooltips with
 * grouped attachment categories (scope, magazine, barrel, stock, grip, ammo, tactical).
 */
class PlayerEquipmentDisplay {
    constructor(playerId) {
        this.playerId = playerId;
        this.equipment = {};
        this.container = null;
        this.activeTooltip = null;
        this.isLoading = false;
        this.loadPromise = null;
    }

    /**
     * Fetches the player's equipment data from the server API. Deduplicates concurrent
     * calls by returning the existing promise if a load is already in progress.
     * @returns {Promise<Object>} The equipment data keyed by slot type, or empty object on failure
     */
    async loadEquipmentData() {
        if (this.isLoading) return this.loadPromise;

        this.isLoading = true;
        this.loadPromise = (async () => {
            try {
                const response = await apiFetch(`/api/data/pmc_equipment/${this.playerId}.json`);
                if (!response) console.error('Failed to load equipment data');

                const playerData = response;
                this.equipment = playerData || {};

                return this.equipment;
            } catch (error) {
                console.error(`Error loading equipment for player ${this.playerId}:`, error);
                this.equipment = {};

                return {};
            } finally {
                this.isLoading = false;
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    async ensureDataLoaded() {
        if (Object.keys(this.equipment).length === 0) {
            await this.loadEquipmentData();
        }
    }

    /**
     * Returns the first item from the array that has a unique template_id (deduplication fix).
     * @param {Array<Object>} items - Array of equipment items
     * @returns {Object|null} The first unique item, or null if the array is empty
     */
    getUniqueFirstItem(items) {
        if (!items || items.length === 0) return null;
        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.template_id)) {
                seen.add(item.template_id);
                return item;
            }
        }
        return items[0];
    }

    /**
     * Filters an array of items to only include those with unique template_ids.
     * @param {Array<Object>} items - Array of equipment items
     * @returns {Array<Object>} Deduplicated array preserving original order
     */
    getUniqueItems(items) {
        const seen = new Set();
        return items.filter(item => {
            if (!seen.has(item.template_id)) {
                seen.add(item.template_id);
                return true;
            }
            return false;
        });
    }

    // Clean shortName
    cleanShortName(shortName) {
        return shortName.replace(/<[^>]*>/g, '');
    }

    /**
     * Groups weapon attachments into categories based on name keywords.
     * @param {Array<Object>} attachments - Array of attachment items with `name` properties
     * @returns {{scope: Array, magazine: Array, barrel: Array, stock: Array, grip: Array, ammo: Array, tactical: Array, other: Array}} Grouped attachments
     */
    groupAttachmentsByType(attachments) {
        const groups = {
            scope: [],
            magazine: [],
            barrel: [],
            stock: [],
            grip: [],
            ammo: [],
            tactical: [],
            other: []
        };

        attachments.forEach(item => {
            const a = item;

            if (a.name.includes('riflescope') ||
                a.name.includes('scope') ||
                a.name.includes('optic') ||
                a.name.includes('holographic') ||
                a.name.includes('reflex sight')) {
                groups.scope.push(item);
            }
            else if (a.name.includes('magazine')) {
                groups.magazine.push(item);
            }
            else if (a.name.includes('tactical')) {
                groups.tactical.push(item);
            }
            else if (a.name.includes('barrel') ||
                a.name.includes('receiver') ||
                a.name.includes('flash hider') ||
                a.name.includes('silencer') ||
                a.name.includes('suppressor')) {
                groups.barrel.push(item);
            }
            else if (a.name.includes('stock') ||
                a.name.includes('buttpad') ||
                a.name.includes('cheek') ||
                a.name.includes('fold')) {
                groups.stock.push(item);
            }
            else if (a.name.includes('grip') ||
                a.name.includes('foregrip')) {
                groups.grip.push(item);
            }
            else if (a.name.includes('mm') ||
                a.name.includes('Lapua Magnum')) {
                groups.ammo.push(item);
            } else {
                groups.other.push(item);
            }
        });

        return groups;
    }

    /**
     * Generates the HTML string for a single attachment item with a loading spinner placeholder.
     * @param {Object} item - The attachment item object
     * @param {string} item.template_id - The item's template ID for CDN image lookup
     * @param {string} item.name - The item's display name
     * @param {number} [item.amount] - Stack count (displayed if > 1)
     * @returns {string} HTML string for the attachment element
     */
    createAttachmentHtml(item) {
        const itemId = item.template_id;
        const cleanName = this.cleanShortName(item.name);

        // Create a unique ID for this attachment to reference later
        const attachmentId = `attachment-${itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        let details = [];
        if (cleanName.includes('mm')) {
            const caliber = cleanName.match(/\d+\.\d+x\d+/);
            if (caliber) details.push(caliber[0]);
        }

        return `
            <div class="attachment-item" data-item-id="${itemId}" data-attachment-id="${attachmentId}">
                <div class="attachment-icon">
                    <div class="attachment-icon-placeholder"
                         data-attachment-id="${attachmentId}"
                         data-item-id="${itemId}"
                         data-item-name="${cleanName}"
                         style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid #444; border-top-color: #888; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                </div>
                <div class="attachment-info">
                    <span class="attachment-name">${cleanName}</span>
                    ${details.length > 0 ? `
                        <div class="attachment-details">
                            ${details.map(d => `<span>${d}</span>`).join(' • ')}
                        </div>
                    ` : ''}
                </div>
                ${item.amount > 1 ? `<span class="attachment-amount">x${item.amount}</span>` : ''}
            </div>
        `;
    }

    /**
     * Finds all attachment placeholder elements within a tooltip and triggers async image loading for each.
     * @param {HTMLElement} tooltipElement - The tooltip DOM element containing attachment placeholders
     */
    loadAttachmentImages(tooltipElement) {
        const placeholders = Array.from(tooltipElement.querySelectorAll('.attachment-icon-placeholder'));

        if (placeholders.length === 0) return;

        // Batching for image loading
        const loadPromises = placeholders.map(placeholder => {
            const itemId = placeholder.dataset.itemId;
            const itemName = placeholder.dataset.itemName;
            const attachmentId = placeholder.dataset.attachmentId;

            return this.loadAttachmentImage(itemId, itemName, attachmentId, placeholder);
        });

        const batchSize = 3;
        for (let i = 0; i < loadPromises.length; i += batchSize) {
            setTimeout(() => {
                loadPromises.slice(i, i + batchSize).forEach(promise => promise.catch(console.error));
            }, i * 50);
        }
    }

    /**
     * Loads an attachment image, trying the CDN first, then falling back to a local URL.
     * Replaces the loading spinner placeholder with the loaded image on success.
     * @param {string} itemId - The item's template ID
     * @param {string} itemName - The item's display name (used for local fallback path)
     * @param {string} attachmentId - Unique ID for this attachment DOM element
     * @param {HTMLElement} placeholderElement - The placeholder element to replace with the loaded image
     */
    async loadAttachmentImage(itemId, itemName, attachmentId, placeholderElement) {
        // Try CDN first
        const cdnUrl = `https://assets.tarkov.dev/${itemId}-512.webp`;
        const localUrl = `media/weapon_attachments/${this.cleanShortName(itemName)}`;

        try {
            const cdnSuccess = await this.testImageLoad(cdnUrl, 1000);

            const img = document.createElement('img');
            img.alt = this.cleanShortName(itemName);
            img.loading = 'lazy';

            img.onerror = async () => {
                try {
                    const localSuccess = await this.testImageLoad(localUrl, 1000);
                    if (localSuccess) {
                        img.src = localUrl;
                    } else {
                        this.showFallbackIcon(placeholderElement);
                    }
                } catch {
                    this.showFallbackIcon(placeholderElement);
                }
            };

            // Set src
            if (cdnSuccess) {
                img.src = cdnUrl;
            } else {
                // Try local
                try {
                    const localSuccess = await this.testImageLoad(localUrl, 1000);
                    if (localSuccess) {
                        img.src = localUrl;
                    } else {
                        this.showFallbackIcon(placeholderElement);
                        return;
                    }
                } catch {
                    this.showFallbackIcon(placeholderElement);
                    return;
                }
            }

            // Replace placeholder
            img.onload = () => {
                placeholderElement.innerHTML = ''; // Clear loading spinner
                placeholderElement.appendChild(img);
                placeholderElement.classList.remove('attachment-icon-placeholder');
                placeholderElement.classList.add('attachment-icon-loaded');
            };

        } catch (error) {
            console.error(`PlayerEquipmentDisplay Error! ${error}`);
        }
    }


    /**
     * Shows a fallback icon when image loading fails.
     * @param {HTMLElement} placeholderElement - The element to update with fallback
     */
    showFallbackIcon(placeholderElement) {
        placeholderElement.innerHTML = '<i class="fa-solid fa-image" style="font-size: 20px; color: #666;"></i>';
        placeholderElement.classList.remove('attachment-icon-placeholder');
        placeholderElement.classList.add('attachment-icon-fallback');
    }

    async testImageLoad(url, timeout = 2000) {
        return new Promise((resolve) => {
            const img = new Image();
            let timer;

            img.onload = () => {
                clearTimeout(timer);
                resolve(true);
            };

            img.onerror = () => {
                clearTimeout(timer);
                resolve(false);
            };

            timer = setTimeout(() => {
                img.src = '';
                resolve(false);
            }, timeout);

            img.src = url;
        });
    }

    /**
     * Creates and returns the complete equipment overlay DOM element containing head gear,
     * armor, weapons, and backpack columns. Loads equipment data if not already cached.
     * @returns {Promise<HTMLDivElement>} The constructed overlay element
     */
    async createViewModelOverlay() {
        await this.ensureDataLoaded();

        const overlay = document.createElement('div');
        overlay.className = 'viewmodel-equipment-overlay';

        this.createHeadColumn(overlay);
        this.createArmorColumn(overlay);
        this.createWeaponColumn(overlay);
        this.createBackpackItem(overlay);

        return overlay;
    }

    /**
     * Builds and appends the head gear column (Headwear, FaceCover, Earpiece, Eyewear) to the overlay.
     * @param {HTMLElement} overlay - The parent overlay element to append the column to
     */
    createHeadColumn(overlay) {
        const headItems = [
            { type: 'Headwear', displayName: 'Helmet' },
            { type: 'FaceCover', displayName: 'Face Cover' },
            { type: 'Earpiece', displayName: 'Headset' },
            { type: 'Eyewear', displayName: 'Eyewear' }
        ].filter(item => this.equipment[item.type] && this.equipment[item.type].length > 0);

        if (headItems.length === 0) return;

        const headColumn = document.createElement('div');
        headColumn.className = 'viewmodel-head-column';

        headItems.forEach(item => {
            const uniqueItem = this.getUniqueFirstItem(this.equipment[item.type]);
            if (!uniqueItem) return;

            const itemDiv = this.createViewModelItem(uniqueItem, item.displayName, 'square');
            headColumn.appendChild(itemDiv);
        });

        overlay.appendChild(headColumn);
    }

    /**
     * Builds and appends the armor column (TacticalVest, ArmorVest) to the overlay.
     * @param {HTMLElement} overlay - The parent overlay element to append the column to
     */
    createArmorColumn(overlay) {
        const armorItems = [
            { type: 'TacticalVest', displayName: 'Tactical Vest' },
            { type: 'ArmorVest', displayName: 'Armor Vest' }
        ].filter(item => this.equipment[item.type] && this.equipment[item.type].length > 0);

        if (armorItems.length === 0) return;

        const armorColumn = document.createElement('div');
        armorColumn.className = 'viewmodel-armor-column';

        armorItems.forEach(item => {
            const uniqueItem = this.getUniqueFirstItem(this.equipment[item.type]);
            if (!uniqueItem) return;

            const itemDiv = this.createViewModelItem(uniqueItem, item.displayName, 'square');
            armorColumn.appendChild(itemDiv);
        });

        overlay.appendChild(armorColumn);
    }

    /**
     * Builds and appends the weapon column (Holster, Primary, Secondary) with click-to-expand
     * attachment tooltips for weapons that have attachments.
     * @param {HTMLElement} overlay - The parent overlay element to append the column to
     */
    createWeaponColumn(overlay) {
        const weaponItems = [
            { type: 'Holster', displayName: 'Holster', className: 'holster' },
            { type: 'FirstPrimaryWeapon', displayName: 'Primary', className: 'primary' },
            { type: 'SecondPrimaryWeapon', displayName: 'Secondary', className: 'secondary' }
        ].filter(item => this.equipment[item.type] && this.equipment[item.type].length > 0);

        if (weaponItems.length === 0) return;

        const weaponColumn = document.createElement('div');
        weaponColumn.className = 'viewmodel-weapon-column';

        weaponItems.forEach(item => {
            const items = this.equipment[item.type] || [];
            const uniqueItems = this.getUniqueItems(items);
            if (uniqueItems.length === 0) return;

            const weapon = uniqueItems[0];
            const attachments = uniqueItems.slice(1);

            const weaponDiv = document.createElement('div');
            weaponDiv.className = `viewmodel-weapon-item ${item.className}`;

            const itemId = cleanWeaponNameFunc(weapon.shortName);
            const iconUrl = `media/weapon_icons/${itemId}.webp`;

            weaponDiv.innerHTML = `
                <div class="viewmodel-icon-rectangle">
                    <img src="${iconUrl}"
                         alt="${this.cleanShortName(weapon.shortName)}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='fallback-image-url.png';">
                </div>
                <span class="viewmodel-item-name">${this.cleanShortName(weapon.shortName)}</span>
                ${attachments.length > 0 ? `<span class="viewmodel-attachment-count">+${attachments.length}</span>` : ''}
            `;

            if (attachments.length > 0) {
                weaponDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleTooltip(weaponDiv, weapon, attachments);
                });
            }

            weaponColumn.appendChild(weaponDiv);
        });

        overlay.appendChild(weaponColumn);
    }

    /**
     * Builds and appends the backpack item element to the overlay.
     * @param {HTMLElement} overlay - The parent overlay element to append the backpack to
     */
    createBackpackItem(overlay) {
        const backpackItems = this.equipment['Backpack'] || [];
        const uniqueItem = this.getUniqueFirstItem(backpackItems);

        if (!uniqueItem) return;

        const backpackDiv = document.createElement('div');
        backpackDiv.className = 'viewmodel-backpack';

        const itemId = uniqueItem.template_id;
        const iconUrl = `https://assets.tarkov.dev/${itemId}-512.webp`;

        backpackDiv.innerHTML = `
            <div class="viewmodel-icon-square">
                <img src="${iconUrl}"
                     alt="${this.cleanShortName(uniqueItem.shortName)}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='fallback-image-url.png';">
            </div>
            <span class="viewmodel-item-name">${this.cleanShortName(uniqueItem.shortName)}</span>
        `;

        overlay.appendChild(backpackDiv);
    }

    /**
     * Creates a single viewmodel item element with a CDN-sourced icon image.
     * @param {Object} item - The equipment item object
     * @param {string} item.template_id - The item's template ID for CDN image lookup
     * @param {string} item.shortName - The item's display name (may contain HTML color tags)
     * @param {string} displayName - Human-readable label for the slot (e.g. "Helmet", "Armor Vest")
     * @param {string} [iconType='square'] - Icon container CSS class suffix ("square" or "rectangle")
     * @returns {HTMLDivElement} The constructed viewmodel item element
     */
    createViewModelItem(item, displayName, iconType = 'square') {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'viewmodel-head-item';
        itemDiv.setAttribute('data-item-type', displayName);

        const itemId = item.template_id;
        const iconUrl = `https://assets.tarkov.dev/${itemId}-512.webp`;

        itemDiv.innerHTML = `
            <div class="viewmodel-icon-${iconType}">
                <img src="${iconUrl}"
                     alt="${this.cleanShortName(item.shortName)}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='fallback-image-url.png';">
            </div>
            <span class="viewmodel-item-name">${this.cleanShortName(item.shortName)}</span>
        `;

        return itemDiv;
    }

    /**
     * Toggles the weapon attachment tooltip for a given weapon element. Closes if already
     * open on the same target, otherwise creates and positions a new tooltip.
     * @param {HTMLElement} targetElement - The weapon DOM element that was clicked
     * @param {Object} weapon - The weapon item object
     * @param {Array<Object>} attachments - Array of attachment items to display in the tooltip
     */
    toggleTooltip(targetElement, weapon, attachments) {
        if (this.activeTooltip && this.activeTooltip.target === targetElement) {
            this.closeTooltip();
            return;
        }

        this.closeTooltip();

        const tooltip = this.createTooltip(weapon, attachments);
        this.showTooltip(targetElement, tooltip);

        // Load attachment images AFTER tooltip
        this.loadAttachmentImages(tooltip);
    }

    /**
     * Creates the tooltip DOM element with grouped attachment listings and a close button.
     * @param {Object} weapon - The weapon item object (used for the tooltip header)
     * @param {Array<Object>} attachments - Array of attachment items to display
     * @returns {HTMLDivElement} The constructed tooltip element (not yet positioned or appended)
     */
    createTooltip(weapon, attachments) {
        const tooltip = document.createElement('div');
        tooltip.className = 'weapon-hover mainvm';

        const attachmentGroups = this.groupAttachmentsByType(attachments);

        let html = `
            <div class="weapon-hover-header">
                <span class="weapon-name">${this.cleanShortName(weapon.shortName)}</span>
                <button class="tooltip-close">x</button>
            </div>
            <div class="weapon-hover-attachments">
        `;

        for (const [type, items] of Object.entries(attachmentGroups)) {
            if (items.length > 0) {
                html += `
                <div class="attachment-group">
                    <div class="attachment-group-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    ${items.map(item => this.createAttachmentHtml(item)).join('')}
                </div>
            `;
            }
        }

        html += '</div>';
        tooltip.innerHTML = html;

        const closeBtn = tooltip.querySelector('.tooltip-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTooltip();
            });
        }

        return tooltip;
    }

    /**
     * Appends the tooltip to the document body and positions it adjacent to the target element,
     * adjusting for viewport boundaries. Registers an outside-click handler to auto-close.
     * @param {HTMLElement} targetElement - The element the tooltip is anchored to
     * @param {HTMLDivElement} tooltip - The tooltip element to position and display
     */
    showTooltip(targetElement, tooltip) {
        document.body.appendChild(tooltip);

        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = targetRect.top - 10;
        let left = targetRect.right + 15;

        if (left + tooltipRect.width > window.innerWidth) {
            left = targetRect.left - tooltipRect.width - 15;
        }

        if (top < 10) {
            top = 10;
        }

        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = window.innerHeight - tooltipRect.height - 10;
        }

        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.zIndex = '10000';

        this.activeTooltip = {
            element: tooltip,
            target: targetElement
        };

        document.addEventListener('click', this.handleOutsideClick);
    }

    handleOutsideClick = (e) => {
        if (this.activeTooltip &&
            !this.activeTooltip.element.contains(e.target) &&
            !this.activeTooltip.target.contains(e.target)) {
            this.closeTooltip();
        }
    }

    closeTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.element.remove();
            this.activeTooltip = null;
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

}
// #endregion

class TabManager {
    constructor(profileId, leaderboardData) {
        this.currentPlayerId = profileId;
        this.currentPlayerObject = null;
        this.activeTab = 'summary';
        this.leaderboardDataToProccess = leaderboardData;
        this.globalAverages = null;
        this.init();
    }

    async init() {
        const tabs = document.querySelectorAll('.raid-tab');
        await this.getGlobalStatistics();

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e));
        });
    }

    async switchTab(event) {
        const tab = event.currentTarget;
        const tabId = tab.dataset.tab;

        if (this.activeTab === tabId) return;

        document.querySelectorAll('.raid-tab').forEach(t => {
            t.classList.remove('active');
        });
        tab.classList.add('active');

        const currentPane = document.getElementById(`tab-${this.activeTab}`);
        const newPane = document.getElementById(`tab-${tabId}`);
        const direction = this.getDirection(tabId);

        newPane.classList.add(direction);

        currentPane.classList.remove('active');
        currentPane.classList.add(this.activeTab === 'summary' ? 'next' : 'prev');

        newPane.classList.add('active');

        setTimeout(() => {
            currentPane.classList.remove('prev', 'next');
            newPane.classList.remove('prev', 'next');
        }, 300);

        this.activeTab = tabId;
    }

    getDirection(newTabId) {
        const tabs = ['summary', 'records'];
        const oldIndex = tabs.indexOf(this.activeTab);
        const newIndex = tabs.indexOf(newTabId);

        return newIndex > oldIndex ? 'next' : 'prev';
    }

    async getGlobalStatistics() {
        const container = document.getElementById('tab-records');
        container.innerHTML = `
            <div class="loader-dots" style="grid-column: 1 / -1;">
                <div class="shimmer-bg"></div>
                <div class="dots-container">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <p class="dots-text">Loading...</p>
            </div>
        `;

        try {
            this.globalAverages = await this.getGlobalStatsPerPlayer(this.leaderboardDataToProccess);

            this.emitAveragesReady();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async getGlobalStatsPerPlayer(leaderboardData) {
        const container = document.getElementById('tab-records');

        if (!leaderboardData || leaderboardData.length === 0) {
            container.innerHTML = `<div class="error-message">No data available</div>`;
            return null;
        }

        this.currentPlayerObject = window.findPlayer(this.currentPlayerId);

        if (!this.currentPlayerObject) {
            container.innerHTML = `<div class="error-message">Player not found in leaderboard</div>`;
            return null;
        }

        // do a single pass for averages
        const stats = this.calculateStatsEfficiently(leaderboardData);

        const averages = {};
        const playerCount = leaderboardData.length;
        Object.keys(stats).forEach(stat => {
            averages[stat] = {
                average: stats[stat].sum / playerCount,
                max: stats[stat].max,
                maxPlayer: stats[stat].maxPlayer
            };
        });

        this.renderGlobalStats(container, averages);

        return averages;
    }

    emitAveragesReady() {
        const event = new CustomEvent('globalAveragesReady', {
            detail: {
                averages: this.globalAverages,
                player: this.currentPlayerObject
            }
        });

        window.dispatchEvent(event);
    }

    getComparisonForStat(statKey, playerValue) {
        if (!this.globalAverages || !this.globalAverages[statKey]) {
            return null;
        }

        const globalAverage = this.globalAverages[statKey].average;
        const difference = playerValue - globalAverage;
        const percentage = globalAverage > 0 ? (difference / globalAverage) * 100 : 0;

        return {
            difference: difference,
            percentage: percentage,
            isHigher: difference > 0,
            isLower: difference < 0,
            isEqual: difference === 0,
            globalAverage: globalAverage
        };
    }

    calculateStatsEfficiently(leaderboardData) {
        const stats = {
            damage: { sum: 0, max: 0, maxPlayer: null },
            currentWinstreak: { sum: 0, max: 0, maxPlayer: null },
            longestShot: { sum: 0, max: 0, maxPlayer: null },
            scavTotalProfit: { sum: 0, max: 0, maxPlayer: null },
            totalProfit: { sum: 0, max: 0, maxPlayer: null },
            scavsKilled: { sum: 0, max: 0, maxPlayer: null },
            bossesKilled: { sum: 0, max: 0, maxPlayer: null },
            scavRaids: { sum: 0, max: 0, maxPlayer: null },
            scavDeaths: { sum: 0, max: 0, maxPlayer: null },
            pmcRaids: { sum: 0, max: 0, maxPlayer: null },
            pmcKills: { sum: 0, max: 0, maxPlayer: null },
            pmcDeaths: { sum: 0, max: 0, maxPlayer: null },
            killToDeathRatio: { sum: 0, max: 0, maxPlayer: null }
        };

        leaderboardData.forEach(player => {
            if (player.isCasual || player.isBanned || player.permBanned) {
                return;
            }

            Object.keys(stats).forEach(stat => {
                const value = parseFloat(player[stat]) || 0;
                stats[stat].sum += value;

                if (value > stats[stat].max) {
                    stats[stat].max = value;
                    stats[stat].maxPlayer = player.name || 'Unknown';
                }
            });
        });

        return stats;
    }

    renderGlobalStats(container, averages) {
        const player = this.currentPlayerObject;
        const statCategories = [
            {
                key: 'damage',
                label: 'Damage Dealt',
                value: player.damage || 0,
                average: averages.damage.average,
                max: averages.damage.max,
                maxPlayer: averages.damage.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'longestShot',
                label: 'Longest Shot',
                value: player.longestShot || 0,
                average: averages.longestShot.average,
                max: averages.longestShot.max,
                maxPlayer: averages.longestShot.maxPlayer,
                higherIsBetter: true,
                unit: 'm'
            },
            {
                key: 'scavTotalProfit',
                label: 'SCAV Profit',
                value: player.scavTotalProfit || 0,
                average: averages.scavTotalProfit.average,
                max: averages.scavTotalProfit.max,
                maxPlayer: averages.scavTotalProfit.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'totalProfit',
                label: 'Total Profit',
                value: player.totalProfit || 0,
                average: averages.totalProfit.average,
                max: averages.totalProfit.max,
                maxPlayer: averages.totalProfit.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'scavsKilled',
                label: 'SCAV Kills',
                value: player.scavsKilled || 0,
                average: averages.scavsKilled.average,
                max: averages.scavsKilled.max,
                maxPlayer: averages.scavsKilled.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'bossesKilled',
                label: 'Boss Kills',
                value: player.bossesKilled || 0,
                average: averages.bossesKilled.average,
                max: averages.bossesKilled.max,
                maxPlayer: averages.bossesKilled.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'scavRaids',
                label: 'SCAV Raids',
                value: player.scavRaids || 0,
                average: averages.scavRaids.average,
                max: averages.scavRaids.max,
                maxPlayer: averages.scavRaids.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'scavDeaths',
                label: 'SCAV Deaths',
                value: player.scavDeaths || 0,
                average: averages.scavDeaths.average,
                max: averages.scavDeaths.max,
                maxPlayer: averages.scavDeaths.maxPlayer,
                higherIsBetter: false,
                unit: '',
                specialMessage: value => value >= averages.scavDeaths.max ? 'Unluckiest SCAV' : null
            },
            {
                key: 'pmcRaids',
                label: 'PMC Raids',
                value: player.pmcRaids || 0,
                average: averages.pmcRaids.average,
                max: averages.pmcRaids.max,
                maxPlayer: averages.pmcRaids.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'pmcKills',
                label: 'PMC Kills',
                value: player.pmcKills || 0,
                average: averages.pmcKills.average,
                max: averages.pmcKills.max,
                maxPlayer: averages.pmcKills.maxPlayer,
                higherIsBetter: true,
                unit: ''
            },
            {
                key: 'pmcDeaths',
                label: 'PMC Deaths',
                value: player.pmcDeaths || 0,
                average: averages.pmcDeaths.average,
                max: averages.pmcDeaths.max,
                maxPlayer: averages.pmcDeaths.maxPlayer,
                higherIsBetter: false,
                unit: '',
                specialMessage: value => value >= averages.pmcDeaths.max ? 'Most Deaths' : null
            },
            {
                key: 'killToDeathRatio',
                label: 'K/D Ratio',
                value: (player.killToDeathRatio || 0).toFixed(2),
                average: averages.killToDeathRatio.average.toFixed(2),
                max: averages.killToDeathRatio.max.toFixed(2),
                maxPlayer: averages.killToDeathRatio.maxPlayer,
                higherIsBetter: true,
                unit: ''
            }
        ];

        let html = '<div class="global-stats-grid">';

        statCategories.forEach(stat => {
            const playerValue = parseFloat(stat.value) || 0;
            const avgValue = parseFloat(stat.average) || 0;
            const maxValue = parseFloat(stat.max) || 0;

            let percentage = 0;
            if (maxValue > 0) {
                percentage = Math.min(100, (playerValue / maxValue) * 100);
            }

            const specialMessage = stat.specialMessage ? stat.specialMessage(playerValue) : null;
            const isRecordHolder = playerValue >= maxValue && maxValue > 0;

            html += `
            <div class="stat-comparison-card ${isRecordHolder ? 'record-holder' : ''}">
                <div class="record-stat-header">
                    <span class="record-stat-label">${stat.label}</span>
                    ${specialMessage ? `<span class="record-special-badge">${specialMessage}</span>` : ''}
                    ${isRecordHolder && !specialMessage ? '<span class="record-badge">Record Holder</span>' : ''}
                </div>
                
                <div class="record-stat-values">
                    <div class="record-player-stat">
                        <span class="record-value">${this.formatNumber(playerValue)}${stat.unit}</span>
                        <span class="record-label">${this.currentPlayerObject.name}</span>
                    </div>
                    <div class="record-average-stat">
                        <span class="record-value">${this.formatNumber(avgValue)}${stat.unit}</span>
                        <span class="record-label">Average</span>
                    </div>
                    <div class="record-max-stat">
                        <span class="record-value">${this.formatNumber(maxValue)}${stat.unit}</span>
                        <span class="record-label">Best</span>
                        <span class="record-max-player" title="${stat.maxPlayer}">by ${window.truncateName(stat.maxPlayer)}</span>
                    </div>
                </div>
                
                <div class="record-progress-container">
                    <div class="record-progress-bar">
                        <div class="record-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="record-progress-label">Holds the top of ${percentage.toFixed(1)}%</span>
                </div>
            </div>
        `;
        });

        html += '</div>';

        container.innerHTML = html;
    }

    formatNumber(value) {
        const num = parseFloat(value) || 0;
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.round(num).toLocaleString();
    }
}

// #region Profile Loader
class ProfileLoader {
    constructor() {
        this.loaderElement = document.getElementById('loading-model');
        this.loaderText = document.getElementById('loading-text');
        this.contentElement = document.getElementById('modalPlayerInfo');
    }

    /**
     * Show loader with custom text
     * @param {string} text - Text to display (default: 'Showing profile...')
     */
    show(text = 'Showing profile...') {
        if (this.loaderElement) {
            setTimeout(() => {
                this.loaderElement.classList.add('active');
            }, 300);

            this.updateText(text);
        }
    }

    /**
     * Hide loader and show content
     */
    hide() {
        setTimeout(() => {
            this.loaderElement.classList.remove('active');
        }, 1000);
    }

    /**
     * Update loader text
     * @param {string} text - New text to display
     */
    updateText(text) {
        if (this.loaderText) {
            this.loaderText.textContent = text;
        }
    }

    /**
     * Update text without showing/hiding
     * @param {string} text - Text to display
     */
    setText(text) {
        this.updateText(text);
    }
}