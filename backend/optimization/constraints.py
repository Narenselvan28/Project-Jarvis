from ortools.sat.python import cp_model

class SchedulingModelBuilder:
    """
    Constructs OR-Tools CP-SAT variables and hard operational constraints:
    1. Machine Compatibility & Capacity (No-Overlap)
    2. Operation Precedence within each Order
    3. Failed Machine Downtime Windows
    4. Due Date Tardiness Tracking
    5. Schedule Stability / Change Penalties
    """
    def __init__(self, horizon_minutes=2880): # 48 hour horizon
        self.model = cp_model.CpModel()
        self.horizon = horizon_minutes
        self.all_machine_intervals = {} # machine_id -> list of interval_vars
        self.operation_vars = {} # (order_id, op_seq) -> dict of vars
        self.order_tardiness_vars = {} # order_id -> int_var
        self.objective_terms = []

    def register_machine(self, machine_id):
        if machine_id not in self.all_machine_intervals:
            self.all_machine_intervals[machine_id] = []

    def add_machine_downtime(self, machine_id, start_min, duration_min):
        """
        Locks out the failed machine during its breakdown/repair window.
        """
        self.register_machine(machine_id)
        start_val = max(0, int(start_min))
        dur_val = max(1, int(duration_min))
        end_val = min(self.horizon, start_val + dur_val)

        dt_interval = self.model.NewFixedSizeIntervalVar(
            start_val, dur_val, f"downtime_{machine_id}_{start_val}"
        )
        self.all_machine_intervals[machine_id].append(dt_interval)

    def add_operation(self, order_id, op_seq, candidate_machines_info, original_machine_id=None):
        """
        candidate_machines_info: list of dicts:
        {
            'machine_id': 'M09',
            'duration_min': 68,
            'cost_per_hour': 1200,
            'precision_ok': True,
            'is_original': False
        }
        """
        op_key = (order_id, op_seq)
        presence_vars = []
        start_vars = []
        end_vars = []
        cost_vars = []
        change_vars = []

        # Op overall start & end
        op_start = self.model.NewIntVar(0, self.horizon, f"start_{order_id}_{op_seq}")
        op_end = self.model.NewIntVar(0, self.horizon, f"end_{order_id}_{op_seq}")

        for cand in candidate_machines_info:
            m_id = cand["machine_id"]
            dur = max(1, int(cand["duration_min"]))
            self.register_machine(m_id)

            # Boolean var: is operation scheduled on machine m_id?
            pres = self.model.NewBoolVar(f"pres_{order_id}_{op_seq}_{m_id}")
            start_m = self.model.NewIntVar(0, self.horizon, f"start_{order_id}_{op_seq}_{m_id}")
            end_m = self.model.NewIntVar(0, self.horizon, f"end_{order_id}_{op_seq}_{m_id}")

            interval = self.model.NewOptionalIntervalVar(
                start_m, dur, end_m, pres, f"interval_{order_id}_{op_seq}_{m_id}"
            )
            self.all_machine_intervals[m_id].append(interval)

            presence_vars.append(pres)
            start_vars.append(start_m)
            end_vars.append(end_m)

            # Cost term (integer cents or scaled units)
            cost_cents = int((dur / 60.0) * cand.get("cost_per_hour", 1000) * 10)
            cost_var = self.model.NewIntVar(0, 1000000, f"cost_{order_id}_{op_seq}_{m_id}")
            self.model.Add(cost_var == cost_cents).OnlyEnforceIf(pres)
            self.model.Add(cost_var == 0).OnlyEnforceIf(pres.Not())
            cost_vars.append(cost_var)

            # Change penalty if changed from original
            is_orig = (m_id == original_machine_id)
            if not is_orig and original_machine_id is not None:
                change_var = self.model.NewIntVar(0, 100, f"change_{order_id}_{op_seq}_{m_id}")
                self.model.Add(change_var == 100).OnlyEnforceIf(pres)
                self.model.Add(change_var == 0).OnlyEnforceIf(pres.Not())
                change_vars.append(change_var)

            # Link op_start and op_end when pres is true
            self.model.Add(op_start == start_m).OnlyEnforceIf(pres)
            self.model.Add(op_end == end_m).OnlyEnforceIf(pres)

        # Constraint: Exactly one machine must be selected for this operation
        self.model.AddExactlyOne(presence_vars)

        self.operation_vars[op_key] = {
            "start": op_start,
            "end": op_end,
            "presence_vars": {cand["machine_id"]: p for cand, p in zip(candidate_machines_info, presence_vars)},
            "cost_vars": cost_vars,
            "change_vars": change_vars,
            "candidate_info": candidate_machines_info
        }

    def add_precedence(self, order_id, op_seq_a, op_seq_b):
        """
        Operation B can only start after Operation A finishes.
        """
        op_a = self.operation_vars.get((order_id, op_seq_a))
        op_b = self.operation_vars.get((order_id, op_seq_b))
        if op_a and op_b:
            self.model.Add(op_b["start"] >= op_a["end"])

    def add_order_deadline(self, order_id, last_op_seq, due_date_minutes, priority_weight=1.0):
        """
        Tardiness = max(0, completion_time - due_date) * priority
        """
        op_last = self.operation_vars.get((order_id, last_op_seq))
        if op_last:
            tardiness = self.model.NewIntVar(0, self.horizon, f"tardiness_{order_id}")
            self.model.Add(tardiness >= op_last["end"] - int(due_date_minutes))
            self.model.Add(tardiness >= 0)
            self.order_tardiness_vars[order_id] = (tardiness, priority_weight)

    def finalize_no_overlap(self):
        """
        Enforce no-overlap constraint on each machine across all assigned operations and downtimes.
        """
        for m_id, intervals in self.all_machine_intervals.items():
            if intervals:
                self.model.AddNoOverlap(intervals)
