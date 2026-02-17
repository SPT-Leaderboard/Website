//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

let currentQuests = [];
let currentFilter = 'all';
let currentSearch = '';

async function loadQuestData(quests) {
    const questsContainer = document.getElementById('quests-container');

    if (!questsContainer) {
        console.error('Container element not found');
        return;
    }

    // Show loader
    questsContainer.innerHTML = `
        <div class="loader-dots">
        <div class="shimmer-bg"></div>
            <div class="dots-container">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <p class="dots-text">Processing Quests...</p>
        </div>
    `;

    if (!quests || Object.keys(quests).length === 0) {
        questsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>No Quests Available</h3>
                <p>This player doesn't have any quests, or they weren't recorded.</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch("achievements/js/compiledQuests.json");
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
        }

        const compiledQuests = await response.json();
        currentQuests = processQuestsData(quests, compiledQuests.questsCompiled);
        await displayQuestsWithControls(currentQuests, questsContainer);

    } catch (error) {
        console.error('Error loading quest data:', error);
        questsContainer.innerHTML = `
            <div class="no-stats-message">
                <h3>Error Loading Quests</h3>
                <p>Unable to load quest information. Please try again later.</p>
            </div>
        `;
    }
}

function processQuestsData(playerQuests, compiledQuests) {
    return Object.entries(playerQuests)
        .map(([questId, playerQuest]) => {
            const compiledQuest = compiledQuests[questId];

            // Skip quests that dont exist in compiled data
            if (!compiledQuest) {
                return null;
            }

            const hasFinishTime = playerQuest.finish_time > 0;
            const hasAcceptTime = playerQuest.accept_time > 0;

            let isCompleted = false;
            let isInProgress = false;
            let isNotAccepted = false;
            let status, statusText;

            if (hasFinishTime) {
                // Finished
                isCompleted = true;
                status = 'completed';
                statusText = 'Completed';
            } else if (hasAcceptTime) {
                // Active
                isInProgress = true;
                status = 'in-progress';
                statusText = 'In Progress';
            } else {
                // Not accepted
                isNotAccepted = true;
                status = 'not-accepted';
                statusText = 'Not Accepted';
            }

            // For quests that have no accept_time, using finish_time
            const sortTime = hasAcceptTime
                ? playerQuest.accept_time
                : (hasFinishTime ? playerQuest.finish_time : 0);

            return {
                id: questId,
                ...compiledQuest,
                ...playerQuest,
                isNotAccepted,
                isCompleted,
                isInProgress,
                status,
                statusText,
                sortTime
            };
        })
        .filter(quest => quest !== null)
        .sort((a, b) => {
            // Sort by statusc
            const statusOrder = { 'in-progress': 0, 'completed': 1, 'not-accepted': 2 };

            if (a.status !== b.status) {
                return statusOrder[a.status] - statusOrder[b.status];
            }

            // then time
            if (a.sortTime !== b.sortTime) {
                return b.sortTime - a.sortTime;
            }

            return 0;
        });
}

async function displayQuestsWithControls(quests, container) {
    const stats = calculateQuestStats(quests);

    const controlsHTML = `
        <div class="quests-controls">
            <div class="quests-filters">
                <button class="sort-btn ${currentFilter === 'all' ? 'active' : ''}" 
                        onclick="setFilter('all')">
                    All Quests
                </button>
                <button class="sort-btn ${currentFilter === 'completed' ? 'active' : ''}" 
                        onclick="setFilter('completed')">
                    Completed
                </button>
                <button class="sort-btn ${currentFilter === 'in-progress' ? 'active' : ''}" 
                        onclick="setFilter('in-progress')">
                    In Progress
                </button>
                <button class="sort-btn ${currentFilter === 'not-accepted' ? 'active' : ''}" 
                        onclick="setFilter('not-accepted')">
                    Not Accepted
                </button>
            </div>
            
            <div class="quests-search">
                <input type="text" 
                       class="search-input" 
                       placeholder="Search quests..." 
                       oninput="handleSearch(this.value)">
            </div>
            
            <div class="quest-counter">
                Showing <span id="visibleCount">${quests.length}</span> of <span>${quests.length}</span> quests
            </div>
        </div>
        
        ${createStatsHTML(stats)}
    `;

    const filteredQuests = filterAndSortQuests(quests);
    const questsHTML = await createQuestsHTML(filteredQuests);

    container.innerHTML = controlsHTML + `<div class="quests-grid">${questsHTML}</div>`;
    updateQuestCounter(filteredQuests.length, quests.length);
}

function calculateQuestStats(quests) {
    const total = quests.length;
    const completed = quests.filter(q => q.isCompleted).length;
    const inProgress = quests.filter(q => q.isInProgress).length;
    const notAccepted = quests.filter(q => q.isNotAccepted).length;

    return { total, completed, inProgress, notAccepted };
}

function createStatsHTML(stats) {
    return `
        <div class="quests-stats">
            <div class="stat-item" style="text-align: center; flex: 1;">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Quests</div>
            </div>
            <div class="stat-item" style="text-align: center; flex: 1;">
                <div class="stat-value">${stats.completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item" style="text-align: center; flex: 1;">
                <div class="stat-value">${stats.inProgress}</div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-item" style="text-align: center; flex: 1;">
                <div class="stat-value">${stats.notAccepted}</div>
                <div class="stat-label">Not Accepted</div>
            </div>
            <div class="stat-item" style="text-align: center; flex: 1;">
                <div class="stat-value">${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</div>
                <div class="stat-label">Completion</div>
            </div>
        </div>
    `;
}

function filterAndSortQuests(quests) {
    let filtered = quests.filter(quest => {
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter === 'completed' && quest.isCompleted) ||
            (currentFilter === 'in-progress' && quest.isInProgress) ||
            (currentFilter === 'not-accepted' && quest.isNotAccepted);

        const matchesSearch = !currentSearch ||
            quest.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
            (quest.description && quest.description.toLowerCase().includes(currentSearch.toLowerCase()));

        return matchesFilter && matchesSearch;
    });

    // Accepted quests first
    filtered.sort((a, b) => {
        const statusOrder = { 'in-progress': 0, 'completed': 1, 'not-accepted': 2 };

        if (a.status !== b.status) {
            return statusOrder[a.status] - statusOrder[b.status];
        }

        return b.sortTime - a.sortTime;
    });

    return filtered;
}

async function createQuestsHTML(quests) {
    const questsHTML = await Promise.all(
        quests.map(async (quest, index) => {
            const correctImageUrl = await getQuestImageUrl(quest.id, quest.imageUrl);

            return `
                <div class="quest-card ${quest.status}" style="animation-delay: ${index * 0.05}s">
                    <div class="quest-header">
                        <img src="${correctImageUrl}" 
                             alt="${quest.name}" 
                             class="quest-image"
                             loading="lazy">
                        <div class="quest-info">
                            <h3 class="quest-name">${quest.name}</h3>
                            <div class="quest-status status-${quest.status}">
                                ${quest.statusText}
                            </div>
                        </div>
                    </div>
                    <div class="quest-timeline">
                        ${quest.isNotAccepted ? `
                            <div class="timeline-item">
                                <span class="timeline-label">Status:</span>
                                <span class="timeline-value" style="color: #94a3b8;">Available</span>
                            </div>
                        ` : `
                            ${quest.accept_time > 0 ? `
                                <div class="timeline-item">
                                    <span class="timeline-label">Accepted:</span>
                                    <span class="timeline-value time-ago">${formatLastPlayedRaid(quest.accept_time)}</span>
                                </div>
                            ` : quest.isCompleted ? `
                                <div class="timeline-item">
                                    <span class="timeline-label">Completed:</span>
                                    <span class="timeline-value time-ago">${formatLastPlayedRaid(quest.finish_time)}</span>
                                </div>
                            ` : ''}
                            ${quest.isCompleted ? `
                                <div class="timeline-item">
                                    <span class="timeline-label">Complete Date:</span>
                                    <span class="timeline-value">${new Date(quest.finish_time * 1000).toLocaleDateString()}</span>
                                </div>
                            ` : `
                                <div class="timeline-item">
                                    <span class="timeline-label">Status:</span>
                                    <span class="timeline-value" style="color: #f59e0b;">Active</span>
                                </div>
                            `}
                        `}
                    </div>
                </div>
            `;
        })
    );

    return questsHTML.join('');
}

async function checkImageExists(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imageUrl;
    });
}

async function getQuestImageUrl(questId, imageFileName, attempts = 0) {
    const basePath = 'media/player_quests/';
    const baseName = imageFileName.split('.')[0];
    const extensions = ['.png', '.jpg', '.jpeg'];

    if (attempts >= extensions.length) {
        return basePath + 'default.jpg';
    }

    const currentExt = attempts === 0 ?
        imageFileName.substring(imageFileName.lastIndexOf('.')) :
        extensions[attempts];

    const testUrl = basePath + baseName + currentExt;
    const exists = await checkImageExists(testUrl);

    if (exists) {
        return testUrl;
    } else {
        return getQuestImageUrl(questId, imageFileName, attempts + 1);
    }
}

// #region Controls
async function setFilter(filterType) {
    currentFilter = filterType;
    await refreshQuestsDisplay();
    updateActiveButtons();
}

async function handleSearch(searchTerm) {
    currentSearch = searchTerm.toLowerCase().trim();
    await refreshQuestsDisplay();
}

async function refreshQuestsDisplay() {
    const questsContainer = document.getElementById('quests-container');
    const questsGrid = questsContainer.querySelector('.quests-grid');
    const filteredQuests = filterAndSortQuests(currentQuests);

    questsGrid.classList.add('updating');

    setTimeout(async () => {
        questsGrid.innerHTML = await createQuestsHTML(filteredQuests);
        updateQuestCounter(filteredQuests.length);
        questsGrid.classList.remove('updating');
    }, 200);
}

function updateQuestCounter(visible) {
    const counter = document.getElementById('visibleCount');
    if (counter) {
        counter.textContent = visible;
    }
}

function updateActiveButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelector(`.sort-btn[onclick="setFilter('${currentFilter}')"]`)?.classList.add('active');
}
// #endregion