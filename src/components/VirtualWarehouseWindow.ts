// ROBOMESS - 3D Virtual Warehouse Window (Digital Twin) in TypeScript
// Provides real-time 3D WebGL perspective, multi-camera director, 3D AMRs, racks, and CCTV telemetry

import { SimulationEngine } from '../simulation/SimulationEngine.js';
import { Robot } from '../simulation/Robot.js';
import { CameraMode, RobotState, SIMULATION_CONFIG } from '../types/index.js';

// Dynamically import Three.js and OrbitControls via ESM
declare const THREE: any;

export class VirtualWarehouseWindow {
    public container: HTMLElement;
    public engine: SimulationEngine;
    public canvas: HTMLCanvasElement | null = null;
    
    private scene: any = null;
    private camera: any = null;
    private renderer: any = null;
    private controls: any = null;
    private THREE_LIB: any = null;

    public cameraMode: CameraMode = CameraMode.ISOMETRIC;
    private robotMeshes: Map<string, any> = new Map();
    private rackMeshes: any[] = [];
    private obstacleMeshes: Map<string, any> = new Map();
    private stationMeshes: any[] = [];

    private isInitialized: boolean = false;
    private animFrameId: number = 0;
    private clock: any = null;

    // Follow camera target smoothing
    private currentCamTarget = { x: 0, y: 0, z: 0 };
    private currentCamPos = { x: 0, y: 0, z: 0 };

    constructor(container: HTMLElement, engine: SimulationEngine) {
        this.container = container;
        this.engine = engine;
        this.init();
    }

    public async init(): Promise<void> {
        this.renderShell();
        await this.loadThreeJS();
        if (this.THREE_LIB) {
            this.setupScene();
            this.buildWarehouseEnvironment();
            this.buildRobotMeshes();
            this.setupCameraControls();
            this.setupEvents();
            this.isInitialized = true;
            this.animate();
        }
    }

    private renderShell(): void {
        this.container.innerHTML = `
            <div class="virtual-window-card">
                <div class="virtual-window-header">
                    <div class="vw-title-group">
                        <span class="vw-live-dot"></span>
                        <span class="vw-title">VIRTUAL WAREHOUSE TWIN // 3D DIGITAL TWIN</span>
                        <span class="vw-rtsp-badge">CAM-04 RTSP</span>
                    </div>

                    <div class="vw-cam-selector">
                        <button class="vw-cam-btn active" data-mode="ISOMETRIC">ISOMETRIC</button>
                        <button class="vw-cam-btn" data-mode="FOLLOW_AMR">FOLLOW AMR</button>
                        <button class="vw-cam-btn" data-mode="OVERHEAD_3D">OVERHEAD</button>
                        <button class="vw-cam-btn" data-mode="BAY_INSPECT">BAY CAM</button>
                    </div>

                    <div class="vw-meta-group">
                        <span class="mono" id="vw-cam-coord">CAM: (0, 30, 24)</span>
                    </div>
                </div>

                <div class="virtual-window-viewport" id="vw-viewport-mount">
                    <canvas id="virtual-warehouse-canvas"></canvas>
                    
                    <!-- Futuristic CCTV HUD Overlay -->
                    <div class="vw-cctv-overlay">
                        <div class="cctv-top-row">
                            <span class="cctv-rec"><span class="rec-dot"></span> REC [00:00:00]</span>
                            <span class="cctv-label">HD 1080P // SENSOR FUSION ACTIVE</span>
                            <span class="cctv-timestamp" id="vw-cctv-clock">2026-09-13 18:45:00</span>
                        </div>
                        <div class="cctv-corner tl"></div>
                        <div class="cctv-corner tr"></div>
                        <div class="cctv-corner bl"></div>
                        <div class="cctv-corner br"></div>
                        <div class="cctv-bottom-row">
                            <span class="cctv-amr-info" id="vw-cctv-amr-info">TARGET: AMR-01 (Vanguard) | SPEED: 0.0 m/s</span>
                            <span class="cctv-status">FPS: <strong class="green" id="vw-fps">60</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.canvas = this.container.querySelector('#virtual-warehouse-canvas');
    }

    private async loadThreeJS(): Promise<void> {
        try {
            if ((window as any).THREE) {
                this.THREE_LIB = (window as any).THREE;
                return;
            }

            // Load Three.js from ESM CDN
            const threeModule = await import('https://esm.sh/three@0.160.0');
            this.THREE_LIB = threeModule;
            (window as any).THREE = threeModule;
        } catch (err) {
            console.warn('[VIRTUAL WINDOW] CDN import error, attempting fallback script loader...', err);
            await this.loadScriptFallback();
        }
    }

    private loadScriptFallback(): Promise<void> {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = () => {
                this.THREE_LIB = (window as any).THREE;
                resolve();
            };
            script.onerror = () => {
                console.error('[VIRTUAL WINDOW] Failed to load Three.js fallback.');
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    private setupScene(): void {
        const THREE = this.THREE_LIB;
        const width = this.canvas!.clientWidth || 950;
        const height = 480;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080D);
        this.scene.fog = new THREE.FogExp2(0x06080D, 0.012);

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 32, 28);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas!,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.clock = new THREE.Clock();

        // Ambient & Directional Lighting
        const ambientLight = new THREE.AmbientLight(0x1B263B, 1.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00F0FF, 1.2);
        dirLight.position.set(20, 45, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);

        const warmLight = new THREE.DirectionalLight(0xFF9F0A, 0.8);
        warmLight.position.set(-20, 30, -20);
        this.scene.add(warmLight);
    }

    private buildWarehouseEnvironment(): void {
        const THREE = this.THREE_LIB;
        const cols = this.engine.warehouse.cols;
        const rows = this.engine.warehouse.rows;

        // 1. Concrete Warehouse Floor
        const floorGeo = new THREE.PlaneGeometry(cols * 1.5, rows * 1.5);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x080D17,
            roughness: 0.35,
            metalness: 0.4
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. High-Tech Grid Lines
        const gridHelper = new THREE.GridHelper(cols * 1.5, cols, 0x00F0FF, 0x152238);
        gridHelper.position.y = 0.02;
        this.scene.add(gridHelper);

        // 3. Storage Racks (3D Volumetric Racks with Shelves and Pallets)
        this.engine.warehouse.racks.forEach((rack) => {
            const worldPos = this.gridToWorld(rack.x, rack.y);
            const rackGroup = new THREE.Group();
            rackGroup.position.set(worldPos.x, 0, worldPos.z);

            // Upright Steel Columns
            const colMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8, roughness: 0.2 });
            const colGeo = new THREE.BoxGeometry(0.12, 3.2, 0.12);

            [-0.45, 0.45].forEach((cx) => {
                [-0.45, 0.45].forEach((cz) => {
                    const col = new THREE.Mesh(colGeo, colMat);
                    col.position.set(cx, 1.6, cz);
                    col.castShadow = true;
                    rackGroup.add(col);
                });
            });

            // 3 Shelf Levels
            const shelfMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
            const shelfGeo = new THREE.BoxGeometry(1.0, 0.08, 1.0);

            [0.3, 1.5, 2.7].forEach((levelY, levelIdx) => {
                const shelf = new THREE.Mesh(shelfGeo, shelfMat);
                shelf.position.set(0, levelY, 0);
                shelf.receiveShadow = true;
                rackGroup.add(shelf);

                // Pallet Cargo on shelf
                if (rack.cargo || levelIdx === 0) {
                    const boxGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
                    const boxMat = new THREE.MeshStandardMaterial({
                        color: levelIdx === 0 ? 0xD97706 : 0x0284C7,
                        roughness: 0.5
                    });
                    const cargoBox = new THREE.Mesh(boxGeo, boxMat);
                    cargoBox.position.set(0, levelY + 0.34, 0);
                    cargoBox.castShadow = true;
                    rackGroup.add(cargoBox);
                }
            });

            // Small LED tag on rack
            const ledGeo = new THREE.SphereGeometry(0.06, 8, 8);
            const ledMat = new THREE.MeshBasicMaterial({ color: rack.cargo ? 0x00FF66 : 0x64748B });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(0, 3.2, 0.46);
            rackGroup.add(led);

            this.scene.add(rackGroup);
            this.rackMeshes.push(rackGroup);
        });

        // 4. Stations & Charging Bays
        this.buildStations3D();
    }

    private buildStations3D(): void {
        const THREE = this.THREE_LIB;
        const st = this.engine.warehouse.stations;

        // Inbound Bays (Cyan glowing pads)
        st.inbound.forEach((bay) => {
            const pos = this.gridToWorld(bay.x, bay.y);
            const padGeo = new THREE.BoxGeometry(1.6, 0.05, 1.6);
            const padMat = new THREE.MeshStandardMaterial({ color: 0x00F0FF, emissive: 0x00F0FF, emissiveIntensity: 0.4 });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(pos.x, 0.03, pos.z);
            this.scene.add(pad);
        });

        // Outbound Bays (Amber glowing pads)
        st.outbound.forEach((bay) => {
            const pos = this.gridToWorld(bay.x, bay.y);
            const padGeo = new THREE.BoxGeometry(1.6, 0.05, 1.6);
            const padMat = new THREE.MeshStandardMaterial({ color: 0xFF9F0A, emissive: 0xFF9F0A, emissiveIntensity: 0.4 });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(pos.x, 0.03, pos.z);
            this.scene.add(pad);
        });

        // Charging Docks (Green glowing pads)
        st.charging.forEach((dock) => {
            const pos = this.gridToWorld(dock.x, dock.y);
            const padGeo = new THREE.BoxGeometry(2.0, 0.06, 1.4);
            const padMat = new THREE.MeshStandardMaterial({ color: 0x00FF88, emissive: 0x00FF88, emissiveIntensity: 0.5 });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(pos.x, 0.03, pos.z);
            this.scene.add(pad);
        });
    }

    private buildRobotMeshes(): void {
        const THREE = this.THREE_LIB;

        this.engine.robots.forEach((robot) => {
            const robotGroup = new THREE.Group();
            const colorHex = parseInt(robot.color.replace('#', '0x'), 16);

            // 1. Lower Chassis (Beveled octagonal base)
            const chassisGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.28, 8);
            const chassisMat = new THREE.MeshStandardMaterial({
                color: 0x0F172A,
                roughness: 0.3,
                metalness: 0.7
            });
            const chassis = new THREE.Mesh(chassisGeo, chassisMat);
            chassis.position.y = 0.2;
            chassis.castShadow = true;
            robotGroup.add(chassis);

            // 2. Glowing Neon Accent Ring
            const ringGeo = new THREE.TorusGeometry(0.58, 0.03, 8, 16);
            const ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.25;
            robotGroup.add(ring);

            // 3. Dual Headlights (Directional Light Cones)
            const headMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const headGeo = new THREE.BoxGeometry(0.08, 0.06, 0.12);
            [-0.2, 0.2].forEach((hx) => {
                const hl = new THREE.Mesh(headGeo, headMat);
                hl.position.set(hx, 0.2, 0.52);
                robotGroup.add(hl);
            });

            // 4. Rotating LiDAR Dome on top
            const lidarGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.16, 12);
            const lidarMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.9 });
            const lidar = new THREE.Mesh(lidarGeo, lidarMat);
            lidar.position.y = 0.42;
            robotGroup.add(lidar);

            // 5. Pallet Cargo Bed (loads/unloads dynamically)
            const cargoBedGeo = new THREE.BoxGeometry(0.7, 0.06, 0.7);
            const cargoBedMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
            const cargoBed = new THREE.Mesh(cargoBedGeo, cargoBedMat);
            cargoBed.position.y = 0.35;
            robotGroup.add(cargoBed);

            // 6. Carried Pallet Object
            const palletGeo = new THREE.BoxGeometry(0.65, 0.45, 0.65);
            const palletMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.6 });
            const carriedPallet = new THREE.Mesh(palletGeo, palletMat);
            carriedPallet.position.y = 0.62;
            carriedPallet.visible = false;
            carriedPallet.castShadow = true;
            robotGroup.add(carriedPallet);

            // 7. Strobe Beacon (Flashing Red when OFFLINE)
            const beaconGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF3344 });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.y = 0.54;
            beacon.visible = false;
            robotGroup.add(beacon);

            const initialWorld = this.gridToWorld(robot.x, robot.y);
            robotGroup.position.set(initialWorld.x, 0, initialWorld.z);

            this.scene.add(robotGroup);
            this.robotMeshes.set(robot.id, {
                group: robotGroup,
                carriedPallet,
                beacon,
                ring,
                chassis
            });
        });
    }

    private setupCameraControls(): void {
        const camBtns = this.container.querySelectorAll('.vw-cam-btn');
        camBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                camBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.setCameraMode(btn.getAttribute('data-mode') as CameraMode);
            });
        });

        // Mouse drag orbit interaction
        let isDragging = false;
        let prevMouse = { x: 0, y: 0 };

        this.canvas!.addEventListener('mousedown', (e) => {
            isDragging = true;
            prevMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || this.cameraMode === CameraMode.FOLLOW_AMR) return;

            const deltaX = (e.clientX - prevMouse.x) * 0.008;
            const deltaY = (e.clientY - prevMouse.y) * 0.008;

            const radius = Math.hypot(this.camera.position.x, this.camera.position.z);
            let angle = Math.atan2(this.camera.position.z, this.camera.position.x) + deltaX;

            this.camera.position.x = radius * Math.cos(angle);
            this.camera.position.z = radius * Math.sin(angle);
            this.camera.position.y = Math.max(8, Math.min(60, this.camera.position.y + deltaY * 20));

            this.camera.lookAt(0, 0, 0);
            prevMouse = { x: e.clientX, y: e.clientY };
        });

        // Mouse Wheel Zoom
        this.canvas!.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY * 0.04;
            const dir = this.camera.position.clone().normalize();
            this.camera.position.addScaledVector(dir, zoomDelta);
            this.camera.lookAt(0, 0, 0);
        });
    }

    public setCameraMode(mode: CameraMode): void {
        this.cameraMode = mode;
        const THREE = this.THREE_LIB;

        switch (mode) {
            case CameraMode.ISOMETRIC:
                this.camera.position.set(16, 26, 24);
                this.camera.lookAt(0, 0, 0);
                break;
            case CameraMode.OVERHEAD_3D:
                this.camera.position.set(0, 38, 4);
                this.camera.lookAt(0, 0, 0);
                break;
            case CameraMode.BAY_INSPECT:
                this.camera.position.set(-14, 12, 12);
                this.camera.lookAt(-10, 0, 0);
                break;
            case CameraMode.FOLLOW_AMR:
                // Will be dynamically updated in loop
                break;
        }
    }

    private setupEvents(): void {
        window.addEventListener('resize', () => {
            if (!this.canvas || !this.renderer || !this.camera) return;
            const width = this.canvas.parentElement?.clientWidth || 950;
            const height = 480;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    private animate(): void {
        this.animFrameId = requestAnimationFrame(() => this.animate());

        if (!this.isInitialized) return;

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // 1. Update 3D Robots from Simulation State
        this.engine.robots.forEach((robot) => {
            const meshEntry = this.robotMeshes.get(robot.id);
            if (!meshEntry) return;

            const targetWorld = this.gridToWorld(robot.x, robot.y);
            
            // Smooth position interpolation
            meshEntry.group.position.x += (targetWorld.x - meshEntry.group.position.x) * 0.25;
            meshEntry.group.position.z += (targetWorld.z - meshEntry.group.position.z) * 0.25;

            // Rotation heading (invert angle for Three.js coordinate space)
            meshEntry.group.rotation.y = -robot.heading + Math.PI / 2;

            // Cargo Pallet Visibility
            meshEntry.carriedPallet.visible = robot.isCarrying;

            // Strobe Beacon if OFFLINE
            if (robot.state === RobotState.OFFLINE) {
                meshEntry.beacon.visible = Math.sin(time * 12) > 0;
            } else {
                meshEntry.beacon.visible = false;
            }
        });

        // 2. Update Dynamic Obstacles in 3D
        this.syncDynamicObstacles();

        // 3. Camera Director (Follow Cam)
        this.updateCameraFollow(delta);

        // 4. Update CCTV HUD
        this.updateCCTVHUD();

        // 5. Render Three.js Scene
        this.renderer.render(this.scene, this.camera);
    }

    private updateCameraFollow(delta: number): void {
        if (this.cameraMode !== CameraMode.FOLLOW_AMR) return;

        const targetRobot = this.engine.robots.find(r => r.id === this.engine.selectedRobotId) || this.engine.robots[0];
        const meshEntry = this.robotMeshes.get(targetRobot.id);
        if (!meshEntry) return;

        const rPos = meshEntry.group.position;
        const heading = meshEntry.group.rotation.y;

        // Position camera behind and slightly above robot
        const distance = 6.5;
        const height = 4.2;

        const idealCamX = rPos.x - Math.sin(heading) * distance;
        const idealCamZ = rPos.z - Math.cos(heading) * distance;
        const idealCamY = rPos.y + height;

        this.camera.position.x += (idealCamX - this.camera.position.x) * 0.12;
        this.camera.position.y += (idealCamY - this.camera.position.y) * 0.12;
        this.camera.position.z += (idealCamZ - this.camera.position.z) * 0.12;

        this.camera.lookAt(rPos.x, rPos.y + 0.8, rPos.z);
    }

    private syncDynamicObstacles(): void {
        const THREE = this.THREE_LIB;
        const activeObs = this.engine.warehouse.dynamicObstacles;

        // Add new obstacles
        for (const [key, obs] of activeObs) {
            if (!this.obstacleMeshes.has(key)) {
                const pos = this.gridToWorld(obs.x, obs.y);
                const obsGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
                const obsMat = new THREE.MeshStandardMaterial({
                    color: 0xEF4444,
                    emissive: 0xEF4444,
                    emissiveIntensity: 0.3
                });
                const obsMesh = new THREE.Mesh(obsGeo, obsMat);
                obsMesh.position.set(pos.x, 0.45, pos.z);
                this.scene.add(obsMesh);
                this.obstacleMeshes.set(key, obsMesh);
            }
        }

        // Remove cleared obstacles
        for (const [key, mesh] of this.obstacleMeshes) {
            if (!activeObs.has(key)) {
                this.scene.remove(mesh);
                this.obstacleMeshes.delete(key);
            }
        }
    }

    private updateCCTVHUD(): void {
        const clockEl = this.container.querySelector('#vw-cctv-clock');
        if (clockEl) {
            clockEl.textContent = new Date().toISOString().replace('T', ' ').substring(0, 19);
        }

        const amrInfoEl = this.container.querySelector('#vw-cctv-amr-info');
        if (amrInfoEl) {
            const r = this.engine.robots.find(r => r.id === this.engine.selectedRobotId) || this.engine.robots[0];
            const speed = Math.hypot(r.velocity.vx, r.velocity.vy).toFixed(2);
            amrInfoEl.textContent = `TARGET: ${r.id} (${r.name}) | POS: (${r.x.toFixed(1)}, ${r.y.toFixed(1)}) | SPEED: ${speed} m/s | ${r.state}`;
        }

        const coordEl = this.container.querySelector('#vw-cam-coord');
        if (coordEl && this.camera) {
            coordEl.textContent = `CAM: (${this.camera.position.x.toFixed(0)}, ${this.camera.position.y.toFixed(0)}, ${this.camera.position.z.toFixed(0)}) // ${this.cameraMode}`;
        }
    }

    private gridToWorld(gx: number, gy: number): { x: number; z: number } {
        const cols = this.engine.warehouse.cols;
        const rows = this.engine.warehouse.rows;
        const scale = 1.5;
        return {
            x: (gx - cols / 2) * scale,
            z: (gy - rows / 2) * scale
        };
    }

    public destroy(): void {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
    }
}
