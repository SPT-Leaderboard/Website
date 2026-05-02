// #region Config
const MAPS = {
    factory: {
        name: "Factory",
        image: "/live-map/maps/factory/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Factory.png",
        imageWidth: 4096,
        imageHeight: 4409,
        bounds: {
            min: { x: -65, y: -64.5 },
            max: { x: 77.6, y: 67.2 }
        },
        rotation: 90
    },
    customs: {
        name: "Customs",
        image: "/live-map/maps/customs/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Customs.png",
        imageWidth: 4248,
        imageHeight: 2140,
        bounds: {
            min: { x: -372, y: -306 },
            max: { x: 698, y: 235 }
        },
        rotation: 180
    },
    groundzero: {
        name: "Ground Zero",
        image: "/live-map/maps/groundZero/0.png",
        buttonImage: "/media/leaderboard_icons/maps/GroundZero.png",
        imageWidth: 4096,
        imageHeight: 5727,
        bounds: {
            min: { x: -99, y: -124 },
            max: { x: 249, y: 364 }
        },
        rotation: 180
    },
    interchange: {
        name: "Interchage",
        image: "/live-map/maps/interchange/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Interchange.png",
        imageWidth: 4096,
        imageHeight: 4096,
        bounds: {
            min: { x: -364, y: -443 },
            max: { x: 534, y: 452 }
        },
        rotation: 180
    },
    streets: {
        name: "Streets of Tarkov",
        image: "/live-map/maps/streets/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Streets.png",
        imageWidth: 4096,
        imageHeight: 5663,
        bounds: {
            min: { x: -279, y: -299 },
            max: { x: 324, y: 533 }
        },
        rotation: 180
    },
    labyrinth: {
        name: "Labyrinth",
        image: "/live-map/maps/labyrinth/0.png",
        buttonImage: "/media/leaderboard_icons/maps/labyrinth.png",
        imageWidth: 4096,
        imageHeight: 3752,
        bounds: {
            min: { x: -52.5, y: -36.5 },
            max: { x: 50.7, y: 75.3 }
        },
        rotation: 180
    },
    lighthouse: {
        name: "Lighthouse",
        image: "/live-map/maps/lighthouse/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Lighthouse.png",
        imageWidth: 4326,
        imageHeight: 6892,
        bounds: {
            min: { x: -545, y: -998 },
            max: { x: 512, y: 721 }
        },
        rotation: 180
    },
    shoreline: {
        name: "Shoreline",
        image: "/live-map/maps/shoreline/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Shoreline.png",
        imageWidth: 6240,
        imageHeight: 4128,
        bounds: {
            min: { x: -1060, y: -415 },
            max: { x: 508, y: 622 }
        },
        rotation: 180
    },
    reserve: {
        name: "Reserve",
        image: "/live-map/maps/reserve/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Reserve.png",
        imageWidth: 4096,
        imageHeight: 3769,
        bounds: {
            min: { x: -303.5, y: -275 },
            max: { x: 292, y: 271.5 }
        },
        rotation: 180
    },
    woods: {
        name: "Woods",
        image: "/live-map/maps/woods/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Woods.png",
        imageWidth: 5880,
        imageHeight: 5684,
        bounds: {
            min: { x: -756, y: -915 },
            max: { x: 647, y: 443 }
        },
        rotation: 180
    },
    labs: {
        name: "Labs",
        image: "/live-map/maps/labs/0.png",
        buttonImage: "/media/leaderboard_icons/maps/Labs.png",
        imageWidth: 4096,
        imageHeight: 3334,
        bounds: {
            min: { x: -292, y: -441 },
            max: { x: -96, y: -223 }
        },
        rotation: 180
    }
};

// #region Engine
class MapEngine {
    constructor() {
        this.mapRoot = document.getElementById('mapRoot');
        this.markerLayer = document.getElementById('markers');

        this.zoom = 0.3;
        this.pan = { x: 0, y: 0 };

        this.currentMap = null;
        this.mapConfig = null;
        this.markers = [];
        this.staticMarkers = [];

        this.deathsData = {
            players: {},
            allDeaths: []
        };

        // Toggles
        this.showMarkers = true;
        this.showLivePlayers = true; // Always show live players
        this.showHeatmap = false;
        this.showLabels = true;
        this.displayMode = 'dots';

        this.isLoading = false;

        // Image layers
        this.labelLayer = document.getElementById('labels');
        this.labels = [];
        this.baseImage = document.getElementById('mapImage');
        this.floorImage = document.getElementById('mapFloorImage');
        this.heatmapCanvas = document.getElementById('heatmapCanvas');
        this.zoneCanvas = document.getElementById('zoneCanvas');
        this.floorPanel = document.getElementById('floorPanel');
        this.floorSelector = document.getElementById('floorSelector');
        this.bottomNav = document.getElementById('bottomNav');

        this.heatmapCtx = null;
        this.zoneCtx = null;
        this.zones = [];
        this.zoneData = null;

        this.currentFloor = null;
        this.floorLayers = [];

        // Live player tracking
        this.livePlayerMarkers = new Map(); // playerId -> { marker, currentPos, targetPos, lastUpdate, interpolationStart }
        this.livePlayerUpdateInterval = null;
        this.interpolationDuration = 1000;

        // Leaderboard data (loaded from /season10.json)
        this.leaderboard = [];

        this.initUI();
        this.loadState();
        this.initInput();
        this.initCoordinates();
        this.createLoader();

        // load leaderboard data for player lookups
        this.loadLeaderboard();
        this.initHeartbeatMonitoring();
    }

    // #region Live Players
    initHeartbeatMonitoring() {
        if (!window.heartbeatMonitor) {
            console.warn('HeartbeatMonitor not available');
            return;
        }

        if (this.livePlayerUpdateInterval) clearInterval(this.livePlayerUpdateInterval);

        this.livePlayerUpdateInterval = setInterval(async () => {
            try {
                const success = await window.heartbeatMonitor.fetchHeartbeats();

                if (success && this.showLivePlayers) {
                    const heartbeats = window.heartbeatMonitor.heartbeatData;
                    this.updateLivePlayersFromHeartbeats(heartbeats);
                }
            } catch (error) {
                console.error('[HEARTBEAT] Error fetching heartbeats:', error);
            }

            this.updateLivePlayersPosition();
        }, 1000);
    }

    displayLivePlayers() {
        console.log("Displaying Live players..");

        // Fetch current heartbeats
        if (window.heartbeatMonitor) {
            console.log("Updaing live players from heartbeat (heartbeat system)");
            this.updateLivePlayersFromHeartbeats(window.heartbeatMonitor.heartbeatData);
        }
    }

    updateLivePlayersFromHeartbeats(heartbeats) {
        const currentTime = Date.now();
        const inRaidPlayers = new Set();

        console.log(`[HEARTBEAT] Processing ${Object.keys(heartbeats).length} players`, { currentFloor: this.currentFloor });

        // Update or create markers for in_raid players
        Object.entries(heartbeats).forEach(([playerId, heartbeat]) => {
            if (heartbeat.type !== 'in_raid') {
                return;
            }

            if (window.getPrettyMapName(heartbeat.map) !== this.currentMap) {
                return;
            }

            inRaidPlayers.add(playerId);

            // Tarkov coordinates: X, Y(up), Z
            const worldX = heartbeat.position?.x;
            const worldY = heartbeat.position?.z;  // Use Z for Y on map
            const worldZ = heartbeat.position?.y;  // Use Y for floor

            if (worldX == null || worldY == null) {
                console.log(`[HEARTBEAT] ${playerId} has invalid position`);
                return;
            }

            const playerObj = this.findPlayerLocal(playerId);
            const playerName = playerObj?.name || 'Unknown';
            const playerSide = playerObj?.side || heartbeat?.side || 'Unknown';

            console.log(`[HEARTBEAT] ${playerName} (${playerId}): pos=(${worldX.toFixed(0)}, ${worldY.toFixed(0)}, z=${worldZ?.toFixed(2)}), onFloor=${this.isPointOnCurrentFloor(worldZ)}`);

            this.updateLivePlayerMarker(playerId, {
                id: playerId,
                name: playerName,
                side: playerSide,
                x: worldX,
                y: worldY,
                z: worldZ,
                state: heartbeat.state
            });
        });

        // no longer in_raid
        this.livePlayerMarkers.forEach((playerData, playerId) => {
            if (!inRaidPlayers.has(playerId)) {
                console.log(`[HEARTBEAT] Removing marker for ${playerId} - no longer in raid`);
                this.removeLivePlayerMarker(playerId);
            }
        });
    }

    updateLivePlayerMarker(playerId, player) {
        let playerData = this.livePlayerMarkers.get(playerId);
        const currentTime = Date.now();
        const isNewMarker = !playerData;

        const isOnCurrentFloor = this.isPointOnCurrentFloor(player.z);

        if (isNewMarker) {
            console.log(`[LivePlayer] CREATING marker for ${player.name} (${playerId})`, {
                pos: `(${player.x.toFixed(0)}, ${player.y.toFixed(0)})`,
                floor: player.z,
                onFloor: isOnCurrentFloor
            });

            const marker = this.createLivePlayerMarkerElement(player);

            if (marker) {
                playerData = {
                    marker: marker,
                    currentPos: { x: player.x, y: player.y, z: player.z },
                    targetPos: { x: player.x, y: player.y, z: player.z },
                    lastUpdate: currentTime,
                    interpolationStart: currentTime,
                    player: player
                };

                this.livePlayerMarkers.set(playerId, playerData);

                if (!isOnCurrentFloor) {
                    marker.style.display = 'none';
                }
            } else {
                console.error(`[LivePlayer] Failed to create marker for ${player.name}`);
            }
        } else {
            const targetChanged = playerData.targetPos.x !== player.x ||
                playerData.targetPos.y !== player.y ||
                playerData.targetPos.z !== player.z;

            if (!targetChanged) return;

            playerData.targetPos = { x: player.x, y: player.y, z: player.z };
            playerData.interpolationStart = currentTime;
            playerData.lastUpdate = currentTime;
            playerData.player = player;

            const wasVisible = playerData.marker.style.display !== 'none';
            if (wasVisible !== isOnCurrentFloor) {
                playerData.marker.style.display = isOnCurrentFloor ? 'block' : 'none';
                console.log(`[LivePlayer] ${player.name} visibility changed: ${isOnCurrentFloor ? 'visible' : 'hidden'} (floor=${player.z})`);
            }

            if (player.state) {
                this.updatePlayerStateBadge(playerData.marker, player.state);
            }
        }
    }

    createLivePlayerMarkerElement(player) {
        // Calculate pixel position (using x and y coordinates)
        const pos = this.worldToPixel(player.x, player.y);

        // Check if position is valid
        if (pos.x === undefined || pos.y === undefined || isNaN(pos.x) || isNaN(pos.y)) {
            console.error(`[LivePlayer] Invalid position for ${player.name}:`, { x: player.x, y: player.y, pos });
            return null;
        }

        // Define marker size (in pixels)
        const markerSize = 12;

        // Define colors based on player side
        let markerColor = '#10b981'; // Default green
        let glowColor = 'rgba(16, 185, 129, 0.5)';

        if (player.side === 'Usec' || player.side === 'USEC') {
            markerColor = '#3b82f6'; // Blue for USEC
            glowColor = 'rgba(59, 130, 246, 0.5)';
        } else if (player.side === 'Bear' || player.side === 'BEAR') {
            markerColor = '#ef4444'; // Red for BEAR
            glowColor = 'rgba(239, 68, 68, 0.5)';
        } else if (player.side === 'Savage' || player.side === 'Scav') {
            markerColor = '#f59e0b'; // Orange for Scav
            glowColor = 'rgba(245, 158, 11, 0.5)';
        }

        const container = document.createElement('div');
        container.className = 'marker live-player-marker';
        container.dataset.playerId = player.id;
        container.style.position = 'absolute';
        container.style.left = pos.x + 'px';
        container.style.top = pos.y + 'px';
        container.style.width = `${markerSize}px`;
        container.style.height = `${markerSize}px`;
        container.style.cursor = 'pointer';
        container.style.zIndex = '100';

        const dot = document.createElement('div');
        dot.className = 'live-player-dot';
        dot.style.width = '100%';
        dot.style.height = '100%';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = markerColor;
        dot.style.boxShadow = `0 0 0 2px rgba(0, 0, 0, 0.3), 0 0 0 4px ${glowColor}`;
        dot.style.transition = 'all 0.2s ease';
        dot.style.animation = 'pulse-green 1.5s ease infinite';

        container.appendChild(dot);

        const label = document.createElement('div');
        label.className = 'marker-label';
        label.textContent = player.name || 'Player';
        label.style.position = 'absolute';
        label.style.bottom = '100%';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        label.style.color = 'white';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '10px';
        label.style.fontWeight = '500';
        label.style.marginBottom = '4px';
        label.style.pointerEvents = 'none';
        label.style.opacity = '0';
        label.style.transition = 'opacity 0.2s ease';
        label.style.whiteSpace = 'nowrap';

        container.appendChild(label);

        // Show label on hover
        container.addEventListener('mouseenter', () => {
            label.style.opacity = '1';
        });
        container.addEventListener('mouseleave', () => {
            label.style.opacity = '0';
        });

        // Optional: click handler to show player info
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof window.openProfile === 'function') {
                window.openProfile(player.id, true);
            }
        });

        this.markerLayer.appendChild(container);

        console.log(`[LivePlayer] Created marker for ${player.name} at (${pos.x}, ${pos.y})`);

        this.markers.push({
            x: player.x,
            y: player.y,
            z: player.z,
            el: container,
            type: 'live',
            playerId: player.id,
            name: player.name
        });

        this.updateMarkerScale(container);

        return container;
    }

    updateLivePlayersPosition() {
        const currentTime = Date.now();

        this.livePlayerMarkers.forEach((playerData, playerId) => {
            if (!playerData.marker) return;

            const isOnFloor = this.isPointOnCurrentFloor(playerData.currentPos.z);

            if (!isOnFloor) {
                if (playerData.marker.style.display !== 'none') {
                    playerData.marker.style.display = 'none';
                }
                return;
            } else {
                if (playerData.marker.style.display !== 'block') {
                    playerData.marker.style.display = 'block';
                }
            }

            // Skip interpolation if already at target
            if (playerData.currentPos.x === playerData.targetPos.x &&
                playerData.currentPos.y === playerData.targetPos.y) {
                return;
            }

            // interpolation starts
            const elapsed = currentTime - playerData.interpolationStart;
            const progress = Math.min(elapsed / this.interpolationDuration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 2);
            const currentX = playerData.currentPos.x + (playerData.targetPos.x - playerData.currentPos.x) * easedProgress;
            const currentY = playerData.currentPos.y + (playerData.targetPos.y - playerData.currentPos.y) * easedProgress;

            // Update position
            const pixelPos = this.worldToPixel(currentX, currentY);
            playerData.marker.style.left = pixelPos.x + 'px';
            playerData.marker.style.top = pixelPos.y + 'px';

            this.updateMarkerScale(playerData.marker);

            // On interpolation complete
            if (progress >= 1) {
                playerData.currentPos = { ...playerData.targetPos };
            }
        });
    }

    updatePlayerStateBadge(marker, state) {
        if (!marker) return;

        let stateBadge = marker.querySelector('.player-state-badge');

        if (!state && stateBadge) {
            stateBadge.remove();
            return;
        }

        if (!state) return;

        if (!stateBadge) {
            stateBadge = document.createElement('div');
            stateBadge.className = 'player-state-badge';
            marker.appendChild(stateBadge);
        }

        // Remove old state classes
        stateBadge.classList.remove('state-fired', 'state-moving', 'state-idle', 'state-extracting');

        // Add state-specific class
        let stateClass = '';
        let displayState = '';
        let icon = '';

        switch (state) {
            case 'fired':
                stateClass = 'state-fired';
                displayState = 'In Combat';
                break;
            case 'looting':
                stateClass = 'state-looting';
                displayState = 'Looting';
                break;
            default:
                stateClass = 'state-default';
                displayState = state || 'Unknown';
        }

        stateBadge.className = `player-state-badge ${stateClass}`;
        stateBadge.innerHTML = `
        <div class="wrapper-state">
            <span class="player-state-text">${displayState}</span>
            <span class="raid-dots">
                <span class="r-dot"></span>
                <span class="r-dot"></span>
                <span class="r-dot"></span>
            </span>
        </div>
    `;
    }

    // TODO
    getDisplayState(state) {
        const states = {
            'fired': 'In Combat'
        };

        return states[state] || 'Traveling';
    }

    removeLivePlayerMarker(playerId) {
        if (this.livePlayerMarkers.has(playerId)) {
            const playerData = this.livePlayerMarkers.get(playerId);
            if (playerData.marker) {
                playerData.marker.remove();

                const index = this.markers.findIndex(m => m.el === playerData.marker);
                if (index !== -1) this.markers.splice(index, 1);
            }
            this.livePlayerMarkers.delete(playerId);
            console.log(`[LivePlayer] Removed marker for ${playerId}`);
        }
    }

    // #region Labels
    loadLabels() {
        if (!this.currentMap || !this.currentMap.labels) return;

        this.clearLabels();

        this.currentMap.labels.forEach(labelDef => {
            this.addLabel(labelDef);
        });

        console.log(`Loaded ${this.labels.length} labels for ${this.currentMap.name}`);
    }

    addLabel(labelDef) {
        const pos = this.worldToPixel(labelDef.Position.x, labelDef.Position.y);

        const el = document.createElement('div');
        el.className = 'map-label';

        if (labelDef.style) {
            el.classList.add(labelDef.style);
        }

        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';

        el.textContent = labelDef.Text;

        if (labelDef.FontSize) {
            el.style.fontSize = labelDef.FontSize + 'px';
        }

        if (labelDef.color) {
            el.style.color = labelDef.color;
        }

        if (labelDef.backgroundColor) {
            el.style.background = labelDef.backgroundColor;
        }

        if (labelDef.borderColor) {
            el.style.border = `2px solid ${labelDef.borderColor}`;
        }

        if (labelDef.fontWeight) {
            el.style.fontWeight = labelDef.fontWeight;
        }

        if (labelDef.opacity) {
            el.style.opacity = labelDef.opacity;
        }

        this.labelLayer.appendChild(el);

        const labelObj = {
            el: el,
            def: labelDef,
            baseFontSize: labelDef.fontSize || 14
        };

        this.labels.push(labelObj);
        this.updateLabelScale(labelObj);

        return labelObj;
    }

    clearLabels() {
        this.labelLayer.innerHTML = "";
        this.labels = [];
    }

    updateLabelScale(labelObj) {
        const scale = 1 / this.zoom;
        labelObj.el.style.transform = `translate(-50%, -50%) scale(${scale})`;

        if (this.zoom > 2) {
            labelObj.el.style.opacity = '0.2';
        } else {
            labelObj.el.style.opacity = labelObj.def.opacity || '1';
        }
    }

    updateAllLabels() {
        this.labels.forEach(label => this.updateLabelScale(label));
    }

    // full opacity when on ground floor (level 0)
    updateLabelOpacity() {
        const isGroundFloor = this.currentFloor === 0;
        this.labels.forEach(label => {
            if (isGroundFloor) {
                label.el.classList.remove('reduced-opacity');
            } else {
                label.el.classList.add('reduced-opacity');
            }
        });
    }

    toggleLabels(show) {
        this.labels.forEach(label => {
            label.el.style.display = show ? 'block' : 'none';
        });
    }

    // #region Loader
    createLoader() {
        const loader = document.createElement('div');
        loader.id = 'mapLoader';
        loader.className = 'map-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <span>Loading Map Engine...</span>
        `;
        loader.style.display = 'none';
        document.body.appendChild(loader);
    }

    showLoader() {
        const loader = document.getElementById('mapLoader');
        if (loader) loader.style.display = 'flex';
        this.isLoading = true;
    }

    hideLoader() {
        const loader = document.getElementById('mapLoader');
        if (loader) loader.style.display = 'none';
        this.isLoading = false;
    }

    // #region Init UI
    initUI() {
        const selector = document.getElementById('mapSelector');

        Object.entries(MAPS).forEach(([key, map]) => {
            const btn = document.createElement('button');
            btn.className = 'map-btn' + (key === 'customs' ? ' active' : '');
            btn.dataset.map = key;
            btn.addEventListener('click', () => this.switchMap(key));
            btn.style.backgroundImage = `url(${map.buttonImage || map.image})`;
            btn.innerHTML = `<span>${map.name}</span>`;
            selector.appendChild(btn);
        });

        document.getElementById('toggleDeathsBtn').addEventListener('click', () => {
            this.showMarkers = !this.showMarkers;
            document.getElementById('toggleDeathsBtn').classList.toggle('active', this.showMarkers);
            this.saveState();
            this.displayMarkers();
        });

        document.getElementById('toggleLabelsBtn').addEventListener('click', () => {
            this.showLabels = !this.showLabels;
            document.getElementById('toggleLabelsBtn').classList.toggle('active', this.showLabels);
            this.saveState();
            this.toggleLabels(this.showLabels);
        });

        document.getElementById('toggleModeBtn').addEventListener('click', () => {
            this.toggleDisplayMode();
        });

        document.getElementById('toggleFloorPanelBtn').addEventListener('click', () => {
            this.floorPanel.classList.toggle('visible');
        });

        const modeBtn = document.getElementById('toggleModeBtn');
        if (modeBtn) {
            modeBtn.classList.toggle('active', this.displayMode === 'dots');
            modeBtn.innerHTML = `<i class="fas fa-layer-group"></i> Display Mode (${this.displayMode === 'dots' ? 'Deaths' : 'Heatmap'})`;
        }

        const deathsBtn = document.getElementById('toggleDeathsBtn');
        if (deathsBtn) {
            deathsBtn.classList.toggle('active', this.showMarkers);
        }
    }

    loadState() {
        try {
            const state = JSON.parse(window.localStorage.getItem('liveMapState') || '{}');
            if (typeof state.showMarkers === 'boolean') this.showMarkers = state.showMarkers;
            if (typeof state.showLabels === 'boolean') this.showLabels = state.showLabels;
            if (typeof state.displayMode === 'string') this.displayMode = state.displayMode;
            if (typeof state.selectedMap === 'string') this.selectedMap = state.selectedMap;
            if (typeof state.currentFloor === 'number') this.currentFloor = state.currentFloor;
        } catch (error) {
            console.warn('Could not load saved live map settings:', error);
        }
    }

    saveState() {
        try {
            window.localStorage.setItem('liveMapState', JSON.stringify({
                selectedMap: this.currentMap?.key || this.selectedMap || 'customs',
                showMarkers: this.showMarkers,
                showLabels: this.showLabels,
                displayMode: this.displayMode,
                currentFloor: this.currentFloor
            }));
        } catch (error) {
            console.warn('Could not save live map settings:', error);
        }
    }

    resolveMapAssetPath(relativePath) {
        if (!relativePath) return null;
        if (relativePath.startsWith('http') || relativePath.startsWith('/')) {
            return relativePath;
        }

        const folder = this.currentMap?.folder || '';
        return `/live-map/maps/${relativePath}`;
    }

    // #region Overlays
    setupOverlayCanvas() {
        if (!this.heatmapCanvas || !this.zoneCanvas || !this.mapWidth || !this.mapHeight) return;

        [this.heatmapCanvas, this.zoneCanvas].forEach(canvas => {
            canvas.width = this.mapWidth;
            canvas.height = this.mapHeight;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
        });

        this.heatmapCtx = this.heatmapCanvas.getContext('2d');
        this.zoneCtx = this.zoneCanvas.getContext('2d');
        this.redrawOverlays();
    }

    redrawOverlays() {
        this.clearHeatmap();
        this.drawHeatmap();
        this.drawZones();
    }

    clearHeatmap() {
        if (this.heatmapCtx) {
            this.heatmapCtx.clearRect(0, 0, this.mapWidth, this.mapHeight);
        }
    }

    // #region Zones
    async loadZoneData() {
        if (this.zoneData) return;
        try {
            const response = await fetch('/api/main/client/data/map_zones.json');
            if (!response.ok) {
                console.warn('Could not load zone data:', response.status);
                return;
            }
            const data = await response.json();
            this.zoneData = data.data || {};
        } catch (error) {
            console.warn('Could not fetch zone data:', error);
        }
    }

    // Normalize map by the zone inside custom zones
    resolveInvertedMapName(map) {
        let normalizedMap = String(map).trim();

        const mapNormalization = {
            // GZ
            'Ground Zero': 'Ground Zero - Low',
        };

        if (mapNormalization.hasOwnProperty(normalizedMap)) {
            return mapNormalization[normalizedMap];
        }

        return normalizedMap; // fallback
    }

    drawZones() {
        if (!this.zoneCtx || !this.zoneData || !this.currentMap) {
            return;
        }

        const normalizedMapName = this.resolveInvertedMapName(this.currentMap.name);
        const zoneSet = this.zoneData[normalizedMapName];

        if (!Array.isArray(zoneSet) || !zoneSet.length) {
            return;
        }

        const ctx = this.zoneCtx;
        ctx.clearRect(0, 0, this.mapWidth, this.mapHeight);

        zoneSet.forEach(zone => {
            const rect = this.getZoneRect(zone);
            if (!rect) return;

            ctx.save();

            // Setup styles for main zone (FILL - transparent background)
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(176, 255, 169, 0.85)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;

            // Check if zone has rotation
            const hasRotation = zone.RotationZ && zone.RotationZ !== 0;

            if (hasRotation) {
                this.drawRotatedZone(ctx, zone, rect);
            } else {
                // No rotation
                ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            }

            // Draw TEXT
            ctx.font = 'bold 24px Bender Regular, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.fillText(zone.Name, rect.x + 4, rect.y + 28);

            ctx.restore();

            // Draw subzones
            if (Array.isArray(zone.SubZones)) {
                zone.SubZones.forEach(sub => {
                    const subRect = this.getZoneRect(sub);
                    if (!subRect) return;

                    ctx.save();

                    // Subzone fill and border
                    ctx.setLineDash([6, 6]);
                    ctx.strokeStyle = 'rgba(255, 238, 0, 0.70)';
                    ctx.fillStyle = 'rgba(255, 230, 0, 0.35)';
                    ctx.lineWidth = 2;

                    const subHasRotation = sub.RotationZ && sub.RotationZ !== 0;

                    if (subHasRotation) {
                        this.drawRotatedSubZone(ctx, sub, subRect);
                    } else {
                        ctx.fillRect(subRect.x, subRect.y, subRect.w, subRect.h);
                        ctx.strokeRect(subRect.x, subRect.y, subRect.w, subRect.h);
                    }

                    // Subzone TEXT
                    ctx.font = '12px Bender Regular, sans-serif';
                    ctx.fillStyle = 'rgba(255, 246, 230, 0.95)';
                    ctx.fillText(sub.Name, subRect.x + 4, subRect.y + 18);

                    ctx.restore();
                });
            }
        });
    }

    getRotatedZoneRect(zone) {
        if (!zone.Center || !zone.Size) return null;

        const angleRad = (zone.RotationZ || 0) * Math.PI / 180;
        const halfW = zone.Size.x / 2;
        const halfH = zone.Size.z / 2;

        // 4 corners of the rectangle before rotation
        const corners = [
            { x: -halfW, z: -halfH }, // top-left
            { x: halfW, z: -halfH }, // top-right
            { x: halfW, z: halfH }, // bottom-right
            { x: -halfW, z: halfH }  // bottom-left
        ];

        // Rotate corners and find min/max
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        corners.forEach(corner => {
            // Rotate around origin
            const rotatedX = corner.x * Math.cos(angleRad) - corner.z * Math.sin(angleRad);
            const rotatedZ = corner.x * Math.sin(angleRad) + corner.z * Math.cos(angleRad);

            // World coordinates
            const worldX = zone.Center.x + rotatedX;
            const worldZ = zone.Center.z + rotatedZ;

            minX = Math.min(minX, worldX);
            maxX = Math.max(maxX, worldX);
            minZ = Math.min(minZ, worldZ);
            maxZ = Math.max(maxZ, worldZ);
        });

        const topLeft = this.worldToPixel(minX, maxZ);
        const bottomRight = this.worldToPixel(maxX, minZ);

        return {
            x: topLeft.x,
            y: topLeft.y,
            w: bottomRight.x - topLeft.x,
            h: bottomRight.y - topLeft.y
        };
    }

    drawRotatedZone(ctx, zone, rect) {
        const angleRad = (zone.RotationZ || 0) * Math.PI / 180;

        // Calculate center of the rectangle
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angleRad);
        ctx.translate(-centerX, -centerY);

        // Draw
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Draw text
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for text
        ctx.fillText(zone.Name, rect.x + 4, rect.y + 20);

        ctx.restore();
    }

    drawRotatedSubZone(ctx, subZone, rect) {
        const angleRad = (subZone.RotationZ || 0) * Math.PI / 180;

        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angleRad);
        ctx.translate(-centerX, -centerY);

        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillText(subZone.Name, rect.x + 4, rect.y + 18);

        ctx.restore();
    }

    getZoneRect(zone) {
        if (!zone.Center || !zone.Size) return null;

        const hasRotation = zone.RotationZ && zone.RotationZ !== 0;

        if (hasRotation) {
            return this.getRotatedZoneRect(zone);
        }

        // Without rotation
        const minX = zone.Center.x - (zone.Size.x / 2);
        const maxX = zone.Center.x + (zone.Size.x / 2);
        const minZ = zone.Center.z - (zone.Size.z / 2);
        const maxZ = zone.Center.z + (zone.Size.z / 2);

        const topLeft = this.worldToPixel(minX, maxZ);
        const bottomRight = this.worldToPixel(maxX, minZ);

        // Redraw zones by the floor
        if (this.isPointOnCurrentFloor(zone.Center.z)) {
            return null;
        }

        return {
            x: topLeft.x,
            y: topLeft.y,
            w: bottomRight.x - topLeft.x,
            h: bottomRight.y - topLeft.y
        };
    }

    drawHeatmap() {
        if (!this.heatmapCtx || !this.showMarkers || this.displayMode !== 'heatmap') {
            return;
        }

        const points = (this.deathsData.allDeaths || [])
            .map(death => {
                const x = death.x ?? death.position?.x ?? death.Position?.x;
                const y = death.y ?? death.position?.y ?? death.Position?.y;
                const z = this.extractZ(death);
                if (x == null || y == null || !this.isPointOnCurrentFloor(z)) return null;
                return { x, y, z };
            })
            .filter(Boolean);

        if (!points.length) {
            return;
        }

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = this.mapWidth;
        tmpCanvas.height = this.mapHeight;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.clearRect(0, 0, this.mapWidth, this.mapHeight);
        tmpCtx.globalCompositeOperation = 'lighter';

        const radius = Math.max(30, Math.min(this.mapWidth, this.mapHeight) * 0.05);
        points.forEach(point => {
            const pos = this.worldToPixel(point.x, point.y);
            const gradient = tmpCtx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.2, 'rgba(255, 224, 0, 0.4)');
            gradient.addColorStop(0.5, 'rgba(255, 80, 0, 0.25)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            tmpCtx.fillStyle = gradient;
            tmpCtx.fillRect(pos.x - radius, pos.y - radius, radius * 2, radius * 2);
        });

        this.heatmapCtx.clearRect(0, 0, this.mapWidth, this.mapHeight);
        this.heatmapCtx.filter = 'blur(24px)';
        this.heatmapCtx.drawImage(tmpCanvas, 0, 0);
        this.heatmapCtx.filter = 'none';
    }

    // #region LOAD/SWITCH MAP
    async switchMap(mapKey) {
        document.querySelectorAll('.map-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.map === mapKey) {
                btn.classList.add('active');
            }
        });

        await this.loadMap(mapKey);
    }

    async loadMap(name) {
        const map = MAPS[name];
        if (!map) {
            console.error("Map not found:", name);
            return;
        }

        document.querySelectorAll('.map-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.map === name);
        });

        const mapFolder = map.folder || name;
        const configPath = `/live-map/maps/${mapFolder}/${name}_TarkovDev.jsonc`;

        this.currentMap = { ...map, key: name, folder: mapFolder };
        this.mapConfig = null;
        this.floorLayers = [];
        const savedFloor = this.currentFloor;
        this.staticMarkers = [];

        // Clear live players when switching maps
        this.livePlayerMarkers.forEach((_, playerId) => this.removeLivePlayerMarker(playerId));

        this.showLoader();
        this.clearAllMarkers();
        this.clearLabels();

        await this.loadMapConfig(configPath);
        this.setupFloorLayers();
        if (typeof savedFloor === 'number' && this.floorLayers.some(f => f.level === savedFloor)) {
            this.currentFloor = savedFloor;
        }
        this.buildFloorSelector();
        await this.loadZoneData();

        await new Promise((resolve, reject) => {
            this.baseImage.onload = () => {
                this.mapWidth = this.baseImage.naturalWidth;
                this.mapHeight = this.baseImage.naturalHeight;
                this.center();
                this.setupOverlayCanvas();
                resolve();
            };
            this.baseImage.onerror = reject;
            this.baseImage.src = this.currentMap.image;
        });

        this.selectFloor(this.currentFloor);
        this.loadLabels();
        this.updateLabelOpacity();
        this.toggleLabels(this.showLabels);
        this.loadStaticMarkers();

        await this.loadDeaths(name);
        this.saveState();
        this.hideLoader();
    }

    async loadMapConfig(configPath) {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                console.warn(`No config found at ${configPath}`);
                return;
            }

            const text = await response.text();
            const config = this.parseJsonc(text);
            this.mapConfig = config;

            if (config.Bounds) {
                this.currentMap.bounds = {
                    min: { x: config.Bounds.Min.x, y: config.Bounds.Min.y },
                    max: { x: config.Bounds.Max.x, y: config.Bounds.Max.y }
                };
            }

            if (typeof config.CoordinateRotation === 'number') {
                this.currentMap.rotation = config.CoordinateRotation;
            }

            if (config.Labels) {
                this.currentMap.labels = config.Labels;
            }

            if (typeof config.DefaultLevel === 'number') {
                this.currentMap.defaultFloor = config.DefaultLevel;
            }

            this.staticMarkers = Array.isArray(config.StaticMarkers) ? config.StaticMarkers : [];
        } catch (error) {
            console.warn('Unable to load map config:', error);
        }
    }

    setupFloorLayers() {
        if (!this.mapConfig || !this.mapConfig.Layers) {
            this.floorLayers = [{
                level: 0,
                name: 'Ground',
                image: this.currentMap.image,
                zRanges: [{ min: -1000, max: 1000 }],
                zMin: -1000,
                zMax: 1000
            }];
            this.currentFloor = 0;
            return;
        }

        const mapFolder = this.currentMap.folder;
        this.floorLayers = Object.entries(this.mapConfig.Layers).map(([name, layer]) => {
            const bounds = Array.isArray(layer.GameBounds) ? layer.GameBounds : [];
            const zRanges = bounds.map(entry => {
                const minZ = entry.Min?.z ?? -Infinity;
                const maxZ = entry.Max?.z ?? Infinity;
                return {
                    min: Math.min(minZ, maxZ),
                    max: Math.max(minZ, maxZ)
                };
            });
            const zMin = zRanges.length ? Math.min(...zRanges.map(r => r.min)) : -1000;
            const zMax = zRanges.length ? Math.max(...zRanges.map(r => r.max)) : 1000;
            return {
                level: layer.Level ?? 0,
                name: name,
                image: `/live-map/maps/${mapFolder}/${layer.Level}.png`,
                zRanges,
                zMin,
                zMax
            };
        }).sort((a, b) => a.level - b.level);

        this.currentFloor = typeof this.currentMap.defaultFloor === 'number'
            ? this.currentMap.defaultFloor
            : (this.floorLayers.find(f => f.level === 0)?.level ?? this.floorLayers[0].level);
    }

    buildFloorSelector() {
        if (!this.floorSelector) return;
        this.floorSelector.innerHTML = '';

        this.floorLayers.forEach(floor => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'floor-btn';
            btn.textContent = floor.level === 0 ? 'Ground' : floor.level < 0 ? `Underground ${floor.level}` : `Floor ${floor.level}`;
            btn.dataset.level = floor.level;
            btn.addEventListener('click', () => this.selectFloor(floor.level));
            this.floorSelector.appendChild(btn);
        });

        this.updateFloorSelectorUI();
    }

    selectFloor(level) {
        const floor = this.floorLayers.find(f => f.level === Number(level)) || this.floorLayers[0];
        if (!floor) return;

        this.currentFloor = floor.level;
        this.saveState();

        if (floor.level === 0) {
            this.floorImage.style.display = 'none';
            this.baseImage.style.opacity = '1';
            this.baseImage.style.filter = 'none';
            this.mapRoot.classList.add('floor-ground-selected');
        } else {
            this.floorImage.style.display = 'block';
            this.floorImage.src = floor.image;
            this.baseImage.style.opacity = '0.35';
            this.baseImage.style.filter = 'blur(3px)';
            this.mapRoot.classList.remove('floor-ground-selected');
        }

        this.updateFloorSelectorUI();
        this.updateLabelOpacity();
        this.displayMarkers();
        this.displayStaticMarkers();
    }

    updateFloorSelectorUI() {
        this.floorSelector.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.level) === this.currentFloor);
        });
    }

    parseJsonc(text) {
        const withoutBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
        const withoutLineComments = withoutBlockComments.replace(/(^|[^:]|\")\/\/.*$/gm, '$1');
        return JSON.parse(withoutLineComments);
    }

    // Load leaderboard data
    async loadLeaderboard() {
        try {
            const resp = await fetch('../api/data/seasons/season11.json', { cache: 'no-cache' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            this.leaderboard = data?.leaderboard || [];

            console.log(`[Leaderboard] Loaded ${this.leaderboard.length} entries from season11.json`);
        } catch (err) {
            console.warn('Failed to load leaderboard from /fallbacks/season11.json', err);
            this.leaderboard = [];
        }
    }

    findPlayerLocal(query) {
        if (!query) return null;
        const q = String(query).toLowerCase();

        let found = this.leaderboard.find(p => p.id && String(p.id).toLowerCase() === q);
        if (found) return found;

        const byPermaLink = this.leaderboard.filter(p => p.permaLink && String(p.permaLink).toLowerCase() === q);
        if (byPermaLink.length > 0) return byPermaLink[0];

        return found || null;
    }

    toggleDisplayMode() {
        this.displayMode = this.displayMode === 'dots' ? 'heatmap' : 'dots';
        const modeBtn = document.getElementById('toggleModeBtn');
        if (modeBtn) {
            modeBtn.classList.toggle('active', this.displayMode === 'dots');
            modeBtn.innerHTML = `<i class="fas fa-layer-group"></i> Display Mode (${this.displayMode === 'dots' ? 'Deaths' : 'Heatmap'})`;
        }
        this.saveState();
        this.displayMarkers();
    }

    async loadDeaths(mapName) {
        try {
            console.log(`Loading deaths for ${mapName}...`);

            const response = await fetch(`/api/data/shared/deaths/${mapName}.json`);

            if (!response.ok) {
                console.warn(`No deaths file for ${mapName} (${response.status})`);
                this.deathsData = { players: {}, allDeaths: [] };
                return;
            }

            const data = await response.json();
            this.deathsData = data;

            console.log(`Loaded ${data.allDeaths.length} deaths for ${mapName}`);

            this.displayMarkers();

        } catch (error) {
            console.error('Failed to load deaths:', error);
            this.deathsData = { players: {}, allDeaths: [] };
        }
    }

    displayMarkers() {
        console.log(`[DISPLAY] displayMarkers() called. showMarkers=${this.showMarkers}, showLivePlayers=${this.showLivePlayers}, displayMode=${this.displayMode}`);
        this.clearAllMarkers();

        if (this.showMarkers && this.displayMode !== 'heatmap') {
            this.displayDeathMarkers();
        }

        this.displayStaticMarkers();

        if (this.showLivePlayers) {
            console.log(`[DISPLAY] Calling displayLivePlayers()`);
            this.displayLivePlayers();
        }

        this.redrawOverlays();
        this.updateMarkerCount();
    }

    clearAllMarkers() {
        this.markerLayer.innerHTML = "";
        this.updateMarkerCount();
    }

    displayDeathMarkers() {
        if (!this.deathsData.allDeaths || !this.showMarkers) return;

        this.deathsData.allDeaths.forEach(death => {
            const x = death.x ?? death.position?.x ?? death.Position?.x;
            const y = death.y ?? death.position?.y ?? death.Position?.y;
            const z = this.extractZ(death);

            if (x == null || y == null) return;
            if (!this.isPointOnCurrentFloor(z)) return;

            const deathTime = new Date(death.timestamp * 1000).toLocaleString() || 'Unknown time';
            const label = `[${deathTime}] ${death.playerName || 'Unknown'}`;

            this.createMarker({ x, y, z, label, type: 'death', imageSrc: '/live-map/maps/Markers/death.webp' });
        });
    }

    displayHeatmapMarkers() {
        this.drawHeatmap();
    }

    calculateHeatmap() {
        const gridSize = 50;
        const grid = {};

        this.deathsData.allDeaths.forEach(death => {
            const x = death.x ?? death.position?.x ?? death.Position?.x;
            const y = death.y ?? death.position?.y ?? death.Position?.y;
            const z = this.extractZ(death);
            if (x == null || y == null) return;

            const gridX = Math.round(x / gridSize) * gridSize;
            const gridY = Math.round(y / gridSize) * gridSize;
            const key = `${gridX},${gridY}`;

            if (!grid[key]) {
                grid[key] = {
                    x: gridX,
                    y: gridY,
                    zValues: [],
                    count: 0
                };
            }

            grid[key].count++;
            if (z != null) grid[key].zValues.push(z);
        });

        return Object.values(grid).map(point => ({
            x: point.x,
            y: point.y,
            z: point.zValues.length ? point.zValues.reduce((sum, val) => sum + val, 0) / point.zValues.length : null,
            count: point.count
        }));
    }

    isPointOnCurrentFloor(z) {
        const floor = this.floorLayers.find(f => f.level === this.currentFloor);
        if (!floor) return true;

        if (z == null) {
            return floor.level === 0;
        }

        return floor.zRanges.some(range => z >= range.min && z <= range.max);
    }

    extractZ(item) {
        return item.z ?? item.position?.z ?? item.Position?.z ?? item.Z ?? null;
    }

    loadStaticMarkers() {
        this.displayStaticMarkers();
    }

    displayStaticMarkers() {
        if (!Array.isArray(this.staticMarkers) || !this.currentMap) return;

        this.staticMarkers.forEach(point => {
            const x = point.Position?.x;
            const y = point.Position?.y;
            const z = this.extractZ(point.Position || point);
            if (x == null || y == null) return;

            const label = point.Text || point.Category || 'Map marker';
            const color = null;
            const imageSrc = point.ImagePath ? this.resolveMapAssetPath(point.ImagePath) : null;

            this.createMarker({ x, y, z, label, type: 'static', size: 12, color, imageSrc });
        });
    }

    findFloorForZ(z) {
        if (z == null) return null;

        for (const floor of this.floorLayers) {
            if (floor.zRanges && floor.zRanges.some(range => z >= range.min && z <= range.max)) {
                return floor.level;
            }
        }

        // Default to ground floor if no match found
        return 0;
    }

    // #region Main Transform
    // This right there carl, yeah. 
    worldToPixel(x, y) {
        if (!this.currentMap) return { x: 0, y: 0 };

        const map = this.currentMap;
        const { min, max } = map.bounds;
        const rotation = map.rotation || 0;

        let nx = (x - min.x) / (max.x - min.x);
        let ny = (y - min.y) / (max.y - min.y);

        switch (rotation) {
            case 0:
                break;

            case 90:
                const temp90 = nx;
                nx = 1 - ny;
                ny = temp90;
                break;

            case 180:
                nx = 1 - nx;
                ny = 1 - ny;
                break;

            case 270:
            case -90:
                const temp270 = nx;
                nx = ny;
                ny = 1 - temp270;
                break;
        }

        if (map.invertX) {
            nx = 1 - nx;
        }

        ny = 1 - ny;

        const px = nx * map.imageWidth;
        const py = ny * map.imageHeight;

        return { x: px, y: py };
    }

    pixelToWorld(px, py) {
        if (!this.currentMap) return { x: 0, y: 0 };

        const map = this.currentMap;
        const { min, max } = map.bounds;
        const rotation = map.rotation || 0;

        // Normalization
        let nx = px / map.imageWidth;
        let ny = py / map.imageHeight;

        // Inversion, if we need to invert Y
        // Use map configs to define those
        if (map.invertY !== false) {
            ny = 1 - ny;
        }

        if (map.invertX) {
            nx = 1 - nx;
        }

        // Rotation support of a map, if its rotated
        switch (rotation) {
            case 0:
                break;
            case 90:
                // 270 degrees (90)
                const temp90 = nx;
                nx = ny;
                ny = 1 - temp90;
                break;
            case 180:
                // Default
                nx = 1 - nx;
                ny = 1 - ny;
                break;
            case 270:
            case -90:
                // Reversed 270 is -90 (wtf?)
                const temp270 = nx;
                nx = 1 - ny;
                ny = temp270;
                break;
        }

        // Final normalization of the coordinates based on the game bounds of a map
        const x = min.x + nx * (max.x - min.x);
        const y = min.y + ny * (max.y - min.y);

        return {
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
        };
    }

    // #region Markers
    createMarker({ x, y, z = null, label = '', type = 'death', size = 10, color = null, imageSrc = null }) {
        if (!this.currentMap) return null;
        if (!this.isPointOnCurrentFloor(z)) return null;

        const pos = this.worldToPixel(x, y);
        const container = document.createElement('div');
        container.className = 'marker';
        if (type === 'static') container.classList.add('static-marker');
        if (type === 'death') container.classList.add('death-marker');

        container.style.left = pos.x + 'px';
        container.style.top = pos.y + 'px';
        container.style.width = imageSrc ? 'auto' : `${size}px`;
        container.style.height = imageSrc ? 'auto' : `${size}px`;

        if (imageSrc) {
            const icon = document.createElement('img');
            icon.src = imageSrc;
            icon.alt = label || 'Marker';
            icon.className = 'marker-icon';
            container.appendChild(icon);
        } else {
            if (color) {
                container.style.background = color;
                container.style.boxShadow = `0 0 ${Math.max(10, size / 2)}px ${color}`;
            }
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;
        }

        container.setAttribute('data-label', label);
        this.markerLayer.appendChild(container);

        const markerObj = { x, y, z, el: container, type };
        this.markers.push(markerObj);
        this.updateMarkerScale(container);

        return markerObj;
    }

    updateMarkerScale(el) {
        el.style.transform = `translate(-50%, -50%) scale(${1 / this.zoom})`;
    }

    updateAllMarkers() {
        this.markers.forEach(m => this.updateMarkerScale(m.el));
    }

    updateMarkerCount() {
        const counter = document.getElementById('markerCount');
        if (!counter) return;

        if (this.displayMode === 'heatmap' && this.showMarkers) {
            const count = this.deathsData?.allDeaths?.length || 0;
            counter.textContent = `${count} heat entries`;
            return;
        }

        counter.textContent = `${this.markers.length} markers`;
    }

    // #region DEBUG
    initCoordinates() {
        const viewport = document.getElementById('viewport');

        viewport.addEventListener('mousemove', (e) => {
            if (!this.currentMap) return;

            const rect = viewport.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const mouseX = e.clientX - rect.left - centerX;
            const mouseY = e.clientY - rect.top - centerY;

            const imgX = (mouseX - this.pan.x) / this.zoom + this.mapWidth / 2;
            const imgY = (mouseY - this.pan.y) / this.zoom + this.mapHeight / 2;

            const gameCoordsEl = document.getElementById('gameCoords');
            const pixelCoordsEl = document.getElementById('pixelCoords');

            if (imgX >= 0 && imgX <= this.mapWidth && imgY >= 0 && imgY <= this.mapHeight) {
                const world = this.pixelToWorld(imgX, imgY);

                gameCoordsEl.textContent = `${world.x.toFixed(2)}, ${world.y.toFixed(2)}`;
                pixelCoordsEl.textContent = `${Math.round(imgX)}, ${Math.round(imgY)}`;
            } else {
                gameCoordsEl.textContent = '---';
                pixelCoordsEl.textContent = '---';
            }
        });

        viewport.addEventListener('mouseleave', () => {
            document.getElementById('gameCoords').textContent = '---';
            document.getElementById('pixelCoords').textContent = '---';
        });
    }

    // #region update()
    update() {
        this.mapRoot.style.transform = `
            translate(-50%, -50%)
            translate(${this.pan.x}px, ${this.pan.y}px)
            scale(${this.zoom})
        `;
        this.updateAllMarkers();
        this.updateAllLabels();
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
    }

    center() {
        this.pan.x = 0;
        this.pan.y = 0;
        this.zoom = 0.3;
        this.update();
    }

    // #region Input
    initInput() {
        const viewport = document.getElementById('viewport');

        let dragging = false;
        let last = { x: 0, y: 0 };

        viewport.addEventListener('mousedown', e => {
            dragging = true;
            last = { x: e.clientX, y: e.clientY };
            viewport.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            dragging = false;
            viewport.style.cursor = 'default';
        });

        window.addEventListener('mousemove', e => {
            if (!dragging) return;

            this.pan.x += e.clientX - last.x;
            this.pan.y += e.clientY - last.y;

            last = { x: e.clientX, y: e.clientY };
            this.update();
        });

        viewport.addEventListener('wheel', e => {
            e.preventDefault();

            const oldZoom = this.zoom;
            const factor = 1.1;

            this.zoom *= (e.deltaY < 0 ? factor : 1 / factor);
            this.zoom = Math.max(0.2, Math.min(5, this.zoom));

            const rect = viewport.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;

            this.pan.x -= cx * (this.zoom / oldZoom - 1);
            this.pan.y -= cy * (this.zoom / oldZoom - 1);

            this.update();
        });
    }
}

// #region Init
document.addEventListener('DOMContentLoaded', async function () {
    const map = new MapEngine();
    const initialMap = map.selectedMap || 'customs';

    await map.loadMap(initialMap);

    window.mapEngine = map;
});