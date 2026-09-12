// ROBOMESS - High-Performance Multi-Layer Canvas 2D Warehouse Renderer
// Visualizes warehouse grid, storage racks, dynamic obstacles, AMRs, glowing paths, ORCA vectors, and LiDAR sweeps

import { SIMULATION_CONFIG, RobotState } from '../simulation/types.js';

export class WarehouseRenderer {
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;
        this.pulsePhase = 0;
        this.radarAngle = 0;
        this.cellSize = SIMULATION_CONFIG.CELL_SIZE;

        this.initCanvas();
        this.setupEventListeners();
    }

    initCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.engine.warehouse.cols * this.cellSize;
        const height = this.engine.warehouse.rows * this.cellSize;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.ctx.scale(dpr, dpr);
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (this.canvas.width / (rect.width * (window.devicePixelRatio || 1)));
            const mouseY = (e.clientY - rect.top) * (this.canvas.height / (rect.height * (window.devicePixelRatio || 1)));

            const gridX = Math.floor(mouseX / this.cellSize);
            const gridY = Math.floor(mouseY / this.cellSize);

            // Check if clicked near any robot
            for (const robot of this.engine.robots) {
                const rx = robot.x * this.cellSize + this.cellSize / 2;
                const ry = robot.y * this.cellSize + this.cellSize / 2;
                if (Math.hypot(mouseX - rx, mouseY - ry) < this.cellSize * 1.2) {
                    this.engine.selectRobot(robot.id);
                    return;
                }
            }

            // Click empty cell to place dynamic obstacle if shift key is pressed
            if (e.shiftKey && this.engine.warehouse.isWalkable(gridX, gridY)) {
                this.engine.blockAisle(gridX, gridY);
            }
        });
    }

    render() {
        const dpr = window.devicePixelRatio || 1;
        const ctx = this.ctx;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const w = this.engine.warehouse.cols * this.cellSize;
        const h = this.engine.warehouse.rows * this.cellSize;

        this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);
        this.radarAngle = (this.radarAngle + 0.04) % (Math.PI * 2);

        // 1. Clear & Background
        ctx.fillStyle = '#07090E';
        ctx.fillRect(0, 0, w, h);

        // 2. Technical Floor Grid
        this.drawFloorGrid(ctx, w, h);

        // 3. Stations (Inbound, Outbound, Charging)
        this.drawStations(ctx);

        // 4. Warehouse Storage Racks
        this.drawRacks(ctx);

        // 5. Dynamic Obstacles
        this.drawDynamicObstacles(ctx);

        // 6. Planned Robot Paths (with animated glowing pulses)
        if (this.engine.layerToggles.paths) {
            this.drawRobotPaths(ctx);
        }

        // 7. Sensor Horizon Sweeps & Collision Radii
        this.engine.robots.forEach(robot => {
            if (robot.state !== RobotState.OFFLINE) {
                if (this.engine.layerToggles.sensorRadius) {
                    this.drawSensorSweep(ctx, robot);
                }
                if (this.engine.layerToggles.collisionZones) {
                    this.drawCollisionZone(ctx, robot);
                }
            }
        });

        // 8. Robots
        this.engine.robots.forEach(robot => {
            this.drawRobot(ctx, robot);
        });

        // 9. Selected Robot Reticle
        const selected = this.engine.robots.find(r => r.id === this.engine.selectedRobotId);
        if (selected) {
            this.drawSelectionReticle(ctx, selected);
        }

        // 10. Velocity Vectors (ORCA Visualizer)
        if (this.engine.layerToggles.velocityVectors) {
            this.engine.robots.forEach(robot => {
                if (robot.state !== RobotState.OFFLINE && robot.state !== RobotState.IDLE) {
                    this.drawVelocityVectors(ctx, robot);
                }
            });
        }
    }

    drawFloorGrid(ctx, w, h) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= w; x += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        for (let y = 0; y <= h; y += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Major aisle highway markings
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.setLineDash([4, 6]);
        [8 * this.cellSize, 14 * this.cellSize, 20 * this.cellSize].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.restore();
    }

    drawStations(ctx) {
        const cs = this.cellSize;
        const st = this.engine.warehouse.stations;

        // Inbound Bays (Cyan tint)
        st.inbound.forEach(bay => {
            this.drawStationBox(ctx, bay.x * cs, bay.y * cs, cs * 1.8, cs * 1.8, '#00F0FF', 'INBOUND', bay.id);
        });

        // Outbound Bays (Orange/Amber tint)
        st.outbound.forEach(bay => {
            this.drawStationBox(ctx, bay.x * cs - cs * 0.8, bay.y * cs, cs * 1.8, cs * 1.8, '#FF9F0A', 'OUTBOUND', bay.id);
        });

        // Charging Docks (Emerald tint)
        st.charging.forEach(dock => {
            this.drawStationBox(ctx, dock.x * cs, dock.y * cs, cs * 2, cs * 1.4, '#00FF88', 'CHARGER', dock.id);
        });
    }

    drawStationBox(ctx, x, y, w, h, color, label, code) {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 15, 25, 0.7)';
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        // Corner brackets
        const bSize = 5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(x - 1, y - 1, bSize, bSize);
        ctx.strokeRect(x + w - bSize + 1, y - 1, bSize, bSize);
        ctx.strokeRect(x - 1, y + h - bSize + 1, bSize, bSize);
        ctx.strokeRect(x + w - bSize + 1, y + h - bSize + 1, bSize, bSize);

        // Station text
        ctx.fillStyle = color;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(code, x + 5, y + 14);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.fillText(label, x + 5, y + 25);
        ctx.restore();
    }

    drawRacks(ctx) {
        const cs = this.cellSize;
        ctx.save();

        this.engine.warehouse.racks.forEach(rack => {
            const rx = rack.x * cs;
            const ry = rack.y * cs;

            // Rack bay background
            ctx.fillStyle = '#0F1626';
            ctx.fillRect(rx + 2, ry + 2, cs - 4, cs - 4);

            // Metallic border
            ctx.strokeStyle = 'rgba(60, 90, 130, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(rx + 2, ry + 2, cs - 4, cs - 4);

            // Pallet cargo if present
            if (rack.cargo) {
                ctx.fillStyle = '#1A2942';
                ctx.fillRect(rx + 6, ry + 6, cs - 12, cs - 12);

                ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.strokeRect(rx + 6, ry + 6, cs - 12, cs - 12);

                // Tiny cargo status LED
                ctx.fillStyle = '#00FF66';
                ctx.beginPath();
                ctx.arc(rx + cs - 8, ry + 8, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Rack label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.fillText(rack.id, rx + 4, ry + cs - 4);
        });

        ctx.restore();
    }

    drawDynamicObstacles(ctx) {
        const cs = this.cellSize;
        ctx.save();

        this.engine.warehouse.dynamicObstacles.forEach(obs => {
            const ox = obs.x * cs;
            const oy = obs.y * cs;

            // Pulsing hazard box
            const pulse = 0.6 + Math.sin(this.pulsePhase * 2) * 0.3;
            ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.4})`;
            ctx.fillRect(ox + 2, oy + 2, cs - 4, cs - 4);

            ctx.strokeStyle = '#FF3344';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#FF3344';
            ctx.shadowBlur = 10;
            ctx.strokeRect(ox + 2, oy + 2, cs - 4, cs - 4);

            // Hazard cross
            ctx.beginPath();
            ctx.moveTo(ox + 5, oy + 5);
            ctx.lineTo(ox + cs - 5, oy + cs - 5);
            ctx.moveTo(ox + cs - 5, oy + 5);
            ctx.lineTo(ox + 5, oy + cs - 5);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.fillText('BLOCK', ox + 4, oy + cs / 2 + 3);
        });

        ctx.restore();
    }

    drawRobotPaths(ctx) {
        const cs = this.cellSize;
        ctx.save();

        this.engine.robots.forEach(robot => {
            if (robot.state === RobotState.OFFLINE || !robot.path || robot.path.length <= 1) return;

            const path = robot.path;
            const startIdx = Math.max(0, robot.pathIndex - 1);

            ctx.strokeStyle = robot.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = robot.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();

            const p0x = robot.x * cs + cs / 2;
            const p0y = robot.y * cs + cs / 2;
            ctx.moveTo(p0x, p0y);

            for (let i = startIdx + 1; i < path.length; i++) {
                const px = path[i].x * cs + cs / 2;
                const py = path[i].y * cs + cs / 2;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Animated light pulse traveling along path
            if (path.length > 2) {
                const pulseIndex = Math.floor(((this.pulsePhase / (Math.PI * 2)) * (path.length - 1))) + 1;
                const pt = path[Math.min(pulseIndex, path.length - 1)];
                if (pt) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.shadowColor = robot.color;
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.arc(pt.x * cs + cs / 2, pt.y * cs + cs / 2, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            // Waypoint nodes
            for (let i = startIdx + 1; i < path.length; i++) {
                const px = path[i].x * cs + cs / 2;
                const py = path[i].y * cs + cs / 2;
                ctx.fillStyle = robot.color;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }

    drawSensorSweep(ctx, robot) {
        const cs = this.cellSize;
        const cx = robot.x * cs + cs / 2;
        const cy = robot.y * cs + cs / 2;
        const rangePx = robot.sensorRange * cs;

        ctx.save();
        // Radar circle perimeter
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, rangePx, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating radar sweep sector
        const sweepAngle = 0.6;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rangePx);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rangePx, this.radarAngle, this.radarAngle + sweepAngle);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawCollisionZone(ctx, robot) {
        const cs = this.cellSize;
        const cx = robot.x * cs + cs / 2;
        const cy = robot.y * cs + cs / 2;
        const radiusPx = robot.collisionRadius * cs * 1.5;

        ctx.save();
        ctx.strokeStyle = robot.orcaActive ? 'rgba(255, 50, 50, 0.7)' : 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
        ctx.stroke();

        if (robot.orcaActive) {
            ctx.fillStyle = 'rgba(255, 50, 50, 0.12)';
            ctx.fill();
        }
        ctx.restore();
    }

    drawRobot(ctx, robot) {
        const cs = this.cellSize;
        const cx = robot.x * cs + cs / 2;
        const cy = robot.y * cs + cs / 2;
        const rSize = cs * 0.78;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(robot.heading);

        // Robot Chassis Shadow & Glow
        ctx.shadowColor = robot.color;
        ctx.shadowBlur = robot.state === RobotState.OFFLINE ? 0 : 12;

        // Base Chassis (Futuristic octagonal AMR body)
        const half = rSize / 2;
        const bevel = 4;
        ctx.fillStyle = robot.state === RobotState.OFFLINE ? '#2A2D35' : '#0B1320';
        ctx.strokeStyle = robot.state === RobotState.OFFLINE ? '#555555' : robot.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-half + bevel, -half);
        ctx.lineTo(half - bevel, -half);
        ctx.lineTo(half, -half + bevel);
        ctx.lineTo(half, half - bevel);
        ctx.lineTo(half - bevel, half);
        ctx.lineTo(-half + bevel, half);
        ctx.lineTo(-half, half - bevel);
        ctx.lineTo(-half, -half + bevel);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Front Headlights (Direction of travel)
        ctx.fillStyle = robot.state === RobotState.OFFLINE ? '#444' : '#FFFFFF';
        ctx.fillRect(half - 2, -half + 5, 2, 4);
        ctx.fillRect(half - 2, half - 9, 2, 4);

        // Drive wheels
        ctx.fillStyle = '#05070B';
        ctx.fillRect(-half + 3, -half - 2, 8, 3);
        ctx.fillRect(-half + 3, half - 1, 8, 3);

        // Cargo Pallet on Top Plate
        if (robot.isCarrying) {
            ctx.fillStyle = '#D97706'; // Wooden / Industrial Pallet Amber
            ctx.fillRect(-half + 5, -half + 5, rSize - 10, rSize - 10);
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 1;
            ctx.strokeRect(-half + 5, -half + 5, rSize - 10, rSize - 10);

            // Pallet strapping
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.moveTo(-half + 5, 0);
            ctx.lineTo(half - 5, 0);
            ctx.moveTo(0, -half + 5);
            ctx.lineTo(0, half - 5);
            ctx.stroke();
        }

        // Circular LiDAR Dome at center
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = robot.color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // Overlay Robot ID & Battery (Do not rotate with heading)
        ctx.save();
        ctx.translate(cx, cy);

        // Robot ID
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(robot.id, 0, -rSize / 2 - 5);

        // Battery Ring Indicator
        const bPct = robot.battery / 100;
        const bColor = bPct > 0.4 ? '#00FF66' : bPct > 0.2 ? '#FFB300' : '#FF3344';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rSize / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = bColor;
        ctx.beginPath();
        ctx.arc(0, 0, rSize / 2 + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bPct);
        ctx.stroke();

        // State Badge
        if (robot.state !== RobotState.IDLE) {
            ctx.fillStyle = robot.state === RobotState.OFFLINE ? '#FF3344' : 'rgba(0, 240, 255, 0.9)';
            ctx.font = '7px "JetBrains Mono", monospace';
            ctx.fillText(robot.state, 0, rSize / 2 + 10);
        }
        ctx.restore();
    }

    drawSelectionReticle(ctx, robot) {
        const cs = this.cellSize;
        const cx = robot.x * cs + cs / 2;
        const cy = robot.y * cs + cs / 2;
        const size = cs * 0.95;

        ctx.save();
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 10;

        const b = 6;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(cx - size / 2, cy - size / 2 + b);
        ctx.lineTo(cx - size / 2, cy - size / 2);
        ctx.lineTo(cx - size / 2 + b, cy - size / 2);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(cx + size / 2 - b, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy - size / 2 + b);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(cx - size / 2, cy + size / 2 - b);
        ctx.lineTo(cx - size / 2, cy + size / 2);
        ctx.lineTo(cx - size / 2 + b, cy + size / 2);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(cx + size / 2 - b, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2 - b);
        ctx.stroke();
        ctx.restore();
    }

    drawVelocityVectors(ctx, robot) {
        const cs = this.cellSize;
        const cx = robot.x * cs + cs / 2;
        const cy = robot.y * cs + cs / 2;
        const scale = cs * 1.5;

        ctx.save();
        // 1. Preferred Velocity (Yellow dashed)
        if (robot.preferredVelocity) {
            ctx.strokeStyle = 'rgba(255, 230, 0, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + robot.preferredVelocity.vx * scale, cy + robot.preferredVelocity.vy * scale);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 2. ORCA Safe Velocity (Neon Green / Red if evasive)
        if (robot.safeVelocity) {
            ctx.strokeStyle = robot.orcaActive ? '#FF3344' : '#00FF66';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + robot.safeVelocity.vx * scale, cy + robot.safeVelocity.vy * scale);
            ctx.stroke();

            // Arrow head
            const tipX = cx + robot.safeVelocity.vx * scale;
            const tipY = cy + robot.safeVelocity.vy * scale;
            const angle = Math.atan2(robot.safeVelocity.vy, robot.safeVelocity.vx);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - 6 * Math.cos(angle - Math.PI / 6), tipY - 6 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(tipX - 6 * Math.cos(angle + Math.PI / 6), tipY - 6 * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
        }

        // Label if ORCA active
        if (robot.orcaActive) {
            ctx.fillStyle = '#FF3344';
            ctx.font = 'bold 7px "JetBrains Mono", monospace';
            ctx.fillText('ORCA EVADE', cx + 15, cy - 12);
        }
        ctx.restore();
    }
}
