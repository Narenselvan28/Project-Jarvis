# ReFlow — Role-Based Access Control (RBAC) Matrix

**Platform:** ReFlow (Adaptive Production Intelligence)  
**Authentication:** Stateless JWT (HMAC-SHA256 with 24-hour expiration)  
**Enforcement:** `@role_required` and `@jwt_required` decorators in Python Flask  
**Verification Date:** September 19, 2026  

---

## 1. System Roles & Security Hierarchy

1. **ADMIN:**
   - Full operational and configuration privileges across the entire enterprise.
   - User creation, role assignment, active/disabled toggling, machine metadata updates, audit log auditing.
2. **MANAGER:**
   - Operational command over production planning, order ingestion, simulated disruption testing, and recovery approval.
   - Work order authorization and factory-wide performance tracking.
3. **SUPERVISOR:**
   - Shift-level shopfloor operations, plan review, machine parameter adjustments, plan approval, and operator assignments.
4. **SERVICE_PERSON:**
   - Field technician operations: accepting maintenance work orders, starting repairs, logging parts/costs, recording diagnostics, and verifying repaired machinery.

---

## 2. API Endpoint Authorization Matrix

| Endpoint Route | HTTP Method | Permitted Roles | Unauthorized Behavior | Description |
| :--- | :---: | :--- | :---: | :--- |
| `/api/v1/auth/login` | POST | Public | 401 Unauthorized (invalid pass) | User authentication & JWT issuance |
| `/api/v1/auth/signup` | POST | Public | 400 Bad Request | User self-registration (Admin role blocked) |
| `/api/v1/auth/me` | GET | All Authenticated | 401 Unauthorized | Current session user profile verification |
| `/api/v1/orders` | POST | `MANAGER`, `ADMIN` | 403 Forbidden | Create new production order |
| `/api/v1/orders` | GET | `MANAGER`, `SUPERVISOR`, `ADMIN` | 403 Forbidden | List all production orders |
| `/api/v1/orders/plan/:id` | GET | `SUPERVISOR`, `MANAGER`, `ADMIN` | 403 Forbidden | Retrieve generated production plan |
| `/api/v1/orders/plan/:id/validate` | POST | `SUPERVISOR`, `MANAGER`, `ADMIN` | 403 Forbidden | Validate edited plan with CP-SAT |
| `/api/v1/orders/plan/:id/approve` | POST | `SUPERVISOR`, `MANAGER`, `ADMIN` | 403 Forbidden | Confirm and activate production plan |
| `/api/v1/orders/plan/:id/reject` | POST | `SUPERVISOR`, `MANAGER`, `ADMIN` | 403 Forbidden | Reject plan and trigger re-plan |
| `/api/v1/manager/simulate-disruption` | POST | `MANAGER`, `ADMIN` | 403 Forbidden | Trigger machine failure simulation |
| `/api/v1/recovery/:id/generate` | POST | `MANAGER`, `ADMIN` | 403 Forbidden | Re-generate CP-SAT recovery alternatives |
| `/api/v1/recovery/:id/approve` | POST | `MANAGER`, `ADMIN` | 403 Forbidden | Approve and commit Option A or B |
| `/api/v1/recovery/:id/reject` | POST | `MANAGER`, `ADMIN` | 403 Forbidden | Reject recovery options |
| `/api/v1/machines` | GET | All Authenticated | 401 Unauthorized | Read factory machine statuses |
| `/api/v1/machines/:id/status` | PATCH | `MANAGER`, `SUPERVISOR`, `ADMIN` | 403 Forbidden | Update machine operational state |
| `/api/v1/maintenance` | GET | All Authenticated | 401 Unauthorized | List fleet maintenance work orders |
| `/api/v1/maintenance/:id/accept` | POST | `SERVICE_PERSON`, `MANAGER`, `ADMIN` | 403 Forbidden | Accept maintenance work order |
| `/api/v1/maintenance/:id/start` | POST | `SERVICE_PERSON`, `MANAGER`, `ADMIN` | 403 Forbidden | Mark work order as in-progress |
| `/api/v1/maintenance/:id/complete` | POST | `SERVICE_PERSON`, `MANAGER`, `ADMIN` | 403 Forbidden | Mark repair work as completed |
| `/api/v1/maintenance/:id/verify-and-restore` | POST | `SERVICE_PERSON`, `MANAGER`, `ADMIN` | 403 Forbidden | Verify machine and restore to AVAILABLE |
| `/api/v1/admin/dashboard` | GET | `ADMIN` | 403 Forbidden | Enterprise overview metrics |
| `/api/v1/admin/users` | GET / POST | `ADMIN` | 403 Forbidden | User administration and creation |
| `/api/v1/admin/users/:id` | PATCH | `ADMIN` | 403 Forbidden | User role assignment and status toggle |
| `/api/v1/admin/machines` | GET / PATCH | `ADMIN` | 403 Forbidden | Machine inventory & metadata overrides |
| `/api/v1/admin/audit-logs` | GET | `ADMIN`, `MANAGER` | 403 Forbidden | Immutable system audit log trail |

---

## 3. Negative Security Test Cases

The test suite validates RBAC boundaries at the API layer:
1. **Service Person Cannot Create Order:** Service Person JWT accessing `POST /api/v1/orders` returns `403 Forbidden`.
2. **Supervisor Cannot Approve Recovery Schedule:** Supervisor JWT attempting `POST /api/v1/recovery/:id/approve` returns `403 Forbidden`.
3. **Manager Cannot Complete Technician Repair:** Manager unauthorized bypass of service steps without technician credentials returns `403 Forbidden`.
4. **Non-Admin Cannot Access `/api/v1/admin/*`:** Requests from non-admin accounts to `/admin/dashboard` or `/admin/users` immediately return `403 Forbidden`.
