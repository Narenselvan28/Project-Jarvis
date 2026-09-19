"""
State Transition Exception Architecture
Provides typed exception for illegal entity lifecycle transitions, mapping to HTTP 409 Conflict.
"""
from backend.domain.errors import InvalidStateTransitionError

__all__ = ["InvalidStateTransitionError"]
