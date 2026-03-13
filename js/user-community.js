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
    constructor() {
        this.container = document.getElementById('friends-container');
        this.section = document.getElementById('friend-list');
        this.buttonContainer = null;
        this.currentPlayer = null;
        this.isLoggedIn = isLoggedIn;
        this.friends = [];
        this.realFriends = new Map();
        this._onDocumentClick = null;
    }

    /**
     * Initializes the friend manager for a given player, sets up click-away listeners,
     * renders the friend button, and loads the friend list.
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
     * @returns {Promise<string>} One of "canAdd", "isFriend", "requestPending", "cannotAdd", or "error"
     */
    async checkFriendStatus() {
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

            if (data === null) {
                return 'cannotAdd';
            }

            return data.status; // "canAdd", "isFriend", "requestPending", "cannotAdd"
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
     * Renders the appropriate friend action button based on the current friendship status.
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
     * Fetches the list of "real" (non-local) friend IDs for the current player from the server.
     * @returns {Promise<Array<string>>} Array of friend IDs, or empty array on failure
     */
    async fetchRealFriends() {
        try {
            const response = await fetch('/api/network/functions/community/get_friends.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profileId: this.currentPlayer.id })
            });

            if (!response.ok) return new Map();

            const data = await response.json();

            const friendsMap = new Map();
            (data.friends || []).forEach(friend => {
                friendsMap.set(friend.id, {
                    ...friend,
                    isRealFriend: true,
                    added_at: friend.added_at
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
                    lastPlayed: p.lastPlayed,
                    isRealFriend: false
                });
            }
        }

        return localFriends;
    }

    /**
     * Fetches and merges the player's friend list, tagging each friend as real or local.
     * Results are sorted with real friends first, then alphabetically by name.
     * @returns {Promise<Array<Object>>} Sorted array of friend objects with `isRealFriend` flag
     */
    async checkFriends() {
        this.realFriends = await this.fetchRealFriends();

        const localFriends = this.getLocalFriends();
        const realFriendsArray = Array.from(this.realFriends.values());
        const allFriends = [...realFriendsArray, ...localFriends];

        allFriends.sort((a, b) => {
            if (a.isRealFriend && !b.isRealFriend) return -1;
            if (!a.isRealFriend && b.isRealFriend) return 1;

            if (a.isRealFriend && b.isRealFriend) {
                return (b.added_at || 0) - (a.added_at || 0);
            }

            return (a.name || '').localeCompare(b.name || '');
        });

        return allFriends;
    }

    /**
     * Fetches the friend list, renders friend items with online status and avatars into
     * the friend container, and attaches click listeners for profile navigation.
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

            this.container.innerHTML = friends.map(friend => {
                const playerStatus = heartbeatMonitor?.getPlayerStatus?.(friend.id) || {};
                const isOnline = heartbeatMonitor?.isOnline?.(friend.id) || false;

                let lastOnlineTime = '';
                if (isOnline) {
                    lastOnlineTime = '<span class="player-status-lb-online">Online</span>';
                } else {
                    const lastUpdate = playerStatus.lastUpdate || friend.lastPlayed || Date.now();
                    lastOnlineTime = window.heartbeatMonitor?.getLastOnlineTime?.(lastUpdate) || 'Offline';
                }

                const lastGame = isOnline
                    ? `<span style="min-width: 0;" class="player-status-lb ${playerStatus.statusClass || ''}">${playerStatus.statusText || 'Online'} <div id="blink"></div></span>`
                    : `<span class="last-online-time">${lastOnlineTime}</span>`;

                const friendClass = friend.isRealFriend ? 'real-friend' : 'local-friend';
                const friendBadge = !friend.isRealFriend ? '<i class="fa-solid fa-users-between-lines local-badge" title="Local friend (Same Team/PermaLink)"></i>' : '';

                return `
                <div class="friend-item ${friendClass}" data-player-id="${friend.id || '0'}">
                    <div class="friend-avatar-wrapper">
                        <img src="${friend.profilePicture || 'media/default_avatar.png'}" class="friend-avatar" onerror="this.src='media/default_avatar.png';" alt="Friend Avatar">
                        ${friendBadge}
                    </div>
                    <div class="friend-info">
                        <div class="friend-name">
                            ${friend.teamTag ? `[${friend.teamTag}]` : ''} ${friend.name || 'Unknown'}
                        </div>
                        <div class="friend-status-text">
                            ${lastGame}
                        </div>
                    </div>
                    <div class="friend-status-indicator">
                        ${friend.isRealFriend ?
                        '<i class="fa-solid fa-check-circle real-friend-badge" title="Real friend"></i>' :
                        ''}
                    </div>
                </div>
            `;
            }).join('');

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
 * and rendering comments on a player's profile page. Supports login-gated submissions and
 * real-time UI updates when new comments are posted.
 */
class CommentsManager {
    /**
     * @param {Object} [config={}] - Configuration options
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
        this.permaLink = null;
        this.playerId = null;
        this.apiEndpoints = {
            sendComment: '/api/network/functions/comment/send_comment.php',
            loadComments: '/api/data/user-comments/'
        };
    }

    /**
     * Initializes the comments system for a specific player profile. Binds DOM elements,
     * disables the form if not logged in, sets up pagination, and loads existing comments.
     * @param {string} permaLink - The player's permanent link identifier used to fetch comments
     * @param {string} playerId - The player's unique ID (used as receiverId when posting)
     */
    init(permaLink, playerId) {
        this.permaLink = permaLink;
        this.playerId = playerId;

        this.initElements();

        if (!this.isLoggedIn) {
            this.disableCommentForm();
        }

        this.initPaginationControls();
        this.attachEventListeners();
        this.loadComments();
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

        this.elements.commentsList.innerHTML = '';
        this.elements.commentsList.classList.add('page-transition');

        if (pageComments.length === 0) {
            this.displayNoComments();
        } else {
            pageComments.forEach((comment) => {
                const commentElement = this.createCommentElement(comment);
                this.elements.commentsList.appendChild(commentElement);
            });
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
     * Submits the comment text to the server, adds the returned comment to the UI
     * on success, and shows success/error feedback on the submit button.
     */
    async submitComment() {
        const originalText = this.elements.commentSubmit.innerHTML;

        try {
            this.elements.commentSubmit.innerHTML = 'Sending...';
            this.elements.commentSubmit.classList.add('loading');
            this.elements.commentSubmit.disabled = true;

            const response = await fetch(this.apiEndpoints.sendComment, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'comment': this.elements.commentInput.value.trim(),
                    'receiverId': this.playerId,
                    'receiverPermaLink': this.permaLink,
                    'timestamp': Date.now()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(data.error || 'Failed to send comment');
            }

            this.elements.commentInput.value = '';

            // Add comment visually
            this.addCommentToUI({
                id: data.id,
                text: data.text,
                author: data.author,
                author_id: data.author_id,
                avatar: data.avatar,
                date: data.date,
                timestamp: data.timestamp
            });

            this.showCommentSuccess();

        } catch (error) {
            console.error('Error sending comment:', error);
            this.showCommentError(error.message);
        } finally {
            this.elements.commentSubmit.innerHTML = originalText;
            this.elements.commentSubmit.classList.remove('loading');
            this.elements.commentSubmit.disabled = false;
        }
    }

    /**
     * Prepends a new comment to the internal comments array and re-renders the first page.
     * Applies a brief highlight animation to the newly added comment element.
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
     * Temporarily shows an error message on the submit button with a red styling for 3 seconds.
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
     * Fetches comments from the server JSON endpoint, sorts them by timestamp descending,
     * and renders the first page with pagination controls.
     */
    async loadComments() {
        if (!this.apiEndpoints.loadComments) {
            console.error('Load comments endpoint not configured');
            return;
        }

        try {
            const response = await fetch(`${this.apiEndpoints.loadComments}${this.permaLink}.json`);

            if (!response.ok) {
                if (response.status === 404) {
                    this.displayNoComments();
                    return;
                }

                console.error('Failed to load comments');
            }

            this.pagination.allComments = await response.json();
            this.pagination.allComments.sort((a, b) => b.timestamp - a.timestamp);

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
     * @param {string} [comment.author] - Author name (defaults to "Anonymous")
     * @param {string} [comment.avatar] - URL to the author's avatar image
     * @returns {HTMLDivElement} The constructed comment DOM element
     */
    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';

        const commentDate = new Date(comment.timestamp * 1000);
        const formattedDate = this.formatDate(commentDate);
        const decodedText = escapeHtml(this.decodeHtmlEntities(comment.text));

        commentDiv.innerHTML = `
            <div class="comment-header">
                <img src="${comment.avatar || 'media/default_avatar.png'}"
                     alt="User Avatar" class="user-avatar"
                     onerror="this.src='media/default_avatar.png'">
                <div class="user-info">
                    <div class="user-name">${escapeHtml(comment.author || 'Anonymous')}</div>
                    <div class="comment-date">${formattedDate}</div>
                </div>
            </div>
            <div class="comment-content">
                ${decodedText}
            </div>
        `;

        return commentDiv;
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
    formatDate(date) {
        // Implement your date formatting logic here
        return date.toLocaleDateString();
    }

    /**
     * Decodes safe HTML entities (apostrophes, quotes, ampersands) back to characters.
     * Intentionally does NOT decode &lt; and &gt; to prevent XSS.
     * @param {string} text - The HTML-entity-encoded string
     * @returns {string} The decoded string with safe entities restored
     */
    decodeHtmlEntities(text) {
        const entities = {
            '&#39;': "'",
            '&quot;': '"',
            '&amp;': '&'
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
        this.updateDisplay();

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
                const response = await fetch(`/api/data/pmc_equipment/${this.playerId}.json`);
                if (!response.ok) console.error('Failed to load equipment data');

                const playerData = await response.json();
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
            else if (a.name.includes('mm')) {
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
        const cleanShortName = this.cleanShortName(item.name);

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
                    <span class="attachment-name">${cleanShortName}</span>
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
        const placeholders = tooltipElement.querySelectorAll('.attachment-icon-placeholder');

        placeholders.forEach(placeholder => {
            const itemId = placeholder.dataset.itemId;
            const itemName = placeholder.dataset.itemName;
            const attachmentId = placeholder.dataset.attachmentId;

            this.loadAttachmentImage(itemId, itemName, attachmentId, placeholder);
        });
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
            console.error(`PlayerEquipmentDisplay Error! ${error}`)
        }
    }


    async testAttachmentIcon(iconLink, iconLink2) {
        try {
            const cdnSuccess = await testImageLoad(iconLink, 1000);

            if (cdnSuccess) {
                return iconLink;
            } else {
                return iconLink2;
            }
        } catch (error) {
            return iconLink2;
        }
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
                <span class="weapon-type">Weapon</span>
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