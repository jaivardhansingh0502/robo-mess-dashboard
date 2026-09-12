// ROBOMESS - Master Simulation Engine
// Coordinates Warehouse, AMRs, CBBA Task Allocation, CBS Path Planning, ORCA Evasion, and Event Injection

import { Warehouse } from './Warehouse.js';
import { Robot } from './Robot.js';
import { CBBAEngine } from './CBBA.js';
import { CBSSolver } from './CBS.js';
import { ORCAEngine } from './ORCA.js';
import { RobotState, TaskState, TaskPriority, SIMULATION_CONFIG } from './types.js';

export class SimulationEngine {
    constructor() {
        this.warehouse = new Warehouse();
        this.cbba = new CBBAEngine();
        this.cbs = new CBSSolver(this.warehouse);
        this.orca = new ORCAEngine(this.warehouse);

        this.robots = [];
        this.tasks = [];
        this.taskCounter = 1;
        this.timeStep = 0;

        this.isRunning = false;
        this.speedMultiplier = 1.0;
        this.timer = null;

        this.selectedRobotId = 'R1';
        this.enabledAlgorithms = {
            cbba: true,
            cbs: true,
            astar: true,
            orca: true
        };

        this.layerToggles = {
            paths: true,
            collisionZones: true,
            velocityVectors: true,
            telemetryHUD: true,
            sensorRadius: true
        };

        this.metrics = {
            activeTasks: 0,
            completedTasks: 0,
            conflictsDetected: 0,
            conflictsResolved: 0,
            replansExecuted: 0,
            avgResponseMs: 18.4,
            fleetAvailability: '100%',
            totalDistance: 0
        };

        // Event callbacks
        this.listeners = {
            log: [],
            telemetry: [],
            tick: [],
            robotSelected: []
        };

        this.initFleet();
        this.initInitialTasks();
    }

    initFleet() {
        this.robots = [
            new Robot({ id: 'R1', name: 'AMR-01 "Vanguard"', x: 3, y: 2, color: '#00F0FF', battery: 94 }),
            new Robot({ id: 'R2', name: 'AMR-02 "Apex"', x: 3, y: 14, color: '#00FF88', battery: 88 }),
            new Robot({ id: 'R3', name: 'AMR-03 "Titan"', x: 14, y: 1, color: '#FFB300', battery: 78 }),
            new Robot({ id: 'R4', name: 'AMR-04 "Echo"', x: 24, y: 2, color: '#D946EF', battery: 91 }),
            new Robot({ id: 'R5', name: 'AMR-05 "Cipher"', x: 24, y: 14, color: '#3B82F6', battery: 85 })
        ];
    }

    initInitialTasks() {
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

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.emitLog('SIMULATION', 'Simulation engine started. Autonomous fleet active.');
        this.runLoop();
    }

    pause() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.emitLog('SIMULATION', 'Simulation paused by operator.');
    }

    reset() {
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

    setSpeed(multiplier) {
        this.speedMultiplier = multiplier;
        this.emitLog('CONFIG', `Simulation speed set to ${multiplier}x.`);
    }

    runLoop() {
        if (!this.isRunning) return;

        this.tick();

        const delay = Math.max(25, Math.round(SIMULATION_CONFIG.TICK_INTERVAL_MS / this.speedMultiplier));
        this.timer = setTimeout(() => this.runLoop(), delay);
    }

    step() {
        this.tick();
    }

    /**
     * Single Simulation Step:
     * 1. CBBA Task Allocation
     * 2. CBS + Space-Time A* Multi-Agent Path Planning
     * 3. AMR State Updates & Kinematics
     * 4. ORCA Local Avoidance
     * 5. Metrics & Event Emits
     */
    tick() {
        this.timeStep++;

        // 1. Task Allocation Round (CBBA)
        if (this.enabledAlgorithms.cbba) {
            // Auto-replenish queue if low
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

            // Check if robot just completed its dropoff
            if (robot.taskPhase === 'COMPLETED' && robot.currentTask) {
                const task = robot.currentTask;
                task.state = TaskState.COMPLETED;
                this.metrics.completedTasks++;
                this.emitLog('TASK', `Task ${task.id} (${task.name}) successfully delivered to ${task.dropoff.name} by ${robot.id}.`);
                robot.currentTask = null;
                robot.taskPhase = null;
                robot.state = RobotState.IDLE;
                this.updateActiveTasksCount();
            }

            // Check if robot battery critical -> Send to charger
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

    runCBBAAllocation() {
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
                        this.emitLog('CBBA', `Auction Consensus: Task ${task.id} awarded to ${robot.id} (Cost bid evaluated across ${result.rounds} rounds).`);
                    }
                });
            }
        }
    }

    runCBSPlanning() {
        const agentsNeedingPath = [];

        this.robots.forEach(robot => {
            if (robot.state === RobotState.OFFLINE) return;

            // Route to Pickup
            if (robot.taskPhase === 'NEEDS_PICKUP_PATH' && robot.currentTask) {
                agentsNeedingPath.push({
                    id: robot.id,
                    start: { x: Math.round(robot.x), y: Math.round(robot.y) },
                    goal: robot.currentTask.pickup,
                    phase: 'TO_PICKUP',
                    startTime: this.timeStep
                });
            }
            // Route from Pickup to Dropoff
            else if (robot.taskPhase === 'READY_FOR_DROPOFF' && robot.currentTask) {
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

            // Update average response latency
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
                    this.emitLog('A_STAR', `${robot.id} trajectory locked: ${path.length} waypoints to ${agent.phase === 'TO_PICKUP' ? robot.currentTask.pickup.name : robot.currentTask.dropoff.name}.`);
                }
            });
        }
    }

    routeToCharger(robot) {
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

    updateActiveTasksCount() {
        this.metrics.activeTasks = this.tasks.filter(t => t.state !== TaskState.COMPLETED).length;
    }

    // ==========================================
    // DYNAMIC EVENT INJECTORS
    // ==========================================

    injectNewTask(priority = TaskPriority.HIGH) {
        const id = `T0${this.taskCounter++}`;
        const rackIndex = Math.floor(Math.random() * this.warehouse.racks.length);
        const rack = this.warehouse.racks[rackIndex];
        const outStations = this.warehouse.stations.outbound;
        const drop = outStations[Math.floor(Math.random() * outStations.length)];

        // Get adjacent walkable spot for pickup
        const pickupSpot = this.warehouse.getClosestWalkableCell(rack.x, rack.y);

        const newTask = {
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

    triggerRobotFailure(robotId = 'R3') {
        const robot = this.robots.find(r => r.id === robotId);
        if (!robot) return false;

        const failedTask = robot.triggerFailure();
        this.emitLog('FAULT', `⚠ HARDWARE ALERT: ${robot.id} OFFLINE! Drive telemetry lost.`);

        if (failedTask) {
            failedTask.state = TaskState.UNASSIGNED;
            failedTask.assignedRobot = null;
            this.emitLog('FAULT', `Task ${failedTask.id} orphaned by ${robot.id}. Re-injected into CBBA global auction pool.`);
        }

        // Force all active paths to recheck constraints around stranded robot
        this.warehouse.addDynamicObstacle(Math.round(robot.x), Math.round(robot.y), `Stranded ${robot.id}`);
        this.metrics.replansExecuted++;
        this.emitTelemetry();
        return true;
    }

    triggerLowBattery(robotId = 'R2') {
        const robot = this.robots.find(r => r.id === robotId);
        if (!robot) return false;

        const abandonedTask = robot.triggerLowBattery();
        this.emitLog('POWER', `⚡ BATTERY WARNING: ${robot.id} critical battery level (8.5%). Initiating emergency abort.`);

        if (abandonedTask) {
            abandonedTask.state = TaskState.UNASSIGNED;
            abandonedTask.assignedRobot = null;
            this.emitLog('CBBA', `Task ${abandonedTask.id} returned to auction pool for immediate reallocation.`);
        }

        this.routeToCharger(robot);
        this.emitTelemetry();
        return true;
    }

    blockAisle(x = 8, y = 8) {
        // Drop dynamic obstacle at a high-traffic intersection
        const obs = this.warehouse.addDynamicObstacle(x, y, 'Fallen Pallet / Spill');
        this.emitLog('DYNAMIC', `🚧 DYNAMIC OBSTACLE DETECTED at aisle intersection (${x}, ${y}). Invalidating intersecting trajectories.`);

        // Force robots crossing this cell to replan
        let replannedAny = false;
        this.robots.forEach(robot => {
            if (robot.path && robot.path.some(pt => pt.x === x && pt.y === y)) {
                this.emitLog('CBS', `${robot.id} route obstructed by barrier. Triggering instant CBS + A* detour replan.`);
                robot.path = [];
                robot.pathIndex = 0;
                if (robot.taskPhase === 'TO_PICKUP') robot.taskPhase = 'NEEDS_PICKUP_PATH';
                if (robot.taskPhase === 'TO_DROPOFF') robot.taskPhase = 'READY_FOR_DROPOFF';
                replannedAny = true;
            }
        });

        this.metrics.replansExecuted++;
        this.emitTelemetry();
        return obs;
    }

    clearObstacles() {
        this.warehouse.clearDynamicObstacles();
        this.emitLog('DYNAMIC', 'Dynamic aisle obstructions cleared. Highway lanes restored.');
        this.emitTelemetry();
    }

    recoverRobot(robotId = 'R3') {
        const robot = this.robots.find(r => r.id === robotId);
        if (!robot) return;
        this.warehouse.removeDynamicObstacle(Math.round(robot.x), Math.round(robot.y));
        robot.recover();
        this.emitLog('SYSTEM', `${robot.id} diagnostic passed. Robot returned to active operational pool.`);
        this.emitTelemetry();
    }

    // ==========================================
    // EVENT SUBSCRIPTION
    // ==========================================

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emitLog(category, message) {
        const entry = {
            id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            timestamp: new Date().toLocaleTimeString(),
            category,
            message
        };
        this.listeners.log.forEach(cb => cb(entry));
    }

    emitTelemetry() {
        this.listeners.telemetry.forEach(cb => cb(this.metrics, this.robots, this.tasks));
    }

    emitTick() {
        this.listeners.tick.forEach(cb => cb(this));
    }

    selectRobot(robotId) {
        this.selectedRobotId = robotId;
        const robot = this.robots.find(r => r.id === robotId);
        this.listeners.robotSelected.forEach(cb => cb(robot));
    }
}
