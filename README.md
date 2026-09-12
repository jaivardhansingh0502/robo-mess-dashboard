# ROBOMESS // Autonomous Mobile Robot Fleet Coordination Platform

**Edge-AI Based Distributed Fleet Coordination for Autonomous Mobile Robots (AMRs) in Smart Warehouses**  
*Smart India Hackathon 2026 — Problem Statement: SIH26123*

---

## 🚀 Overview

**ROBOMESS** is an industrial-grade, decentralized fleet coordination and digital twin platform for Autonomous Mobile Robots (AMRs) in high-density smart fulfillment centers.

Unlike traditional centralized dispatchers that suffer from high cloud latency, network single points of failure, and aisle deadlocks, ROBOMESS distributes time-critical intelligence directly to the edge.

### Core Mathematical Pipeline
$$\text{Tasks} \xrightarrow{\text{CBBA}} \text{Decentralized Assignment} \xrightarrow{\text{CBS + A*}} \text{Space-Time Conflict-Free Routes} \xrightarrow{\text{ORCA}} \text{Local Evasion} \xrightarrow{} \text{Millimeter Execution}$$

---

## ⚡ Key Technical Innovations

1. **CBBA (Consensus-Based Bundle Algorithm)**:
   - Decentralized multi-agent auctioning mechanism.
   - Bidding considers task priority, exponential distance decay, remaining battery state of health, and current bundle workload.
   - Converges to conflict-free task allocation in polynomial time without a central master node.

2. **CBS (Conflict-Based Search) + Space-Time A\***:
   - Two-level search tree for multi-agent path finding (MAPF).
   - Low level plans 3D space-time trajectories $(x, y, t)$ with dynamic wait actions.
   - High level detects vertex collisions and edge-swap conflicts, branching constraints to achieve provably conflict-free global routes.

3. **ORCA (Optimal Reciprocal Collision Avoidance)**:
   - Real-time continuous 2D kinematic collision avoidance running at 50Hz.
   - Computes Velocity Obstacles ($VO_{A|B}$) and enforces 50/50 reciprocal evasion between AMRs.

4. **Edge AI Perception (NVIDIA Jetson / PyTorch)**:
   - Sub-12ms on-robot vision inference.
   - 2D LiDAR point-cloud clustering and OpenCV AprilTag/QR fiducial docking.

---

## 🖥️ Platform Features & Capabilities

- **Live Autonomous Warehouse Simulation**: 28 × 18 aisle topology with 12 multi-bay storage racks, inbound receiving bays, outbound packaging stations, and automated battery charging pads.
- **5 Autonomous AMRs**: R1 "Vanguard", R2 "Apex", R3 "Titan", R4 "Echo", and R5 "Cipher" with real-time kinematics, payload tracking, and battery meters.
- **Dynamic Event Injection**:
  - `[+ NEW ORDER]`: Emergency pallet demand with instant re-auctioning.
  - `[⚠ ROBOT FAULT]`: Motor failure simulation with automatic task detachment and fleet detour routing.
  - `[⚡ LOW BATTERY]`: Automated mission preemption and charging dock navigation.
  - `[🚧 BLOCK AISLE]`: Highway blockage detection with dynamic space-time replanning.
- **Real-Time Telemetry HUD & Terminal**: Per-robot stats, metrics counters, robot route inspector, and auto-scrolling ROS 2 DDS event bus.

---

## 🛠️ Quick Start

### Option 1: Double Click
Simply open `index.html` in Microsoft Edge, Brave, or Google Chrome.

### Option 2: Local HTTP Server (Zero Dependencies)
```bash
node server.js
```
Navigate to `http://localhost:3000/`.

---

## 📦 Tech Stack

- **Core Middleware**: ROS 2 Humble / Iron, DDS, MQTT, Zenoh
- **Algorithms**: C++ 20, Space-Time A*, CBS, CBBA, ORCA
- **Edge AI**: Python 3.11, PyTorch, YOLOv8, OpenCV
- **Digital Twin Frontend**: High-Performance HTML5 Canvas 2D, Modern ES6+ Modules, Cyber-Industrial CSS
