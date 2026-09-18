"""
Automated Integration Tests for Unified ERP Modules
Tests Materials, Inventory, Workforce, Contracts & SLA, Service Person Invoicing, and Dashboards.
"""

import pytest
from backend.repositories.material_repository import material_repo
from backend.repositories.workforce_repository import workforce_repo
from backend.repositories.contract_repository import contract_repo
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.maintenance_repository import maintenance_repo
from backend.repositories.maintenance_invoice_repository import maintenance_invoice_repo
from backend.repositories.service_person_repository import service_person_repo

def test_materials_inventory_endpoints(client, auth_headers):
    # 1. GET /api/v1/materials
    resp = client.get("/api/v1/materials", headers=auth_headers["manager"])
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["success"] is True
    assert len(json_data["data"]) >= 5

    # 2. Check stock feasibility logic
    check = material_repo.check_feasibility("100% Combed Cotton", 500.0)
    assert check["feasible"] is True
    assert check["sufficient"] is True

    # 3. GET specific material
    first_mat = json_data["data"][0]
    mat_id = first_mat["id"]
    detail_resp = client.get(f"/api/v1/materials/{mat_id}", headers=auth_headers["manager"])
    assert detail_resp.status_code == 200
    assert detail_resp.get_json()["data"]["id"] == mat_id

def test_workforce_endpoints(client, auth_headers):
    # 1. GET /api/v1/workforce
    resp = client.get("/api/v1/workforce", headers=auth_headers["supervisor"])
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert len(data) >= 5

    # 2. PATCH workforce shift availability
    wf_id = data[0]["id"]
    patch_resp = client.patch(
        f"/api/v1/workforce/{wf_id}",
        json={"available_operators": 10, "active_operators": 15},
        headers=auth_headers["supervisor"]
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.get_json()["data"]
    assert updated["available_operators"] == 10

def test_contracts_and_sla(client, auth_headers):
    # 1. GET /api/v1/contracts
    resp = client.get("/api/v1/contracts", headers=auth_headers["manager"])
    assert resp.status_code == 200
    contracts = resp.get_json()["data"]
    assert len(contracts) >= 1
    assert any(c["id"] == "CON-1042" for c in contracts)

    # 2. GET /api/v1/contracts/CON-1042
    detail = client.get("/api/v1/contracts/CON-1042", headers=auth_headers["manager"])
    assert detail.status_code == 200
    c_data = detail.get_json()["data"]
    assert c_data["customer_name"] == "Nordic Athletic Apparel"
    assert "penalty_per_hour_delay" in c_data

def test_service_persons_and_invoicing(client, auth_headers):
    # 1. GET /api/v1/maintenance/service-persons
    sp_resp = client.get("/api/v1/maintenance/service-persons", headers=auth_headers["service"])
    assert sp_resp.status_code == 200
    sps = sp_resp.get_json()["data"]
    assert len(sps) >= 3
    assert any(s["id"] == "SP-01" for s in sps)

    # 2. Create a test work order on CUT-03
    wo = maintenance_repo.create_work_order(
        machine_id="CUT-03",
        fault_type="Hydraulic Line Leak",
        priority="HIGH",
        estimated_hours=3.0,
        assigned_to="SP-01"
    )

    # 3. Generate Maintenance Invoice
    inv_payload = {
        "work_order_id": wo["id"],
        "machine_id": "CUT-03",
        "service_person_id": "SP-01",
        "service_person_name": "Vikram Patel",
        "problem_summary": "Hydraulic line leak repaired",
        "action_taken": "Replaced hydraulic seal and purged fluid line",
        "labour_cost": 1500.0,
        "parts_cost": 3200.0,
        "additional_cost": 300.0,
        "downtime_hours": 2.5,
        "parts_used": "Viton Hydraulic O-Ring Kit #22",
        "remarks": "Machine tested and passed pressure test."
    }
    inv_resp = client.post("/api/v1/maintenance/invoices", json=inv_payload, headers=auth_headers["service"])
    assert inv_resp.status_code == 201
    inv_data = inv_resp.get_json()["data"]
    assert inv_data["total_cost"] == 5000.0

    # 4. Verify machine returned to AVAILABLE
    mach = machine_repo.get_by_id("CUT-03")
    assert mach["status"] == "AVAILABLE"
    assert mach["health_score"] == 98

def test_operational_dashboards(client, auth_headers):
    # 1. Manager Dashboard
    mgr_resp = client.get("/api/v1/dashboard/manager", headers=auth_headers["manager"])
    assert mgr_resp.status_code == 200
    mgr_data = mgr_resp.get_json()["data"]
    assert "active_orders" in mgr_data
    assert "machines_available" in mgr_data
    assert "contracts" in mgr_data

    # 2. Supervisor Dashboard
    sup_resp = client.get("/api/v1/dashboard/supervisor", headers=auth_headers["supervisor"])
    assert sup_resp.status_code == 200
    sup_data = sup_resp.get_json()["data"]
    assert "counts" in sup_data
    assert "groups" in sup_data

    # 3. Service Dashboard
    srv_resp = client.get("/api/v1/dashboard/service?service_person_id=SP-01", headers=auth_headers["service"])
    assert srv_resp.status_code == 200
    srv_data = srv_resp.get_json()["data"]
    assert "service_person" in srv_data
    assert "pending_repairs" in srv_data

    # 4. Admin Dashboard
    adm_resp = client.get("/api/v1/dashboard/admin", headers=auth_headers["manager"])
    assert adm_resp.status_code == 200
    adm_data = adm_resp.get_json()["data"]
    assert "total_machines" in adm_data
    assert "status_counts" in adm_data

def test_order_creation_with_erp_context(client, auth_headers):
    order_payload = {
        "id": "ORD-TEST-999",
        "customer_name": "Test Global Retailer",
        "product_name": "Performance Running Tee",
        "product_code": "PRD-TSHIRT-01",
        "quantity": 3000,
        "priority": "HIGH",
        "delivery_deadline": "2026-09-30 18:00:00",
        "required_material": "100% Combed Cotton Single Jersey 180 GSM",
        "required_color": "Heather Grey",
        "required_fabric": "Single Jersey 180 GSM",
        "required_garment_type": "Men's Athletic Fit",
        "estimated_production_cost": 45000.0
    }
    resp = client.post("/api/v1/orders", json=order_payload, headers=auth_headers["manager"])
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    assert data["id"] == "ORD-TEST-999"
    assert data["contract_id"] == "CON-TEST-999"
    assert data["customer_name"] == "Test Global Retailer"

    # Verify contract created in repository
    c = contract_repo.get_by_id("CON-TEST-999")
    assert c is not None
    assert c["customer_name"] == "Test Global Retailer"
