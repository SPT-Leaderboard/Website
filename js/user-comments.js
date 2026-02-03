//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

// Pagination config
let commentsPagination = {
    allComments: [],
    currentPage: 1,
    commentsPerPage: 5,
    totalPages: 1
};

function initComments(permaLink, playerId) {
    // Init comment container elements
    const commentSubmit = document.getElementById('submit-comment');
    const commentInput = document.getElementById('comment-text');

    // Disable form if not logged in
    if (!isLoggedIn) {
        commentInput.disabled = true;
        commentInput.placeholder = "Please log in to comment...";
        commentSubmit.disabled = true;
        commentSubmit.innerHTML = '<i class="fa-solid fa-key"></i> Login Required';
    }

    initPaginationControls();

    // Should we show login prompt or not if user is not logged in when sending a comment
    commentSubmit.addEventListener('click', function () {
        if (!isLoggedIn) {
            showLoginPrompt(commentInput);
            return;
        }

        if (commentInput.value.trim() === '') {
            commentInput.focus();
            return;
        }

        // Send Comment
        submitComment(commentInput.value.trim(), playerId, permaLink, commentSubmit, commentInput);
    });

    // Send comment
    commentInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commentSubmit.click();
        }
    });

    // Finally try to load comments
    loadComments(permaLink);
}

function initPaginationControls() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (commentsPagination.currentPage > 1) {
                goToPage(commentsPagination.currentPage - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (commentsPagination.currentPage < commentsPagination.totalPages) {
                goToPage(commentsPagination.currentPage + 1);
            }
        });
    }
}

function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > commentsPagination.totalPages) {
        return;
    }

    commentsPagination.currentPage = pageNumber;
    renderCurrentPage();
    updatePaginationUI();

    const commentsList = document.getElementById('comments-list');
    if (commentsList) {
        commentsList.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function renderCurrentPage() {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    // Get indexes
    const startIndex = (commentsPagination.currentPage - 1) * commentsPagination.commentsPerPage;
    const endIndex = startIndex + commentsPagination.commentsPerPage;
    const pageComments = commentsPagination.allComments.slice(startIndex, endIndex);

    commentsList.innerHTML = '';
    commentsList.classList.add('page-transition');

    if (pageComments.length === 0) {
        displayNoComments();
    } else {
        pageComments.forEach((comment) => {
            const commentElement = createCommentElement(comment);
            commentsList.appendChild(commentElement);
        });
    }

    setTimeout(() => {
        commentsList.classList.remove('page-transition');
    }, 400);
}

function updatePaginationUI() {
    const paginationInfo = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageIndicators = document.getElementById('page-indicators');
    const paginationControls = document.getElementById('pagination-controls');

    if (commentsPagination.allComments.length > commentsPagination.commentsPerPage) {
        paginationControls.style.display = 'flex';
    } else {
        paginationControls.style.display = 'none';
    }

    if (paginationInfo) {
        paginationInfo.textContent = `Page ${commentsPagination.currentPage} of ${commentsPagination.totalPages}`;
    }

    if (prevBtn) {
        prevBtn.disabled = commentsPagination.currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled = commentsPagination.currentPage === commentsPagination.totalPages;
    }

    const commentsCount = document.getElementById('comments-count');
    if (commentsCount) {
        commentsCount.textContent = commentsPagination.allComments.length.toLocaleString();
    }

    generatePageIndicators(pageIndicators);
}

function generatePageIndicators(container) {
    if (!container) return;

    container.innerHTML = '';

    if (commentsPagination.totalPages <= 1) return;

    const maxVisiblePages = 5;
    let startPage, endPage;

    if (commentsPagination.totalPages <= maxVisiblePages) {
        startPage = 1;
        endPage = commentsPagination.totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
        const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

        if (commentsPagination.currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (commentsPagination.currentPage + maxPagesAfterCurrent >= commentsPagination.totalPages) {
            startPage = commentsPagination.totalPages - maxVisiblePages + 1;
            endPage = commentsPagination.totalPages;
        } else {
            startPage = commentsPagination.currentPage - maxPagesBeforeCurrent;
            endPage = commentsPagination.currentPage + maxPagesAfterCurrent;
        }
    }

    // First page add
    if (startPage > 1) {
        addPageIndicator(container, 1);
        if (startPage > 2) {
            addEllipsis(container);
        }
    }

    // Add pages in diapazone (whatever the fuck that means in english i forgot, sorry)
    for (let i = startPage; i <= endPage; i++) {
        addPageIndicator(container, i);
    }

    // Add last page indicator if needed
    if (endPage < commentsPagination.totalPages) {
        if (endPage < commentsPagination.totalPages - 1) {
            addEllipsis(container);
        }
        addPageIndicator(container, commentsPagination.totalPages);
    }
}

function addPageIndicator(container, pageNumber) {
    const indicator = document.createElement('button');
    indicator.className = `page-indicator ${pageNumber === commentsPagination.currentPage ? 'active' : ''}`;
    indicator.textContent = pageNumber;
    indicator.addEventListener('click', () => goToPage(pageNumber));
    container.appendChild(indicator);
}

function addEllipsis(container) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-indicator ellipsis';
    ellipsis.textContent = '...';
    container.appendChild(ellipsis);
}


function showLoginPrompt(commentInput) {
    commentInput.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        commentInput.style.animation = '';
    }, 500);
}

async function submitComment(commentText, receiverId, permaLink, submitBtn, commentInput) {
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.innerHTML = 'Sending...';
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const response = await fetch('/api/network/functions/comment/send_comment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'comment': commentText,
                'receiverId': receiverId,
                'receiverPermaLink': permaLink,
                'timestamp': Date.now()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send comment');
        }

        commentInput.value = '';

        // Add comment visually with animation
        addCommentToUI({
            id: data.id,
            text: data.text,
            author: data.author,
            author_id: data.author_id,
            avatar: data.avatar,
            date: data.date,
            timestamp: data.timestamp
        });

        // Show success
        showCommentSuccess();

    } catch (error) {
        console.error('Error sending comment:', error);
        showCommentError(error);
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// Add comment visually to not fetch it again and show user success
function addCommentToUI(comment) {
    commentsPagination.allComments.unshift(comment);

    // Re-calc the pages
    commentsPagination.totalPages = Math.ceil(commentsPagination.allComments.length / commentsPagination.commentsPerPage);

    // Remove no comments element if exists
    const noComments = document.querySelector('.no-comments');
    if (noComments) {
        noComments.remove();
    }

    // Update visuals
    commentsPagination.currentPage = 1;
    renderCurrentPage();
    updatePaginationUI();

    const commentsList = document.getElementById('comments-list');
    if (commentsList && commentsList.firstChild) {
        commentsList.firstChild.classList.add('new-comment');

        // Remove the new comment class
        setTimeout(() => {
            if (commentsList.firstChild) {
                commentsList.firstChild.classList.remove('new-comment');
            }
        }, 600);
    }
}

// Display if comment was send
function showCommentSuccess() {
    const submitBtn = commentSubmit;
    const originalHtml = submitBtn.innerHTML;

    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Sent!';
    submitBtn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))';
    submitBtn.style.borderColor = 'rgba(16, 185, 129, 0.3)';

    setTimeout(() => {
        submitBtn.innerHTML = originalHtml;
        submitBtn.style.background = '';
        submitBtn.style.borderColor = '';
    }, 2000);
}

function showCommentError(error) {
    const submitBtn = commentSubmit;
    const originalHtml = submitBtn.innerHTML;

    submitBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${error}`;
    submitBtn.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))';
    submitBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';

    setTimeout(() => {
        submitBtn.innerHTML = originalHtml;
        submitBtn.style.background = '';
        submitBtn.style.borderColor = '';
    }, 3000);
}

// Comments sending 
async function loadComments(permaLink) {
    try {
        const response = await fetch(`${profileComments}${permaLink}${profileCommentsEnd}`);

        if (!response.ok) {
            // If doesn't exist, show empty state
            if (response.status === 404) {
                displayNoComments();
                return;
            }
            throw new Error('Failed to load comments');
        }

        // Save locally first
        commentsPagination.allComments = await response.json();

        // Sort by time
        commentsPagination.allComments.sort((a, b) => b.timestamp - a.timestamp);

        // Get page count
        commentsPagination.totalPages = Math.ceil(commentsPagination.allComments.length / commentsPagination.commentsPerPage);

        // Display first page
        commentsPagination.currentPage = 1;
        renderCurrentPage();
        updatePaginationUI();

    } catch (error) {
        console.error('Error loading comments:', error);
        displayNoComments();
    }
}

// Function to create individual comment element
function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';

    const commentDate = new Date(comment.timestamp * 1000);
    const formattedDate = formatDate(commentDate);

    // Decode text to look normal
    const decodedText = decodeHtmlEntities(comment.text);

    commentDiv.innerHTML = `
        <div class="comment-header">
            <img src="${comment.avatar || 'media/default_avatar.png'}" 
                 alt="User Avatar" class="user-avatar"
                 onerror="this.src='media/default_avatar.png'">
            <div class="user-info">
                <div class="user-name">${comment.author || 'Anonymous'}</div>
                <div class="comment-date">${formattedDate}</div>
            </div>
        </div>
        <div class="comment-content">
            ${decodedText}
        </div>
    `;

    return commentDiv;
}

// display "no comments if.. no comments lmao
function displayNoComments() {
    const commentsList = document.getElementById('comments-list');
    if (commentsList) {
        commentsList.innerHTML = `
            <div class="no-comments">
                <i class="fa-solid fa-comment"></i>
                <p>No comments yet</p>
                <span>Be the first to leave a comment!</span>
            </div>
        `;
    }

    // Hide pagination
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.style.display = 'none';
    }

    // Comment count
    const commentsCount = document.getElementById('comments-count');
    if (commentsCount) {
        commentsCount.textContent = '0';
    }
}

// Decode comments we got from comments file
function decodeHtmlEntities(text) {
    const entities = {
        '&#39;': "'",
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>'
    };

    return text.replace(/&#?\w+;/g, match => entities[match] || match);
}
