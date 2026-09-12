// ROBOMESS - Autonomous Mobile Robot (AMR) Entity & State Machine

import { RobotState, SIMULATION_CONFIG } from './types.js';

export class Robot {
    constructor(config) {
        this.id = config.id;
        this.name = config.name || `AMR-${this.id}`;
        this.x = config.x;
        this.y = config.y;
        this.targetX = config.x;
        this.targetY = config.y;
        this.heading = config.heading || 0; // Radians
        this.color = config.color || '#00F0FF';
        
        this.state = RobotState.IDLE;
        this.battery = config.battery || 100.0;
        this.maxSpeed = 0.85; // Grid cells per tick
        
        this.velocity = { vx: 0, vy: 0 };
        this.preferredVelocity = { vx: 0, vy: 0 };
        this.safeVelocity = { vx: 0, vy: 0 };
        this.orcaActive = false;
        this.orcaNeighborId = null;

        this.currentTask = null;
        this.taskPhase = null; // 'TO_PICKUP' | 'PICKING_UP' | 'TO_DROPOFF' | 'DROPPING_OFF' | 'TO_CHARGER'
        this.bundle = [];
        this.path = [];
        this.pathIndex = 0;
        this.isCarrying = false;
        this.payloadWeight = 0; // kg

        this.dwellTicks = 0; // Waiting at station (pickup/dropoff dwell)
        this.stats = {
            distanceTraveled: 0,
            tasksCompleted: 0,
            replansCount: 0,
            orcaInterventions: 0
        };

        this.sensorRange = SIMULATION_CONFIG.SENSOR_RANGE;
        this.collisionRadius = SIMULATION_CONFIG.ROBOT_RADIUS;
    }

    /**
     * Main update tick for robot physics, path following, and state transitions.
     */
    update(warehouse, orcaEngine, allRobots, timeStep) {
        if (this.state === RobotState.OFFLINE) {
            this.velocity = { vx: 0, vy: 0 };
            return;
        }

        // Handle Battery Charging
        if (this.state === RobotState.CHARGING) {
            this.battery = Math.min(100, this.battery + SIMULATION_CONFIG.BATTERY_CHARGE_PER_TICK);
            this.velocity = { vx: 0, vy: 0 };
            if (this.battery >= 98) {
                this.state = RobotState.IDLE;
                this.taskPhase = null;
            }
            return;
        }

        // Handle Dwell actions (Loading / Unloading / Waiting)
        if (this.dwellTicks > 0) {
            this.dwellTicks--;
            this.velocity = { vx: 0, vy: 0 };
            if (this.dwellTicks === 0) {
                this.handleDwellCompletion(warehouse);
            }
            return;
        }

        // Path following
        if (this.path && this.path.length > 0 && this.pathIndex < this.path.length) {
            const nextWaypoint = this.path[this.pathIndex];
            const dx = nextWaypoint.x - this.x;
            const dy = nextWaypoint.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 0.12) {
                // Waypoint reached!
                this.x = nextWaypoint.x;
                this.y = nextWaypoint.y;
                this.pathIndex++;

                if (this.pathIndex >= this.path.length) {
                    // Reached path destination
                    this.velocity = { vx: 0, vy: 0 };
                    this.handlePathDestinationReached(warehouse);
                    return;
                }
            }

            // Calculate Preferred Velocity towards next waypoint
            const targetPoint = this.path[this.pathIndex];
            const tdx = targetPoint.x - this.x;
            const tdy = targetPoint.y - this.y;
            const tdist = Math.hypot(tdx, tdy) || 0.001;

            const speed = Math.min(this.maxSpeed, tdist);
            this.preferredVelocity = {
                vx: (tdx / tdist) * speed,
                vy: (tdy / tdist) * speed
            };

            // Apply ORCA Local Avoidance
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

            // Move robot
            const moveStep = 0.22;
            const moveX = this.velocity.vx * moveStep;
            const moveY = this.velocity.vy * moveStep;

            const proposedX = this.x + moveX;
            const proposedY = this.y + moveY;

            // Check warehouse collision
            if (warehouse.isWalkable(Math.round(proposedX), Math.round(proposedY))) {
                this.x = proposedX;
                this.y = proposedY;
                this.stats.distanceTraveled += Math.hypot(moveX, moveY);
            } else {
                // Slip along free axis
                if (warehouse.isWalkable(Math.round(proposedX), Math.round(this.y))) {
                    this.x = proposedX;
                } else if (warehouse.isWalkable(Math.round(this.x), Math.round(proposedY))) {
                    this.y = proposedY;
                }
            }

            // Update heading
            if (Math.hypot(this.velocity.vx, this.velocity.vy) > 0.05) {
                const targetHeading = Math.atan2(this.velocity.vy, this.velocity.vx);
                this.heading += (targetHeading - this.heading) * 0.3;
            }

            // Drain battery
            this.battery = Math.max(0, this.battery - SIMULATION_CONFIG.BATTERY_DRAIN_PER_MOVE);
            if (this.battery < SIMULATION_CONFIG.BATTERY_CRITICAL_THRESHOLD && this.state !== RobotState.LOW_BATTERY) {
                this.state = RobotState.LOW_BATTERY;
            }
        } else {
            this.velocity = { vx: 0, vy: 0 };
            this.orcaActive = false;
        }
    }

    handlePathDestinationReached(warehouse) {
        if (this.taskPhase === 'TO_PICKUP' && this.currentTask) {
            this.state = RobotState.PICKUP;
            this.taskPhase = 'PICKING_UP';
            this.dwellTicks = 8; // Loading cargo dwell
        } else if (this.taskPhase === 'TO_DROPOFF' && this.currentTask) {
            this.state = RobotState.DROPOFF;
            this.taskPhase = 'DROPPING_OFF';
            this.dwellTicks = 8; // Unloading cargo dwell
        } else if (this.taskPhase === 'TO_CHARGER') {
            this.state = RobotState.CHARGING;
        } else {
            this.state = RobotState.IDLE;
        }
    }

    handleDwellCompletion(warehouse) {
        if (this.taskPhase === 'PICKING_UP' && this.currentTask) {
            // Picked up pallet!
            this.isCarrying = true;
            this.payloadWeight = this.currentTask.weight || 150;
            this.taskPhase = 'READY_FOR_DROPOFF';
        } else if (this.taskPhase === 'DROPPING_OFF' && this.currentTask) {
            // Dropped off pallet!
            this.isCarrying = false;
            this.payloadWeight = 0;
            this.stats.tasksCompleted++;
            this.taskPhase = 'COMPLETED';
        }
    }

    setTrajectory(path, phase) {
        this.path = path;
        this.pathIndex = 0;
        this.taskPhase = phase;
        this.state = RobotState.MOVING;
    }

    triggerFailure() {
        this.state = RobotState.OFFLINE;
        this.velocity = { vx: 0, vy: 0 };
        this.path = [];
        this.isCarrying = false;
        const failedTask = this.currentTask;
        this.currentTask = null;
        this.bundle = [];
        return failedTask;
    }

    recover() {
        if (this.state === RobotState.OFFLINE) {
            this.state = RobotState.IDLE;
            this.battery = Math.max(50, this.battery);
            return true;
        }
        return false;
    }

    triggerLowBattery() {
        this.battery = 8.5;
        this.state = RobotState.LOW_BATTERY;
        const abandonedTask = this.currentTask;
        this.currentTask = null;
        this.isCarrying = false;
        this.path = [];
        return abandonedTask;
    }
}
