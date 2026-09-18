# ReFlow — Security & Cryptographic Architecture

**Platform**: ReFlow (Adaptive Production Intelligence)  
**Security Standard**: Enterprise Defense-in-Depth  
**Specification Version**: 1.0 (Production)  

---

## 1. Security Architecture Overview

ReFlow implements a layered defense-in-depth model across network transport, authentication, authorization, database storage, and cryptographic data protection. Each security control addresses a distinct attack vector.

```
+-----------------------------------------------------------------------+
| 1. Transport Layer Security (TLS 1.3 / HTTPS & WSS)                   |
|    - Protects data-in-transit across all HTTP and WebSocket sessions  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 2. Authentication & Session Security (JWT + Refresh Tokens)           |
|    - HS256-signed JWT access tokens (15m expiry)                      |
|    - Refresh tokens (30d expiry) for controlled token renewal         |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 3. Role-Based Access Control (RBAC)                                   |
|    - Strict backend enforcement via @role_required decorator          |
|    - Roles: MANAGER, SUPERVISOR, SERVICE_PERSON                      |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 4. Credential Security (Argon2id / bcrypt)                            |
|    - One-way salted adaptive hashing for user passwords               |
|    - Passwords never stored in plaintext                              |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 5. Application-Level Cryptography (AES-256-GCM)                       |
|    - Authenticated encryption with associated data (AEAD)             |
|    - Explicitly targeted at designated sensitive data payloads        |
|    - Key loaded strictly from environment variable AES_ENCRYPTION_KEY |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 6. Database Access Security (MongoDB Enterprise Security)             |
|    - Scoped collection permissions, role-based database users        |
|    - Network binding (localhost/VPC isolated), optional storage-at-rest|
+-----------------------------------------------------------------------+
```

---

## 2. Distinction of Security Mechanisms

To maintain absolute transparency and prevent misleading claims, ReFlow explicitly categorizes each security primitive:

| Layer / Mechanism | Implementation | Purpose | What It Protects | What It Does NOT Do |
| :--- | :--- | :--- | :--- | :--- |
| **TLS / Transport** | TLS 1.3 / HTTPS / WSS | Transport Encryption | Prevents packet sniffing, man-in-the-middle attacks over the wire. | Does not protect data at rest on server or disk. |
| **Password Hashing** | Argon2id / bcrypt (`generate_password_hash`) | One-Way Credential Hashing | Irreversible hashing with salt; authenticates user logins. | Cannot decrypt passwords (one-way); not an encryption algorithm. |
| **Token Authentication** | JWT (JSON Web Token, HS256) | Stateless Identity Verification | Embeds identity (`sub`), `role`, `name`, issued-at, and expiry in signed token. | Does not encrypt payload (payload is Base64Url encoded, cryptographically signed). |
| **Application Encryption** | AES-256-GCM (`encryption_service.py`) | Authenticated Confidentiality | Symmetrically encrypts selected sensitive data fields before database write. | **Does NOT encrypt the entire MongoDB database.** Only selected sensitive payloads. |
| **Database Access** | MongoDB User Auth & VPC Isolation | Data Store Access Control | Restricts database read/write access to authenticated application services. | Relies on application-level and OS-level storage configurations. |

> [!IMPORTANT]
> **Cryptographic Boundary Disclaimer**:
> ReFlow does **NOT** claim that the entire MongoDB database is AES-256 encrypted. MongoDB is a high-throughput operational document store where non-sensitive operational fields (e.g., machine status, order numbers, process sequences, telemetry) are indexed and queried in plaintext. Only sensitive application payloads (such as secure telemetry tokens, proprietary client formulations, and encrypted notes) are routed through AES-256-GCM.

---

## 3. AES-256-GCM Application-Level Encryption

The service `backend/services/encryption_service.py` provides authenticated symmetric encryption using the Galois/Counter Mode (GCM) cipher:

### Key Features
1. **256-bit Key Derivation**:
   - Master key is supplied exclusively via environment configuration: `AES_ENCRYPTION_KEY`.
   - Never hardcoded in source code, never committed to git repositories, and never rendered in logs or UI.
   - If the raw secret length differs from 32 bytes, SHA-256 derivation standardizes it to an exact 32-byte (256-bit) cryptographic key.
2. **Authenticated Encryption (AEAD)**:
   - Uses AESGCM with a cryptographically secure 12-byte initialization vector (nonce) generated per encryption operation via `os.urandom(12)`.
   - Generates an authentication tag that prevents ciphertext tampering, bit-flipping, or replay corruption.
   - Output format: `base64(12-byte nonce + ciphertext + 16-byte tag)`.

### Core Python API
```python
from backend.services.encryption_service import encrypt_sensitive_data, decrypt_sensitive_data

# Encrypting sensitive payload
ciphertext = encrypt_sensitive_data("Confidential client production notes and supplier specs")

# Decrypting sensitive payload
plaintext = decrypt_sensitive_data(ciphertext)
```

---

## 4. Role-Based Access Control (RBAC) Specifications

Role authorization is enforced on the **backend** using the `@role_required(*allowed_roles)` decorator. Frontend UI hiding is merely ergonomic; unauthorized backend requests strictly terminate with `HTTP 403 Forbidden`.

| Role | Permitted Actions | Prohibited Actions |
| :--- | :--- | :--- |
| **MANAGER** | Create orders, confirm orders, review schedules, approve recovery Option A/B, reject recovery, view analytics, view audit logs, run authorized disruption simulations. | Cannot perform machine verification without Service qualification. |
| **SUPERVISOR** | View factory floor, view orders, view production routes, review machine allocation, edit proposed allocations, approve/reject baseline schedules, inspect workers and materials. | Cannot approve recovery alternatives or override manager decisions. |
| **SERVICE_PERSON** | View maintenance queue, accept work orders, start repairs, add repair logs/notes, mark machine as REPAIRED, mark machine as VERIFIED. | Cannot approve production schedules, cannot approve recovery alternatives, cannot alter order priorities. |

---

## 5. Security Audit Log & Governance Trail

Every security-sensitive or operational state change is persisted to the MongoDB `audit_logs` collection:
- `LOGIN` & `LOGOUT`
- `SIGNUP` (restricted MANAGER registration)
- `DISRUPTION_CREATED`
- `RECOVERY_APPROVED` & `RECOVERY_REJECTED`
- `MACHINE_STATUS_CHANGED`
- `MAINTENANCE_CREATED`, `MACHINE_REPAIRED`, `MACHINE_VERIFIED`

Each audit record captures:
```json
{
  "id": "AUD-XXXXXXXX",
  "action": "RECOVERY_APPROVED",
  "actor": "manager",
  "role": "MANAGER",
  "entity": "DISRUPTION",
  "entity_id": "DISRUPT-1042",
  "before": { "status": "PENDING" },
  "after": { "status": "APPROVED", "selected_option": "OPTION_A" },
  "metadata": { "order_id": "ORD-1042", "lane_id": "L3" },
  "timestamp": "2026-09-19T00:30:00.000Z"
}
```

Audit trails are immutable, indexed by timestamp, and accessible via `/api/v1/audit` for operational accountability.
