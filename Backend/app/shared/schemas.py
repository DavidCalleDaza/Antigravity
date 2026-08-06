"""
DonApp API — Shared Pydantic Schemas.

Generic response models reused across multiple modules.
"""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Standard message-only response schema."""

    detail: str


class HealthCheckResponse(BaseModel):
    """Response schema for the health-check endpoint."""

    status: str
    db_connection: bool
