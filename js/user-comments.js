//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

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
