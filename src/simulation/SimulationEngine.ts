// ROBOMESS - Master Simulation Engine (TypeScript)

import { Warehouse } from './Warehouse.js';
import { Robot } from './Robot.js';
import { CBBAEngine } from './CBBA.js';
import { CBSSolver } from './CBS.js';
import { ORCAEngine } from './ORCA.js';
import { RobotState, TaskState, TaskPriority, ITask, ISimulationMetrics, ILogEntry, SIMULATION_CONFIG } from '../types/index.js';

export class SimulationEngine {
    public warehouse: Warehouse;
    public cbba: CBBAEngine;
    public cbs: CBSSolver;
    public orca: ORCAEngine;

    public robots: Robot[] = [];
    public tasks: ITask[] = [];
    public taskCounter: number = 1;
    public timeStep: number = 0;

    public isRunning: boolean = false;
    public speedMultiplier: number = 1.0;
    private timer: any = null;

    public selectedRobotId: string = 'R1';
    public enabledAlgorithms = {
        cbba: true,
        cbs: true,
        astar: true,
        orca: true
    };

    public layerToggles = {
        paths: true,
        collisionZones: true,
        velocityVectors: true,
        telemetryHUD: true,
        sensorRadius: true
    };

    public metrics: ISimulationMetrics = {
        activeTasks: 0,
        completedTasks: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        replansExecuted: 0,
        avgResponseMs: 18.4,
        fleetAvailability: '100%',
        totalDistance: 0
    };

    private listeners: {
        log: ((entry: ILogEntry) => void)[];
        telemetry: ((metrics: ISimulationMetrics, robots: Robot[], tasks: ITask[]) => void)[];
        tick: ((engine: SimulationEngine) => void)[];
        robotSelected: ((robot: Robot | undefined) => void)[];
    } = {
        log: [],
        telemetry: [],
        tick: [],
        robotSelected: []
    };

    constructor() {
        this.warehouse = new Warehouse();
        this.cbba = new CBBAEngine();
        this.cbs = new CBSSolver(this.warehouse);
        this.orca = new ORCAEngine(this.warehouse);

        this.initFleet();
        this.initInitialTasks();
    }

    public initFleet(): void {
        this.robots = [
            new Robot({ id: 'R1', name: 'AMR-01 "Vanguard"', x: 3, y: 2, color: '#00F0FF', battery: 94 }),
            new Robot({ id: 'R2', name: 'AMR-02 "Apex"', x: 3, y: 14, color: '#00FF88', battery: 88 }),
            new Robot({ id: 'R3', name: 'AMR-03 "Titan"', x: 14, y: 1, color: '#FFB300', battery: 78 }),
            new Robot({ id: 'R4', name: 'AMR-04 "Echo"', x: 24, y: 2, color: '#D946EF', battery: 91 }),
            new Robot({ id: 'R5', name: 'AMR-05 "Cipher"', x: 24, y: 14, color: '#3B82F6', battery: 85 })
        ];
    }

    public initInitialTasks(): void {
        this.tasks = [
            { id: 'T01', name: 'Medical Supplies Batch A', pickup: { x: 5, y: 4, name: 'Rack A1' }, dropoff: { x: 25, y: 4, name: 'Outbound D1' }, priority: TaskPriority.CRITICAL, state: TaskState.UNASSIGNED, weight: 140, assignedRobot: null },
            { id: 'T02', name: 'Precision Components Pallet', pickup: { x: 2, y: 4, name: 'Inbound P1' }, dropoff: { x: 10, y: 5, name: 'Rack C2' }, priority: TaskPriority.HIGH, state: TaskState.UNASSIGNED, weight: 220, assignedRobot: null },
            { id: 'T03', name: 'Lithium Cells Crate', pickup: { x: 5, y: 10, name: 'Rack B2' }, dropoff: { x: 25, y: 12, name: 'Outbound D2' }, priority: TaskPriority.NORMAL, state: TaskState.UNASSIGNED, weight: 180, assignedRobot: null },
            { id: 'T04', name: 'Optical Sensors Container', pickup: { x: 2, y: 12, name: 'Inbound P2' }, dropoff: { x: 15, y: 4, name: 'Rack E1' }, priority: TaskPriority.CRITICAL, state: TaskState.UNASSIGNED, weight: 95, assignedRobot: null },
            { id: 'T05', name: 'Robotics Actuators Bin', pickup: { x: 13, y: 12, name: 'Rack D3' }, dropoff: { x: 25, y: 4, name: 'Outbound D1' }, priority: TaskPriority.HIGH, state: TaskState.UNASSIGNED, weight: 310, assignedRobot: null },
            { id: 'T06', name: 'Carbon Fiber Panels', pickup: { x: 15, y: 10, name: 'Rack F2' }, dropoff: { x: 25, y: 12, name: 'Outbound D2' }, priority: TaskPriority.NORMAL, state: TaskState.UNASSIGNED, weight: 160, assignedRobot: null },
            { id: 'T07', name: 'Coolant Reservoirs', pickup: { x: 2, y: 4, name: 'Inbound P1' }, dropoff: { x: 20, y: 5, name: 'Rack G2' }, priority: TaskPriority.LOW, state: TaskState.UNASSIGNED, weight: 110, assignedRobot: null },
            { id: 'T08', name: 'High-Torque Servos', pickup: { x: 20, y: 11, name: 'Rack H1' }, dropoff: { x: 25, y: 4, name: 'Outbound D1' }, priority: TaskPriority.NORMAL, state: TaskState.UNASSIGNED, weight: 240, assignedRobot: null }
        ];
        this.taskCounter = 9;
        this.updateActiveTasksCount();
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.emitLog('SIMULATION', 'Simulation engine started. Autonomous fleet active.');
        this.runLoop();
    }

    public pause(): void {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.emitLog('SIMULATION', 'Simulation paused by operator.');
    }

    public reset(): void {
        this.pause();
        this.timeStep = 0;
        this.warehouse = new Warehouse();
        this.cbs = new CBSSolver(this.warehouse);
        this.orca = new ORCAEngine(this.warehouse);
        this.initFleet();
        this.initInitialTasks();
        this.metrics = {
            activeTasks: this.tasks.filter(t => t.state !== TaskState.COMPLETED).length,
            completedTasks: 0,
            conflictsDetected: 0,
            conflictsResolved: 0,
            replansExecuted: 0,
            avgResponseMs: 18.4,
            fleetAvailability: '100%',
            totalDistance: 0
        };
        this.emitLog('SYSTEM', 'Simulation reset to factory deterministic baseline.');
        this.emitTick();
        this.emitTelemetry();
    }

    public setSpeed(multiplier: number): void {
        this.speedMultiplier = multiplier;
        this.emitLog('CONFIG', `Simulation speed set to ${multiplier}x.`);
    }

    private runLoop(): void {
        if (!this.isRunning) return;

        this.tick();

        const delay = Math.max(25, Math.round(SIMULATION_CONFIG.TICK_INTERVAL_MS / this.speedMultiplier));
        this.timer = setTimeout(() => this.runLoop(), delay);
    }

    public step(): void {
        this.tick();
    }

    public tick(): void {
        this.timeStep++;

        // 1. Task Allocation Round (CBBA)
        if (this.enabledAlgorithms.cbba) {
            const pending = this.tasks.filter(t => t.state === TaskState.UNASSIGNED);
            if (pending.length < 2 && Math.random() < 0.15) {
                this.injectNewTask(Math.random() > 0.5 ? TaskPriority.HIGH : TaskPriority.NORMAL);
            }
            this.runCBBAAllocation();
        }

        // 2. Global Path Planning & Conflict Resolution (CBS + A*)
        if (this.enabledAlgorithms.cbs) {
            this.runCBSPlanning();
        }

        // 3. Update Robots
        const activeCount = this.robots.filter(r => r.state !== RobotState.OFFLINE).length;
        this.metrics.fleetAvailability = `${Math.round((activeCount / this.robots.length) * 100)}%`;

        let totalDist = 0;
        this.robots.forEach(robot => {
            robot.update(this.warehouse, this.enabledAlgorithms.orca ? this.orca : null, this.robots, this.timeStep);
            totalDist += robot.stats.distanceTraveled;

            if (robot.taskPhase === 'COMPLETED' && robot.currentTask) {
                const task = robot.currentTask;
                task.state = TaskState.COMPLETED;
                this.metrics.completedTasks++;
                this.emitLog('TASK', `Task ${task.id} (${task.name}) delivered to ${task.dropoff.name} by ${robot.id}.`);
                robot.currentTask = null;
                robot.taskPhase = null;
                robot.state = RobotState.IDLE;
                this.updateActiveTasksCount();
            }

            if (robot.state === RobotState.LOW_BATTERY && robot.taskPhase !== 'TO_CHARGER') {
                this.routeToCharger(robot);
            }
        });

        this.metrics.totalDistance = Number(totalDist.toFixed(1));
        this.emitTick();
        if (this.timeStep % 4 === 0) {
            this.emitTelemetry();
        }
    }

    private runCBBAAllocation(): void {
        const unassignedTasks = this.tasks.filter(t => t.state === TaskState.UNASSIGNED);
        const availableRobots = this.robots.filter(r => r.state === RobotState.IDLE && r.battery > 20);

        if (unassignedTasks.length > 0 && availableRobots.length > 0) {
            const result = this.cbba.allocateTasks(availableRobots, unassignedTasks);

            if (result && result.assignments && result.assignments.size > 0) {
                result.assignments.forEach((task, robotId) => {
                    const robot = this.robots.find(r => r.id === robotId);
                    if (robot && !robot.currentTask) {
                        task.state = TaskState.ASSIGNED;
                        task.assignedRobot = robot.id;
                        robot.currentTask = task;
                        robot.bundle = [task.id];
                        robot.taskPhase = 'NEEDS_PICKUP_PATH';
                        this.emitLog('CBBA', `Auction Consensus: Task ${task.id} awarded to ${robot.id} across ${result.rounds} rounds.`);
                    }
                });
            }
        }
    }

    private runCBSPlanning(): void {
        const agentsNeedingPath: Array<{ id: string; start: { x: number; y: number }; goal: { x: number; y: number }; phase: string; startTime: number }> = [];

        this.robots.forEach(robot => {
            if (robot.state === RobotState.OFFLINE) return;

            if (robot.taskPhase === 'NEEDS_PICKUP_PATH' && robot.currentTask) {
                agentsNeedingPath.push({
                    id: robot.id,
                    start: { x: Math.round(robot.x), y: Math.round(robot.y) },
                    goal: robot.currentTask.pickup,
                    phase: 'TO_PICKUP',
                    startTime: this.timeStep
                });
            } else if (robot.taskPhase === 'READY_FOR_DROPOFF' && robot.currentTask) {
                agentsNeedingPath.push({
                    id: robot.id,
                    start: { x: Math.round(robot.x), y: Math.round(robot.y) },
                    goal: robot.currentTask.dropoff,
                    phase: 'TO_DROPOFF',
                    startTime: this.timeStep
                });
            }
        });

        if (agentsNeedingPath.length > 0) {
            const planStart = performance.now();
            const planResult = this.cbs.planPaths(agentsNeedingPath);
            const planDuration = performance.now() - planStart;

            this.metrics.avgResponseMs = Number(((this.metrics.avgResponseMs * 0.85) + (planDuration * 0.15)).toFixed(1));

            if (planResult.conflictsResolved > 0) {
                this.metrics.conflictsDetected += planResult.conflictsResolved;
                this.metrics.conflictsResolved += planResult.conflictsResolved;
                this.metrics.replansExecuted++;

                planResult.conflictLog.forEach(log => {
                    this.emitLog('CBS', `CONFLICT DETECTED at ${log.location} between ${log.agent1} & ${log.agent2} (t=${log.timeStep}). Space-time constraint added.`);
                    this.emitLog('CBS', `Replanning successful: Conflict eliminated via synchronized space-time detour.`);
                });
            }

            agentsNeedingPath.forEach(agent => {
                const robot = this.robots.find(r => r.id === agent.id);
                const path = planResult.paths.get(agent.id);
                if (robot && path && path.length > 0) {
                    robot.setTrajectory(path, agent.phase);
                    robot.stats.replansCount++;
                    this.emitLog('A_STAR', `${robot.id} trajectory locked: ${path.length} waypoints to destination.`);
                }
            });
        }
    }

    private routeToCharger(robot: Robot): void {
        const dock = this.warehouse.getChargingStation(this.robots.indexOf(robot));
        const path = this.cbs.astar.findPath(
            { x: Math.round(robot.x), y: Math.round(robot.y) },
            { x: dock.x, y: dock.y },
            this.timeStep,
            [],
            null,
            robot.id
        );

        if (path && path.length > 0) {
            robot.setTrajectory(path, 'TO_CHARGER');
            this.emitLog('POWER', `LOW BATTERY: ${robot.id} rerouted to ${dock.name} (${dock.x}, ${dock.y}).`);
        }
    }

    public updateActiveTasksCount(): void {
        this.metrics.activeTasks = this.tasks.filter(t => t.state !== TaskState.COMPLETED).length;
    }

    public injectNewTask(priority: TaskPriority = TaskPriority.HIGH): ITask {
        const id = `T0${this.taskCounter++}`;
        const rackIndex = Math.floor(Math.random() * this.warehouse.racks.length);
        const rack = this.warehouse.racks[rackIndex];
        const outStations = this.warehouse.stations.outbound;
        const drop = outStations[Math.floor(Math.random() * outStations.length)];
        const pickupSpot = this.warehouse.getClosestWalkableCell(rack.x, rack.y);

        const newTask: ITask = {
            id,
            name: `Priority Order #${Math.floor(1000 + Math.random() * 9000)}`,
            pickup: { x: pickupSpot.x, y: pickupSpot.y, name: `Rack ${rack.id}` },
            dropoff: { x: drop.x, y: drop.y, name: drop.name },
            priority,
            state: TaskState.UNASSIGNED,
            weight: Math.round(80 + Math.random() * 250),
            assignedRobot: null
        };

        this.tasks.push(newTask);
        this.updateActiveTasksCount();
        this.emitLog('EVENT', `[NEW TASK] Order ${newTask.id} created (${newTask.name}, Weight: ${newTask.weight}kg, Priority: ${priority}). Triggering CBBA auction.`);
        this.emitTelemetry();
        return newTask;
    }

    public triggerRobotFailure(robotId: string = 'R3'): boolean {
        const robot = this.robots.find(r => r.id === robotId);
        if (!robot) return false;

        const failedTask = robot.triggerFailure();
        this.emitLog('FAULT', `⚠ HARDWARE ALERT: ${robot.id} OFFLINE! Drive telemetry lost.`);

        if (failedTask) {
            failedTask.state = TaskState.UNASSIGNED;
            failedTask.assignedRobot = null;
            this.emitLog('FAULT', `Task ${failedTask.id} orphaned by ${robot.id}. Re-injected into CBBA auction.`);
        }

        this.warehouse.addDynamicObstacle(Math.round(robot.x), Math.round(robot.y), `Stranded ${robot.id}`);
        this.metrics.replansExecuted++;
        this.emitTelemetry();
        return true;
    }

    public triggerLowBattery(robotId: string = 'R2'): boolean {
        const robot = this.robots.find(r => r.id === robotId);
        if (!robot) return false;

        const abandonedTask = robot.triggerLowBattery();
        this.emitLog('POWER', `⚡ BATTERY WARNING: ${robot.id} critical battery level (8.5%). Initiating emergency abort.`);

        if (abandonedTask) {
            abandonedTask.state = TaskState.UNASSIGNED;
            abandonedTask.assignedRobot = null;
            this.emitLog('CBBA', `Task ${abandonedTask.id} returned to auction pool.`);
        }

        this.routeToCharger(robot);
        this.emitTelemetry();
        return true;
    }

    public blockAisle(x: number = 8, y: number = 8): any {
        const obs = this.warehouse.addDynamicObstacle(x, y, 'Fallen Pallet / Spill');
        this.emitLog('DYNAMIC', `🚧 DYNAMIC OBSTACLE DETECTED at aisle intersection (${x}, ${y}). Invalidating intersecting trajectories.`);

        this.robots.forEach(robot => {
            if (robot.path && robot.path.some(pt => pt.x === x && pt.y === y)) {
                this.emitLog('CBS', `${robot.id} route obstructed by barrier. Triggering instant CBS + A* detour replan.`);
                robot.path = [];
                robot.pathIndex = 0;
                if (robot.taskPhase === 'TO_PICKUP') robot.taskPhase = 'NEEDS_PICKUP_PATH';
                if (robot.taskPhase === 'TO_DROPOFF') robot.taskPhase = 'READY_FOR_DROPOFF';
            }
        });

        this.metrics.replansExecuted++;
        this.emitTelemetry();
        return obs;
    }

    public clearObstacles(): void {
        this.warehouse.clearDynamicObstacles();
        this.emitLog('DYNAMIC', 'Dynamic aisle obstructions cleared. Highway lanes restored.');
        this.emitTelemetry();
    }

    public recoverRobot(robotId: string = 'R3'): void {
        const robot = this.robots.find(r => r.id === robotId);
        if (!robot) return;
        this.warehouse.removeDynamicObstacle(Math.round(robot.x), Math.round(robot.y));
        robot.recover();
        this.emitLog('SYSTEM', `${robot.id} diagnostic passed. Robot returned to active operational pool.`);
        this.emitTelemetry();
    }

    public on(event: 'log', callback: (entry: ILogEntry) => void): void;
    public on(event: 'telemetry', callback: (metrics: ISimulationMetrics, robots: Robot[], tasks: ITask[]) => void): void;
    public on(event: 'tick', callback: (engine: SimulationEngine) => void): void;
    public on(event: 'robotSelected', callback: (robot: Robot | undefined) => void): void;
    public on(event: string, callback: any): void {
        if ((this.listeners as any)[event]) {
            (this.listeners as any)[event].push(callback);
        }
    }

    public emitLog(category: string, message: string): void {
        const entry: ILogEntry = {
            id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toLocaleTimeString(),
            category,
            message
        };
        this.listeners.log.forEach(cb => cb(entry));
    }

    public emitTelemetry(): void {
        this.listeners.telemetry.forEach(cb => cb(this.metrics, this.robots, this.tasks));
    }

    public emitTick(): void {
        this.listeners.tick.forEach(cb => cb(this));
    }

    public selectRobot(robotId: string): void {
        this.selectedRobotId = robotId;
        const robot = this.robots.find(r => r.id === robotId);
        this.listeners.robotSelected.forEach(cb => cb(robot));
    }
}
