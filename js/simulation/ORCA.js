// ROBOMESS - Optimal Reciprocal Collision Avoidance (ORCA)
// Local Continuous-Time Collision Avoidance with Velocity Obstacles and Reciprocal Sharing

import { SIMULATION_CONFIG } from './types.js';

export class ORCAEngine {
    constructor(warehouse) {
        this.warehouse = warehouse;
        this.timeHorizon = 2.0; // Lookahead time horizon in seconds
        this.radius = SIMULATION_CONFIG.ROBOT_RADIUS;
        this.safetyMargin = SIMULATION_CONFIG.SAFETY_MARGIN;
    }

    /**
     * Compute safe collision-free velocity for a robot given its preferred velocity and nearby neighbors.
     * @param {Robot} robot - Agent A
     * @param {Array<Robot>} neighbors - Nearby AMRs within sensing horizon
     * @param {Object} preferredVelocity - { vx, vy } heading towards next waypoint
     * @returns {Object} { safeVelocity: { vx, vy }, active: boolean, uVector: { ux, uy }, neighborId: string|null }
     */
    computeSafeVelocity(robot, neighbors, preferredVelocity) {
        const vPref = { ...preferredVelocity };
        let safeVelocity = { ...preferredVelocity };
        let activeAvoidance = false;
        let uVector = { ux: 0, uy: 0 };
        let mostCriticalNeighbor = null;
        let minTimeToCollision = Infinity;

        const combinedRadius = this.radius * 2 + 0.25; // Combined footprint + buffer

        for (const other of neighbors) {
            if (other.id === robot.id || other.state === 'OFFLINE') continue;

            const dx = other.x - robot.x;
            const dy = other.y - robot.y;
            const dist = Math.hypot(dx, dy);

            // Only consider neighbors within sensory range
            if (dist > SIMULATION_CONFIG.SENSOR_RANGE) continue;

            // Relative velocity
            const vRelX = robot.velocity.vx - other.velocity.vx;
            const vRelY = robot.velocity.vy - other.velocity.vy;

            // Velocity Obstacle (VO) analysis
            // Vector from robot to other
            const relPos = { x: dx, y: dy };

            // Check if already in critical proximity (penetration / near-collision)
            if (dist < combinedRadius) {
                activeAvoidance = true;
                mostCriticalNeighbor = other.id;

                // Push velocity directly away from other robot along normal
                const nx = dx / (dist || 0.001);
                const ny = dy / (dist || 0.001);

                // Perpendicular lateral push
                const perpX = -ny;
                const perpY = nx;

                safeVelocity.vx = -nx * 0.8 + perpX * 0.6;
                safeVelocity.vy = -ny * 0.8 + perpY * 0.6;
                uVector = { ux: safeVelocity.vx - vPref.vx, uy: safeVelocity.vy - vPref.vy };
                break;
            }

            // Time to closest approach (TTC)
            const vRelSpeedSq = vRelX * vRelX + vRelY * vRelY;
            if (vRelSpeedSq > 0.001) {
                const timeToClosest = -(relPos.x * vRelX + relPos.y * vRelY) / vRelSpeedSq;
                if (timeToClosest > 0 && timeToClosest < this.timeHorizon) {
                    const closestDistX = relPos.x + vRelX * timeToClosest;
                    const closestDistY = relPos.y + vRelY * timeToClosest;
                    const closestDist = Math.hypot(closestDistX, closestDistY);

                    if (closestDist < combinedRadius) {
                        // Trajectory leads to collision within time horizon!
                        activeAvoidance = true;
                        mostCriticalNeighbor = other.id;

                        // Calculate minimal evasion vector u to VO boundary
                        // Normal to relative position
                        const normalX = relPos.x / dist;
                        const normalY = relPos.y / dist;

                        // Lateral unit vector for smooth sidestepping
                        const lateralX = -normalY;
                        const lateralY = normalX;

                        // Decide detour side based on cross product (standard maritime / robotics rule: steer to right)
                        const cross = vPref.vx * lateralY - vPref.vy * lateralX;
                        const side = cross >= 0 ? 1 : -1;

                        const evasionMagnitude = ((combinedRadius - closestDist) / timeToClosest) * 0.85;

                        // Reciprocal 1/2 responsibility: each robot takes 50% of the evasion vector
                        const halfU_X = lateralX * side * evasionMagnitude * 0.5;
                        const halfU_Y = lateralY * side * evasionMagnitude * 0.5;

                        uVector = { ux: halfU_X, uy: halfU_Y };
                        safeVelocity.vx = vPref.vx + halfU_X;
                        safeVelocity.vy = vPref.vy + halfU_Y;

                        minTimeToCollision = timeToClosest;
                    }
                }
            }
        }

        // Validate safeVelocity does not direct robot into a static rack or boundary
        if (activeAvoidance) {
            const probeX = Math.round(robot.x + safeVelocity.vx * 0.6);
            const probeY = Math.round(robot.y + safeVelocity.vy * 0.6);

            if (!this.warehouse.isWalkable(probeX, probeY)) {
                // If evasion would hit wall/rack, clamp or reverse lateral component
                safeVelocity.vx = vPref.vx * 0.4;
                safeVelocity.vy = vPref.vy * 0.4;
            }
        }

        // Normalize speed to robot maximum speed
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
