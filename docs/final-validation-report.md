# ReFlow — Final Platform Validation & Architecture Report

**Platform**: ReFlow (Adaptive Production Intelligence)  
**Subtitle**: Adaptive Production Scheduling & Disruption Management  
**Version**: 2.0 (Production Release)  
**Date of Validation**: September 19, 2026  
**Environment**: Production Localhost (`Node.js 24.17` / `Webpack 5.111` / `Python 3.11.9` / `MongoDB 8.0`)  

---

## 1. System Architecture

ReFlow is engineered as an enterprise-grade adaptive manufacturing execution and disruption recovery platform. The architecture separates operational data persistence, mathematical constraint optimization, machine learning inference, and real-time reactive user interfaces:

```
                                 REFLOW ARCHITECTURE
                                 
   +----------------------------------------------------------------------------+
   |                             FRONTEND LAYER                                 |
   |   React.js 18 (Vanilla JavaScript, Babel, Webpack 5)                       |
   |   - Strict Light Theme (#f8fafc / #ffffff / #0f172a slate & navy)          |
   |   - Collapsible Adaptive Sidebar with Tamil-English Dual Taxonomy          |
   |   - Factory Floor: Dual Switcher [ LANES VIEW ] <---> [ ORDER VIEW ]       |
   |   - Deterministic 13-Process Grid & Secondary Lane Recovery Renderers      |
   +----------------------------------------------------------------------------+
                                        ▲
                   HTTP REST API (JWT)  │  WebSocket Real-Time Events
                                        ▼
   +----------------------------------------------------------------------------+
   |                             BACKEND LAYER                                  |
   |   Python Flask + Flask-SocketIO + Flask-JWT-Extended                       |
   |   - REST Controllers (/api/v1/auth, factory, orders, disruptions, etc.)    |
   |   - Domain Engine & State Machine (MachineState, OrderState, TicketState)  |
   |   - RBAC Enforcement Decorators (@role_required)                           |
   |   - Authenticated Application Cryptography (AES-256-GCM)                   |
   +----------------------------------------------------------------------------+
          ▲                              ▲                            ▲
          │                              │                            │
          ▼                              ▼                            ▼
   +---------------+             +---------------+            +---------------+
   |   DATABASE    |             |  ML PIPELINE  |            | OPTIMIZATION  |
   |  MongoDB 8.0  |             |  XGBoost      |            | Google        |
   |  Native Store |             |  - Duration   |            | OR-Tools      |
   |  - machines   |             |  - Failure    |            | CP-SAT Solver |
   |  - orders     |             |  - Confidence |            | - Option A    |
   |  - schedules  |             |  - SHAP Feat. |            | - Option B    |
   |  - audit_logs |             |    Importance |            | - Multi-Obj.  |
   +---------------+             +---------------+            +---------------+
```

---

## 2. Authentication & JWT Architecture

- **Stateless Verification**: Uses JSON Web Tokens (JWT) signed via HS256 with key configuration from `JWT_SECRET_KEY`.
- **Dual-Token Lifecycle**:
  - `access_token`: Short-lived (15 minutes) for API request authorization.
  - `refresh_token`: Long-lived (30 days) for controlled session extension via `/api/v1/auth/refresh`.
- **Identity Payload**: Contains `sub` (User ID), `role` (`MANAGER`, `SUPERVISOR`, `SERVICE_PERSON`), and `name`.
- **Demonstration Account Isolation**: Pre-configured demo credentials appear strictly on `/login`. No role switchers or demo selectors exist within the operational views.

---

## 3. User Registration (Signup) & Governance

- **Dedicated Route**: `/signup` rendered in strict light mode.
- **Role Governance**: Public registration strictly restricts unauthorized creation of `MANAGER` accounts. Only `SUPERVISOR` and `SERVICE_PERSON` roles are permitted for public signup; managerial accounts require administrative creation.
- **Validation**: Strict password length and strength validation, unique username and email enforcement, with encrypted persistence to MongoDB.

---

## 4. Role-Based Access Control (RBAC)

RBAC is strictly enforced on the **backend** using the `@role_required(*allowed_roles)` decorator. Frontend UI controls adapt to user roles, but attempts to bypass UI restrictions return `HTTP 403 Forbidden`:

| Role | Authorizations | Prohibitions |
| :--- | :--- | :--- |
| **MANAGER** | Create orders, approve/reject baseline production plans, authorize recovery Option A or Option B, run disruption simulations, view audit trails and analytics. | Cannot execute physical machine repair completions without service certification. |
| **SUPERVISOR** | View factory floor and active orders, inspect production routes, review machine allocations, approve/reject shopfloor baseline schedules. | Cannot authorize disruption recovery alternatives or alter financial priority flags. |
| **SERVICE_PERSON** | Access maintenance queue (`Paramaippu`), accept work orders, initiate repair work, log repair notes, mark machines as `REPAIRED` and `VERIFIED`. | Cannot approve production plans, alter scheduling constraints, or override order sequences. |

---

## 5. AES-256-GCM Application Cryptography

- **Cipher**: AES-256 in Galois/Counter Mode (GCM), providing authenticated encryption with associated data (AEAD).
- **Service Implementation**: `backend/services/encryption_service.py` (`encrypt_sensitive_data`, `decrypt_sensitive_data`).
- **Key Storage**: Master key loaded strictly from environment variable `AES_ENCRYPTION_KEY`. Never hardcoded, never committed, never displayed.
- **Cryptographic Scope**: Targeted exclusively at designated sensitive application data fields (e.g., client proprietary specifications and secure diagnostic notes). MongoDB collections remain transparent for high-speed indexing and operational querying.

---

## 6. MongoDB Data Persistence

MongoDB serves as the sole, single source of truth for all operational entities:
- `machines`: 50+ individually addressable workstations with layout metadata (`grid_row`, `grid_column`, `process_code`, `lane_id`, `utilization`).
- `orders`: 30+ active manufacturing orders with 13 sequential apparel operations.
- `schedules`: Active shopfloor schedules with exact operation start/end times and machine allocations.
- `maintenance_orders`: Complete work order queue with lifecycle tracking.
- `audit_logs`: Immutable chronological governance stream.
- `users`: Authenticated enterprise accounts with hashed credentials.

---

## 7. Machine Learning Pipeline & Reliability Contract

### Models Retained
1. **Processing Time Model**: XGBoost Regressor predicting stage completion time based on order quantity, fabric weight, stitch density, and machine capability.
2. **Failure Risk Model**: XGBoost Classifier evaluating machine telemetry (vibration, temperature, cumulative operating hours) to predict failure probability.

### Reliability Contract
Every prediction returned from `/api/v1` strictly adheres to a standardized contract to eliminate frontend rendering anomalies:
```json
{
  "prediction_id": "PRED-XGB-2026-0919",
  "model": {
    "name": "processing_time_xgboost",
    "version": "1.2.0"
  },
  "prediction": {
    "value": 131.4,
    "unit": "minutes"
  },
  "confidence": 0.91,
  "explanation": [
    { "feature": "quantity", "impact": 14.2 },
    { "feature": "stitch_density", "impact": 8.5 }
  ],
  "timestamp": "2026-09-19T00:30:00.000Z",
  "input_validation": "VALIDATED"
}
```
**Zero Tolerance for `undefined`, `NaN`, `null`, or unvalidated strings**: When ML inference encounters out-of-distribution inputs, a controlled fallback state is returned with clear explanatory diagnostic codes.

---

## 8. Google OR-Tools CP-SAT Optimization & Multi-Objective Recovery

OR-Tools CP-SAT functions as the deterministic constraint solver:
- **Hard Constraints**: Machine capability matching, non-overlapping task intervals, strict operation precedence ($FI \rightarrow SP \rightarrow CUT \rightarrow \dots \rightarrow PK$), worker skill qualifications, and operational shift boundaries.
- **Two Recovery Options**: Upon disruption, OR-Tools generates two distinct feasible schedules:
  - **Option A (Deadline Protection)**: Minimizes tardiness and protects customer delivery dates, accepting machine reassignments across lanes if necessary.
  - **Option B (Cost & Stability)**: Minimizes schedule changes and reassignment costs, absorbing minor schedule buffering without cross-lane turbulence.
- **Human-in-the-Loop**: The platform never auto-commits a recovered schedule; explicit Manager approval (`APPROVE OPTION A` or `APPROVE OPTION B`) is mandatory.

---

## 9. Factory Floor Dual Views & Deterministic Layout

The Factory Floor implements two distinct operational perspectives:

### 1. Lanes View (`Iyandhiram / Flow`)
- **Deterministic 13-Process Grid**:
  $\text{FI} \rightarrow \text{SP} \rightarrow \text{CUT} \rightarrow \text{BND} \rightarrow \text{SH} \rightarrow \text{COL} \rightarrow \text{SL} \rightarrow \text{SS} \rightarrow \text{HM} \rightarrow \text{PR/EMB} \rightarrow \text{FIN} \rightarrow \text{QC} \rightarrow \text{PK}$
- **Lane Rows**: 4 horizontal production lane bands (`Lane 1` to `Lane 4`).
- **Node Design**: Compact workstations displaying Machine ID, Process, Status Pill, Active Order, and Utilization %.
- **Failed Machine Indicator**: When a machine fails, the node transforms into a bold **RED** card with a red border, warning icon (`⚠ FAILED`), and red status marker.
- **Floating Modal**: Clicking a machine opens **only** `MachineDetailModal`. The permanent side panel was eliminated to keep the factory floor unobstructed.

### 2. Order View (`Aanaigal / Operations`)
- **Compact Order Table**: Filterable by priority and status, with order progress bars.
- **Order Route Modal**: Visualizes the order's sequential route, current active operation, assigned machine, and assigned lane.
- **Secondary Lane Recovery**: When an operation is reassigned to a machine in another lane, the **Secondary Lane is rendered directly below the Primary Lane**, visually demarcating the recovery bypass without crossing diagonal lines.

---

## 10. Real-Time WebSocket Event Pipeline

Flask-SocketIO broadcasts state changes instantly across connected clients:
- `machine.failed` & `machine.repaired`
- `order.updated` & `operation.updated`
- `disruption.created` & `recovery.completed`
- `schedule.updated` & `schedule.approved`
- `maintenance.updated`

**Live Reactive Updates**: Disruption events update machine nodes to red, block affected operations, and prompt recovery modals without requiring manual page refreshes.

---

## 11. Maintenance Lifecycle Management

The maintenance queue (`/maintenance`) implements a rigorous 5-stage lifecycle:
$$\text{OPEN} \longrightarrow \text{ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{REPAIRED} \longrightarrow \text{VERIFIED} \longrightarrow \text{AVAILABLE}$$

Service personnel manage diagnostics, record technical notes, and sign off on verification before a machine's status is restored to `AVAILABLE` on the factory floor.

---

## 12. Audit & Governance Trail

Accessible via `/audit`, the immutable audit log records all administrative, operational, and system actions:
- User actions (`LOGIN`, `SIGNUP`, `LOGOUT`)
- Order lifecycle (`ORDER_CREATED`, `ORDER_UPDATED`)
- Machine transitions (`MACHINE_STATUS_CHANGED`)
- Disruption and recovery (`DISRUPTION_CREATED`, `RECOVERY_APPROVED`, `RECOVERY_REJECTED`)
- Maintenance events (`MAINTENANCE_CREATED`, `MACHINE_REPAIRED`, `MACHINE_VERIFIED`)

Includes before/after state diffs, actor role, entity target, and UTC timestamps.

---

## 13. Responsive Viewport Verification

Tested across standard display resolutions:
- **1920x1080 (Full HD Desktop)**: Optimal full-width visualization with sidebar expanded.
- **1440x900 & 1280x720 (Laptop Displays)**: Clean reflow; horizontal scrolling enabled on factory grid and Gantt timelines.
- **1024x768 & 768x1024 (Tablet Devices)**: Modals automatically center with scrollable bodies; no clipping.
- **390x844 (Mobile Viewport)**: Sidebar collapses; tables support horizontal touch panning.

---

## 14. Known Limitations & Future Enhancements

1. **Native Mobile App**: While responsive in mobile web browsers, high-density manufacturing grids are best experienced on tablets (10"+) or desktop monitors.
2. **Offline Mode**: Current architecture relies on real-time connection to MongoDB and Flask-SocketIO; offline client queuing with local IndexedDB sync is planned for Phase 3.
3. **Automated PLC/SCADA Ingestion**: Telemetry is currently ingested via authenticated REST/WebSocket APIs; direct OPC-UA hardware bridge adapters are slated for future release.
