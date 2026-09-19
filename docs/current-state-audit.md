# ARIVON Platform: Current State Audit Report

**Date:** September 18, 2026  
**System:** ARIVON — Adaptive Manufacturing Intelligence Platform  
**Target Architecture:** MongoDB canonical store + Google OR-Tools CP-SAT + XGBoost ML + React 18 / Webpack 5 + Flask / SocketIO  

---

## 1. What Currently Exists

### Database Layer
* **MongoDB Engine:** [`backend/database/mongo.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/database/mongo.py) implements a resilient singleton connection manager:
  * First attempts remote MongoDB Atlas (`mongodb+srv://...`).
  * If Atlas DNS or network IP is unreachable, connects directly to native local MongoDB service (`mongodb://127.0.0.1:27017/production_planning`).
  * Only if local server is down does it fall back to `mongomock`.
* **MongoDB Data Access:** [`backend/database/models.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/database/models.py) provides class-based document helpers (`UserDB`, `MachineDB`, `OrderDB`, `ScheduleDB`, `DisruptionDB`, `MaintenanceDB`, `PlanningDB`, `AuditLogDB`).
* **Seeding:** [`backend/seed/seed_mongo.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/seed/seed_mongo.py) seeds:
  * 50 individually addressable machines across 13 apparel stages (`FI-01..02`, `SP-01..03`, `CUT-01..03`, `BND-01..04`, `SH-01..04`, `COL-01..04`, `SL-01..04`, `SS-01..04`, `HM-01..04`, `PR-01..02`, `EMB-01..02`, `FIN-01..04`, `QC-01..04`, `PK-01..06`).
  * 3 production lanes (`L01`, `L02`, `L03`).
  * Demo order `ORD-1042` with 13 sequential operations.
  * 29 additional background orders.
  * 1,200 synthetic historical records for ML.

### Machine Learning
* **Models Trained:**
  * XGBoost regressor for cycle-time prediction: MAE 2.76m, $R^2 \approx 0.9858$.
  * XGBoost classifier for machine failure probability.
* **Artifacts:** Saved in [`backend/ml/models/`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/models/) (`processing_time_model.joblib`, `failure_risk_model.joblib`, `training_metrics.json`).
* **Inference API:** [`backend/ml/prediction.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/prediction.py) and [`backend/ml/machine_suitability_model.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/ml/machine_suitability_model.py).

### Optimization (OR-Tools CP-SAT)
* **Scheduler:** [`backend/optimization/scheduler.py`](file:///d:/Studies/Project%20-%20Jarvis/backend/optimization/scheduler.py):
  * Solves multi-objective schedule optimization.
  * Generates **Option A (Deadline Protection)** vs **Option B (Cost & Stability)**.
  * `validate_plan()` constraint checker for supervisor editing.
  * Computes heuristic baselines (FCFS, SPT, EDD, WSPT vs OR-Tools).

### Frontend (React 18 + Webpack 5)
* **Pages:** `FactoryPage`, `PlanningPage`, `SupervisorPlansPage`, `GanttPage`, `MaintenancePage`, `AnalyticsPage`, `AuditLogPage`, `LoginPage`.
* **Components:** 2D SVG canvas (`FactoryMap.js`), interactive nodes (`MachineNode.js`), order flow connectors (`FlowConnector.js`), SVG Gantt chart (`OrderGanttChart.js`), two-option modal (`DisruptionModal.js`), and demo toolbar (`DemoToolbar.js`).
* **Packaging:** Pure JS, Babel, Webpack 5 dev server on port 3000, production build verified with 0 compilation errors.

---

## 2. What Works Well (Preserve)
1. **Garment Factory Fleet Topology:** 50 individual machines and 13 apparel stages are correctly defined and visually rendered in the SVG canvas.
2. **Order-Level Gantt Chart:** Timeline visualization, reassignment indicators (`CUT-02 FAILED → CUT-01 REASSIGNED`), zoom controls, and operational metrics are fully working.
3. **Two-Option Disruption Recovery Engine:** Real CP-SAT optimization with differentiated objective weights (Option A vs Option B).
4. **PyTest Automated Suite:** 9/9 unit tests pass.
5. **Native MongoDB Integration:** Fully operational on Windows service `mongodb://127.0.0.1:27017`.

---

## 3. Incomplete, Inconsistent, or Legacy Items (Must Refactor)

### A. Contradictory Database Architecture
* **Problem:** Residual SQLAlchemy models in [`backend/models/`](file:///d:/Studies/Project%20-%20Jarvis/backend/models/) (`machine.py`, `order.py`, etc.) and SQLite database file `backend/adaptive_factory.db` remain in the repo. Some legacy services (`machine_service.py`, `impact_analysis_service.py`, `scheduling_service.py`) still attempt to import SQLAlchemy models.
* **Refactor Requirement:** Completely migrate all data access to a clean **Repository Pattern** over MongoDB. Remove obsolete SQLite/MySQL dependencies and dead models.

### B. Route Structure & API Versioning
* **Problem:** Current endpoints are mounted directly under `/api/...` (e.g. `/api/machines`, `/api/orders`, `/api/admin/disruptions`) without explicit `/api/v1` namespace, and return varying response envelopes.
* **Refactor Requirement:** Organize clean controllers under `/api/v1/...` with standard response envelope:
  * Success: `{"success": true, "data": ..., "meta": ...}`
  * Error: `{"success": false, "error": {"code": "...", "message": "..."}}`
  * Maintain backward-compatible aliases for `/api/...` so current frontend components continue working without disruption.

### C. Validation & Schema Enforcement
* **Problem:** Request validation is partially ad-hoc inside route functions using `request.get_json()`.
* **Refactor Requirement:** Introduce **Pydantic schemas** in `backend/schemas/` for input sanitization, data validation, and strict type constraints.

### D. Layered Architecture Separation
* **Problem:** Some business logic resides inside routes (`routes/planning.py` is 14KB).
* **Refactor Requirement:** Separate cleanly into:
  * `routes/` (Controllers)
  * `schemas/` (Pydantic models)
  * `services/` (Application logic)
  * `domain/` (Entities, business rules, schedule versioning, state machines)
  * `repositories/` (MongoDB collections & indexes)

### E. Schedule Versioning
* **Problem:** Schedules currently only toggle `is_active=True/False`.
* **Refactor Requirement:** Implement explicit schedule versioning (`SCHEDULE-001`, `v1 BASELINE`, `v2 OPTIMIZED`, `v3 RECOVERY`) preserving parent IDs, timestamps, and creator provenance without overwriting history.

### F. Simulation Engine (What-If)
* **Problem:** `routes/simulation.py` was partially coupled to old SQLAlchemy models.
* **Refactor Requirement:** Ensure What-If simulation snapshots current factory state in-memory, applies hypothetical failure, runs ML + CP-SAT, and returns projections **without mutating production state**.

### G. ML CLI Tools & SHAP Explainability
* **Problem:** Missing standardized CLI commands (`python -m ml.train ...`, `python -m ml.evaluate`, `python -m ml.predict`).
* **Refactor Requirement:** Implement `backend/ml/__main__.py` to support exact CLI invocations and add SHAP feature attribution explainability.

### H. Infrastructure & Deployment
* **Problem:** `docker-compose.yml` still references MySQL instead of MongoDB. `setup.bat` needs refinement for Windows.
* **Refactor Requirement:** Update Dockerfile, docker-compose.yml with MongoDB container, health checks, and production Gunicorn WSGI configuration.

---

## 4. Preservation & Modernization Strategy

* **Preserve:** All existing visual designs, 2D SVG canvas geometry, Gantt timeline components, and CP-SAT mathematical optimization formulations.
* **Upgrade:** Refactor the backend foundation into clean Pythonic layered architecture with Pydantic validation and MongoDB repositories.
* **Document:** Generate comprehensive architecture, API, database, ML, optimization, and security documentation.

---

## 5. End-to-End Data Lifecycle Trace & Defect Audit

### A. End-to-End Link Verification

1. **UI Routes & Components:**
   - Missing `/admin` route in `App.js` and missing navigation entry in `AppLayout.js`.
   - `OrdersPage.js`: Modal closes immediately after order creation without displaying the generated production plan or ML inference scores.
   - `SupervisorReviewPage.js`: Lacks an explicit confirmation modal before activating the plan; permits single-click activation.
   - `DisruptionModal.js`: Hardcodes target order `ORD-1042`; lacks an explicit review confirmation dialog before approving recovery Option A or B; lacks a clean rejection and re-generation workflow.
   - `MaintenancePage.js`: Missing state transition button to advance tickets from `REPAIRED` to `VERIFIED`; missing self-assignment action for `OPEN` tickets.

2. **API Controllers & Routes:**
   - Missing dedicated Manager endpoint: `POST /api/manager/simulate-disruption` and `POST /api/v1/manager/simulate-disruption`.
   - Missing Admin endpoints: `/api/v1/admin/dashboard`, `/api/v1/admin/users`, `/api/v1/admin/machines`, `/api/v1/admin/audit-logs`.
   - Schedule approval endpoint missing explicit state verification `current_status == PENDING_SUPERVISOR_REVIEW` and metadata capture (`approved_by`, `approved_at`, `schedule_version`).

3. **Service Layer:**
   - `DisruptionService`: Recovery option generation relies on fallback machines if lane alternatives are not matched.
   - `MaintenanceService`: Machine synchronization on `VERIFIED` must cleanly restore machine state to `AVAILABLE` and update operational queues.
   - `OrderPlanningService`: Needs to strictly emit `PENDING_SUPERVISOR_REVIEW` status and compute complete feature vectors for ML.

4. **Database & Repository Queries:**
   - MongoDB is functioning locally (`mongodb://127.0.0.1:27017`), but `.env` was defaulting to Atlas with network delays. Fixed to `DATABASE_MODE=local`.
   - All state must be queried dynamically from MongoDB collections (`machines`, `orders`, `order_operations`, `planning_plans`, `schedules`, `disruptions`, `maintenance_tickets`, `audit_logs`).

5. **ML Prediction Services:**
   - XGBoost models (`processing_time_model.joblib` and `failure_risk_model.joblib`) are present and valid.
   - Must be invoked on all new orders and candidate machine evaluations to provide real inference values (cycle time, failure probability, feature attributions).

6. **OR-Tools Optimization Models:**
   - CP-SAT solver generates multi-objective schedules.
   - Must produce genuinely distinct options: Option A (Deadline Protection with high tardiness penalties) vs Option B (Cost & Stability with high cost/change penalties) without static fallbacks.

7. **WebSocket Emissions:**
   - Events `machine.updated`, `disruption.triggered`, `schedule.updated`, `plan.created`, `order.updated` must be broadcasted on state changes so all clients update without full reloads.

8. **Role-Based Access Control (RBAC):**
   - MANAGER: Disruption simulation, recovery route approval, view all.
   - SUPERVISOR: Create orders, review plans, edit plans, approve/reject plans, view all. Restricted from disruption triggers.
   - SERVICE_PERSON: Maintenance tickets (`ASSIGNED → IN_PROGRESS → REPAIRED → VERIFIED`), diagnostics notes, invoicing. Restricted from schedule approvals.
   - ADMIN: Full system overview, user management, machine configuration, audit trail.

---

### B. Detailed Defect Matrix

| Feature / Workflow | Current Implementation | Intended Behavior | Gap / Root Cause | Required Fix |
|---|---|---|---|---|
| **1. Alternative / predicted production path suggestion** | Uses candidate machines with occasional fallback to `CUT-01` / `CUT-03`. | Dynamically evaluates all available machines matching the process across all lanes with suitability scores, ML cycle time, failure risk, and cost. | Hardcoded fallback machines in scheduler; incomplete path visualization in UI. | Connect candidate selector to full MongoDB machine pool, run XGBoost models, and provide alternative route suggestions. |
| **2. Admin panel** | Route `/admin` does not exist; backend only has disruption reset. | Dedicated `/admin` route with System Overview, Machine Management (50 machines), User Management (CRUD + role change), and Live System Activity logs. | Missing `AdminPage.js`, missing routes in `App.js` & `AppLayout.js`, missing backend endpoints. | Build `AdminPage.js`, implement `/api/v1/admin/...` endpoints, protect with role checking. |
| **3. Simulate Machine Failure** | Hidden button; lacks dedicated manager endpoint specified in prompt. | Manager can trigger machine failure from dashboard or machine modal via `POST /api/v1/manager/simulate-disruption` selecting any machine, downtime duration, and failure type. | Missing dedicated controller; modal was coupled to fixed order. | Add `manager_controller.py`, mount `POST /api/v1/manager/simulate-disruption`, dynamically list all machines in modal. |
| **4. Manager Recovery Route Approval & Rejection** | Disruption modal approves directly on button click without confirmation; rejection flow incomplete. | Manager reviews Option A vs Option B with clear metrics; clicking Approve prompts a Confirmation Dialog; confirming updates status `PENDING_APPROVAL → APPROVED → ACTIVE`; rejection allows generating a new recovery. | Missing confirmation modal component; rejection did not support regeneration. | Add confirmation modal to `DisruptionModal.js`, add rejection with regeneration endpoint, update state machine. |
| **5. Supervisor New Order + ML Execution** | Order creation posts to backend and immediately closes modal without displaying ML predictions or plan scorecard. | Order creation generates operations, extracts features, runs XGBoost regressor and failure classifier, sets status `PENDING_SUPERVISOR_REVIEW`, and opens plan review. | Modal dismissed without navigating to review; status was `PENDING_SUPERVISOR_APPROVAL`. | Normalize status to `PENDING_SUPERVISOR_REVIEW`, return full ML predictions, guide user to `/review`. |
| **6. Supervisor Confirmation Step** | Approve button immediately commits plan to active schedule. | Backend and UI require explicit review and confirmation dialog summarizing completion, cost, and deadline. Enforces `PENDING_SUPERVISOR_REVIEW → SUPERVISOR_APPROVED → ACTIVE`. | No confirmation step in `SupervisorReviewPage.js`; missing strict two-step state validation. | Implement confirmation modal in frontend and strict state machine verification in backend controller. |
| **7. Disruption Simulation End-to-End Execution** | Disruption triggers in service, but operation state updates and maintenance link were inconsistent. | End-to-end chain: Failure simulated -> Machine `FAILED` -> affected operations `BLOCKED` -> Maintenance ticket created -> Recovery options generated -> WebSocket broadcast -> Approval -> Operations reassigned -> Machine states updated -> Schedule version saved. | Incomplete linkage between disruption service and maintenance repository in all edge cases. | Ensure atomic-like transaction logic in `DisruptionService` and verify end-to-end event chain. |
| **8. Service Person Actions** | Cannot transition `REPAIRED → VERIFIED` from ticket modal; tickets cannot be self-assigned. | Service Person can view tickets, self-assign (`OPEN → ASSIGNED`), start work (`IN_PROGRESS`), mark `REPAIRED` with notes, mark `VERIFIED`, and restore machine to `AVAILABLE`. | Missing UI buttons and backend handlers for `REPAIRED → VERIFIED` in maintenance modal. | Add full lifecycle buttons to `MaintenancePage.js` and connect to `MaintenanceService` with role verification. |

