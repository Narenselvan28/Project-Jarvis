from backend.repositories.base_repository import BaseRepository
from backend.repositories.machine_repository import machine_repo, MachineRepository
from backend.repositories.order_repository import order_repo, OrderRepository
from backend.repositories.schedule_repository import schedule_repo, ScheduleRepository
from backend.repositories.disruption_repository import disruption_repo, DisruptionRepository
from backend.repositories.maintenance_repository import maintenance_repo, MaintenanceRepository
from backend.repositories.user_repository import user_repo, UserRepository
from backend.repositories.factory_repository import factory_repo, FactoryRepository
from backend.repositories.audit_repository import audit_repo, AuditRepository

from backend.repositories.material_repository import material_repo, MaterialRepository
from backend.repositories.contract_repository import contract_repo, ContractRepository
from backend.repositories.workforce_repository import workforce_repo, WorkforceRepository
from backend.repositories.service_person_repository import service_person_repo, ServicePersonRepository
from backend.repositories.maintenance_invoice_repository import maintenance_invoice_repo, MaintenanceInvoiceRepository

__all__ = [
    "BaseRepository",
    "machine_repo", "MachineRepository",
    "order_repo", "OrderRepository",
    "schedule_repo", "ScheduleRepository",
    "disruption_repo", "DisruptionRepository",
    "maintenance_repo", "MaintenanceRepository",
    "user_repo", "UserRepository",
    "factory_repo", "FactoryRepository",
    "audit_repo", "AuditRepository",
    "material_repo", "MaterialRepository",
    "contract_repo", "ContractRepository",
    "workforce_repo", "WorkforceRepository",
    "service_person_repo", "ServicePersonRepository",
    "maintenance_invoice_repo", "MaintenanceInvoiceRepository"
]
