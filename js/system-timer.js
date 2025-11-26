//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

const seasonEndTimestamp = 1765188000 * 1000;;

let timerInterval;

document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timerDisplay');
    const endDateDisplay = document.getElementById('endDateDisplay');

    if (endDateDisplay) {
        const utcDate = new Date(seasonEndTimestamp).toUTCString();
        endDateDisplay.textContent = `Season ends: ${utcDate}`;
    }

    function updateTimer() {
        const now = Date.now();
        const diff = seasonEndTimestamp - now;

        if (diff <= 0) {
            timerDisplay.textContent = "Season has ended! New season starting shortly...";
            clearInterval(timerInterval);
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            timerDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s (UTC)`;
        }

        playAppropriateTrack(diff);
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
});

function dateToUnixTimestamp(year, month, day, hour, minute, second) {
    return Date.UTC(year, month, day, hour, minute, second);
}