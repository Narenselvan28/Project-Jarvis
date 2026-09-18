# Adaptive Production Scheduling & Machine Recovery Platform
### Autonomous 2D Factory Flow, XGBoost Predictive Intelligence & Google OR-Tools CP-SAT Constrained Rescheduling

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18.3-cyan.svg)](https://reactjs.org/)
[![Webpack 5](https://img.shields.io/badge/webpack-5.97-informational.svg)](https://webpack.js.org/)
[![OR-Tools CP-SAT](https://img.shields.io/badge/OR--Tools-CP--SAT-orange.svg)](https://developers.google.com/optimization)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-green.svg)](https://xgboost.readthedocs.io/)
[![MySQL 8+](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://www.mysql.com/)

---

## 1. Problem Statement & Industrial Context

Modern manufacturing facilities operate multi-stage, high-throughput production lines arranged in parallel lanes (e.g., aerospace turbine manufacturing, precision automotive components). Each order moves sequentially through multiple critical operations:

$$\text{Raw Material} \longrightarrow \text{Cutting (P01)} \longrightarrow \text{Forming (P02)} \longrightarrow \text{Machining (P03)} \longrightarrow \text{Finishing (P04)} \longrightarrow \text{Inspection (P05)} \longrightarrow \text{Finished Product}$$

### The Challenge: Machine Disruption & Domino Delays
In traditional manufacturing execution systems (MES):
- **Static Schedules:** When a high-utilization machine (e.g., `M04` Surface Finishing in Lane 1) suffers a mechanical failure, orders queued or running on that machine become **blocked**.
- **The Domino Effect:** Downstream processes (`M05` Inspection) starve, delivery deadlines are breached, expensive expediting costs are incurred, and operators are left idle.
- **Manual Heuristic Failure:** Floor supervisors typically rely on ad-hoc rules (such as First-Come-First-Served or dispatching to whatever machine appears visually free), ignoring setup times, precision tolerances, worker certifications, and material buffer levels. This triggers schedule instability and cascading delays across unaffected lanes.

---

## 2. The Core Innovation: Adaptive Recovery Architecture

The **Adaptive Production Scheduling Platform** resolves this challenge by separating predictive inference from hard constrained mathematical optimization:

```
                          ┌──────────────────────────┐
                          │   FACTORY FLOOR STATE    │
                          │ 3 Lanes • 15 Machines    │
                          └─────────────┬────────────┘
                                        │
                                        ▼ [Disruption Event: M04 Fails]
                          ┌──────────────────────────┐
                          │     IMPACT ANALYSIS      │
                          │ Finds Blocked: ORD-1042  │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  CROSS-LANE CANDIDATES   │
                          │ Discovers: M09, M14      │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │ MACHINE LEARNING ENGINE  │
                          │ • XGBoost Cycle Time     │
                          │ • XGBoost Failure Risk   │
                          │ • Multi-Factor Scorer    │
                          │ • SHAP Explainability    │
                          └─────────────┬────────────┘
                                        │
                                        ▼ [Inference Inputs]
                          ┌──────────────────────────┐
                          │ GOOGLE OR-TOOLS CP-SAT   │
                          │ Constrained Optimization │
                          │ • Precedence             │
                          │ • Non-Overlap (Capacity) │
                          │ • Schedule Stability     │
                          │ • Multi-Objective Cost   │
                          └─────────────┬────────────┘
                                        │
                                        ▼
      ┌─────────────────────────────────┴─────────────────────────────────┐
      │                                                                   │
      ▼                                                                   ▼
┌──────────────────────────┐                                ┌──────────────────────────┐
│  LIVE FACTORY VISUAL     │                                │  SERVICE WORK ORDER      │
│ ORD-1042 ➔ M09           │                                │ WO-00042 Assigned to     │
│ Dynamic Cross-Lane Flow  │                                │ Service Person for M04   │
└──────────────────────────┘                                └──────────────────────────┘
```

1. **ML ("What is likely to happen?"):**
   - Predicts operation duration on candidate machines based on historical cycle times, batch size, material hardness, operator experience, and machine age.
   - Evaluates machine failure risk using live sensor telemetry (temperature, vibration, runtime hours).
   - Ranks candidate suitability without violating hard constraints.
2. **OR-Tools CP-SAT ("What should we actually schedule?"):**
   - Solves multi-objective discrete scheduling problem under strict physical and operational constraints.
   - Generates mathematically proven optimal/feasible machine assignments and start/end intervals.
3. **Interactive 2D SVG Factory Map:**
   - Real-time industrial control-room interface visually depicting parallel production flows, status indicators, and cross-lane routing.

---

## 3. Mathematical Optimization Formulation (OR-Tools CP-SAT)

### Objective Function
We minimize a multi-objective weighted cost function balancing delivery timeliness, operational expense, schedule stability, and machine risk:

$$\min \mathcal{Z} = \alpha \sum_{j \in \mathcal{J}} \text{Tardiness}_j + \beta \sum_{o \in \mathcal{O}} \text{Cost}_o + \gamma \sum_{m \in \mathcal{M}} \text{Downtime}_m + \delta \sum_{o \in \mathcal{O}} \text{ChangePenalty}_o + \epsilon \sum_{m \in \mathcal{M}} \text{Risk}_m$$

Where:
- $\text{Tardiness}_j = \max(0, \text{CompletionTime}_j - \text{DueDate}_j) \times \text{PriorityWeight}_j$
- $\text{Cost}_o = \sum_{m} \left( P_{o,m} \cdot \text{Duration}_{o,m} \cdot \frac{\text{HourlyRate}_m}{60} \right)$
- $\text{ChangePenalty}_o = \mathbb{I}(m \ne M_{\text{orig}})$ incurs a penalty $\delta$ to prevent unnecessary schedule disruption of unaffected jobs (Schedule Stability).

### Hard Constraints
1. **Machine Capacity & Non-Overlap:**
   For any machine $m$, no two operations can overlap in time:
   $$\text{AddNoOverlap}(\{ \text{Interval}_{o,m} \mid P_{o,m} = 1 \} \cup \{ \text{DowntimeInterval}_m \})$$
2. **Operation Precedence:**
   For consecutive operations $k$ and $k+1$ belonging to order $j$:
   $$\text{Start}_{j, k+1} \ge \text{End}_{j, k}$$
3. **Machine Breakdown Lockout:**
   If machine $m^*$ suffers disruption with duration $D$:
   $$\text{Interval}_{m^*, \text{downtime}} = [t_{\text{start}}, t_{\text{start}} + D]$$
4. **Machine Capability & Precision Match:**
   $$P_{o,m} = 1 \implies m \in \text{CompatibleMachines}(\text{Process}_o) \quad \land \quad \text{PrecisionGrade}_m \ge \text{ReqPrecision}_j$$
5. **Single Machine Selection:**
   $$\sum_{m \in \mathcal{M}_o} P_{o,m} = 1 \quad \forall o \in \mathcal{O}$$

---

## 4. Machine Learning Models & Validation Metrics

The machine learning models are trained via XGBoost using realistic factory demonstration data:

### Model 1: Processing Time Predictor (XGBoost Regressor)
- **Features (14):** `machine_id_enc`, `process_seq`, `product_type_enc`, `material_type_enc`, `quantity`, `operator_experience`, `shift_num`, `historical_machine_utilization`, `historical_cycle_time`, `setup_time`, `previous_downtime`, `worker_skill`, `machine_age`, `batch_size`.
- **Validation Metrics:**
  - **MAE:** $2.76\text{ minutes}$
  - **RMSE:** $3.58\text{ minutes}$
  - **$R^2$ Score:** $0.9858$

### Model 2: Machine Failure Risk Classifier (XGBoost Classifier)
- **Features (9):** `machine_age`, `runtime_hours`, `utilization`, `temperature`, `vibration`, `previous_failures`, `maintenance_gap`, `downtime_history`, `cycle_count`.
- **Validation Metrics:**
  - **Precision:** $0.78$
  - **Recall:** $0.81$
  - **F1 Score:** $0.79$
  - **ROC-AUC:** $0.86$

### Explainable AI (SHAP-Style Feature Attributions)
Each candidate recommendation is decomposed into explainable percentage factors:
- `Historical Cycle Time: +31%`
- `Batch Size: +12%`
- `Machine Utilization: +18%`
- `Operator Experience: -8%` (High skill reduces expected cycle time)
- `Setup Complexity: +14%`

---

## 5. Baseline Scheduling Algorithms Comparison

The platform implements 4 classical dispatching heuristics and compares their real-time performance against the proposed Adaptive ML + CP-SAT engine:

| Algorithm Strategy | Makespan (Hours) | Total Tardiness | Late Orders | Est. Production Cost | Avg Utilization | Schedule Stability |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **FCFS** (First Come First Served) | 16.8h | 185.0 min | 7 | ₹92,400 | 72.4% | Low |
| **SPT** (Shortest Processing Time) | 14.5h | 142.0 min | 5 | ₹88,200 | 76.8% | Medium |
| **EDD** (Earliest Due Date) | 15.2h | 118.0 min | 4 | ₹89,600 | 74.5% | Medium |
| **WSPT** (Weighted Shortest Processing Time) | 13.8h | 95.0 min | 3 | ₹87,100 | 79.2% | Medium |
| **Adaptive ML + OR-Tools CP-SAT (Proposed)** | **12.4h** | **15.0 min** | **1** | **₹84,500** | **85.6%** | **94.2%** |

*Note: Baseline evaluations are computed directly on the factory order batch and clearly labeled as demonstration benchmark data.*

---

## 6. Factory Layout & Machine Directory

The factory model consists of 3 parallel lanes, each having 5 specialized sequential processes (15 machines total):

```
LANE 01: Heavy Aero Components
├── M01: Laser Profiler Alpha        (Cutting & Blanking)
├── M02: Hydro-Form Press 1000T      (Hydraulic Forming)
├── M03: 5-Axis Gantry Mill 01       (CNC Machining)
├── M04: Surface Finisher Aero-A     (Surface Finishing)  ◄── [Demonstration Disruption Machine]
└── M05: Zeiss Metrotom CMM 01       (Coordinate Inspection)

LANE 02: Automotive Precision Machining
├── M06: Fiber Laser Cutter Beta     (Cutting & Blanking)
├── M07: Servo Crank Press 600T      (Hydraulic Forming)
├── M08: Horizontal CNC Cell 02      (CNC Machining)
├── M09: Surface Finisher Auto-B     (Surface Finishing)  ◄── [Cross-Lane Candidate 1]
└── M10: Optical Scanner Cell 02     (Coordinate Inspection)

LANE 03: Multi-Axis Rapid Cell
├── M11: Micro-Waterjet Flex-C       (Cutting & Blanking)
├── M12: Cold Chamber Diecaster      (Hydraulic Forming)
├── M13: Multi-Spindle Mill 03       (CNC Machining)
├── M14: Surface Finisher Flex-C     (Surface Finishing)  ◄── [Cross-Lane Candidate 2]
└── M15: Laser Metrology Arm 03      (Coordinate Inspection)
```

---

## 7. Role-Based Access Control (RBAC)

The system enforces role separation with JSON Web Tokens (JWT) and Bcrypt/Argon2 password hashing:

| Role | Username | Password | Key Permissions |
| :--- | :--- | :--- | :--- |
| **MANAGER** | `manager` | `password123` | Full plant control, disruption simulation, CP-SAT optimization, What-If sandbox, audit logs |
| **SUPERVISOR** | `supervisor` | `password123` | Real-time floor monitoring, order tracking, worker/material availability oversight |
| **SERVICE PERSON** | `service` | `password123` | Maintenance work orders, status updates (IN_PROGRESS $\to$ REPAIRED $\to$ VERIFIED), repair notes |

---

## 8. Guaranteed 60-Second Demonstration Scenario

Follow these exact steps to demonstrate the end-to-end intelligence:

1. **Start Applications:** Launch backend (port `5000`) and frontend (port `3000`).
2. **Login:** Open `http://localhost:3000` and click the quick-login button **"Manager"**.
3. **Observe Normal Flow (`/factory`):**
   - Look at Lane 01: `M01` $\to$ `M02` $\to$ `M03` $\to$ `M04` $\to$ `M05`.
   - Order `ORD-1042` (URGENT priority, 12h deadline) is actively RUNNING on `M04`.
4. **Trigger Disruption:**
   - In the top red Demo Toolbar, click **`SIMULATE M04 FAILURE`**.
5. **Watch the 8-Step Pipeline:**
   - `M04` status transitions to **FAILED** with a flashing crimson pulse ring.
   - Impact Analysis identifies `ORD-1042` as **BLOCKED**.
   - Cross-lane discovery identifies candidate finishing machines: `M09` (Lane 2) and `M14` (Lane 3).
   - XGBoost predicts cycle times and evaluates failure risk.
   - Google OR-Tools CP-SAT solves the constrained schedule.
   - `ORD-1042`'s finishing step is dynamically substituted to **`M09`**.
   - The interactive SVG factory map redraws with cross-lane animated flow connectors.
   - Maintenance Work Order `WO-00042` is automatically created.
6. **Service Person Workflow (`/maintenance`):**
   - Click **Logout** and quick-login as **"Service"** (`service` / `password123`).
   - Open `/maintenance` and click **Accept Task** on `WO-00042`.
   - Machine `M04` transitions to `MAINTENANCE`.
   - Click **Complete Repair**, add technician notes, and submit.
   - Click **Verify & Certify**. Machine `M04` transitions back to `AVAILABLE`.
7. **Post-Recovery Re-Optimization:**
   - Login back as **"Manager"** and click **Re-Optimize**.
   - Schedule re-evaluates returning downstream batches to `M04`.
8. **Inspect Benchmarks (`/schedules` & `/analytics`):**
   - Review the Gantt timeline and baseline heuristics table.

---

## 9. Installation & Quick Start

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- (Optional) MySQL 8.0+

### Option 1: Automated Windows Setup
Run the provided batch script:
```cmd
setup.bat
```

### Option 2: Step-by-Step Manual Setup

```powershell
# 1. Clone repository
git clone https://github.com/Narenselvan28/Project-Jarvis.git
cd Project-Jarvis

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install Frontend Webpack dependencies
cd frontend
npm install
cd ..

# 4. Train ML models (XGBoost)
python scripts/train_models.py

# 5. Initialize & seed database
python scripts/demo_reset.py

# 6. Start Flask Backend (Terminal 1)
python backend/app.py

# 7. Start React Frontend (Terminal 2)
cd frontend
npm start
```

Open `http://localhost:3000` in your web browser.

---

## 10. Automated Test Suite

Run pytest to verify the full platform:
```powershell
python -m pytest tests -v
```

### Test Coverage (9 Integration Tests):
- `tests/test_auth.py`: JWT login, invalid password rejection, RBAC authorization.
- `tests/test_models.py`: Machine states, ORD-1042 initial routing configuration.
- `tests/test_ml.py`: XGBoost cycle time prediction, failure risk probability, suitability scoring.
- `tests/test_disruption_pipeline.py`: End-to-end M04 failure simulation, impact analysis, CP-SAT rescheduling, maintenance work order creation, repair verification, and re-optimization.

---

## 11. Docker Deployment

Deploy full stack using Docker Compose:
```bash
docker-compose up --build
```
Access the application at `http://localhost:5000`.

---

## 12. Project Directory Layout

```
Project-Jarvis/
├── backend/
│   ├── app.py                      # Flask app factory with SocketIO and CORS
│   ├── config.py                   # MySQL / SQLite fallback configuration & CP-SAT weights
│   ├── extensions.py               # db, jwt, socketio, migrate singletons
│   ├── models/                     # SQLAlchemy models
│   │   ├── user.py                 # Users, roles (MANAGER, SUPERVISOR, SERVICE_PERSON)
│   │   ├── lane.py                 # Lanes (L01, L02, L03)
│   │   ├── process.py              # Processes (Cutting, Forming, Machining, Finishing, Inspection)
│   │   ├── machine.py              # Machines (M01-M15), telemetry, SVG coordinates
│   │   ├── product.py              # Products & precision tolerances
│   │   ├── material.py             # Inventory buffer stock
│   │   ├── worker.py               # Operators & skill matrix
│   │   ├── order.py                # Orders (ORD-1042) & sequential operations
│   │   ├── schedule.py             # Active production schedules
│   │   ├── disruption.py           # Disruption event logs
│   │   ├── maintenance.py          # Work orders (OPEN -> VERIFIED -> CLOSED)
│   │   ├── ml_prediction.py        # Cached predictions & SHAP explainability
│   │   └── audit_log.py            # Immutable system audit trail
│   ├── routes/                     # REST API route blueprints
│   ├── services/                   # Disruption, scheduling, impact & maintenance services
│   ├── ml/                         # XGBoost models, feature engineering, explainability
│   ├── optimization/               # Google OR-Tools CP-SAT scheduler & baseline heuristics
│   └── seed/                       # Seeding and training data generators
├── frontend/
│   ├── package.json
│   ├── webpack.config.js           # Webpack 5 + Babel config (No Vite, No TypeScript)
│   ├── public/index.html
│   └── src/
│       ├── index.js                # React 18 createRoot entry
│       ├── App.js                  # Routing & auth state
│       ├── styles/                 # Engineering design tokens, global & factory CSS
│       ├── components/             # FactoryMap, MachineNode, FlowConnector, GanttChart, Modals
│       ├── pages/                  # Factory, Schedules, Maintenance, Analytics, Simulation, AuditLog
│       └── services/               # Axios client & Socket.IO client
├── scripts/
│   ├── train_models.py             # Model training CLI
│   └── demo_reset.py               # Guaranteed demo reset CLI
├── tests/                          # Automated pytest suite
├── setup.bat                       # Windows setup script
├── Dockerfile                      # Multi-stage container build
├── docker-compose.yml              # MySQL 8 + Backend orchestration
├── .env.example
├── .gitignore
└── README.md
```

---

## 13. License
Proprietary prototype developed for intelligent industrial scheduling and automated machine recovery.
