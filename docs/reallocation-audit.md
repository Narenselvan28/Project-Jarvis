# Technical Audit: Disruption Recovery, Reallocation Engine & State Transitions

This document provides a comprehensive audit of the Intelligent Production Scheduling + Manufacturing ERP platform (**ReFlow**) regarding machine disruption handling, candidate discovery, ML prediction, OR-Tools CP-SAT reoptimization, schedule versioning, and state transition governance.

---

## 1. Current Failure Endpoint
- **Primary Endpoint**: `POST /api/v1/manager/simulate-disruption` in [`backend/routes/v1/manager_controller.py`](file:///d:/Studies/Project - Jarvis/backend/routes/v1/manager_controller.py)
- **Legacy Endpoint**: `POST /api/disruptions/simulate` in [`backend/routes/disruptions.py`](file:///d:/Studies/Project - Jarvis/backend/routes/disruptions.py)
- **Payload**:
  ```json
  {
    "machine_id": "CUT-02",
    "failure_type": "Mechanical Breakdown",
    "duration_hours": 6.0,
    "reason": "Spindle motor overheating"
  }
  ```
- **Handler Delegation**: Invokes `DisruptionService.simulate_disruption(...)` with authenticated user context.

---

## 2. Current Impact-Analysis Service
- **Implementation**: [`backend/services/disruption_service.py`](file:///d:/Studies/Project - Jarvis/backend/services/disruption_service.py) and [`backend/services/impact_analysis_service.py`](file:///d:/Studies/Project - Jarvis/backend/services/impact_analysis_service.py)
- **Mechanism**:
  1. Sets target machine status to `FAILED` in `machines` collection.
  2. Queries `order_operations` where `assigned_machine_id == machine_id` and `status != "COMPLETED"`.
  3. Collects affected order IDs (e.g. `ORD-1042`).
  4. Marks affected operations and orders as `BLOCKED`.
  5. Generates a maintenance work order in `maintenance` collection.

---

## 3. Current Machine Learning Service
- **Implementations**:
  - [`backend/ml/prediction.py`](file:///d:/Studies/Project - Jarvis/backend/ml/prediction.py): Inference wrappers for Processing Time and Failure Risk.
  - [`backend/ml/manager.py`](file:///d:/Studies/Project - Jarvis/backend/ml/manager.py): Singleton model registry holding trained XGBoost Regressor, XGBoost Classifier, and SHAP TreeExplainer.
  - [`backend/optimization/candidate_machine_selector.py`](file:///d:/Studies/Project - Jarvis/backend/optimization/candidate_machine_selector.py): `find_candidate_machines()` queries compatible workstations, extracts feature vectors, runs ML inference, and computes composite suitability scores.

---

## 4. Current Optimizer (OR-Tools CP-SAT)
- **Scheduler**: [`backend/optimization/scheduler.py`](file:///d:/Studies/Project - Jarvis/backend/optimization/scheduler.py) (`ProductionScheduler.generate_two_recovery_options`)
- **Model Builder**: [`backend/optimization/constraints.py`](file:///d:/Studies/Project - Jarvis/backend/optimization/constraints.py) (`SchedulingModelBuilder`)
- **Capabilities**:
  - Uses `NewOptionalIntervalVar` for each candidate machine.
  - Enforces `AddExactlyOne(presence_vars)` so exactly one machine is assigned per operation.
  - Enforces `AddNoOverlap` per machine to eliminate concurrent conflicts.
  - Enforces operation precedence (`op_start >= prev_op_end`).
  - Supports multi-objective optimization balancing tardiness, cost, deadline penalties, and schedule change stability.

---

## 5. Current Recovery Service
- **Implementation**: [`backend/services/disruption_service.py`](file:///d:/Studies/Project - Jarvis/backend/services/disruption_service.py)
- **Endpoints in Controller**:
  - `POST /api/v1/recovery/:id/approve`
  - `POST /api/v1/recovery/:id/reject`
  - `POST /api/v1/recovery/:id/regenerate`
- **Missing Endpoint**: `GET /api/v1/recovery/:id` is currently missing.

---

## 6. Current Database Collections (MongoDB)
- **`machines`**: 50 workstations across 3 lanes with status (`AVAILABLE`, `RUNNING`, `FAILED`, `MAINTENANCE`), process capabilities, and hourly rates.
- **`orders`**: Active customer orders with deadlines, priorities, and manufacturing routes.
- **`order_operations`**: Individual steps per order with assigned machine, process, sequence, scheduled start/end minutes, and status (`QUEUED`, `RUNNING`, `BLOCKED`, `REASSIGNED`).
- **`schedules`**: Versioned schedule metadata (`version`, `status`, `parent_schedule_id`, `schedule_type`).
- **`schedule_operations`**: Detailed operation schedule per version.
- **`disruptions`**: Disruption events with Option A and Option B solution trees.
- **`maintenance`**: Work orders for service personnel.
- **`planning_plans`**: Supervisor proposed plans.
- **`audit_logs`**: Immutable event stream.

---

## 7. Current Frontend Recovery Components
- **`DisruptionModal.js`**: Manager simulation dialog, candidate display, Option A vs B comparison, approval confirmation dialog.
- **`FactoryMap.js` & `FlowConnector.js`**: Shopfloor canvas rendering lanes, machine nodes, and connection lines.
- **`SupervisorReviewPage.js`**: Supervisor plan review and sign-off.
- **`OrderGanttChart.js`**: Gantt chart timeline.

---

## 8. Current WebSocket Events
- `machine_failed`: Dispatched when a machine breaks down.
- `optimization_started`: Dispatched when CP-SAT solver starts.
- `machine_status_changed`: Dispatched on machine state transition.
- `schedule_updated`: Dispatched when a new schedule version is activated.
- `maintenance_created`: Dispatched when work order is filed.
- `machine_repaired`: Dispatched when maintenance completes.

---

## 9. Current State Transition Implementation
- **Machine State**: [`backend/domain/machine_state.py`](file:///d:/Studies/Project - Jarvis/backend/domain/machine_state.py) enforces valid transitions and role permissions (`MANAGER`, `SUPERVISOR`, `SERVICE_PERSON`).
- **Maintenance State**: [`backend/domain/maintenance_workflow.py`](file:///d:/Studies/Project - Jarvis/backend/domain/maintenance_workflow.py).
- **Schedule Versioning**: [`backend/domain/schedule_versioning.py`](file:///d:/Studies/Project - Jarvis/backend/domain/schedule_versioning.py).

---

## 10. Exact Reasons Current Implementation Fails

### Root Cause 1: `NameError: name 'InvalidStateTransitionError' is not defined`
- In [`backend/services/order_planning_service.py`](file:///d:/Studies/Project - Jarvis/backend/services/order_planning_service.py#L279), the code checks `if curr_status not in ["PENDING_SUPERVISOR_REVIEW", ...]`:
  `raise InvalidStateTransitionError(curr_status, "SUPERVISOR_APPROVED", ...)`
- **The import statement `from backend.domain.errors import InvalidStateTransitionError` was missing.**
- Whenever a plan in an unexpected state was acted upon, Python raised an unhandled `NameError`, which Flask returned as an internal server 500 error that crashed the Supervisor Review page.
- In addition, the frontend UI rendered `[ APPROVE PLAN ]` even when plans were already in terminal states (`SUPERVISOR_APPROVED`, `REJECTED`), causing illegal transition attempts.

### Root Cause 2: Reallocation Engine Did Not Apply Full Rescheduled Operations
- When Manager approved Option A or Option B in `DisruptionService.approve_recommendation()`, the method only executed:
  ```python
  op_coll.update_many({"assigned_machine_id": failed_machine_id}, {"$set": {"assigned_machine_id": selected_machine_id}})
  ```
- **It discarded the full OR-Tools solved timeline (`assignments`)!**
- Downstream operations (`BND-02`, `SH-02`, etc.) were left with their original `scheduled_start_min` and `scheduled_end_min`, creating immediate precedence violations (`next_op.start < prev_op.end`).
- It did not create a new `ACTIVE` schedule version (`version: 2`) in `schedules` and `schedule_operations`.

### Root Cause 3: Factory Floor Route Rendering Geometry Flaw
- In [`frontend/src/components/FactoryMap.js`](file:///d:/Studies/Project - Jarvis/frontend/src/components/FactoryMap.js#L49-L75), when an operation had status `REASSIGNED`, the component synthesized ad-hoc diagonal Bezier connectors from `prevOp` to `reassignedOp` and `reassignedOp` to `nextOp` on top of the static horizontal lane tracks.
- This created arbitrary cross-factory overlay lines that crossed unrelated machines, rather than rendering the actual sequential order production route (`FI -> SP -> CUT-01 [RECOVERED] -> BND -> ...`).
