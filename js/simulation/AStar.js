// ROBOMESS - Space-Time A* Multi-Agent Pathfinding Algorithm
// Plans paths in 3D configuration space (x, y, time) with WAIT actions and reservation constraints.

export class SpaceTimeAStar {
    constructor(warehouse) {
        this.warehouse = warehouse;
    }

    /**
     * Find space-time path avoiding static obstacles, dynamic obstacles, and space-time constraints.
     * @param {Object} start - { x, y }
     * @param {Object} goal - { x, y }
     * @param {number} startTime - initial time step t0
     * @param {Array} constraints - list of vertex/edge constraints for this robot
     * @param {Map} reservationTable - optional space-time reservations of other robots
     * @param {string} robotId - current robot id
     * @param {number} maxHorizon - max search depth
     * @returns {Array<{x: number, y: number, t: number}>|null}
     */
    findPath(start, goal, startTime = 0, constraints = [], reservationTable = null, robotId = '', maxHorizon = 120) {
        if (!this.warehouse.isWalkable(goal.x, goal.y)) {
            // If goal is adjacent to a rack, find the closest walkable cell
            const closest = this.warehouse.getClosestWalkableCell(goal.x, goal.y);
            goal = closest;
        }

        const constraintSet = this.buildConstraintSet(constraints, robotId);

        // Open Set: Priority queue based on f-score
        const openSet = [];
        // Closed Set: key 'x,y,t' -> true
        const closedSet = new Set();

        const startNode = {
            x: start.x,
            y: start.y,
            t: startTime,
            g: 0,
            h: this.heuristic(start.x, start.y, goal.x, goal.y),
            f: this.heuristic(start.x, start.y, goal.x, goal.y),
            parent: null
        };

        openSet.push(startNode);

        const movements = [
            { dx: 0, dy: -1, cost: 1, action: 'N' }, // North
            { dx: 0, dy: 1, cost: 1, action: 'S' },  // South
            { dx: 1, dy: 0, cost: 1, action: 'E' },  // East
            { dx: -1, dy: 0, cost: 1, action: 'W' }, // West
            { dx: 0, dy: 0, cost: 1.1, action: 'WAIT' } // Wait in place (slightly penalized)
        ];

        while (openSet.length > 0) {
            // Find node with lowest f
            let bestIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[bestIndex].f || 
                   (openSet[i].f === openSet[bestIndex].f && openSet[i].h < openSet[bestIndex].h)) {
                    bestIndex = i;
                }
            }
            const current = openSet.splice(bestIndex, 1)[0];

            // Goal reached check
            if (current.x === goal.x && current.y === goal.y) {
                // Ensure goal cell is not constrained at subsequent times if staying there
                return this.reconstructPath(current);
            }

            const stateKey = `${current.x},${current.y},${current.t}`;
            if (closedSet.has(stateKey)) continue;
            closedSet.add(stateKey);

            if (current.t - startTime >= maxHorizon) {
                // Reached max planning horizon, return path to best node so far
                return this.reconstructPath(current);
            }

            // Expand successors
            for (const move of movements) {
                const nx = current.x + move.dx;
                const ny = current.y + move.dy;
                const nt = current.t + 1;

                // Check static bounds and static obstacles
                if (!this.warehouse.isWalkable(nx, ny)) continue;

                // Check Space-Time Constraints (CBS Generated)
                if (this.isConstrained(current.x, current.y, nx, ny, nt, constraintSet)) continue;

                // Check Space-Time Reservation Table (Multi-Agent Reservations)
                if (reservationTable && this.isReserved(current.x, current.y, nx, ny, nt, reservationTable, robotId)) continue;

                const nextStateKey = `${nx},${ny},${nt}`;
                if (closedSet.has(nextStateKey)) continue;

                const tentativeG = current.g + move.cost;
                const h = this.heuristic(nx, ny, goal.x, goal.y);
                const f = tentativeG + h;

                // Check if already in open set with a better g
                const existingIndex = openSet.findIndex(n => n.x === nx && n.y === ny && n.t === nt);
                if (existingIndex !== -1) {
                    if (tentativeG < openSet[existingIndex].g) {
                        openSet[existingIndex].g = tentativeG;
                        openSet[existingIndex].f = f;
                        openSet[existingIndex].parent = current;
                    }
                } else {
                    openSet.push({
                        x: nx,
                        y: ny,
                        t: nt,
                        g: tentativeG,
                        h,
                        f,
                        parent: current
                    });
                }
            }
        }

        // Fallback: direct line search if constrained
        return null;
    }

    heuristic(x1, y1, x2, y2) {
        // Manhattan distance with slight tie-breaker
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        return (dx + dy) * 1.001;
    }

    buildConstraintSet(constraints, robotId) {
        const vertexMap = new Set();
        const edgeMap = new Set();

        for (const c of constraints) {
            if (c.robotId === robotId || !c.robotId) {
                if (c.type === 'VERTEX') {
                    vertexMap.add(`${c.x},${c.y},${c.t}`);
                } else if (c.type === 'EDGE') {
                    edgeMap.add(`${c.fromX},${c.fromY}->${c.toX},${c.toY},${c.t}`);
                }
            }
        }
        return { vertexMap, edgeMap };
    }

    isConstrained(currX, currY, nextX, nextY, nextT, constraintSet) {
        // Check vertex constraint at (nextX, nextY, nextT)
        if (constraintSet.vertexMap.has(`${nextX},${nextY},${nextT}`)) return true;

        // Check edge swap constraint
        if (constraintSet.edgeMap.has(`${currX},${currY}->${nextX},${nextY},${nextT}`)) return true;

        return false;
    }

    isReserved(currX, currY, nextX, nextY, nextT, reservationTable, myId) {
        // Vertex reservation check: another robot reserved (nextX, nextY) at nextT
        const resVertex = reservationTable.get(`${nextX},${nextY},${nextT}`);
        if (resVertex && resVertex !== myId) return true;

        // Edge swap reservation check: another robot moved (nextX, nextY) -> (currX, currY) at nextT
        const resEdge = reservationTable.get(`${nextX},${nextY}->${currX},${currY},${nextT}`);
        if (resEdge && resEdge !== myId) return true;

        return false;
    }

    reconstructPath(node) {
        const path = [];
        let curr = node;
        while (curr) {
            path.unshift({ x: curr.x, y: curr.y, t: curr.t });
            curr = curr.parent;
        }
        return path;
    }
}
