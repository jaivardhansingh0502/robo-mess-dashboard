// ROBOMESS - Conflict-Based Search (CBS) in TypeScript

import { SpaceTimeAStar } from './AStar.js';
import { Warehouse } from './Warehouse.js';
import { IWaypoint, IPoint2D, IConflictConstraint, ICBSConflict, ConflictType } from '../types/index.js';

interface ICBSAgentInput {
    id: string;
    start: IPoint2D;
    goal: IPoint2D;
    startTime?: number;
    phase?: string;
}

interface ICBSNode {
    constraints: IConflictConstraint[];
    paths: Map<string, IWaypoint[]>;
    cost: number;
}

export interface ICBSResult {
    paths: Map<string, IWaypoint[]>;
    conflictsResolved: number;
    conflictLog: Array<{
        type: ConflictType;
        agent1: string;
        agent2: string;
        location: string;
        timeStep: number;
        timestamp: number;
    }>;
}

export class CBSSolver {
    private warehouse: Warehouse;
    public astar: SpaceTimeAStar;
    public lastConflictLog: ICBSResult['conflictLog'] = [];

    constructor(warehouse: Warehouse) {
        this.warehouse = warehouse;
        this.astar = new SpaceTimeAStar(warehouse);
    }

    public planPaths(agents: ICBSAgentInput[]): ICBSResult {
        if (!agents || agents.length === 0) {
            return { paths: new Map(), conflictsResolved: 0, conflictLog: [] };
        }

        const conflictLog: ICBSResult['conflictLog'] = [];
        let conflictsResolved = 0;

        const root: ICBSNode = {
            constraints: [],
            paths: new Map(),
            cost: 0
        };

        for (const agent of agents) {
            const initialPath = this.astar.findPath(agent.start, agent.goal, agent.startTime || 0, [], null, agent.id);
            if (initialPath) {
                root.paths.set(agent.id, initialPath);
                root.cost += initialPath.length;
            } else {
                root.paths.set(agent.id, [{ x: agent.start.x, y: agent.start.y, t: agent.startTime || 0 }]);
            }
        }

        const openTree: ICBSNode[] = [root];
        const maxTreeIterations = 25;
        let iterations = 0;
        let bestNode: ICBSNode = root;

        while (openTree.length > 0 && iterations < maxTreeIterations) {
            iterations++;
            openTree.sort((a, b) => a.cost - b.cost);
            const currentNode = openTree.shift()!;
            bestNode = currentNode;

            const conflict = this.findFirstConflict(currentNode.paths);

            if (!conflict) {
                this.lastConflictLog = conflictLog;
                return {
                    paths: currentNode.paths,
                    conflictsResolved,
                    conflictLog
                };
            }

            conflictsResolved++;
            conflictLog.push({
                type: conflict.type,
                agent1: conflict.agent1,
                agent2: conflict.agent2,
                location: conflict.type === ConflictType.VERTEX
                    ? `(${conflict.x}, ${conflict.y})`
                    : `(${conflict.fromX},${conflict.fromY})->(${conflict.toX},${conflict.toY})`,
                timeStep: conflict.t,
                timestamp: Date.now()
            });

            // Branch 1
            const branch1Constraints = [...currentNode.constraints];
            if (conflict.type === ConflictType.VERTEX) {
                branch1Constraints.push({
                    robotId: conflict.agent1,
                    type: ConflictType.VERTEX,
                    x: conflict.x,
                    y: conflict.y,
                    t: conflict.t
                });
            } else {
                branch1Constraints.push({
                    robotId: conflict.agent1,
                    type: ConflictType.EDGE,
                    fromX: conflict.fromX,
                    fromY: conflict.fromY,
                    toX: conflict.toX,
                    toY: conflict.toY,
                    t: conflict.t
                });
            }

            const branch1Node = this.createBranchNode(currentNode, branch1Constraints, conflict.agent1, agents);
            if (branch1Node) openTree.push(branch1Node);

            // Branch 2
            const branch2Constraints = [...currentNode.constraints];
            if (conflict.type === ConflictType.VERTEX) {
                branch2Constraints.push({
                    robotId: conflict.agent2,
                    type: ConflictType.VERTEX,
                    x: conflict.x,
                    y: conflict.y,
                    t: conflict.t
                });
            } else {
                branch2Constraints.push({
                    robotId: conflict.agent2,
                    type: ConflictType.EDGE,
                    fromX: conflict.toX,
                    fromY: conflict.toY,
                    toX: conflict.fromX,
                    toY: conflict.fromY,
                    t: conflict.t
                });
            }

            const branch2Node = this.createBranchNode(currentNode, branch2Constraints, conflict.agent2, agents);
            if (branch2Node) openTree.push(branch2Node);
        }

        this.lastConflictLog = conflictLog;
        return {
            paths: bestNode.paths,
            conflictsResolved,
            conflictLog
        };
    }

    private findFirstConflict(pathsMap: Map<string, IWaypoint[]>): ICBSConflict | null {
        const agentIds = Array.from(pathsMap.keys());

        for (let i = 0; i < agentIds.length; i++) {
            for (let j = i + 1; j < agentIds.length; j++) {
                const id1 = agentIds[i];
                const id2 = agentIds[j];
                const p1 = pathsMap.get(id1);
                const p2 = pathsMap.get(id2);
                if (!p1 || !p2) continue;

                const maxLen = Math.max(p1.length, p2.length);

                for (let t = 0; t < maxLen; t++) {
                    const step1 = t < p1.length ? p1[t] : p1[p1.length - 1];
                    const step2 = t < p2.length ? p2[t] : p2[p2.length - 1];

                    if (step1.x === step2.x && step1.y === step2.y) {
                        return {
                            type: ConflictType.VERTEX,
                            agent1: id1,
                            agent2: id2,
                            x: step1.x,
                            y: step1.y,
                            t
                        };
                    }

                    if (t > 0 && t < p1.length && t < p2.length) {
                        const prev1 = p1[t - 1];
                        const prev2 = p2[t - 1];

                        if (prev1.x === step2.x && prev1.y === step2.y &&
                            step1.x === prev2.x && step1.y === prev2.y) {
                            return {
                                type: ConflictType.EDGE,
                                agent1: id1,
                                agent2: id2,
                                fromX: prev1.x,
                                fromY: prev1.y,
                                toX: step1.x,
                                toY: step1.y,
                                t
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    private createBranchNode(parentNode: ICBSNode, newConstraints: IConflictConstraint[], replanAgentId: string, agents: ICBSAgentInput[]): ICBSNode | null {
        const newPaths = new Map(parentNode.paths);
        const agent = agents.find(a => a.id === replanAgentId);
        if (!agent) return null;

        const replannedPath = this.astar.findPath(
            agent.start,
            agent.goal,
            agent.startTime || 0,
            newConstraints,
            null,
            replanAgentId
        );

        if (!replannedPath) {
            return null;
        }

        newPaths.set(replanAgentId, replannedPath);

        let totalCost = 0;
        for (const p of newPaths.values()) {
            totalCost += p.length;
        }

        return {
            constraints: newConstraints,
            paths: newPaths,
            cost: totalCost
        };
    }
}
