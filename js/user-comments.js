//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/


function initComments(permaLink, playerId) {

    // Init comment container elements
    const commentSubmit = document.getElementById('submit-comment');
    const commentInput = document.getElementById('comment-text');

    // Disable form if not logged in
    if (!isLoggedIn) {
        commentInput.disabled = true;
        commentInput.placeholder = "Please log in to comment...";
        commentSubmit.disabled = true;
        commentSubmit.innerHTML = '<i class="bx bx-key-alt"></i> Login Required';
    }

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
        submitComment(commentInput.value.trim(), playerId, permaLink);
    });

    // Send comment
    commentInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commentSubmit.click();
        }
    });

    // Finally try to load comments
    loadComments(permaLink)

}

function showLoginPrompt(commentInput) {
    commentInput.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        commentInput.style.animation = '';
    }, 500);
}

async function submitComment(commentText, receiverId, permaLink) {
    const submitBtn = commentSubmit;
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Sending...';
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
    const commentsList = document.querySelector('.comments-list');

    // Remove no comments message if it exists
    const noComments = commentsList.querySelector('.no-comments');
    if (noComments) {
        noComments.remove();
    }

    const commentElement = createCommentElement(comment);
    commentElement.classList.add('new-comment');

    commentsList.insertBefore(commentElement, commentsList.firstChild);

    // Remove the new comment class
    setTimeout(() => {
        commentElement.classList.remove('new-comment');
    }, 400);
}

// Display if comment was send
function showCommentSuccess() {
    const submitBtn = commentSubmit;
    const originalHtml = submitBtn.innerHTML;

    submitBtn.innerHTML = '<i class="bx bx-check"></i> Sent!';
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

    submitBtn.innerHTML = `<i class="bx bx-error"></i> ${error}`;
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
        const response = await fetch(`/api/data/user-comments/player_${permaLink}.json?t=${Date.now()}`);

        if (!response.ok) {
            // If doesn't exist, show empty state
            if (response.status === 404) {
                displayNoComments();
                return;
            }
            throw new Error('Failed to load comments');
        }

        const comments = await response.json();
        displayComments(comments);

    } catch (error) {
        console.error('Error loading comments:', error);
        displayNoComments();
    }
}

// Display comments in the UI
function displayComments(comments) {
    const commentsList = document.querySelector('.comments-list');

    // Clear existing comments
    commentsList.innerHTML = '';

    if (!comments || comments.length === 0) {
        displayNoComments();
        return;
    }

    // Sort comments by timestamp (newest first)
    comments.sort((a, b) => b.timestamp - a.timestamp);

    // Create and append each comment
    comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
    });
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
    const commentsList = document.querySelector('.comments-list');
    commentsList.innerHTML = `
        <div class="no-comments">
            <i class='bx bxs-message'></i>
            <p>No comments yet</p>
            <span>Be the first to leave a comment!</span>
        </div>
    `;
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
