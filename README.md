<div align="center">
  <img src="https://sptlb.yuyui.moe/media/newlogo_transparent.png" alt="SPT Leaderboard Logo" width="150" />
</div>

<h1 align="center">SPT Leaderboard</h1>

<p align="center">
  Dynamic leaderboard for <strong>SPT (Single Player Tarkov)</strong> player statistics, displaying player rankings, skill score, profiles and more.
</p>

---
## How does it work?

To minimize costs, we use a static website (GitHub Pages) that pulls dynamic data in JSON format made by proxy API hosted on our server.
SPtarkov mod sends a request to the API, and it turns your request into JSON - exactly what this system was designed to deliver. Straightforward.

---

## Contribution
Pull requests and issue reports are welcome!
Submit them here on GitHub or contact through other channels.

---

## Installation & Hosting (Private Setup)
Don't like how the leaderboard is open for everyone else and want to set it up just for your friends? Now you can do that!

### Requirements
- **SPT 3.11.4** (or latest compatible version)
- Interdemate knowledge of **PHP**, basic knowledge of **JavaScript**
- Server with **PHP/JSON** support

### First Step
1. [Download the latest SPT Mod release](https://github.com/harmonyzt/SPT-Leaderboard/releases)
2. Drop the zip contents in your SPT root game folder (Extract at `/SPT_GAME/`)
3. Launch SPT and open F12 BepInEx menu
4. Enable Advanced Settings
5. You'll see two similar settings in the dropdown menu of SPT Leaderboard mod:

`PHP_ENDPOINT: "your.domain.com", // Your server domain`

`PHP_PATH: "/backend/SPT_Profiles_Backend.php" // Relative PHP path`

Change them accordingly where your PHP files will be hosted.

### Second Step
1. [Download Dynamic Leaderboard Website](https://github.com/harmonyzt/SPT-Leaderboard-Front/archive/refs/heads/main.zip)
2. Extract the contents to your web server's root or subdirectory (where your front end will be). 
3. Make sure you will be creating a folder on the backend named `seasons` where your data will be stored. It'll take less effort than editing the code on the frontend. (The season system on front end adds the number to the season file automatically.)
4. Go to the `js` folder and open `appCore.js`. At the top you'll see all the paths the mod uses to fetch data. Put your paths that correspond your backend server.
5. Update the URL (seasonPath) to match your own hosted path.

⚠️ AGAIN - Do not include a season number if you wanna have multiple seasons!

⚠️ Note that there's no ready back-end to proccess the data. You HAVE to write your own endpoint for leaderboard that'd accept POST requests and store players (in JSON, SQL or PHP, it doesn't matter how you want it to be later on)

### You're good to go!
Now you can play and rank up just like in present leaderboard with all of its features!
