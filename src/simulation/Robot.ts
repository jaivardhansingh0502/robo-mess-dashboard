// ROBOMESS - Autonomous Mobile Robot (AMR) Entity in TypeScript

import { Warehouse } from './Warehouse.js';
import { ORCAEngine } from './ORCA.js';
import { RobotState, SIMULATION_CONFIG, IRobotConfig, IRobotStats, ITask, IWaypoint, IVector2D } from '../types/index.js';

export class Robot {
    public id: string;
    public name: string;
    public x: number;
    public y: number;
    public targetX: number;
    public targetY: number;
    public heading: number;
    public color: string;

    public state: RobotState = RobotState.IDLE;
    public battery: number;
    public maxSpeed: number = 0.85;

    public velocity: IVector2D = { vx: 0, vy: 0 };
    public preferredVelocity: IVector2D = { vx: 0, vy: 0 };
    public safeVelocity: IVector2D = { vx: 0, vy: 0 };
    public orcaActive: boolean = false;
    public orcaNeighborId: string | null = null;

    public currentTask: ITask | null = null;
    public taskPhase: string | null = null;
    public bundle: string[] = [];
    public path: IWaypoint[] = [];
    public pathIndex: number = 0;
    public isCarrying: boolean = false;
    public payloadWeight: number = 0;

    public dwellTicks: number = 0;
    public stats: IRobotStats = {
        distanceTraveled: 0,
        tasksCompleted: 0,
        replansCount: 0,
        orcaInterventions: 0
    };

    public sensorRange: number = SIMULATION_CONFIG.SENSOR_RANGE;
    public collisionRadius: number = SIMULATION_CONFIG.ROBOT_RADIUS;

    constructor(config: IRobotConfig) {
        this.id = config.id;
        this.name = config.name || `AMR-${this.id}`;
        this.x = config.x;
        this.y = config.y;
        this.targetX = config.x;
        this.targetY = config.y;
        this.heading = config.heading || 0;
        this.color = config.color || '#00F0FF';
        this.battery = config.battery !== undefined ? config.battery : 100.0;
    }

    public update(warehouse: Warehouse, orcaEngine: ORCAEngine | null, allRobots: Robot[], timeStep: number): void {
        if (this.state === RobotState.OFFLINE) {
            this.velocity = { vx: 0, vy: 0 };
            return;
        }

        if (this.state === RobotState.CHARGING) {
            this.battery = Math.min(100, this.battery + SIMULATION_CONFIG.BATTERY_CHARGE_PER_TICK);
            this.velocity = { vx: 0, vy: 0 };
            if (this.battery >= 98) {
                this.state = RobotState.IDLE;
                this.taskPhase = null;
            }
            return;
        }

        if (this.dwellTicks > 0) {
            this.dwellTicks--;
            this.velocity = { vx: 0, vy: 0 };
            if (this.dwellTicks === 0) {
                this.handleDwellCompletion();
            }
            return;
        }

        if (this.path && this.path.length > 0 && this.pathIndex < this.path.length) {
            const nextWaypoint = this.path[this.pathIndex];
            const dx = nextWaypoint.x - this.x;
            const dy = nextWaypoint.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 0.12) {
                this.x = nextWaypoint.x;
                this.y = nextWaypoint.y;
                this.pathIndex++;

                if (this.pathIndex >= this.path.length) {
                    this.velocity = { vx: 0, vy: 0 };
                    this.handlePathDestinationReached();
                    return;
                }
            }

            const targetPoint = this.path[this.pathIndex];
            const tdx = targetPoint.x - this.x;
            const tdy = targetPoint.y - this.y;
            const tdist = Math.hypot(tdx, tdy) || 0.001;

            const speed = Math.min(this.maxSpeed, tdist);
            this.preferredVelocity = {
                vx: (tdx / tdist) * speed,
                vy: (tdy / tdist) * speed
            };

            if (orcaEngine) {
                const orcaResult = orcaEngine.computeSafeVelocity(this, allRobots, this.preferredVelocity);
                this.safeVelocity = orcaResult.safeVelocity;
                this.orcaActive = orcaResult.active;
                this.orcaNeighborId = orcaResult.neighborId;

                if (this.orcaActive) {
                    this.stats.orcaInterventions++;
                }

                this.velocity = this.safeVelocity;
            } else {
                this.velocity = this.preferredVelocity;
                this.orcaActive = false;
            }

            const moveStep = 0.22;
            const moveX = this.velocity.vx * moveStep;
            const moveY = this.velocity.vy * moveStep;

            const proposedX = this.x + moveX;
            const proposedY = this.y + moveY;

            if (warehouse.isWalkable(Math.round(proposedX), Math.round(proposedY))) {
                this.x = proposedX;
                this.y = proposedY;
                this.stats.distanceTraveled += Math.hypot(moveX, moveY);
            } else {
                if (warehouse.isWalkable(Math.round(proposedX), Math.round(this.y))) {
                    this.x = proposedX;
                } else if (warehouse.isWalkable(Math.round(this.x), Math.round(proposedY))) {
                    this.y = proposedY;
                }
            }

            if (Math.hypot(this.velocity.vx, this.velocity.vy) > 0.05) {
                const targetHeading = Math.atan2(this.velocity.vy, this.velocity.vx);
                this.heading += (targetHeading - this.heading) * 0.3;
            }

            this.battery = Math.max(0, this.battery - SIMULATION_CONFIG.BATTERY_DRAIN_PER_MOVE);
            if (this.battery < SIMULATION_CONFIG.BATTERY_CRITICAL_THRESHOLD && this.state !== RobotState.LOW_BATTERY) {
                this.state = RobotState.LOW_BATTERY;
            }
        } else {
            this.velocity = { vx: 0, vy: 0 };
            this.orcaActive = false;
        }
    }

    private handlePathDestinationReached(): void {
        if (this.taskPhase === 'TO_PICKUP' && this.currentTask) {
            this.state = RobotState.PICKUP;
            this.taskPhase = 'PICKING_UP';
            this.dwellTicks = 8;
        } else if (this.taskPhase === 'TO_DROPOFF' && this.currentTask) {
            this.state = RobotState.DROPOFF;
            this.taskPhase = 'DROPPING_OFF';
            this.dwellTicks = 8;
        } else if (this.taskPhase === 'TO_CHARGER') {
            this.state = RobotState.CHARGING;
        } else {
            this.state = RobotState.IDLE;
        }
    }

    private handleDwellCompletion(): void {
        if (this.taskPhase === 'PICKING_UP' && this.currentTask) {
            this.isCarrying = true;
            this.payloadWeight = this.currentTask.weight || 150;
            this.taskPhase = 'READY_FOR_DROPOFF';
        } else if (this.taskPhase === 'DROPPING_OFF' && this.currentTask) {
            this.isCarrying = false;
            this.payloadWeight = 0;
            this.stats.tasksCompleted++;
            this.taskPhase = 'COMPLETED';
        }
    }

    public setTrajectory(path: IWaypoint[], phase: string): void {
        this.path = path;
        this.pathIndex = 0;
        this.taskPhase = phase;
        this.state = RobotState.MOVING;
    }

    public triggerFailure(): ITask | null {
        this.state = RobotState.OFFLINE;
        this.velocity = { vx: 0, vy: 0 };
        this.path = [];
        this.isCarrying = false;
        const failedTask = this.currentTask;
        this.currentTask = null;
        this.bundle = [];
        return failedTask;
    }

    public recover(): boolean {
        if (this.state === RobotState.OFFLINE) {
            this.state = RobotState.IDLE;
            this.battery = Math.max(50, this.battery);
            return true;
        }
        return false;
    }

    public triggerLowBattery(): ITask | null {
        this.battery = 8.5;
        this.state = RobotState.LOW_BATTERY;
        const abandonedTask = this.currentTask;
        this.currentTask = null;
        this.isCarrying = false;
        this.path = [];
        return abandonedTask;
    }
}
