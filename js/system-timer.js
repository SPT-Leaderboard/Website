//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

// Date
const seasonEndDate = new Date(2025, 11, 13, 14, 1, 1);
let timerInterval;

document.addEventListener('DOMContentLoaded', () => {
    // Timer functionality
    const timerDisplay = document.getElementById('timerDisplay');
    const endDateDisplay = document.getElementById('endDateDisplay');
    if (endDateDisplay) {
        endDateDisplay.textContent = `Season ends: ${formatDate(seasonEndDate)}`;
    }

    // Same timer update
    function updateTimer() {
        const now = new Date();
        const diff = seasonEndDate.getTime() - now.getTime();

        if (diff <= 0) {
            timerDisplay.textContent = "Season has ended! New season starting shortly...";
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            timerDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        playAppropriateTrack(diff);
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
});