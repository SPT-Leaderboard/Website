<div align="center">
  <img src="https://sptlb.katrinfoxvr.com/media/icon_transparent.png" alt="SPT Leaderboard Logo" width="150" />
</div>

<h1 align="center">SPT Leaderboard</h1>

<p align="center">
  Dynamic leaderboard for <strong>SPT (Single Player Tarkov)</strong> player statistics, displaying player rankings, skill score, profiles and more.
</p>

---

## Contribution
Pull requests and issue reports are welcome!
Submit them here on GitHub or contact through other channels.

---

## Installation & Hosting (Private Setup)
Don't like how the leaderboard is open for everyone else and want to set it up just for your friends? Now you can do that!

### Requirements
- **SPT 4.0.12** (or latest SPT Version)
- Interdemate knowledge of **PHP** along basic knowledge of **JavaScript**
- Web Server with **PHP** support

### First Step
1. [Download the latest SPT Mod release](https://github.com/SPT-Leaderboard/Client/releases)
2. Drop the zip contents in your SPT root game folder (Extract at `/SPT_GAME/`)
3. Launch SPT and open F12 BepInEx menu
4. Enable Advanced Settings
5. You'll see two similar settings in the dropdown menu of SPT Leaderboard mod:

`SPTLB Server Endpoint` - Must be the initial domain you host and will be sending requests to, for example `https://example.com`  
`Server Path` - Path to the Rest API for the Client requests, for example `/api/client/`. This will be later on combined into `https://example.com/api/client/` by the mod.

Change them accordingly where your PHP files will be hosted.

### Second Step
1. [Download Dynamic Leaderboard Website](https://github.com/SPT-Leaderboard/Website/archive/refs/heads/main.zip)
2. Extract the contents to your web server's root or subdirectory (where your front end will be).
3. Create the folders and .php files accordingly to the `Server Path` you've set in the mod.
4. Make sure you will be creating a folder on the backend named `seasons` where your data will be stored. It'll take less effort than editing the code on the frontend. (The season system on front end adds the number to the season file automatically.)
5. Go to the `js` folder and open `app-core.js`. At the top you'll see all the paths the mod uses to fetch data. Put your paths that correspond your backend server. Please note that not all paths can be defined in this file.
6. Update the URL (seasonPath) to match your own hosted path.

⚠️ AGAIN - Do not include a season number if you wanna have multiple seasons!  
⚠️ Note that there's no ready back-end to proccess the data. You HAVE to write your own Rest API for leaderboard that'd accept POST requests and store players (in JSON, SQL or PHP, it doesn't matter how you want it to be later on)  
⚠️ All the variables or JSON keys the mod sends can be found at [SPT Leaderboard Client Mod](https://github.com/harmonyzt/SPT-Leaderboard) - just choose what you want to accept on the back end. They're all self-explanatory!

### You're good to go!
Now you can play and rank up just like in present leaderboard with all of its features!
