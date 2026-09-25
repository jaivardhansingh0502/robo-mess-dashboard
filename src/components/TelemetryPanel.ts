// ROBOMESS - Real-Time Telemetry & Fleet Status HUD Panel in TypeScript

import { SimulationEngine } from '../simulation/SimulationEngine.js';
import { RobotState, ISimulationMetrics } from '../types/index.js';

export class TelemetryPanel {
    public container: HTMLElement;
    public engine: SimulationEngine;

    constructor(container: HTMLElement, engine: SimulationEngine) {
        this.container = container;
        this.engine = engine;
        this.render();
        this.attachEvents();
    }

    public render(): void {
        this.container.innerHTML = `
            <div class="telemetry-hud-wrapper">
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-title">FLEET OPERATIONAL</div>
                        <div class="metric-value cyan" id="metric-fleet-avail">5 / 5</div>
                        <div class="metric-sub">HEALTH: 100% NOMINAL</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">ACTIVE ORDERS</div>
                        <div class="metric-value orange" id="metric-active-tasks">8</div>
                        <div class="metric-sub" id="metric-completed-tasks">COMPLETED: 0</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">CONFLICTS RESOLVED</div>
                        <div class="metric-value green" id="metric-conflicts">0</div>
                        <div class="metric-sub" id="metric-replans">CBS REPLANS: 0</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">AVG CBS LATENCY</div>
                        <div class="metric-value purple" id="metric-latency">18.4 ms</div>
                        <div class="metric-sub">SUB-50ms TARGET OK</div>
                    </div>
                </div>

                <div class="fleet-cards-container">
                    <div class="section-micro-header">
                        <span>AMR TELEMETRY STREAM</span>
                        <span class="live-dot">● DUAL DDS/MQTT</span>
                    </div>
                    <div class="robot-cards-list" id="robot-cards-list"></div>
                </div>

                <div class="inspector-card" id="robot-inspector"></div>
            </div>
        `;

        this.updateFleetCards();
        this.updateInspector();
    }

    private attachEvents(): void {
        this.engine.on('telemetry', (metrics) => {
            this.updateMetrics(metrics);
            this.updateFleetCards();
            this.updateInspector();
        });

        this.engine.on('robotSelected', () => {
            this.updateFleetCards();
            this.updateInspector();
        });
    }

    private updateMetrics(m: ISimulationMetrics): void {
        const fleetAvail = this.container.querySelector('#metric-fleet-avail');
        const activeCount = this.engine.robots.filter(r => r.state !== RobotState.OFFLINE).length;
        if (fleetAvail) fleetAvail.textContent = `${activeCount} / ${this.engine.robots.length}`;

        const activeTasks = this.container.querySelector('#metric-active-tasks');
        if (activeTasks) activeTasks.textContent = `${m.activeTasks}`;

        const completedTasks = this.container.querySelector('#metric-completed-tasks');
        if (completedTasks) completedTasks.textContent = `COMPLETED: ${m.completedTasks}`;

        const conflicts = this.container.querySelector('#metric-conflicts');
        if (conflicts) conflicts.textContent = `${m.conflictsResolved}`;

        const replans = this.container.querySelector('#metric-replans');
        if (replans) replans.textContent = `CBS REPLANS: ${m.replansExecuted}`;

        const latency = this.container.querySelector('#metric-latency');
        if (latency) latency.textContent = `${m.avgResponseMs} ms`;
    }

    public updateFleetCards(): void {
        const list = this.container.querySelector('#robot-cards-list');
        if (!list) return;

        list.innerHTML = this.engine.robots.map(r => {
            const isSelected = r.id === this.engine.selectedRobotId;
            const bPct = Math.round(r.battery);
            const bColorClass = bPct > 40 ? 'green-battery' : bPct > 20 ? 'orange-battery' : 'red-battery';
            const stateClass = r.state === RobotState.OFFLINE ? 'state-offline' : r.state === RobotState.MOVING ? 'state-moving' : 'state-normal';

            return `
                <div class="robot-telemetry-row ${isSelected ? 'selected-robot' : ''}" data-id="${r.id}">
                    <div class="robot-header-col">
                        <span class="robot-id-badge" style="border-color: ${r.color}; color: ${r.color};">${r.id}</span>
                        <span class="robot-name-label">${r.name}</span>
                    </div>

                    <div class="robot-state-col">
                        <span class="state-pill ${stateClass}">${r.state}</span>
                        ${r.orcaActive ? '<span class="orca-badge">ORCA</span>' : ''}
                    </div>

                    <div class="robot-task-col">
                        <span class="task-label">${r.currentTask ? r.currentTask.name : '<span class="idle-txt">IDLE / STANDBY</span>'}</span>
                        <span class="task-dest">${r.currentTask ? (r.isCarrying ? `→ ${r.currentTask.dropoff.name}` : `→ ${r.currentTask.pickup.name}`) : `POS: (${r.x.toFixed(1)}, ${r.y.toFixed(1)})`}</span>
                    </div>

                    <div class="robot-battery-col">
                        <div class="battery-readout">
                            <span>${bPct}%</span>
                        </div>
                        <div class="battery-bar-track">
                            <div class="battery-bar-fill ${bColorClass}" style="width: ${bPct}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.robot-telemetry-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-id');
                if (id) this.engine.selectRobot(id);
            });
        });
    }

    public updateInspector(): void {
        const inspector = this.container.querySelector('#robot-inspector');
        if (!inspector) return;

        const robot = this.engine.robots.find(r => r.id === this.engine.selectedRobotId) || this.engine.robots[0];
        if (!robot) return;

        const speed = Math.hypot(robot.velocity.vx, robot.velocity.vy).toFixed(2);
        const headingDeg = Math.round((robot.heading * 180) / Math.PI);

        inspector.innerHTML = `
            <div class="inspector-header">
                <div class="inspector-title">
                    <span class="inspector-indicator" style="background: ${robot.color};"></span>
                    <span>INSPECTOR: ${robot.id} — ${robot.name}</span>
                </div>
                <span class="status-tag ${robot.state === RobotState.OFFLINE ? 'red' : 'green'}">${robot.state}</span>
            </div>

            <div class="inspector-grid">
                <div class="insp-item">
                    <span class="insp-label">COORDINATES</span>
                    <span class="insp-val">(${robot.x.toFixed(2)}, ${robot.y.toFixed(2)})</span>
                </div>
                <div class="insp-item">
                    <span class="insp-label">HEADING</span>
                    <span class="insp-val">${headingDeg}°</span>
                </div>
                <div class="insp-item">
                    <span class="insp-label">VELOCITY (ORCA)</span>
                    <span class="insp-val">${speed} m/s</span>
                </div>
                <div class="insp-item">
                    <span class="insp-label">PAYLOAD</span>
                    <span class="insp-val">${robot.isCarrying ? `${robot.payloadWeight} kg` : 'EMPTY'}</span>
                </div>
                <div class="insp-item">
                    <span class="insp-label">WAYPOINTS REMAINING</span>
                    <span class="insp-val">${robot.path ? Math.max(0, robot.path.length - robot.pathIndex) : 0} pts</span>
                </div>
                <div class="insp-item">
                    <span class="insp-label">DISTANCE TRAVELED</span>
                    <span class="insp-val">${robot.stats.distanceTraveled.toFixed(1)} m</span>
                </div>
            </div>

            <div class="inspector-route-bar">
                <span class="route-step ${robot.taskPhase === 'TO_PICKUP' ? 'active' : ''}">1. ROUTE TO PICKUP</span>
                <span class="route-arrow">→</span>
                <span class="route-step ${robot.taskPhase === 'PICKING_UP' ? 'active' : ''}">2. DWELL & LIFT</span>
                <span class="route-arrow">→</span>
                <span class="route-step ${robot.taskPhase === 'READY_FOR_DROPOFF' || robot.taskPhase === 'TO_DROPOFF' ? 'active' : ''}">3. CBS TRANSIT</span>
                <span class="route-arrow">→</span>
                <span class="route-step ${robot.taskPhase === 'DROPPING_OFF' ? 'active' : ''}">4. DELIVER</span>
            </div>
        `;
    }
}
