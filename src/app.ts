// ROBOMESS - Main Application Orchestrator in TypeScript
// Coordinates SimulationEngine, 2D WarehouseRenderer, and 3D VirtualWarehouseWindow Digital Twin

import { SimulationEngine } from './simulation/SimulationEngine.js';
import { WarehouseRenderer } from './components/WarehouseRenderer.js';
import { VirtualWarehouseWindow } from './components/VirtualWarehouseWindow.js';
import { SimulationControls } from './components/SimulationControls.js';
import { TelemetryPanel } from './components/TelemetryPanel.js';
import { EventLog } from './components/EventLog.js';
import { AlgorithmPlayground } from './components/AlgorithmPlayground.js';
import { Navigation } from './components/Navigation.js';
import { ViewMode } from './types/index.js';

export class RobomessApp {
    public engine: SimulationEngine;
    public renderer2D: WarehouseRenderer | null = null;
    public virtualWindow3D: VirtualWarehouseWindow | null = null;
    public controls: SimulationControls | null = null;
    
    private audioCtx: any = null;
    private audioEnabled: boolean = false;

    constructor() {
        this.engine = new SimulationEngine();
        this.init();
    }

    public init(): void {
        // 1. Mount 2D Canvas Renderer
        const canvas2D = document.getElementById('warehouse-canvas') as HTMLCanvasElement;
        if (canvas2D) {
            this.renderer2D = new WarehouseRenderer(canvas2D, this.engine);
        }

        // 2. Mount 3D Virtual Warehouse Window
        const vwMount = document.getElementById('virtual-warehouse-mount');
        if (vwMount) {
            this.virtualWindow3D = new VirtualWarehouseWindow(vwMount, this.engine);
        }

        // 3. Mount Simulation Controls with ViewMode Switching
        const controlsMount = document.getElementById('sim-controls-mount');
        if (controlsMount) {
            this.controls = new SimulationControls(controlsMount, this.engine);
            this.controls.onViewModeChange = (mode: ViewMode) => this.switchViewMode(mode);
        }

        // 4. Mount Telemetry & Event Terminal
        const telemetryMount = document.getElementById('sim-telemetry-mount');
        if (telemetryMount) new TelemetryPanel(telemetryMount, this.engine);

        const terminalMount = document.getElementById('sim-terminal-mount');
        if (terminalMount) new EventLog(terminalMount, this.engine);

        // 5. Initialize Algorithm Playgrounds & Navigation
        new AlgorithmPlayground();
        new Navigation();

        // 6. Setup Interactive Background Canvas & Problem Demo
        this.initHeroCanvas();
        this.initProblemSection();
        this.initFailureRecoverySection();
        this.initAudioAndInteractions();

        // 7. Start 2D Render Loop
        this.start2DRenderLoop();

        // Auto-start simulation in background with gentle speed
        setTimeout(() => {
            this.engine.start();
            const playBtn = document.getElementById('btn-play-pause');
            if (playBtn) {
                playBtn.classList.add('active');
                const icon = playBtn.querySelector('.btn-icon');
                const text = playBtn.querySelector('.btn-text');
                if (icon) icon.textContent = '⏸';
                if (text) text.textContent = 'PAUSE FLEET';
            }
        }, 800);
    }

    public switchViewMode(mode: ViewMode): void {
        const deck = document.querySelector('.sim-display-area');
        const card2D = document.querySelector('.canvas-display-card-2d');
        const card3D = document.querySelector('#virtual-warehouse-mount');

        if (!deck || !card2D || !card3D) return;

        if (mode === ViewMode.VIEW_2D) {
            deck.classList.remove('split-mode', 'only-3d-mode');
            deck.classList.add('only-2d-mode');
            (card2D as HTMLElement).style.display = 'flex';
            (card3D as HTMLElement).style.display = 'none';
        } else if (mode === ViewMode.VIEW_3D) {
            deck.classList.remove('split-mode', 'only-2d-mode');
            deck.classList.add('only-3d-mode');
            (card2D as HTMLElement).style.display = 'none';
            (card3D as HTMLElement).style.display = 'block';
        } else {
            // Split Mode (Both 2D Map and 3D Virtual Window visible)
            deck.classList.remove('only-2d-mode', 'only-3d-mode');
            deck.classList.add('split-mode');
            (card2D as HTMLElement).style.display = 'flex';
            (card3D as HTMLElement).style.display = 'block';
        }

        // Trigger resize event for WebGL aspect ratio update
        window.dispatchEvent(new Event('resize'));
    }

    private start2DRenderLoop(): void {
        const render = () => {
            if (this.renderer2D) {
                this.renderer2D.render();
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    private initHeroCanvas(): void {
        const heroCanvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
        if (!heroCanvas) return;

        const ctx = heroCanvas.getContext('2d')!;
        const resize = () => {
            if (heroCanvas.parentElement) {
                heroCanvas.width = heroCanvas.parentElement.clientWidth;
                heroCanvas.height = heroCanvas.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        const nodes = Array.from({ length: 18 }, () => ({
            x: Math.random() * heroCanvas.width,
            y: Math.random() * heroCanvas.height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            radius: 2.5 + Math.random() * 3,
            color: ['#00F0FF', '#00FF88', '#FF9F0A', '#3B82F6'][Math.floor(Math.random() * 4)]
        }));

        const animateHero = () => {
            ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

            ctx.lineWidth = 0.8;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                    if (dist < 140) {
                        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - dist / 140)})`;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }

            nodes.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;

                if (n.x < 0 || n.x > heroCanvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > heroCanvas.height) n.vy *= -1;

                ctx.fillStyle = n.color;
                ctx.shadowColor = n.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            requestAnimationFrame(animateHero);
        };
        requestAnimationFrame(animateHero);
    }

    private initProblemSection(): void {
        const btn = document.getElementById('btn-run-problem-demo');
        const alertBox = document.getElementById('problem-conflict-alert');
        const canvas = document.getElementById('problem-demo-canvas') as HTMLCanvasElement;
        if (!canvas || !btn) return;

        const ctx = canvas.getContext('2d')!;
        let state = 'IDLE';
        let t = 0;

        const renderProblem = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            const cs = 35;
            for (let x = 0; x <= w; x += cs) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y <= h; y += cs) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            ctx.fillStyle = '#111827';
            ctx.fillRect(cs * 1, cs * 1, cs * 2, cs * 3);
            ctx.fillRect(cs * 7, cs * 1, cs * 2, cs * 3);
            ctx.fillRect(cs * 1, cs * 6, cs * 2, cs * 3);
            ctx.fillRect(cs * 7, cs * 6, cs * 2, cs * 3);

            const cx = cs * 5;
            const cy = cs * 5;

            ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);

            ctx.beginPath();
            ctx.moveTo(cs * 2, cy);
            ctx.lineTo(cs * 8, cy);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx, cs * 2);
            ctx.lineTo(cx, cs * 8);
            ctx.stroke();
            ctx.setLineDash([]);

            let r1x = cs * 2 + t * (cs * 3);
            let r2y = cs * 2 + t * (cs * 3);

            if (state === 'CONFLICT') {
                r1x = cx;
                r2y = cy;

                ctx.fillStyle = 'rgba(255, 50, 50, 0.25)';
                ctx.beginPath();
                ctx.arc(cx, cy, 38, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#FF3344';
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - cs / 2, cy - cs / 2, cs, cs);
            }

            ctx.fillStyle = '#38BDF8';
            ctx.beginPath();
            ctx.arc(r1x, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('R1', r1x - 6, cy + 3);

            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(cx, r2y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillText('R2', cx - 6, r2y + 3);

            if (state === 'MOVING') {
                t += 0.015;
                if (t >= 1.0) {
                    t = 1.0;
                    state = 'CONFLICT';
                    if (alertBox) alertBox.classList.add('visible');
                    this.playAlertSound();
                }
                requestAnimationFrame(renderProblem);
            }
        };

        btn.addEventListener('click', () => {
            t = 0;
            state = 'MOVING';
            if (alertBox) alertBox.classList.remove('visible');
            renderProblem();
        });

        renderProblem();
    }

    private initFailureRecoverySection(): void {
        const triggerBtn = document.getElementById('btn-run-failure-sim');
        if (!triggerBtn) return;

        triggerBtn.addEventListener('click', () => {
            const simEl = document.getElementById('section-simulation');
            if (simEl) simEl.scrollIntoView({ behavior: 'smooth' });

            setTimeout(() => {
                this.engine.triggerRobotFailure('R3');
                this.playAlertSound();
            }, 600);
        });
    }

    private initAudioAndInteractions(): void {
        const audioBtn = document.getElementById('btn-audio-toggle');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                if (!this.audioCtx) {
                    this.audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
                }
                this.audioEnabled = !this.audioEnabled;
                audioBtn.classList.toggle('active', this.audioEnabled);
                const label = audioBtn.querySelector('.audio-label');
                if (label) label.textContent = this.audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
                if (this.audioEnabled) this.playTone(660, 0.08, 'sine');
            });
        }

        const heroSimBtn = document.getElementById('hero-enter-sim');
        if (heroSimBtn) {
            heroSimBtn.addEventListener('click', () => {
                const simSection = document.getElementById('section-simulation');
                if (simSection) simSection.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    public playTone(freq: number, duration: number, type: OscillatorType = 'sine'): void {
        if (!this.audioEnabled || !this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {
            // Audio policy catch
        }
    }

    public playAlertSound(): void {
        if (!this.audioEnabled || !this.audioCtx) return;
        this.playTone(440, 0.1, 'sawtooth');
        setTimeout(() => this.playTone(880, 0.15, 'sawtooth'), 120);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    (window as any).robomessApp = new RobomessApp();
});
