// ROBOMESS - Simulation Type Definitions and Constants

export const RobotState = {
    IDLE: 'IDLE',
    BIDDING: 'BIDDING',
    MOVING: 'MOVING',
    PICKUP: 'PICKUP',
    DROPOFF: 'DROPOFF',
    WAITING: 'WAITING',
    REPLANNING: 'REPLANNING',
    CHARGING: 'CHARGING',
    LOW_BATTERY: 'LOW_BATTERY',
    OFFLINE: 'OFFLINE'
};

export const TaskState = {
    UNASSIGNED: 'UNASSIGNED',
    BIDDING: 'BIDDING',
    ASSIGNED: 'ASSIGNED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};

export const TaskPriority = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    CRITICAL: 5
};

export const ConflictType = {
    VERTEX: 'VERTEX',   // Two robots at same (x, y) at time t
    EDGE: 'EDGE'        // Two robots swapping positions between t and t+1
};

export const SIMULATION_CONFIG = {
    GRID_COLS: 28,
    GRID_ROWS: 18,
    CELL_SIZE: 34, // Pixels per cell in renderer
    DEFAULT_SPEED: 1.0,
    TICK_INTERVAL_MS: 120, // Base simulation tick rate
    ROBOT_RADIUS: 0.42, // In grid cell units
    SAFETY_MARGIN: 0.65, // In grid cell units
    SENSOR_RANGE: 3.5, // Grid cells
    BATTERY_DRAIN_PER_MOVE: 0.08,
    BATTERY_CHARGE_PER_TICK: 0.6,
    BATTERY_CRITICAL_THRESHOLD: 18.0
};
