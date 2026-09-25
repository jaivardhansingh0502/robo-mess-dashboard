// ROBOMESS - Interactive Algorithm Playgrounds in TypeScript

export class AlgorithmPlayground {
    constructor() {
        this.initCBBAPlayground();
        this.initCBSPlayground();
        this.initORCAPlayground();
        this.initEdgeAIPlayground();
    }

    private initCBBAPlayground(): void {
        const container = document.getElementById('cbba-interactive-demo');
        if (!container) return;

        const updateBids = () => {
            const priority = parseFloat((document.getElementById('cbba-priority') as HTMLInputElement)?.value || '4');
            const distR1 = parseFloat((document.getElementById('cbba-dist-r1') as HTMLInputElement)?.value || '6.2');
            const distR2 = parseFloat((document.getElementById('cbba-dist-r2') as HTMLInputElement)?.value || '14.8');
            const distR3 = parseFloat((document.getElementById('cbba-dist-r3') as HTMLInputElement)?.value || '9.1');
            const distR4 = parseFloat((document.getElementById('cbba-dist-r4') as HTMLInputElement)?.value || '18.5');

            const battR1 = parseFloat((document.getElementById('cbba-batt-r1') as HTMLInputElement)?.value || '92');
            const battR2 = parseFloat((document.getElementById('cbba-batt-r2') as HTMLInputElement)?.value || '75');
            const battR3 = parseFloat((document.getElementById('cbba-batt-r3') as HTMLInputElement)?.value || '45');
            const battR4 = parseFloat((document.getElementById('cbba-batt-r4') as HTMLInputElement)?.value || '88');

            const calcScore = (p: number, d: number, b: number) => {
                const lambda = 0.08;
                return (p * 12) * Math.exp(-lambda * d) * (b / 100);
            };

            const bids = [
                { id: 'R1', name: 'AMR-01', dist: distR1, batt: battR1, score: calcScore(priority, distR1, battR1), color: '#00F0FF' },
                { id: 'R2', name: 'AMR-02', dist: distR2, batt: battR2, score: calcScore(priority, distR2, battR2), color: '#00FF88' },
                { id: 'R3', name: 'AMR-03', dist: distR3, batt: battR3, score: calcScore(priority, distR3, battR3), color: '#FFB300' },
                { id: 'R4', name: 'AMR-04', dist: distR4, batt: battR4, score: calcScore(priority, distR4, battR4), color: '#D946EF' }
            ];

            bids.sort((a, b) => b.score - a.score);
            const winner = bids[0];

            const tbody = document.getElementById('cbba-table-body');
            if (tbody) {
                tbody.innerHTML = bids.map((b, idx) => `
                    <tr class="${idx === 0 ? 'winner-row' : ''}">
                        <td><strong style="color: ${b.color};">${b.id}</strong> (${b.name})</td>
                        <td>${b.dist.toFixed(1)} m</td>
                        <td>
                            <span class="batt-text">${b.batt}%</span>
                            <div class="mini-bar-track"><div class="mini-bar-fill" style="width: ${b.batt}%;"></div></div>
                        </td>
                        <td><strong class="bid-val">${b.score.toFixed(2)}</strong></td>
                        <td>
                            ${idx === 0 ? '<span class="winner-badge">★ WINNER (AWARDED)</span>' : `<span class="outbid-badge">OUTBID (-${(winner.score - b.score).toFixed(2)})</span>`}
                        </td>
                    </tr>
                `).join('');
            }

            const winnerSummary = document.getElementById('cbba-winner-summary');
            if (winnerSummary) {
                winnerSummary.innerHTML = `
                    <div class="consensus-banner">
                        <span class="banner-icon">✓</span>
                        <span>CONSENSUS ACHIEVED IN 2 ROUNDS: <strong>${winner.id}</strong> awarded Task T04 with marginal bid score <strong>${winner.score.toFixed(2)}</strong>.</span>
                    </div>
                `;
            }
        };

        ['cbba-priority', 'cbba-dist-r1', 'cbba-dist-r2', 'cbba-dist-r3', 'cbba-dist-r4', 'cbba-batt-r1', 'cbba-batt-r2', 'cbba-batt-r3', 'cbba-batt-r4'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    const valDisplay = document.getElementById(`${id}-val`);
                    if (valDisplay) valDisplay.textContent = (el as HTMLInputElement).value;
                    updateBids();
                });
            }
        });

        updateBids();
    }

    private initCBSPlayground(): void {
        const canvas = document.getElementById('cbs-canvas-demo') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d')!;
        let currentStep = 0;

        const renderCBSVisual = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const gridSize = 40;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= w; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y <= h; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            const cx = 5 * gridSize + gridSize / 2;
            const cy = 3 * gridSize + gridSize / 2;

            ctx.strokeStyle = '#00F0FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(1 * gridSize + gridSize / 2, cy);
            ctx.lineTo(9 * gridSize + gridSize / 2, cy);
            ctx.stroke();

            ctx.strokeStyle = '#FF9F0A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, 0 * gridSize + gridSize / 2);

            if (currentStep === 2) {
                ctx.lineTo(cx, 2 * gridSize + gridSize / 2);
                ctx.lineTo(cx + gridSize, 2 * gridSize + gridSize / 2);
                ctx.lineTo(cx + gridSize, 4 * gridSize + gridSize / 2);
                ctx.lineTo(cx, 4 * gridSize + gridSize / 2);
                ctx.lineTo(cx, 6 * gridSize + gridSize / 2);
            } else {
                ctx.lineTo(cx, 6 * gridSize + gridSize / 2);
            }
            ctx.stroke();

            if (currentStep === 0) {
                ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
                ctx.fillRect(5 * gridSize, 3 * gridSize, gridSize, gridSize);
                ctx.strokeStyle = '#FF3344';
                ctx.lineWidth = 2;
                ctx.strokeRect(5 * gridSize, 3 * gridSize, gridSize, gridSize);

                ctx.fillStyle = '#FF3344';
                ctx.font = 'bold 11px "JetBrains Mono", monospace';
                ctx.fillText('VERTEX COLLISION', cx - 55, cy - 25);
                ctx.fillText('at (5, 3) @ t=4', cx - 45, cy + 35);
            } else if (currentStep === 1) {
                ctx.strokeStyle = '#D946EF';
                ctx.lineWidth = 2;
                ctx.strokeRect(5 * gridSize, 3 * gridSize, gridSize, gridSize);
                ctx.fillStyle = '#D946EF';
                ctx.font = 'bold 10px "JetBrains Mono", monospace';
                ctx.fillText('CONSTRAINT: <R2, (5,3), t=4>', cx - 75, cy - 25);
            } else {
                ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
                ctx.fillRect(5 * gridSize, 3 * gridSize, gridSize, gridSize);
                ctx.strokeStyle = '#00FF88';
                ctx.lineWidth = 2;
                ctx.strokeRect(5 * gridSize, 3 * gridSize, gridSize, gridSize);

                ctx.fillStyle = '#00FF88';
                ctx.font = 'bold 11px "JetBrains Mono", monospace';
                ctx.fillText('CONFLICT RESOLVED', cx - 55, cy - 25);
                ctx.fillText('Wait step / detour inserted', cx - 65, cy + 35);
            }

            ctx.fillStyle = '#00F0FF';
            ctx.beginPath();
            ctx.arc(currentStep === 0 ? cx : 3 * gridSize + gridSize / 2, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('R1', (currentStep === 0 ? cx : 3 * gridSize + gridSize / 2) - 6, cy + 3);

            ctx.fillStyle = '#FF9F0A';
            ctx.beginPath();
            ctx.arc(cx, currentStep === 0 ? cy : (currentStep === 2 ? 2 * gridSize + gridSize / 2 : 2 * gridSize), 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('R2', cx - 6, (currentStep === 0 ? cy : (currentStep === 2 ? 2 * gridSize + gridSize / 2 : 2 * gridSize)) + 3);
        };

        const stepBtns = document.querySelectorAll('.cbs-step-btn');
        stepBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                stepBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStep = parseInt(btn.getAttribute('data-step') || '0', 10);
                renderCBSVisual();
            });
        });

        renderCBSVisual();
    }

    private initORCAPlayground(): void {
        const canvas = document.getElementById('orca-canvas-demo') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d')!;
        let tauHorizon = 2.0;

        const renderORCA = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h / 2;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            [40, 80, 120, 160].forEach(r => {
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            });
            ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

            const posA = { x: cx - 90, y: cy };
            const posB = { x: cx + 90, y: cy };
            const rA = 24;
            const rB = 24;

            const vPrefA = { vx: 45, vy: 0 };
            const vPrefB = { vx: -45, vy: 0 };

            ctx.save();
            ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
            ctx.lineWidth = 1.5;

            const combR = (rA + rB) * (tauHorizon / 1.5);
            ctx.beginPath();
            ctx.arc(posB.x, posB.y, combR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const dist = posB.x - posA.x;
            const alpha = Math.asin(Math.min(0.95, combR / dist));
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posA.x + Math.cos(alpha) * 260, posA.y - Math.sin(alpha) * 260);
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posA.x + Math.cos(alpha) * 260, posA.y + Math.sin(alpha) * 260);
            ctx.stroke();
            ctx.restore();

            const evasionY = combR * 0.55;
            const halfU = evasionY * 0.5;

            ctx.fillStyle = '#00F0FF';
            ctx.beginPath();
            ctx.arc(posA.x, posA.y, rA, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('AMR-A', posA.x - 16, posA.y + 4);

            ctx.fillStyle = '#00FF88';
            ctx.beginPath();
            ctx.arc(posB.x, posB.y, rB, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillText('AMR-B', posB.x - 16, posB.y + 4);

            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posA.x + vPrefA.vx, posA.y + vPrefA.vy);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = '#00FF88';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posA.x + vPrefA.vx, posA.y - halfU);
            ctx.stroke();

            ctx.strokeStyle = '#00FF88';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(posB.x, posB.y);
            ctx.lineTo(posB.x + vPrefB.vx, posB.y + halfU);
            ctx.stroke();

            ctx.fillStyle = '#FDE047';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText('v_pref (Direct Collinear)', posA.x, posA.y + 38);

            ctx.fillStyle = '#00FF88';
            ctx.fillText('v_safe = v_pref + 0.5 * u', posA.x, posA.y - 32);

            ctx.fillStyle = '#FF3344';
            ctx.fillText(`VO Cone (τ=${tauHorizon}s)`, posB.x - 30, posB.y + combR + 18);
        };

        const tauSlider = document.getElementById('orca-tau') as HTMLInputElement;
        if (tauSlider) {
            tauSlider.addEventListener('input', (e: any) => {
                tauHorizon = parseFloat(e.target.value);
                const valDisplay = document.getElementById('orca-tau-val');
                if (valDisplay) valDisplay.textContent = `${tauHorizon}s`;
                renderORCA();
            });
        }

        renderORCA();
    }

    private initEdgeAIPlayground(): void {
        const fpsDisplay = document.getElementById('edge-ai-fps');
        const latencyDisplay = document.getElementById('edge-ai-latency');
        const cloudLatency = document.getElementById('cloud-ai-latency');

        if (!fpsDisplay) return;

        setInterval(() => {
            const baseFps = 84.2;
            const jitter = (Math.random() - 0.5) * 4;
            const currentFps = (baseFps + jitter).toFixed(1);
            const edgeMs = (1000 / parseFloat(currentFps)).toFixed(1);
            const cloudMs = Math.round(240 + Math.random() * 50);

            fpsDisplay.textContent = `${currentFps} FPS`;
            if (latencyDisplay) latencyDisplay.textContent = `${edgeMs} ms`;
            if (cloudLatency) cloudLatency.textContent = `${cloudMs} ms`;
        }, 1200);
    }
}
