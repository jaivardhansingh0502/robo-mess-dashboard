// ROBOMESS - Optimal Reciprocal Collision Avoidance (ORCA) in TypeScript

import { Warehouse } from './Warehouse.js';
import { Robot } from './Robot.js';
import { SIMULATION_CONFIG, IVector2D, IORCAResult } from '../types/index.js';

export class ORCAEngine {
    private warehouse: Warehouse;
    public timeHorizon: number = 2.0;
    public radius: number = SIMULATION_CONFIG.ROBOT_RADIUS;
    public safetyMargin: number = SIMULATION_CONFIG.SAFETY_MARGIN;

    constructor(warehouse: Warehouse) {
        this.warehouse = warehouse;
    }

    public computeSafeVelocity(robot: Robot, neighbors: Robot[], preferredVelocity: IVector2D): IORCAResult {
        const vPref: IVector2D = { ...preferredVelocity };
        const safeVelocity: IVector2D = { ...preferredVelocity };
        let activeAvoidance = false;
        let uVector = { ux: 0, uy: 0 };
        let mostCriticalNeighbor: string | null = null;

        const combinedRadius = this.radius * 2 + 0.25;

        for (const other of neighbors) {
            if (other.id === robot.id || other.state === 'OFFLINE') continue;

            const dx = other.x - robot.x;
            const dy = other.y - robot.y;
            const dist = Math.hypot(dx, dy);

            if (dist > SIMULATION_CONFIG.SENSOR_RANGE) continue;

            const vRelX = robot.velocity.vx - other.velocity.vx;
            const vRelY = robot.velocity.vy - other.velocity.vy;
            const relPos = { x: dx, y: dy };

            if (dist < combinedRadius) {
                activeAvoidance = true;
                mostCriticalNeighbor = other.id;

                const nx = dx / (dist || 0.001);
                const ny = dy / (dist || 0.001);
                const perpX = -ny;
                const perpY = nx;

                safeVelocity.vx = -nx * 0.8 + perpX * 0.6;
                safeVelocity.vy = -ny * 0.8 + perpY * 0.6;
                uVector = { ux: safeVelocity.vx - vPref.vx, uy: safeVelocity.vy - vPref.vy };
                break;
            }

            const vRelSpeedSq = vRelX * vRelX + vRelY * vRelY;
            if (vRelSpeedSq > 0.001) {
                const timeToClosest = -(relPos.x * vRelX + relPos.y * vRelY) / vRelSpeedSq;
                if (timeToClosest > 0 && timeToClosest < this.timeHorizon) {
                    const closestDistX = relPos.x + vRelX * timeToClosest;
                    const closestDistY = relPos.y + vRelY * timeToClosest;
                    const closestDist = Math.hypot(closestDistX, closestDistY);

                    if (closestDist < combinedRadius) {
                        activeAvoidance = true;
                        mostCriticalNeighbor = other.id;

                        const normalX = relPos.x / dist;
                        const normalY = relPos.y / dist;
                        const lateralX = -normalY;
                        const lateralY = normalX;

                        const cross = vPref.vx * lateralY - vPref.vy * lateralX;
                        const side = cross >= 0 ? 1 : -1;

                        const evasionMagnitude = ((combinedRadius - closestDist) / timeToClosest) * 0.85;
                        const halfU_X = lateralX * side * evasionMagnitude * 0.5;
                        const halfU_Y = lateralY * side * evasionMagnitude * 0.5;

                        uVector = { ux: halfU_X, uy: halfU_Y };
                        safeVelocity.vx = vPref.vx + halfU_X;
                        safeVelocity.vy = vPref.vy + halfU_Y;
                    }
                }
            }
        }

        if (activeAvoidance) {
            const probeX = Math.round(robot.x + safeVelocity.vx * 0.6);
            const probeY = Math.round(robot.y + safeVelocity.vy * 0.6);

            if (!this.warehouse.isWalkable(probeX, probeY)) {
                safeVelocity.vx = vPref.vx * 0.4;
                safeVelocity.vy = vPref.vy * 0.4;
            }
        }

        const speed = Math.hypot(safeVelocity.vx, safeVelocity.vy);
        const maxSpeed = 1.0;
        if (speed > maxSpeed) {
            safeVelocity.vx = (safeVelocity.vx / speed) * maxSpeed;
            safeVelocity.vy = (safeVelocity.vy / speed) * maxSpeed;
        }

        return {
            safeVelocity,
            active: activeAvoidance,
            uVector,
            neighborId: mostCriticalNeighbor
        };
    }
}
