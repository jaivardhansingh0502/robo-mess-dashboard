// ROBOMESS - Warehouse Topology & Grid Management

import { SIMULATION_CONFIG } from './types.js';

export class Warehouse {
    constructor(cols = SIMULATION_CONFIG.GRID_COLS, rows = SIMULATION_CONFIG.GRID_ROWS) {
        this.cols = cols;
        this.rows = rows;
        this.grid = []; // 0 = walkable, 1 = static obstacle/rack, 2 = dynamic obstacle
        this.racks = [];
        this.stations = {
            inbound: [
                { id: 'P1', name: 'Inbound Bay North', x: 2, y: 4, type: 'INBOUND' },
                { id: 'P2', name: 'Inbound Bay South', x: 2, y: 12, type: 'INBOUND' }
            ],
            outbound: [
                { id: 'D1', name: 'Outbound Packing 01', x: 25, y: 4, type: 'OUTBOUND' },
                { id: 'D2', name: 'Outbound Shipping 02', x: 25, y: 12, type: 'OUTBOUND' }
            ],
            charging: [
                { id: 'C1', name: 'Fast-Charge Bay Alpha', x: 4, y: 16, type: 'CHARGING' },
                { id: 'C2', name: 'Fast-Charge Bay Beta', x: 23, y: 16, type: 'CHARGING' }
            ]
        };
        this.dynamicObstacles = new Map(); // key 'x,y' -> { id, x, y, timestamp, label }

        this.initGrid();
    }

    initGrid() {
        // Initialize blank grid
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

        // Create Rack Blocks (Shelves where pallets are stored)
        // Format: [xStart, yStart, width, height, rackCode]
        const rackConfigs = [
            // Block 1 (West Column)
            { x: 6, y: 3, w: 2, h: 4, code: 'A' },
            { x: 6, y: 9, w: 2, h: 4, code: 'B' },
            // Block 2 (Central West)
            { x: 11, y: 3, w: 2, h: 4, code: 'C' },
            { x: 11, y: 9, w: 2, h: 4, code: 'D' },
            // Block 3 (Central East)
            { x: 16, y: 3, w: 2, h: 4, code: 'E' },
            { x: 16, y: 9, w: 2, h: 4, code: 'F' },
            // Block 4 (East Column)
            { x: 21, y: 3, w: 2, h: 4, code: 'G' },
            { x: 21, y: 9, w: 2, h: 4, code: 'H' }
        ];

        this.racks = [];
        rackConfigs.forEach((cfg) => {
            let slotIndex = 1;
            for (let r = 0; r < cfg.h; r++) {
                for (let c = 0; c < cfg.w; c++) {
                    const gx = cfg.x + c;
                    const gy = cfg.y + r;
                    this.grid[gy][gx] = 1; // Mark static rack
                    this.racks.push({
                        id: `${cfg.code}${slotIndex++}`,
                        x: gx,
                        y: gy,
                        code: cfg.code,
                        cargo: Math.random() > 0.25 // 75% occupied
                    });
                }
            }
        });
    }

    isWithinBounds(x, y) {
        return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
    }

    isWalkable(x, y) {
        if (!this.isWithinBounds(x, y)) return false;
        // 0 = walkable aisle, 1 = rack, 2 = dynamic obstacle
        return this.grid[y][x] === 0;
    }

    addDynamicObstacle(x, y, label = 'Maintenance Barrier') {
        if (!this.isWithinBounds(x, y)) return false;
        const key = `${x},${y}`;
        this.grid[y][x] = 2; // Dynamic obstacle
        const obstacle = {
            id: `OBS_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            x,
            y,
            label,
            timestamp: Date.now()
        };
        this.dynamicObstacles.set(key, obstacle);
        return obstacle;
    }

    removeDynamicObstacle(x, y) {
        const key = `${x},${y}`;
        if (this.dynamicObstacles.has(key)) {
            this.grid[y][x] = 0;
            this.dynamicObstacles.delete(key);
            return true;
        }
        return false;
    }

    clearDynamicObstacles() {
        for (const [key, obs] of this.dynamicObstacles) {
            this.grid[obs.y][obs.x] = 0;
        }
        this.dynamicObstacles.clear();
    }

    getClosestWalkableCell(x, y) {
        if (this.isWalkable(x, y)) return { x, y };
        // Search adjacent 4-neighborhood
        const neighbors = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 }
        ];
        for (const n of neighbors) {
            if (this.isWalkable(n.x, n.y)) return n;
        }
        return { x: Math.max(0, Math.min(this.cols - 1, x)), y: Math.max(0, Math.min(this.rows - 1, y)) };
    }

    getChargingStation(index = 0) {
        const docks = this.stations.charging;
        return docks[index % docks.length];
    }
}
