// ROBOMESS - Consensus-Based Bundle Algorithm (CBBA)
// Decentralized Multi-Robot Task Allocation with Auction & Consensus Rounds

export class CBBAEngine {
    constructor() {
        this.history = [];
        this.lastResult = null;
    }

    /**
     * Run full CBBA auction across active robots for pending tasks.
     * @param {Array<Robot>} robots - Active AMRs
     * @param {Array<Task>} tasks - Pending warehouse tasks
     * @returns {Object} { assignments, biddingMatrix, rounds, telemetry }
     */
    allocateTasks(robots, tasks) {
        const activeRobots = robots.filter(r => r.state !== 'OFFLINE' && r.battery > 15);
        const unassignedTasks = tasks.filter(t => t.state === 'UNASSIGNED' || t.state === 'BIDDING');

        if (activeRobots.length === 0 || unassignedTasks.length === 0) {
            return {
                assignments: new Map(),
                biddingMatrix: [],
                rounds: 0,
                status: 'IDLE_OR_NO_TASKS'
            };
        }

        // Initialize CBBA state per robot
        // winningBids[robotId][taskId]
        const winningBids = new Map();
        // winningAgents[robotId][taskId]
        const winningAgents = new Map();
        // bundles[robotId] = array of taskIds
        const bundles = new Map();

        activeRobots.forEach(r => {
            winningBids.set(r.id, new Map());
            winningAgents.set(r.id, new Map());
            bundles.set(r.id, [...(r.bundle || [])]);

            unassignedTasks.forEach(t => {
                winningBids.get(r.id).set(t.id, 0);
                winningAgents.get(r.id).set(t.id, null);
            });
        });

        const biddingMatrix = [];
        let converged = false;
        let rounds = 0;
        const maxRounds = 10;

        while (!converged && rounds < maxRounds) {
            rounds++;
            let changedThisRound = false;

            // Phase 1: Bundle Construction (Local Bidding)
            activeRobots.forEach(robot => {
                const rBundle = bundles.get(robot.id);
                const rBids = winningBids.get(robot.id);
                const rAgents = winningAgents.get(robot.id);

                unassignedTasks.forEach(task => {
                    // Skip if already in this robot's bundle
                    if (rBundle.includes(task.id)) return;

                    // Calculate marginal bid score for this robot on this task
                    const bidScore = this.calculateBidScore(robot, task, rBundle.length);

                    // Record bid for visual telemetry
                    if (rounds === 1) {
                        biddingMatrix.push({
                            taskId: task.id,
                            taskName: task.name,
                            robotId: robot.id,
                            robotName: robot.name,
                            bid: Number(bidScore.toFixed(2)),
                            distance: Number(this.euclideanDistance(robot.x, robot.y, task.pickup.x, task.pickup.y).toFixed(1)),
                            battery: robot.battery,
                            priority: task.priority
                        });
                    }

                    const currentHighBid = rBids.get(task.id) || 0;

                    if (bidScore > currentHighBid) {
                        // Robot outbids current winner
                        rBids.set(task.id, bidScore);
                        rAgents.set(task.id, robot.id);
                        rBundle.push(task.id);
                        changedThisRound = true;
                    }
                });
            });

            // Phase 2: Consensus (Peer-to-Peer State Exchange)
            // Robots share winning bids and resolve conflicts
            for (let i = 0; i < activeRobots.length; i++) {
                for (let j = 0; j < activeRobots.length; j++) {
                    if (i === j) continue;
                    const rA = activeRobots[i];
                    const rB = activeRobots[j];

                    unassignedTasks.forEach(task => {
                        const bidA = winningBids.get(rA.id).get(task.id) || 0;
                        const bidB = winningBids.get(rB.id).get(task.id) || 0;
                        const agentB = winningAgents.get(rB.id).get(task.id);

                        if (bidB > bidA) {
                            // Robot A adopts Robot B's winning bid
                            winningBids.get(rA.id).set(task.id, bidB);
                            winningAgents.get(rA.id).set(task.id, agentB);

                            // If Robot A had this task in its bundle, it must drop it and subsequent tasks
                            const bundleA = bundles.get(rA.id);
                            const dropIdx = bundleA.indexOf(task.id);
                            if (dropIdx !== -1) {
                                bundleA.splice(dropIdx, bundleA.length - dropIdx);
                                changedThisRound = true;
                            }
                        }
                    });
                }
            }

            if (!changedThisRound) {
                converged = true;
            }
        }

        // Extract Final Winning Assignments
        const finalAssignments = new Map(); // robotId -> Task
        const assignedTaskIds = new Set();

        activeRobots.forEach(robot => {
            const rAgents = winningAgents.get(robot.id);
            unassignedTasks.forEach(task => {
                if (rAgents.get(task.id) === robot.id && !assignedTaskIds.has(task.id)) {
                    finalAssignments.set(robot.id, task);
                    assignedTaskIds.add(task.id);
                }
            });
        });

        this.lastResult = {
            assignments: finalAssignments,
            biddingMatrix,
            rounds,
            timestamp: Date.now(),
            converged
        };

        this.history.unshift(this.lastResult);
        if (this.history.length > 20) this.history.pop();

        return this.lastResult;
    }

    /**
     * Compute mathematical bid score:
     * c_ij = Priority * exp(-lambda * distance) * (battery / 100) * (1 / (1 + workload))
     */
    calculateBidScore(robot, task, currentBundleSize) {
        const dist = this.euclideanDistance(robot.x, robot.y, task.pickup.x, task.pickup.y);
        const lambda = 0.07; // Distance decay factor
        const distanceFactor = Math.exp(-lambda * dist);
        const batteryFactor = Math.max(0.1, robot.battery / 100);
        const workloadPenalty = 1 / (1 + currentBundleSize * 0.45);
        const priorityWeight = task.priority * 8.5;

        const score = priorityWeight * distanceFactor * batteryFactor * workloadPenalty;
        return Math.max(0.1, score);
    }

    euclideanDistance(x1, y1, x2, y2) {
        return Math.hypot(x1 - x2, y1 - y2);
    }
}
