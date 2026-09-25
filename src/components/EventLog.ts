// ROBOMESS - EventLog Terminal Component in TypeScript

import { SimulationEngine } from '../simulation/SimulationEngine.js';
import { ILogEntry } from '../types/index.js';

export class EventLog {
    public container: HTMLElement;
    public engine: SimulationEngine;
    public logs: ILogEntry[] = [];
    public activeFilter: string = 'ALL';
    public autoScroll: boolean = true;

    constructor(container: HTMLElement, engine: SimulationEngine) {
        this.container = container;
        this.engine = engine;
        this.render();
        this.attachEvents();
    }

    public render(): void {
        this.container.innerHTML = `
            <div class="event-terminal-wrapper">
                <div class="terminal-header">
                    <div class="terminal-title">
                        <span class="terminal-pulse-dot"></span>
                        <span>ROBOMESS TELEMETRY CONSOLE // ROS 2 NODE EVENT BUS</span>
                    </div>

                    <div class="terminal-filters">
                        <button class="term-filter-btn active" data-filter="ALL">ALL</button>
                        <button class="term-filter-btn" data-filter="CBBA">CBBA</button>
                        <button class="term-filter-btn" data-filter="CBS">CBS</button>
                        <button class="term-filter-btn" data-filter="TASK">TASKS</button>
                        <button class="term-filter-btn" data-filter="FAULT">FAULTS</button>
                    </div>

                    <div class="terminal-actions">
                        <button id="btn-clear-terminal" class="term-action-btn" title="Clear console buffer">CLEAR</button>
                    </div>
                </div>

                <div class="terminal-body" id="terminal-entries">
                    <div class="terminal-line system-line">
                        <span class="term-time">[00:00:00]</span>
                        <span class="term-badge badge-system">[SYSTEM]</span>
                        <span class="term-msg">ROBOMESS Edge-AI Fleet Coordination Engine Initialized.</span>
                    </div>
                    <div class="terminal-line system-line">
                        <span class="term-time">[00:00:00]</span>
                        <span class="term-badge badge-system">[SYSTEM]</span>
                        <span class="term-msg">ROS 2 DDS Discovery: 5 Nodes Joined (R1, R2, R3, R4, R5).</span>
                    </div>
                </div>
            </div>
        `;
    }

    private attachEvents(): void {
        const body = this.container.querySelector('#terminal-entries') as HTMLElement;

        this.engine.on('log', (entry: ILogEntry) => {
            this.logs.push(entry);
            if (this.logs.length > 250) this.logs.shift();
            this.appendEntry(entry, body);
        });

        const filterBtns = this.container.querySelectorAll('.term-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.getAttribute('data-filter') || 'ALL';
                this.rebuildLogView(body);
            });
        });

        this.container.querySelector('#btn-clear-terminal')!.addEventListener('click', () => {
            this.logs = [];
            body.innerHTML = '';
        });
    }

    private appendEntry(entry: ILogEntry, body: HTMLElement): void {
        if (!this.matchesFilter(entry.category)) return;

        const line = document.createElement('div');
        line.className = `terminal-line ${this.getCategoryClass(entry.category)}`;
        line.innerHTML = `
            <span class="term-time">[${entry.timestamp}]</span>
            <span class="term-badge ${this.getBadgeClass(entry.category)}">[${entry.category}]</span>
            <span class="term-msg">${this.escapeHtml(entry.message)}</span>
        `;

        body.appendChild(line);

        if (this.autoScroll) {
            body.scrollTop = body.scrollHeight;
        }
    }

    private rebuildLogView(body: HTMLElement): void {
        body.innerHTML = '';
        this.logs.forEach(entry => {
            if (this.matchesFilter(entry.category)) {
                this.appendEntry(entry, body);
            }
        });
    }

    private matchesFilter(category: string): boolean {
        if (this.activeFilter === 'ALL') return true;
        if (this.activeFilter === 'CBBA' && category === 'CBBA') return true;
        if (this.activeFilter === 'CBS' && (category === 'CBS' || category === 'A_STAR')) return true;
        if (this.activeFilter === 'TASK' && category === 'TASK') return true;
        if (this.activeFilter === 'FAULT' && (category === 'FAULT' || category === 'POWER' || category === 'DYNAMIC')) return true;
        return false;
    }

    private getCategoryClass(cat: string): string {
        switch (cat) {
            case 'FAULT':
            case 'POWER':
                return 'fault-line';
            case 'CBS':
                return 'cbs-line';
            case 'CBBA':
                return 'cbba-line';
            case 'TASK':
                return 'task-line';
            default:
                return 'normal-line';
        }
    }

    private getBadgeClass(cat: string): string {
        switch (cat) {
            case 'CBBA': return 'badge-cbba';
            case 'CBS': return 'badge-cbs';
            case 'ORCA': return 'badge-orca';
            case 'TASK': return 'badge-task';
            case 'FAULT': return 'badge-fault';
            case 'POWER': return 'badge-power';
            default: return 'badge-system';
        }
    }

    private escapeHtml(str: string): string {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
