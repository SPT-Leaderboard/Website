//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('progress-dot');
    const statusText = document.getElementById('status-text');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');

    // Resources to load
    const resources = [
        { name: "Connectivity with API", url: "/api/main/online.json", weight: 25 },
        { name: "Core Logic", url: "js/app-core.js", weight: 25 },
        { name: "Core Utils", url: "js/app-utils.js", weight: 10 },
        { name: "Core Utils", url: "js/app-seasons.js", weight: 10 },
        { name: "Raid Notifications", url: "js/raid-notifications.js", weight: 15 },
        { name: "Heartbeat System", url: "js/system-heartbeat.js", weight: 15 },
        { name: "Live Data Flow", url: "js/ui-live-data-flow.js", weight: 25 },
        { name: "User Profiles", url: "js/user-profiles.js", weight: 30 },
        { name: "User Teams", url: "js/user-teams.js", weight: 10 },
        { name: "User Raid History", url: "js/user-raid-history.js", weight: 10 },
        { name: "User Achievements", url: "js/user-achievements.js", weight: 10 },
        { name: "BattlePass", url: "js/battlepass-calculator.js", weight: 15 },
        { name: "BattlePass", url: "js/battlepass-rewards.js", weight: 15 }
    ];

    const filteredResources = isLocalhost ? resources.slice(2) : resources;
    let loadedResources = 0;
    let totalWeight = filteredResources.reduce((sum, resource) => sum + resource.weight, 0);
    let loadingMessages = [
        "Duping free Leaderboard Coins...",
        "Syncing with SPTLB network...",
        "Placing good players on top...",
        "Preparing the competition...",
        "Setting up real-time rankings...",
        "Preparing your BattlePass rewards...",
        "Polishing our UI..."
    ];

    function getRandomMessage() {
        return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    }

    // Function to load a resource
    function loadResource(resource, index) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const minLoadTime = 800 + (index * 100);
            const isJsonFile = resource.url.endsWith('.json');

            const fetchPromise = isJsonFile
                ? apiFetch(resource.url, {
                    method: 'GET',
                    cacheBust: true,
                    showErrorToast: false,
                    timeout: 10000
                })
                : fetch(resource.url, {
                    method: 'HEAD',
                    cache: 'no-cache'
                }).then(response => {
                    if (response.ok) {
                        return true;
                    }
                    throw new Error(`HTTP ${response.status}`);
                });

            fetchPromise.then(result => {
                if (isJsonFile && result === null) {
                    throw new Error(`Failed to load ${resource.name}`);
                }

                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, minLoadTime - elapsedTime);

                setTimeout(() => {
                    loadedResources += resource.weight;
                    updateProgress();

                    if (Math.random() > 0.9) {
                        statusText.textContent = getRandomMessage();
                    }

                    resolve();
                }, remainingTime);
            }).catch(error => {
                reject(new Error(`Failed to load ${resource.name}: ${error.message}`));
            });
        });
    }

    function updateProgress() {
        const progress = Math.round((loadedResources / totalWeight) * 100);

        if (progress < 25) {
            animateStatusText("Loading system core...");
        } else if (progress < 60) {
            animateStatusText("Loading essentials...");
        } else if (progress < 75) {
            animateStatusText("Initializing...");
        } else if (progress < 90) {
            animateStatusText("Finalizing...");
        } else if (progress < 100) {
            animateStatusText("Almost ready...");
        } else {
            animateStatusText("Awaiting data from API...");
            waitForDataReady(() => completeLoading());
        }
    }

    function showError(error) {
        animateStatusText("Connection interrupted. Retrying...");
        errorMessage.textContent = error.message || "Network connection failed";
        errorContainer.classList.add('visible');
    }

    function completeLoading() {
        animateStatusText("Welcome to SPTLB!");

        loader.classList.add('complete');

        // Show welcome screen (app-welcome-screen.js)
        initWelcomeScreen();

        setTimeout(() => {
            loader.classList.add('hidden');

            setTimeout(() => {
                document.body.style.overflow = 'auto';
            }, 300);
        }, 1300);
    }

    function animateStatusText(newText) {
        // Don't animate if the text is the same
        if (statusText.textContent === newText) return;

        statusText.classList.add('fade-out');

        setTimeout(() => {
            statusText.textContent = newText;
            statusText.classList.remove('fade-out');
            statusText.classList.add('fade-in');

            setTimeout(() => {
                statusText.classList.remove('fade-in');
            }, 400);
        }, 200);
    }

    async function init() {
        try {
            animateStatusText("Starting up...");

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

    retryButton.addEventListener('click', () => {
        errorContainer.classList.remove('visible');
        loadedResources = 0;
        init();
    });

    init();
});