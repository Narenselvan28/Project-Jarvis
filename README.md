# ReFlow

### Adaptive Production Scheduling & Disruption Recovery

ReFlow is a production scheduling system that combines machine-state monitoring, machine suitability prediction, constraint-based optimization, and human approval to generate and recover manufacturing schedules when production conditions change.

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Our Solution](#our-solution)
3. [Core Innovation](#core-innovation)
4. [Problem Statement Alignment](#problem-statement-alignment)
5. [Core Implementation](#core-implementation)
   - [5.1 Production Order Management](#51-production-order-management)
   - [5.2 Machine Management](#52-machine-management)
   - [5.3 Production Scheduling](#53-production-scheduling)
   - [5.4 ML Processing-Time Prediction](#54-ml-processing-time-prediction)
   - [5.5 Machine Failure Risk Prediction](#55-machine-failure-risk-prediction)
   - [5.6 Machine Suitability Evaluation](#56-machine-suitability-evaluation)
   - [5.7 OR-Tools CP-SAT Optimization](#57-or-tools-cp-sat-optimization)
   - [5.8 Disruption Recovery Workflow](#58-disruption-recovery-workflow)
   - [5.9 Maintenance Queue & Work Orders](#59-maintenance-queue--work-orders)
6. [AI / Optimization Architecture](#ai--optimization-architecture)
7. [System Architecture](#system-architecture)
8. [Code Architecture](#code-architecture)
9. [Development History & Evolution](#development-history--evolution)
10. [Security, Cryptography & RBAC](#security-cryptography--rbac)
11. [Verification & Test Results](#verification--test-results)
12. [Setup & Running Locally](#setup--running-locally)

---

## Problem Statement

In discrete and batch manufacturing facilities, operational schedules depend on an interdependent network of constraints:
- **Machine availability and operating status** across parallel lanes
- **Operation processing time** and product-dependent setup times
- **Order priorities** and binding delivery deadlines
- **Workforce availability** and certified operator skills
- **Raw material availability** and bill-of-materials stage requirements
- **Unplanned downtime** due to mechanical wear, electrical drive faults, or thermal trips

In standard factory operations, production plans are generated periodically (e.g., weekly or per shift). While schedules are reviewed by plant managers and floor supervisors, operational disruptions between planning cycles render static schedules obsolete:
- When a workstation breaks down, queued and currently running orders become **blocked**.
- Downstream stages are starved of work-in-progress inventory while upstream stages accumulate buffer bottlenecks.
- Reallocating work manually via ad-hoc heuristics (such as dispatching to the first open machine) frequently ignores secondary setup requirements, material stage readiness, and operator certifications, triggering cascading delays across unaffected lines.

**Accurate Operational Framing:** Production priorities and allocations may be periodically reviewed by production personnel, but disruptions between planning/review cycles require dynamic reallocation and schedule adjustment without violating hard shopfloor constraints.

---

## Our Solution

ReFlow establishes a continuous, human-supervised scheduling feedback loop:

```
    PLAN
     ↓
  PREDICT  (XGBoost processing time, failure risk & multi-factor suitability)
     ↓
  OPTIMIZE (Google OR-Tools CP-SAT constrained schedule generation)
     ↓
   REVIEW  (Supervisor / Manager review & constraint validation)
     ↓
  EXECUTE  (Live shopfloor execution with WebSocket telemetry)
     ↓
DETECT DISRUPTION (Machine breakdown or maintenance trigger)
     ↓
  RECOVER  (Automated candidate evaluation & dual-option generation)
     ↓
RE-OPTIMIZE (Authorized approval activates new feasible schedule)
```

ReFlow automates baseline production planning and dynamically evaluates alternative machine allocations when shopfloor conditions change, while maintaining human oversight over schedule approval.

---

## Core Innovation

### Dynamic Machine Substitution with Constraint-Aware Re-Scheduling

When an assigned machine becomes unavailable due to an operational fault or maintenance event, ReFlow executes an automated 8-step recovery pipeline:

1. **Identifies affected operations:** Scans the active schedule to determine which operations are currently in progress or queued on the faulted machine.
2. **Identifies compatible alternative machines:** Queries machine capabilities to discover candidate workstations equipped for the required process.
3. **Evaluates machine suitability:** Applies trained ML inference to estimate candidate cycle times, calculates setup adjustments, and checks machine operational risk.
4. **Validates resource constraints:** Verifies that required raw materials are in stock and that certified workers are available for the shift.
5. **Transfers candidate variables to optimizer:** Supplies candidate intervals, setup matrices, and machine costs to Google OR-Tools CP-SAT.
6. **Generates distinct recovery alternatives:** Solves the constrained model under two distinct objective profiles:
   - **Option A (Deadline Protection):** Heavily penalizes tardiness and delivery delay.
   - **Option B (Cost & Schedule Stability):** Minimizes overtime cost and penalizes excessive machine reallocations.
7. **Presents recovery options to authorized personnel:** Displays the trade-off matrix (reassigned machine, predicted duration, additional cost, delivery variance) to the Plant Manager.
8. **Applies schedule only after human approval:** The active floor plan is updated only after explicit authorization. Rejection allows manual reassignment or queuing.

> **Key Architectural Boundary:**
> - **ML predicts:** Evaluates cycle durations, failure probabilities, and suitability signals.
> - **OR-Tools optimizes:** Enforces hard mathematical constraints (no-overlap, precedence, worker skills, capacity).
> - **The human approves:** Plant managers and supervisors retain ultimate operational authority.

---

## Problem Statement Alignment

| Requirement | How ReFlow Addresses It | Implementation Evidence |
|---|---|---|
| **Machine availability** | Tracks real-time states (`AVAILABLE`, `RUNNING`, `IDLE`, `SETUP`, `FAILED`, `MAINTENANCE`); filters unavailable machines from new assignments. | [`backend/models/machine.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/machine.py), [`backend/services/machine_service.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/services/machine_service.py) |
| **Processing / setup time** | Uses XGBoost regressor to estimate duration based on batch size, machine age, material, and operator experience; incorporates explicit setup times. | [`backend/ml/processing_time_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/processing_time_model.py), [`backend/ml/feature_engineering.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/feature_engineering.py) |
| **Order priority** | Weighs tardiness penalty multipliers by order priority (`URGENT` = 5×, `HIGH` = 3×, `MEDIUM` = 2×, `LOW` = 1×). | [`backend/optimization/objective.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/objective.py), [`backend/models/order.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/order.py) |
| **Delivery deadlines** | Models hard and soft due-date constraints with tardiness tracking variables in the solver objective function. | [`backend/optimization/constraints.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/constraints.py), [`backend/optimization/scheduler.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/scheduler.py) |
| **Workforce availability** | Checks operator certifications against required operation processes and verifies shift scheduling before assigning tasks. | [`backend/models/worker.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/worker.py), [`backend/ml/machine_suitability_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/machine_suitability_model.py) |
| **Material constraints** | Verifies BOM requirements and inventory quantities before operations can be scheduled or dispatched. | [`backend/models/material.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/material.py), [`backend/routes/v1/materials_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/materials_controller.py) |
| **Downtime management** | Adds fixed downtime intervals (`NewFixedSizeIntervalVar`) locking out faulted machines during repair windows. | [`backend/optimization/constraints.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/constraints.py#L24-L36), [`backend/services/disruption_service.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/services/disruption_service.py) |
| **Production cost** | Factors machine hourly operating rates, setup costs, and overtime multipliers into candidate evaluation and CP-SAT objective. | [`backend/optimization/objective.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/objective.py), [`backend/config.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/config.py) |
| **Dynamic re-optimization** | CP-SAT solver re-executes upon disruption, creating localized reschedule options within user-defined horizon. | [`backend/optimization/scheduler.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/scheduler.py), [`backend/routes/v1/disruptions_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/disruptions_controller.py) |
| **Machine substitution** | Cross-lane candidate discovery filters alternative machines with matching process capabilities and ranks them. | [`backend/optimization/candidate_machine_selector.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/candidate_machine_selector.py), [`backend/ml/machine_suitability_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/machine_suitability_model.py) |
| **Schedule feasibility** | Enforces strict operation precedence ($Start_{op+1} \ge End_{op}$) and machine capacity non-overlap (`AddNoOverlap`). | [`backend/optimization/constraints.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/constraints.py#L110-L135) |
| **Human approval** | Enforces two-step commit: recovery options and order plans remain `PENDING_APPROVAL` until signed off by an authorized role. | [`backend/routes/v1/disruptions_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/disruptions_controller.py), [`backend/routes/v1/orders_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/orders_controller.py) |

---

## Core Implementation

### 5.1 Production Order Management
- **Entity Structure:** Models order ID, product type, order quantity, priority level (`URGENT`, `HIGH`, `MEDIUM`, `LOW`), target deadline, and sequential bill-of-operations.
- **Workflow:** Manager initiates order creation $\rightarrow$ system generates required operations with material and worker requirements $\rightarrow$ feeds order into planning pipeline.
- **Source Paths:** [`backend/models/order.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/order.py), [`backend/routes/v1/orders_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/orders_controller.py)

### 5.2 Machine Management
- **Facility Model:** Configured for 50 workstations distributed across 3 flow lanes (*Jersey Flow*, *Wovens & Blends*, *Rapid Response Cell*) spanning 13 sequential manufacturing processes (Fabric Inspection, Spreading, Cutting, Bundling, Sewing Assembly, Collar Preparation, Sleeve Attaching, Side Seaming, Hemming, Pressing, Embroidery, Finishing, Inspection & Quality Control, Final Packing).
- **Attributes:** Master data records machine ID, name, process capability list, current operational state, hourly rate, average setup time, runtime hours, operating temperature, and vibration telemetry.
- **Source Paths:** [`backend/models/machine.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/machine.py), [`backend/routes/v1/machines_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/machines_controller.py)

### 5.3 Production Scheduling
- **Engine:** Google OR-Tools CP-SAT constraint programming engine modeling orders over a configurable 48-hour planning horizon (2880 minutes).
- **Physical Constraints:** Enforces no two operations can occupy the same machine simultaneously (`AddNoOverlap`), operation sequences must strictly follow routing order, and assigned machines cannot be scheduled during downtime windows.
- **Source Paths:** [`backend/optimization/scheduler.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/scheduler.py), [`backend/optimization/constraints.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/constraints.py)

### 5.4 ML Processing-Time Prediction
- **Model Architecture:** XGBoost Regressor (`processing_time_xgboost`, version 1.2.0) trained to predict operation duration in minutes.
- **Input Features (14):** `machine_id_enc`, `process_seq`, `product_type_enc`, `material_type_enc`, `quantity`, `operator_experience`, `shift_num`, `historical_machine_utilization`, `historical_cycle_time`, `setup_time`, `previous_downtime`, `worker_skill`, `machine_age`, `batch_size`.
- **Output Validation:** Output is strictly bounded $[10.0, 2880.0]$ minutes with numeric checks to prevent `NaN`, `Infinity`, or negative values reaching the frontend.
- **Explainability:** SHAP TreeExplainer integration (`backend/ml/explainability.py`) decomposes predictions into top contributing features (e.g., batch volume impact, operator efficiency delta).
- **Source Paths:** [`backend/ml/processing_time_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/processing_time_model.py), [`backend/ml/feature_engineering.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/feature_engineering.py)

### 5.5 Machine Failure Risk Prediction
- **Model Architecture:** XGBoost Classifier predicting the statistical failure probability of a machine under current load.
- **Input Features (9):** `machine_age`, `runtime_hours`, `utilization`, `temperature`, `vibration`, `previous_failures`, `maintenance_gap`, `downtime_history`, `cycle_count`.
- **Framing:** Output is strictly treated as an *estimated failure risk percentage* (e.g., `Estimated Failure Risk: 12%`), never as a deterministic guarantee.
- **Source Paths:** [`backend/ml/machine_failure_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/machine_failure_model.py)

### 5.6 Machine Suitability Evaluation
- **Candidate Scoring:** When finding replacements for an interrupted operation, candidate machines are evaluated across 7 weighted operational criteria:
  1. Capability verification (process match or secondary capability list)
  2. Machine availability (`AVAILABLE` or `IDLE` status)
  3. Certified worker availability for the operation's process
  4. Raw material stock sufficiency
  5. Predicted cycle time via ML regressor
  6. Machine failure risk probability
  7. Setup duration and hourly operational cost
- **Explanation Generation:** The scoring engine dynamically constructs natural-language justifications from actual feature weights (e.g., *"Direct capability match; available certified operator; 14 min lower predicted cycle time"*).
- **Source Paths:** [`backend/ml/machine_suitability_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/machine_suitability_model.py)

### 5.7 OR-Tools CP-SAT Optimization
- **Mathematical Formulation:**
  $$\min \mathcal{Z} = w_{\text{tardiness}} \sum \text{Tardiness}_j + w_{\text{cost}} \sum \text{Cost}_o + w_{\text{change}} \sum \text{Perturbation}_o + w_{\text{risk}} \sum \text{Risk}_m$$
- **Dual Objective Configurations:**
  - **Option A (Deadline Protection):**
    `tardiness: 50.0`, `deadline_penalty: 100.0`, `cost: 1.0`, `schedule_change: 2.0`, `risk: 3.0`.
  - **Option B (Cost & Schedule Stability):**
    `tardiness: 5.0`, `deadline_penalty: 10.0`, `cost: 30.0`, `schedule_change: 40.0`, `risk: 5.0`.
- **Source Paths:** [`backend/optimization/scheduler.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/scheduler.py), [`backend/config.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/config.py#L48-L65)

### 5.8 Disruption Recovery Workflow
- **Failure Injection & Propagation:** A machine breakdown triggers immediate state transition to `FAILED`, broadcasts a WebSocket event (`machine.failed`), flags the machine node **RED** on the factory floor, and identifies affected operations.
- **Candidate Evaluation:** The system discovers alternative machines, executes ML suitability scoring, and runs the CP-SAT solver to generate Option A and Option B.
- **Two-Step Human Approval:** The manager reviews the trade-offs on the disruption modal. Approving an option updates the schedule, routes the order to the secondary lane, and marks the recovery machine **BLUE** (`↳ RECOVERY`).
- **Source Paths:** [`backend/services/disruption_service.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/services/disruption_service.py), [`backend/routes/v1/disruptions_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/disruptions_controller.py)

### 5.9 Maintenance Queue & Work Orders
- **Lifecycle Management:** Any machine disruption automatically creates a maintenance work order in the maintenance queue.
- **State Machine:**
  $$\text{OPEN} \longrightarrow \text{ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{REPAIRED} \longrightarrow \text{VERIFIED} \longrightarrow \text{AVAILABLE}$$
- **Role Isolation:** Service personnel can accept, work on, and verify repairs, but cannot alter or approve production schedules.
- **Source Paths:** [`backend/services/maintenance_service.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/services/maintenance_service.py), [`backend/routes/v1/maintenance_controller.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/routes/v1/maintenance_controller.py)

---

## AI / Optimization Architecture

```text
               SHOPFLOOR STATE (Machines, Orders, Workers, Materials)
                                         |
                                         v
                         +-------------------------------+
                         |      Feature Preparation      |
                         +---------------+---------------+
                                         |
                   +---------------------+---------------------+
                   |                                           |
                   v                                           v
     +---------------------------+               +---------------------------+
     |   Processing-Time Model   |               |     Failure-Risk Model    |
     |     (XGBoost Regressor)   |               |    (XGBoost Classifier)   |
     +-------------+-------------+               +-------------+-------------+
                   |                                           |
                   +---------------------+---------------------+
                                         |
                                         v
                         +-------------------------------+
                         |   Machine Suitability Scorer  |
                         |   (Multi-Factor Ranking)      |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         |   Candidate Machine Filter    |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         |    Google OR-Tools CP-SAT     |
                         |  (Hard Constraints & Weights) |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         | Feasible Reschedule Proposal  |
                         |   (Option A vs Option B)      |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         |    Human Approval Screen      |
                         |  (Plant Manager / Supervisor) |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         |     Active Shopfloor State    |
                         +-------------------------------+
```

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                           REACT 18 FRONTEND (LIGHT THEME)                         |
|   • Shrinkable Sidebar Navigation (Expanded 260px / Collapsed 72px)              |
|   • Factory Floor (Circular Machine Map, Lanes & Orders Views)                   |
|   • Supervisor Review (Plan Validation & Overrides)                              |
|   • Fleet Maintenance Queue (Work Order Lifecycle)                               |
|   • Disruption Simulation Sandbox (What-If Analysis)                             |
+----------------------------------------+------------------------------------------+
                                         |
                       REST API (HTTP/JSON) | WebSocket Events (Socket.IO)
                                         |
+----------------------------------------v------------------------------------------+
|                            FLASK 3.0 APPLICATION SERVER                           |
|   • JWT Auth & Role-Based Access Control (MANAGER, SUPERVISOR, SERVICE_PERSON)    |
|   • Application-Level AES-256-GCM Field Encryption                               |
|   • Controller Layer (v1 Routes: Auth, Factory, Machines, Orders, Disruptions)    |
|   • Domain Services (Planning, Disruption, Maintenance, Impact Analysis)          |
|   • Real-Time Event Dispatcher (machine.failed, order.updated, maintenance.upd)  |
+-------------------+------------------------------------+--------------------------+
                    |                                    |
                    v                                    v
+-----------------------------------+    +------------------------------------------+
|        PREDICTIVE ML LAYER        |    |       MATHEMATICAL OPTIMIZATION          |
|  • XGBoost Processing Time Model  |    |  • Google OR-Tools CP-SAT Solver         |
|  • XGBoost Machine Failure Risk   |    |  • Precedence & No-Overlap Constraints   |
|  • Multi-Factor Suitability Engine|    |  • Dual Objectives (Option A vs B)       |
|  • SHAP Explainability Subsystem  |    |  • Horizon & Downtime Window Lockouts    |
+-------------------+---------------+    +-------------------+----------------------+
                    |                                        |
                    +--------------------+-------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        MONGODB PERSISTENCE LAYER                                  |
|   Database: production_planning                                                   |
|   Collections: users, machines, lanes, workers, materials, orders,                |
|                order_operations, schedules, schedule_operations, disruptions,     |
|                maintenance_work_orders, ml_predictions, audit_logs               |
+-----------------------------------------------------------------------------------+
```

---

## Code Architecture

```text
Project-Jarvis/
├── backend/
│   ├── app.py                      # Flask factory initialization, socketio, error handling
│   ├── config.py                   # Environment configuration, CP-SAT weights, AES keys
│   ├── extensions.py               # Flask extensions (JWT, CORS, SocketIO)
│   ├── database/
│   │   └── mongo.py                # MongoDB connection manager and collections indexer
│   ├── domain/
│   │   ├── enums.py                # MachineStatus, OrderPriority, DisruptionType enums
│   │   ├── errors.py               # Domain exception classes
│   │   └── events.py               # WebSocket event definitions
│   ├── ml/
│   │   ├── feature_engineering.py  # 14 processing features, 9 failure features
│   │   ├── processing_time_model.py# XGBoost processing duration predictor
│   │   ├── machine_failure_model.py# XGBoost machine failure risk classifier
│   │   ├── machine_suitability_model.py # Candidate scoring & ranking
│   │   ├── explainability.py       # SHAP TreeExplainer attribution
│   │   ├── model_manager.py        # Model artifact loader and cache
│   │   └── models/                 # Joblib serialized model artifacts
│   ├── models/                     # Domain entity serializers & validators
│   │   ├── machine.py
│   │   ├── order.py
│   │   ├── schedule.py
│   │   ├── worker.py
│   │   ├── material.py
│   │   ├── maintenance.py
│   │   └── user.py
│   ├── optimization/
│   │   ├── scheduler.py            # ProductionScheduler CP-SAT formulation
│   │   ├── constraints.py          # Precedence, non-overlap & downtime builders
│   │   ├── objective.py            # Weighted multi-objective calculation
│   │   └── candidate_machine_selector.py # Capability filter
│   ├── routes/
│   │   └── v1/                     # Versioned REST controllers
│   │       ├── auth_controller.py
│   │       ├── factory_controller.py
│   │       ├── machines_controller.py
│   │       ├── orders_controller.py
│   │       ├── disruptions_controller.py
│   │       ├── maintenance_controller.py
│   │       ├── simulation_controller.py
│   │       └── admin_controller.py
│   ├── seed/
│   │   └── seed_mongo.py           # 50 machines, 3 lanes, demo orders & workers
│   └── services/
│       ├── disruption_service.py   # Machine failure handling & recovery pipeline
│       ├── maintenance_service.py  # Work order state machine
│       ├── order_planning_service.py # Plan generation and approvals
│       ├── encryption_service.py   # AES-256-GCM application encryption
│       └── websocket_service.py    # SocketIO broadcast dispatcher
│
├── frontend/
│   ├── package.json
│   ├── webpack.config.js           # Webpack 5 dev server with /api proxy
│   ├── public/
│   │   └── index.html              # Light enterprise Tailwind tokens & fonts
│   └── src/
│       ├── App.js                  # React router & JWT session hydration
│       ├── components/
│       │   ├── AppLayout.js        # Shrinkable navigation sidebar & header
│       │   ├── FactoryMap.js       # SVG circular factory machine floor
│       │   ├── MachineNode.js      # Circular machine node (red failure, blue recovery)
│       │   ├── FlowConnector.js    # Animated SVG Bezier flow paths
│       │   ├── OrderView.js        # Compact production order table
│       │   ├── MachineDetailModal.js # Machine telemetry & formatted ML stats
│       │   ├── OrderDetailsModal.js  # Order route (secondary lane below primary)
│       │   └── DisruptionModal.js  # Option A vs Option B approval modal
│       ├── pages/
│       │   ├── LoginPage.js        # Seeded demo credentials display
│       │   ├── SignupPage.js       # Operational registration
│       │   ├── FactoryPage.js      # Dual view toggle: [ Lanes ] [ Orders ]
│       │   ├── SupervisorReviewPage.js # Plan review & constraint override
│       │   ├── MaintenancePage.js  # Fleet maintenance work order queue
│       │   └── SimulationPage.js   # What-if disruption sandbox
│       ├── services/
│       │   ├── api.js              # Axios client with JWT refresh interceptor
│       │   └── socket.js           # Socket.IO client connection
│       └── styles/
│           ├── factory.css         # SVG canvas, circular node & pulse styles
│           ├── global.css          # Enterprise light utility classes
│           └── variables.css       # Light design system variables
│
├── tests/
│   ├── test_auth.py                # JWT auth, token expiration, invalid logins
│   ├── test_auth_rbac_crypto.py    # RBAC permissions & AES-256-GCM verification
│   ├── test_disruption_pipeline.py # End-to-end failure injection & CP-SAT recovery
│   ├── test_ml.py                  # XGBoost models & schema contract verification
│   ├── test_models.py              # Domain entity serialization
│   ├── test_optimization.py        # CP-SAT feasible schedule generation
│   ├── test_simulation.py          # What-if sandbox non-destructive execution
│   └── test_state_machine.py       # Machine & maintenance state transitions
│
├── scripts/
│   ├── demo_reset.py               # Resets MongoDB collections to clean baseline
│   ├── generate_demo_data.py       # Generates synthetic manufacturing records
│   └── train_models.py             # Trains XGBoost regressors and classifiers
│
├── run.bat                         # Windows one-click launcher
└── README.md
```

---

## Development History & Evolution

The project progressed through iterative milestones focused on core scheduling, mathematical optimization, operational database persistence, and enterprise UI restoration:

1. **Foundational Scheduling & Optimization (`a66c113`):**
   - Implemented initial Google OR-Tools CP-SAT scheduler modeling precedence and capacity constraints.
   - Built XGBoost cycle-time regressor and interactive 2D SVG canvas.
2. **Environment & Scripting (`ec27077`):**
   - Packaged one-click launcher scripts (`run.bat`) for Windows developer workstations.
3. **MongoDB Migration & Plant Scale (`498e5e8`):**
   - Replaced SQL schema with MongoDB database (`production_planning`), scaling the plant model to 50 workstations across 3 parallel flow lanes.
   - Implemented disruption service and two-loop state machines.
4. **Layered Architecture & Audit Trails (`5c2d537`):**
   - Refactored backend into formal controllers, domain models, and service classes.
   - Added persistent audit logging for scheduling actions and state transitions.
5. **Security, Cryptography & Validation (`9b10c0f`):**
   - Implemented real JWT authentication with refresh rotation, role-based access control (`MANAGER`, `SUPERVISOR`, `SERVICE_PERSON`), and AES-256-GCM application encryption.
   - Added mathematical dual-objective options (Option A: Deadline Protection vs Option B: Cost Minimization) to the CP-SAT engine.
   - Hardened ML inference pipelines with numerical bounds validation, preventing `NaN`, `null`, or negative values.
6. **UI Restoration & Product Simplification (`a23edcc`):**
   - Restored the strict light-mode visual design language specified in [`ui.txt`](file:///d:/Studies/Project%20-%20Jarvis/ui.txt).
   - Restored the circular machine node network with connected flow paths.
   - Unified the Factory Floor into dual views (`[ Lanes ]` and `[ Orders ]`) and ensured secondary recovery lanes render directly below primary allocations.
   - Cleaned the navigation hierarchy to 6 essential operational pages.

---

## Security, Cryptography & RBAC

1. **Authentication:**
   - Stateless JWT tokens (access token lifespan 24 hours, refresh tokens).
   - Passwords hashed using `werkzeug.security` (PBKDF2/SHA-256).
   - Axios request interceptor automatically attaches Bearer tokens; response interceptor handles 401 refresh rotation.
2. **Role-Based Access Control (RBAC):**
   - Roles originate strictly from the backend JWT claim, never from frontend state.
   - `MANAGER`: Plant-wide authority; creates orders, configures lines, and approves/rejects disruption recovery plans.
   - `SUPERVISOR`: Production floor oversight; reviews order plans, validates machine overrides, inspects operations.
   - `SERVICE_PERSON`: Fleet engineering; manages maintenance queue, executes repairs, and verifies machines. Restricted from schedule approvals.
3. **Application-Level Encryption:**
   - Uses AES-256-GCM (`backend/services/encryption_service.py`) for sensitive application data fields with nonce-based authenticated encryption.
   - Encryption keys are loaded strictly from environment variables (`AES_ENCRYPTION_KEY`).

---

## Verification & Test Results

### 1. Automated Test Suite (Pytest)
Ran all 23 backend automated test suites with 100% pass rate:
```bash
python -m pytest tests/
======================= 23 passed, 3 warnings in 8.92s =======================
```

- `tests/test_auth.py` (3 tests): JWT login, token refresh, invalid credential rejection.
- `tests/test_auth_rbac_crypto.py` (6 tests): RBAC authorization, unauthorized access prevention, AES-256-GCM encryption/decryption round-trip.
- `tests/test_disruption_pipeline.py` (1 test): Full failure injection, candidate discovery, ML scoring, and CP-SAT schedule re-optimization.
- `tests/test_ml.py` (3 tests): XGBoost inference, numerical schema validation, feature extraction.
- `tests/test_models.py` (2 tests): Domain entity serialization and MongoDB schema compatibility.
- `tests/test_optimization.py` (3 tests): CP-SAT solver convergence, feasible assignment under capacity constraints, objective trade-offs.
- `tests/test_simulation.py` (1 test): Non-destructive sandbox execution without mutating live database state.
- `tests/test_state_machine.py` (4 tests): Machine status transitions and maintenance work order progression.

### 2. Frontend Build Verification
Compiled with Webpack 5:
```bash
npm run build
webpack 5.111.1 compiled with 3 warnings in 4001 ms (0 errors)
```

### 3. End-to-End Browser Verification
Executed autonomous browser validation against the running application:
- **Scenario A (Login):** Verified light theme, demo credential auto-fill, JWT session storage in `localStorage`.
- **Scenario B (Factory Map):** Verified 50 circular machine nodes across 3 lanes and 13 processes with SVG Bezier connectors; tested sidebar collapse/expand.
- **Scenario C (Machine Modal):** Clicked workstation node `FI-01`; confirmed modal-only display (no permanent side panel); verified formatted ML stats (`45 min`, failure risk `%`, zero `NaN` values).
- **Scenario D (Orders View):** Switched to Orders table; opened `ORD-1042` details modal; verified route steps and vertical secondary lane placement.
- **Scenario E (Disruption & Recovery):** Simulated mechanical failure on `CUT-02`; confirmed machine turned **RED** with `⚠ FAILED` badge; OR-Tools generated Option A and Option B; manager approval reallocated order to `CUT-01` (**BLUE** `↳ RECOVERY` node).
- **Scenario F (Maintenance Queue):** Verified creation of work order `WO-00001`; advanced status from `OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `REPAIRED` $\rightarrow$ `VERIFIED`; confirmed machine returned to operational status.
- **Scenario G (Responsive Testing):** Verified layouts on `1440×900`, `1024×768`, `768×1024`, and `390×844` with zero accidental page-level horizontal overflow.

## MongoDB Configuration

ReFlow uses **MongoDB Atlas as the PRIMARY database** and automatically supports **Local MongoDB fallback** for offline development, local demonstrations, and network resilience.

### Architecture & Fallback Behavior

```text
                  ReFlow Application
                          │
                          ▼
                  MongoDB Manager
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
    MongoDB Atlas                   Local MongoDB
   (Primary Cloud)                (Resilient Fallback)
          │                               │
          └───────────────┬───────────────┘
                          │
                          ▼
                 reflow Database
```

### Connection Modes (`DATABASE_MODE`)

Configure `DATABASE_MODE` in `.env`:

| Mode | Behavior | Use Case |
|---|---|---|
| **`auto`** *(Default)* | Attempts **MongoDB Atlas** first. If Atlas is unreachable or times out within `MONGODB_CONNECTION_TIMEOUT_MS` (5000ms), it automatically falls back to **Local MongoDB**. | Production deployments and local development with cloud resilience. |
| **`atlas`** | Strictly connects to **MongoDB Atlas only**. If Atlas is unavailable, raises a clear connection error without falling back. | Strict cloud-only production staging. |
| **`local`** | Strictly connects to **Local MongoDB only** (`mongodb://127.0.0.1:27017`). Does not attempt remote Atlas connection. | Air-gapped / offline local testing. |

### Diagnostic Health Endpoint (`GET /api/v1/health`)
The backend exposes a safe status probe indicating the active provider without revealing credentials:
```json
{
  "status": "healthy",
  "database": {
    "provider": "ATLAS",
    "status": "connected"
  },
  "ml_service": "available",
  "optimization_engine": "available"
}
```
*(When local fallback is engaged, `"provider"` reports `"LOCAL"`).*

---

## Setup & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Local MongoDB community server (listening on `mongodb://127.0.0.1:27017`)
- MongoDB Atlas cluster URI (optional if using local fallback)

### 1. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Edit `.env` to configure your database connection:
```env
MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/reflow?retryWrites=true&w=majority&appName=Cluster0
MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=reflow
MONGODB_CONNECTION_TIMEOUT_MS=5000
DATABASE_MODE=auto
```

### 2. Database Seeding
To manually seed or reset the active database (Atlas or Local):
```bash
python scripts/seed_demo.py
```
*(The backend also automatically verifies and seeds the 50 machines and default operations on initial startup if the database is empty).*

### 3. Backend Setup
```bash
# Navigate to repository root
cd "d:/Studies/Project - Jarvis"

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask backend server (port 5000)
python backend/app.py
```

### 4. Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the Webpack development server (port 3000)
npm start
```

### 5. Accessing the Application
Open [http://localhost:3000](http://localhost:3000) in a web browser.

### Seeded Demo Accounts (Displayed on Login Page)
| Role | Username | Password | Operational Access |
|---|---|---|---|
| **Plant Manager** (*Nirvagam*) | `manager` | `password123` | Full plant authority, order creation, disruption recovery approval |
| **Floor Supervisor** (*Meerpaarvai*) | `supervisor` | `password123` | Floor oversight, production plan review, schedule validation |
| **Service Technician** (*Paramaippu*) | `service` | `password123` | Fleet maintenance queue, work orders, repair verification |
