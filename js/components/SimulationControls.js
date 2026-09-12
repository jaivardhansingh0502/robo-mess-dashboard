// ROBOMESS - Simulation Controls UI Component
// Handles Start/Pause/Reset, Speed multipliers, Algorithm toggles, Layer overlays, and Dynamic Event Triggers

export class SimulationControls {
    constructor(container, engine) {
        this.container = container;
        this.engine = engine;
        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="sim-controls-panel">
                <!-- Playback & Speed Bar -->
                <div class="control-group playback-group">
                    <div class="control-label">FLEET EXECUTION</div>
                    <div class="btn-cluster">
                        <button id="btn-play-pause" class="cyber-btn primary-pulse">
                            <span class="btn-icon">▶</span>
                            <span class="btn-text">START FLEET</span>
                        </button>
                        <button id="btn-step" class="cyber-btn">
                            <span class="btn-icon">⏭</span>
                            <span class="btn-text">STEP</span>
                        </button>
                        <button id="btn-reset" class="cyber-btn danger-hover">
                            <span class="btn-icon">↻</span>
                            <span class="btn-text">RESET</span>
                        </button>
                    </div>

                    <!-- Speed Multipliers -->
                    <div class="speed-selector">
                        <span class="speed-label">RATE:</span>
                        <button class="speed-btn" data-speed="0.5">0.5x</button>
                        <button class="speed-btn active" data-speed="1">1.0x</button>
                        <button class="speed-btn" data-speed="2">2.0x</button>
                        <button class="speed-btn" data-speed="4">4.0x</button>
                    </div>
                </div>

                <!-- Algorithm Pipeline Toggles -->
                <div class="control-group algo-group">
                    <div class="control-label">ALGORITHM PIPELINE</div>
                    <div class="toggle-cluster">
                        <label class="cyber-toggle" title="Consensus-Based Bundle Algorithm (Decentralized Task Auction)">
                            <input type="checkbox" id="toggle-cbba" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-text"><strong class="cyan">CBBA</strong> (Task Alloc)</span>
                        </label>
                        <label class="cyber-toggle" title="Conflict-Based Search Multi-Agent Path Planning">
                            <input type="checkbox" id="toggle-cbs" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-text"><strong class="orange">CBS + A*</strong> (Global Path)</span>
                        </label>
                        <label class="cyber-toggle" title="Optimal Reciprocal Collision Avoidance (Real-Time Evasion)">
                            <input type="checkbox" id="toggle-orca" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-text"><strong class="green">ORCA</strong> (Local Evasion)</span>
                        </label>
                    </div>
                </div>

                <!-- Layer Visualization Overlays -->
                <div class="control-group layer-group">
                    <div class="control-label">HUD SENSORY LAYERS</div>
                    <div class="btn-cluster wrap-cluster">
                        <button class="chip-btn active" id="toggle-paths">
                            <span class="chip-dot cyan-dot"></span> Paths
                        </button>
                        <button class="chip-btn active" id="toggle-collision">
                            <span class="chip-dot red-dot"></span> Safety Radii
                        </button>
                        <button class="chip-btn active" id="toggle-vectors">
                            <span class="chip-dot green-dot"></span> ORCA Vectors
                        </button>
                        <button class="chip-btn active" id="toggle-sensor">
                            <span class="chip-dot yellow-dot"></span> LiDAR Sweeps
                        </button>
                    </div>
                </div>

                <!-- Dynamic Event Injection Deck -->
                <div class="control-group event-injection-group">
                    <div class="control-label warning-label">
                        <span class="pulse-warning">⚡</span> DYNAMIC EVENT INJECTION
                    </div>
                    <div class="btn-cluster wrap-cluster">
                        <button id="evt-new-task" class="event-btn new-task-btn" title="Inject dynamic urgent warehouse order">
                            <span class="btn-badge">+</span> NEW ORDER
                        </button>
                        <button id="evt-robot-failure" class="event-btn failure-btn" title="Simulate motor failure on AMR-03 (Titan)">
                            <span class="btn-badge">⚠</span> ROBOT FAULT (R3)
                        </button>
                        <button id="evt-low-battery" class="event-btn battery-btn" title="Simulate battery drain on AMR-02 (Apex)">
                            <span class="btn-badge">⚡</span> LOW BATTERY (R2)
                        </button>
                        <button id="evt-block-aisle" class="event-btn obstacle-btn" title="Drop physical crate spill in central highway">
                            <span class="btn-badge">🚧</span> BLOCK AISLE
                        </button>
                        <button id="evt-recover" class="event-btn recover-btn" title="Reactivate offline robots">
                            <span class="btn-badge">↺</span> RECOVER R3
                        </button>
                        <button id="evt-clear-obs" class="event-btn clear-btn" title="Clear all dynamic obstacles">
                            <span class="btn-badge">🧹</span> CLEAR AISLES
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        const playBtn = this.container.querySelector('#btn-play-pause');
        const playIcon = playBtn.querySelector('.btn-icon');
        const playText = playBtn.querySelector('.btn-text');

        playBtn.addEventListener('click', () => {
            if (this.engine.isRunning) {
                this.engine.pause();
                playBtn.classList.remove('active');
                playIcon.textContent = '▶';
                playText.textContent = 'RESUME FLEET';
            } else {
                this.engine.start();
                playBtn.classList.add('active');
                playIcon.textContent = '⏸';
                playText.textContent = 'PAUSE FLEET';
            }
        });

        this.container.querySelector('#btn-step').addEventListener('click', () => {
            if (this.engine.isRunning) {
                this.engine.pause();
                playBtn.classList.remove('active');
                playIcon.textContent = '▶';
                playText.textContent = 'RESUME FLEET';
            }
            this.engine.step();
        });

        this.container.querySelector('#btn-reset').addEventListener('click', () => {
            this.engine.reset();
            playBtn.classList.remove('active');
            playIcon.textContent = '▶';
            playText.textContent = 'START FLEET';
        });

        // Speed Multipliers
        const speedBtns = this.container.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const speed = parseFloat(btn.dataset.speed);
                this.engine.setSpeed(speed);
            });
        });

        // Algorithm Toggles
        this.container.querySelector('#toggle-cbba').addEventListener('change', (e) => {
            this.engine.enabledAlgorithms.cbba = e.target.checked;
            this.engine.emitLog('CONFIG', `CBBA Task Allocation algorithm: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
        });

        this.container.querySelector('#toggle-cbs').addEventListener('change', (e) => {
            this.engine.enabledAlgorithms.cbs = e.target.checked;
            this.engine.emitLog('CONFIG', `CBS Multi-Agent Path Planning algorithm: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
        });

        this.container.querySelector('#toggle-orca').addEventListener('change', (e) => {
            this.engine.enabledAlgorithms.orca = e.target.checked;
            this.engine.emitLog('CONFIG', `ORCA Local Real-Time Evasion algorithm: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
        });

        // Layer Overlays
        this.setupLayerToggle('#toggle-paths', 'paths');
        this.setupLayerToggle('#toggle-collision', 'collisionZones');
        this.setupLayerToggle('#toggle-vectors', 'velocityVectors');
        this.setupLayerToggle('#toggle-sensor', 'sensorRadius');

        // Dynamic Events
        this.container.querySelector('#evt-new-task').addEventListener('click', () => {
            this.engine.injectNewTask();
        });

        this.container.querySelector('#evt-robot-failure').addEventListener('click', () => {
            this.engine.triggerRobotFailure('R3');
        });

        this.container.querySelector('#evt-low-battery').addEventListener('click', () => {
            this.engine.triggerLowBattery('R2');
        });

        this.container.querySelector('#evt-block-aisle').addEventListener('click', () => {
            // Drop obstacle at high-traffic crossing (14, 7) or (8, 8)
            const coords = Math.random() > 0.5 ? { x: 14, y: 7 } : { x: 8, y: 8 };
            this.engine.blockAisle(coords.x, coords.y);
        });

        this.container.querySelector('#evt-recover').addEventListener('click', () => {
            this.engine.recoverRobot('R3');
        });

        this.container.querySelector('#evt-clear-obs').addEventListener('click', () => {
            this.engine.clearObstacles();
        });
    }

    setupLayerToggle(selector, layerKey) {
        const btn = this.container.querySelector(selector);
        btn.addEventListener('click', () => {
            this.engine.layerToggles[layerKey] = !this.engine.layerToggles[layerKey];
            btn.classList.toggle('active', this.engine.layerToggles[layerKey]);
        });
    }
}
