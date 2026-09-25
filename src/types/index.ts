// ROBOMESS - Complete TypeScript Type Definitions & Interfaces

export enum RobotState {
    IDLE = 'IDLE',
    BIDDING = 'BIDDING',
    MOVING = 'MOVING',
    PICKUP = 'PICKUP',
    DROPOFF = 'DROPOFF',
    WAITING = 'WAITING',
    REPLANNING = 'REPLANNING',
    CHARGING = 'CHARGING',
    LOW_BATTERY = 'LOW_BATTERY',
    OFFLINE = 'OFFLINE'
}

export enum TaskState {
    UNASSIGNED = 'UNASSIGNED',
    BIDDING = 'BIDDING',
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 5
}

export enum ConflictType {
    VERTEX = 'VERTEX', // Two robots at same (x, y) at time t
    EDGE = 'EDGE'      // Two robots swapping positions between t and t+1
}

export enum CameraMode {
    ISOMETRIC = 'ISOMETRIC',
    FOLLOW_AMR = 'FOLLOW_AMR',
    OVERHEAD_3D = 'OVERHEAD_3D',
    BAY_INSPECT = 'BAY_INSPECT'
}

export enum ViewMode {
    VIEW_2D = 'VIEW_2D',
    VIEW_3D = 'VIEW_3D',
    SPLIT = 'SPLIT'
}

export interface IVector2D {
    vx: number;
    vy: number;
}

export interface IPoint2D {
    x: number;
    y: number;
    name?: string;
}

export interface IWaypoint {
    x: number;
    y: number;
    t: number;
}

export interface ITask {
    id: string;
    name: string;
    pickup: IPoint2D;
    dropoff: IPoint2D;
    priority: TaskPriority;
    state: TaskState;
    weight: number;
    assignedRobot: string | null;
}

export interface IRobotStats {
    distanceTraveled: number;
    tasksCompleted: number;
    replansCount: number;
    orcaInterventions: number;
}

export interface IRobotConfig {
    id: string;
    name?: string;
    x: number;
    y: number;
    color?: string;
    battery?: number;
    heading?: number;
}

export interface IStation {
    id: string;
    name: string;
    x: number;
    y: number;
    type: 'INBOUND' | 'OUTBOUND' | 'CHARGING';
}

export interface IRack {
    id: string;
    x: number;
    y: number;
    code: string;
    cargo: boolean;
}

export interface IDynamicObstacle {
    id: string;
    x: number;
    y: number;
    label: string;
    timestamp: number;
}

export interface IConflictConstraint {
    robotId?: string;
    type: ConflictType;
    x?: number;
    y?: number;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    t: number;
}

export interface ICBSConflict {
    type: ConflictType;
    agent1: string;
    agent2: string;
    x?: number;
    y?: number;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    t: number;
}

export interface IORCAResult {
    safeVelocity: IVector2D;
    active: boolean;
    uVector: { ux: number; uy: number };
    neighborId: string | null;
}

export interface ICBBABidEntry {
    taskId: string;
    taskName: string;
    robotId: string;
    robotName: string;
    bid: number;
    distance: number;
    battery: number;
    priority: number;
}

export interface ICBBAResult {
    assignments: Map<string, ITask>;
    biddingMatrix: ICBBABidEntry[];
    rounds: number;
    timestamp?: number;
    converged?: boolean;
    status?: string;
}

export interface ISimulationMetrics {
    activeTasks: number;
    completedTasks: number;
    conflictsDetected: number;
    conflictsResolved: number;
    replansExecuted: number;
    avgResponseMs: number;
    fleetAvailability: string;
    totalDistance: number;
}

export interface ILogEntry {
    id: string;
    timestamp: string;
    category: string;
    message: string;
}

export interface ISimulationConfig {
    GRID_COLS: number;
    GRID_ROWS: number;
    CELL_SIZE: number;
    DEFAULT_SPEED: number;
    TICK_INTERVAL_MS: number;
    ROBOT_RADIUS: number;
    SAFETY_MARGIN: number;
    SENSOR_RANGE: number;
    BATTERY_DRAIN_PER_MOVE: number;
    BATTERY_CHARGE_PER_TICK: number;
    BATTERY_CRITICAL_THRESHOLD: number;
}

export const SIMULATION_CONFIG: ISimulationConfig = {
    GRID_COLS: 28,
    GRID_ROWS: 18,
    CELL_SIZE: 34,
    DEFAULT_SPEED: 1.0,
    TICK_INTERVAL_MS: 120,
    ROBOT_RADIUS: 0.42,
    SAFETY_MARGIN: 0.65,
    SENSOR_RANGE: 3.5,
    BATTERY_DRAIN_PER_MOVE: 0.08,
    BATTERY_CHARGE_PER_TICK: 0.6,
    BATTERY_CRITICAL_THRESHOLD: 18.0
};
