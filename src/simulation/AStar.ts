// ROBOMESS - Space-Time A* Multi-Agent Pathfinding Algorithm (TypeScript)

import { Warehouse } from './Warehouse.js';
import { IWaypoint, IPoint2D, IConflictConstraint, ConflictType } from '../types/index.js';

interface IAStarNode {
    x: number;
    y: number;
    t: number;
    g: number;
    h: number;
    f: number;
    parent: IAStarNode | null;
}

export class SpaceTimeAStar {
    private warehouse: Warehouse;

    constructor(warehouse: Warehouse) {
        this.warehouse = warehouse;
    }

    public findPath(
        start: IPoint2D,
        goal: IPoint2D,
        startTime: number = 0,
        constraints: IConflictConstraint[] = [],
        reservationTable: Map<string, string> | null = null,
        robotId: string = '',
        maxHorizon: number = 120
    ): IWaypoint[] | null {
        let targetGoal = goal;
        if (!this.warehouse.isWalkable(targetGoal.x, targetGoal.y)) {
            targetGoal = this.warehouse.getClosestWalkableCell(targetGoal.x, targetGoal.y);
        }

        const constraintSet = this.buildConstraintSet(constraints, robotId);
        const openSet: IAStarNode[] = [];
        const closedSet = new Set<string>();

        const startNode: IAStarNode = {
            x: start.x,
            y: start.y,
            t: startTime,
            g: 0,
            h: this.heuristic(start.x, start.y, targetGoal.x, targetGoal.y),
            f: this.heuristic(start.x, start.y, targetGoal.x, targetGoal.y),
            parent: null
        };

        openSet.push(startNode);

        const movements = [
            { dx: 0, dy: -1, cost: 1 },  // North
            { dx: 0, dy: 1, cost: 1 },   // South
            { dx: 1, dy: 0, cost: 1 },   // East
            { dx: -1, dy: 0, cost: 1 },  // West
            { dx: 0, dy: 0, cost: 1.1 }  // Wait
        ];

        while (openSet.length > 0) {
            let bestIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[bestIndex].f ||
                   (openSet[i].f === openSet[bestIndex].f && openSet[i].h < openSet[bestIndex].h)) {
                    bestIndex = i;
                }
            }
            const current = openSet.splice(bestIndex, 1)[0];

            if (current.x === targetGoal.x && current.y === targetGoal.y) {
                return this.reconstructPath(current);
            }

            const stateKey = `${current.x},${current.y},${current.t}`;
            if (closedSet.has(stateKey)) continue;
            closedSet.add(stateKey);

            if (current.t - startTime >= maxHorizon) {
                return this.reconstructPath(current);
            }

            for (const move of movements) {
                const nx = current.x + move.dx;
                const ny = current.y + move.dy;
                const nt = current.t + 1;

                if (!this.warehouse.isWalkable(nx, ny)) continue;
                if (this.isConstrained(current.x, current.y, nx, ny, nt, constraintSet)) continue;
                if (reservationTable && this.isReserved(current.x, current.y, nx, ny, nt, reservationTable, robotId)) continue;

                const nextStateKey = `${nx},${ny},${nt}`;
                if (closedSet.has(nextStateKey)) continue;

                const tentativeG = current.g + move.cost;
                const h = this.heuristic(nx, ny, targetGoal.x, targetGoal.y);
                const f = tentativeG + h;

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

        return null;
    }

    private heuristic(x1: number, y1: number, x2: number, y2: number): number {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        return (dx + dy) * 1.001;
    }

    private buildConstraintSet(constraints: IConflictConstraint[], robotId: string): { vertexMap: Set<string>; edgeMap: Set<string> } {
        const vertexMap = new Set<string>();
        const edgeMap = new Set<string>();

        for (const c of constraints) {
            if (c.robotId === robotId || !c.robotId) {
                if (c.type === ConflictType.VERTEX && c.x !== undefined && c.y !== undefined) {
                    vertexMap.add(`${c.x},${c.y},${c.t}`);
                } else if (c.type === ConflictType.EDGE && c.fromX !== undefined && c.toX !== undefined) {
                    edgeMap.add(`${c.fromX},${c.fromY}->${c.toX},${c.toY},${c.t}`);
                }
            }
        }
        return { vertexMap, edgeMap };
    }

    private isConstrained(currX: number, currY: number, nextX: number, nextY: number, nextT: number, constraintSet: { vertexMap: Set<string>; edgeMap: Set<string> }): boolean {
        if (constraintSet.vertexMap.has(`${nextX},${nextY},${nextT}`)) return true;
        if (constraintSet.edgeMap.has(`${currX},${currY}->${nextX},${nextY},${nextT}`)) return true;
        return false;
    }

    private isReserved(currX: number, currY: number, nextX: number, nextY: number, nextT: number, reservationTable: Map<string, string>, myId: string): boolean {
        const resVertex = reservationTable.get(`${nextX},${nextY},${nextT}`);
        if (resVertex && resVertex !== myId) return true;

        const resEdge = reservationTable.get(`${nextX},${nextY}->${currX},${currY},${nextT}`);
        if (resEdge && resEdge !== myId) return true;

        return false;
    }

    private reconstructPath(node: IAStarNode): IWaypoint[] {
        const path: IWaypoint[] = [];
        let curr: IAStarNode | null = node;
        while (curr) {
            path.unshift({ x: curr.x, y: curr.y, t: curr.t });
            curr = curr.parent;
        }
        return path;
    }
}
