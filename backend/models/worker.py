class WorkerSkill:
    def __init__(self, worker_id, process_id, skill_level=3):
        self.worker_id = worker_id
        self.process_id = process_id
        self.skill_level = skill_level

class Worker:
    def __init__(self, id, name, shift=1, experience_years=3.0, skill_level=3, is_available=True):
        self.id = id
        self.name = name
        self.shift = shift
        self.experience_years = experience_years
        self.skill_level = skill_level
        self.is_available = is_available

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "shift": self.shift,
            "experience_years": self.experience_years,
            "skill_level": self.skill_level,
            "is_available": self.is_available
        }
