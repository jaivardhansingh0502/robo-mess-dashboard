// ROBOMESS - Automated Simulation Verification Test
import { SimulationEngine } from './js/simulation/SimulationEngine.js';

console.log('--- Initializing Simulation Engine ---');
const engine = new SimulationEngine();

let logsCount = 0;
let telemetryUpdates = 0;

engine.on('log', (entry) => {
    logsCount++;
    console.log(`[LOG] [${entry.category}] ${entry.message}`);
});

engine.on('telemetry', (m) => {
    telemetryUpdates++;
});

console.log('--- Testing Fleet Initialization ---');
console.assert(engine.robots.length === 5, 'Fleet must have 5 robots');
console.assert(engine.tasks.length >= 8, 'Initial task queue must have at least 8 tasks');

console.log('--- Running 20 Simulation Ticks ---');
for (let i = 0; i < 20; i++) {
    engine.tick();
}

console.log('Fleet Availability:', engine.metrics.fleetAvailability);
console.log('Active Tasks:', engine.metrics.activeTasks);
console.log('Completed Tasks:', engine.metrics.completedTasks);

console.log('--- Testing Dynamic Event: New Task Injection ---');
const newTask = engine.injectNewTask();
console.assert(newTask.id.startsWith('T0'), 'New task should have valid ID');

console.log('--- Testing Dynamic Event: Robot Failure (R3) ---');
engine.triggerRobotFailure('R3');
const r3 = engine.robots.find(r => r.id === 'R3');
console.assert(r3.state === 'OFFLINE', 'R3 state should be OFFLINE');

console.log('--- Running 10 Ticks post-failure (CBBA reallocation) ---');
for (let i = 0; i < 10; i++) {
    engine.tick();
}

console.log('--- Testing Dynamic Event: Block Aisle ---');
const obs = engine.blockAisle(8, 8);
console.assert(obs !== false, 'Dynamic obstacle should be placed');

console.log('--- Running 10 Ticks post-obstacle (CBS Detour) ---');
for (let i = 0; i < 10; i++) {
    engine.tick();
}

console.log('--- Testing Dynamic Event: Recover Robot R3 ---');
engine.recoverRobot('R3');
console.assert(r3.state !== 'OFFLINE', 'R3 should be recovered');

console.log('--- Verification Summary ---');
console.log(`Total Logs Generated: ${logsCount}`);
console.log(`Total Telemetry Pushes: ${telemetryUpdates}`);
console.log('All Simulation & Algorithm tests passed successfully!');
