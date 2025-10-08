//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('status-text');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    const resourceList = document.getElementById('resource-list');

    // Resources to load
    const resources = [
        { name: "Connectivity with API", url: "/api/main/online.json", weight: 25 },
        { name: "Core Logic", url: "js/app-core.js", weight: 30 },
        { name: "Raid Notifications", url: "js/raid-notifications.js", weight: 15 },
        { name: "User Heartbeats", url: "js/system-heartbeat.js", weight: 15 },
        { name: "Live Data Flow", url: "js/ui-live-data-flow.js", weight: 20 },
        { name: "API Monitor", url: "js/api-monitor.js", weight: 20 },
        { name: "Raid History", url: "js/user-raid-history.js", weight: 10 },
        { name: "Achievements", url: "js/system-achievements.js", weight: 5 },
        { name: "User Settings", url: "js/user-settings.js", weight: 5 },
        { name: "Search", url: "js/user-search.js", weight: 5 },
        { name: "User Profiles", url: "js/user-profiles.js", weight: 30 },
        { name: "Friend Lists", url: "js/user-friends.js", weight: 15 },
        { name: "Teams", url: "js/user-teams.js", weight: 5 },
        { name: "BattlePass Features", url: "js/battlepass-calculator.js", weight: 15 },
        { name: "BattlePass Rewards", url: "js/battlepass-rewards.js", weight: 15 },
        { name: "Utils", url: "js/app-utils.js", weight: 10 }
    ];

    const filteredResources = isLocalhost ? resources.slice(2) : resources;

    // Track loading progress
    let loadedResources = 0;
    let totalWeight = filteredResources.reduce((sum, resource) => sum + resource.weight, 0);
    let loadingMessages = [
        "Duping free Leaderboard Coins...",
        "Syncing with SPTLB network...",
        "Don't look at me like that! I'm shy...",
        "Banning bad players...",
        "Placing good players on top...",
        "Preparing the competition...",
        "Setting up real-time rankings...",
        "Preparing your BattlePass rewards...",
        "Calculating your Skill Rating...",
        "Downloading more website updates..."
    ];

    function getRandomMessage() {
        return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    }

    // Function to load a resource
    function loadResource(resource, index) {
        return new Promise((resolve, reject) => {
            const resourceItem = document.createElement('div');
            resourceItem.className = 'resource-item-pre';
            resourceItem.style.animationDelay = `${index * 0.1}s`;
            resourceItem.innerHTML = `
                <span class="resource-name-pre">${resource.name}</span>
                <span class="resource-status-pre">Loading</span>
            `;
            resourceList.appendChild(resourceItem);

            updateResourceCounter();

            const startTime = Date.now();
            const minLoadTime = 800 + (index * 100);

            setTimeout(() => {
                fetch(resource.url, { method: 'HEAD', cache: 'no-cache' })
                    .then(response => {
                        if (response.ok) {
                            return fetch(resource.url);
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            const statusEl = resourceItem.querySelector('.resource-status-pre');
                            statusEl.textContent = 'Loaded';
                            statusEl.classList.add('loaded');
                            resourceItem.classList.add('loaded');

                            loadedResources += resource.weight;
                            updateProgress();
                            updateResourceCounter();

                            if (Math.random() > 0.7) {
                                statusText.textContent = getRandomMessage();
                            }

                            resolve();
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    })
                    .catch(error => {
                        const statusEl = resourceItem.querySelector('.resource-status-pre');
                        statusEl.textContent = 'Failed';
                        statusEl.classList.add('failed');
                        resourceItem.classList.add('failed');

                        updateResourceCounter();
                        reject(new Error(`Failed to load ${resource.name}: ${error.message}`));
                    });
            }, minLoadTime - (Date.now() - startTime));
        });
    }

    function updateResourceCounter() {
        const total = filteredResources.length;
        const loaded = document.querySelectorAll('.resource-item-pre.loaded').length;
        const failed = document.querySelectorAll('.resource-item-pre.failed').length;
        const completed = loaded + failed;

        document.getElementById('resource-count').textContent = `${completed}/${total}`;
    }

    // Update progress bar and status text
    function updateProgress() {
        const progress = Math.round((loadedResources / totalWeight) * 100);
        progressBar.style.width = progress + '%';

        if (progress < 25) {
            statusText.textContent = "Booting system core...";
        } else if (progress < 50) {
            statusText.textContent = "Loading essentials...";
        } else if (progress < 75) {
            statusText.textContent = "Initializing...";
        } else if (progress < 90) {
            statusText.textContent = "Finalizing...";
        } else if (progress < 100) {
            statusText.textContent = "Almost ready...";
        } else {
            waitForDataReady(() => completeLoading());
            statusText.textContent = "Welcome to SPTLB!";
        }
    }

    // Show error state
    function showError(error) {
        statusText.textContent = "Connection interrupted. Retrying...";
        errorMessage.textContent = error.message || "Network connection failed";
        errorContainer.classList.add('visible');
    }

    // Complete loading successfully
    function completeLoading() {
        loader.classList.add('complete');

        setTimeout(() => {
            loader.classList.add('hidden');

            setTimeout(() => {
                document.body.style.overflow = 'auto';
            }, 300);
        }, 1300);
    }

    // Initialize and load all resources
    async function init() {
        try {
            statusText.textContent = "Establishing connection...";

            const MAX_CONCURRENT = 20;
            for (let i = 0; i < filteredResources.length; i += MAX_CONCURRENT) {
                const chunk = filteredResources.slice(i, i + MAX_CONCURRENT);
                await Promise.all(chunk.map((resource, idx) =>
                    loadResource(resource, i + idx).catch(error => {
                        throw error;
                    })
                ));
            }

        } catch (error) {
            showError(error);
        }
    }

    // Set up retry button
    retryButton.addEventListener('click', () => {
        errorContainer.classList.remove('visible');
        progressBar.style.width = '0%';
        loadedResources = 0;
        resourceList.innerHTML = '';
        init();
    });

    // Start the loading process
    init();
});