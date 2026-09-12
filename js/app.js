// ROBOMESS - Main Application Orchestrator
// Initializes engines, renderers, UI panels, hero canvas, and Web Audio synthesis

import { SimulationEngine } from './simulation/SimulationEngine.js';
import { WarehouseRenderer } from './components/WarehouseRenderer.js';
import { SimulationControls } from './components/SimulationControls.js';
import { TelemetryPanel } from './components/TelemetryPanel.js';
import { EventLog } from './components/EventLog.js';
import { AlgorithmPlayground } from './components/AlgorithmPlayground.js';
import { Navigation } from './components/Navigation.js';

class RobomessApp {
    constructor() {
        this.engine = null;
        this.renderer = null;
        this.audioCtx = null;
        this.audioEnabled = false;

        this.init();
    }

    init() {
        // 1. Initialize Simulation Engine
        this.engine = new SimulationEngine();

        // 2. Mount Canvas Renderer
        const canvas = document.getElementById('warehouse-canvas');
        if (canvas) {
            this.renderer = new WarehouseRenderer(canvas, this.engine);
        }

        // 3. Mount UI Components
        const controlsMount = document.getElementById('sim-controls-mount');
        if (controlsMount) new SimulationControls(controlsMount, this.engine);

        const telemetryMount = document.getElementById('sim-telemetry-mount');
        if (telemetryMount) new TelemetryPanel(telemetryMount, this.engine);

        const terminalMount = document.getElementById('sim-terminal-mount');
        if (terminalMount) new EventLog(terminalMount, this.engine);

        // 4. Initialize Interactive Deep Dive Playgrounds
        new AlgorithmPlayground();

        // 5. Initialize Navigation & Scroll Spy
        new Navigation();

        // 6. Setup Hero Interactive Background Canvas
        this.initHeroCanvas();

        // 7. Setup Section 02 Problem Interactive Visualizer
        this.initProblemSection();

        // 8. Setup Section 12 Failure Recovery Walkthrough
        this.initFailureRecoverySection();

        // 9. Setup Audio Feedback & Global Buttons
        this.initAudioAndInteractions();

        // 10. Start Canvas Render Loop
        this.startRenderLoop();

        // Auto-start simulation in background with gentle speed
        setTimeout(() => {
            this.engine.start();
            const playBtn = document.getElementById('btn-play-pause');
            if (playBtn) {
                playBtn.classList.add('active');
                playBtn.querySelector('.btn-icon').textContent = '⏸';
                playBtn.querySelector('.btn-text').textContent = 'PAUSE FLEET';
            }
        }, 800);
    }

    startRenderLoop() {
        const render = () => {
            if (this.renderer) {
                this.renderer.render();
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    initHeroCanvas() {
        const heroCanvas = document.getElementById('hero-canvas');
        if (!heroCanvas) return;

        const ctx = heroCanvas.getContext('2d');
        const resize = () => {
            heroCanvas.width = heroCanvas.parentElement.clientWidth;
            heroCanvas.height = heroCanvas.parentElement.clientHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Subtle background AMR nodes
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

            // Draw connecting mesh lines
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

            // Update & draw nodes
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

    initProblemSection() {
        const btn = document.getElementById('btn-run-problem-demo');
        const alertBox = document.getElementById('problem-conflict-alert');
        const canvas = document.getElementById('problem-demo-canvas');
        if (!canvas || !btn) return;

        const ctx = canvas.getContext('2d');
        let state = 'IDLE'; // 'IDLE' | 'MOVING' | 'CONFLICT'
        let t = 0;

        const renderProblem = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Draw warehouse aisle intersection
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            const cs = 35;
            for (let x = 0; x <= w; x += cs) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y <= h; y += cs) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // Racks on side
            ctx.fillStyle = '#111827';
            ctx.fillRect(cs * 1, cs * 1, cs * 2, cs * 3);
            ctx.fillRect(cs * 7, cs * 1, cs * 2, cs * 3);
            ctx.fillRect(cs * 1, cs * 6, cs * 2, cs * 3);
            ctx.fillRect(cs * 7, cs * 6, cs * 2, cs * 3);

            // Crossing point
            const cx = cs * 5;
            const cy = cs * 5;

            // Naive Paths crossing
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);

            // Path 1 (R1 horizontal)
            ctx.beginPath();
            ctx.moveTo(cs * 2, cy);
            ctx.lineTo(cs * 8, cy);
            ctx.stroke();

            // Path 2 (R2 vertical)
            ctx.beginPath();
            ctx.moveTo(cx, cs * 2);
            ctx.lineTo(cx, cs * 8);
            ctx.stroke();
            ctx.setLineDash([]);

            // AMRs positions
            let r1x = cs * 2 + t * (cs * 3);
            let r2y = cs * 2 + t * (cs * 3);

            if (state === 'CONFLICT') {
                r1x = cx;
                r2y = cy;

                // Pulsing hazard zone
                ctx.fillStyle = 'rgba(255, 50, 50, 0.25)';
                ctx.beginPath();
                ctx.arc(cx, cy, 38, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#FF3344';
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - cs / 2, cy - cs / 2, cs, cs);
            }

            // Draw R1 (Blue)
            ctx.fillStyle = '#38BDF8';
            ctx.beginPath();
            ctx.arc(r1x, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('R1', r1x - 6, cy + 3);

            // Draw R2 (Amber)
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

    initFailureRecoverySection() {
        const triggerBtn = document.getElementById('btn-run-failure-sim');
        if (!triggerBtn) return;

        triggerBtn.addEventListener('click', () => {
            // Scroll user up to simulation to watch live
            const simEl = document.getElementById('section-simulation');
            if (simEl) simEl.scrollIntoView({ behavior: 'smooth' });

            setTimeout(() => {
                this.engine.triggerRobotFailure('R3');
                this.playAlertSound();
            }, 600);
        });
    }

    initAudioAndInteractions() {
        const audioBtn = document.getElementById('btn-audio-toggle');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                if (!this.audioCtx) {
                    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                this.audioEnabled = !this.audioEnabled;
                audioBtn.classList.toggle('active', this.audioEnabled);
                audioBtn.querySelector('.audio-label').textContent = this.audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
                if (this.audioEnabled) this.playTone(660, 0.08, 'sine');
            });
        }

        // Hero CTA button smooth scroll
        const heroSimBtn = document.getElementById('hero-enter-sim');
        if (heroSimBtn) {
            heroSimBtn.addEventListener('click', () => {
                const simSection = document.getElementById('section-simulation');
                if (simSection) simSection.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    playTone(freq, duration, type = 'sine') {
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
            // Audio context policy
        }
    }

    playAlertSound() {
        if (!this.audioEnabled || !this.audioCtx) return;
        this.playTone(440, 0.1, 'sawtooth');
        setTimeout(() => this.playTone(880, 0.15, 'sawtooth'), 120);
    }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.robomessApp = new RobomessApp();
});
