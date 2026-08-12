import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class UsageRow(BaseModel):
    """One aggregated row of token usage."""
    key: Annotated[str | uuid.UUID | None, Field(description="Grouped dimension value (user/customer/post UUID) or None.")]
    label: Annotated[str | None, Field(description="Human-readable label for the group.", default=None)]
    total_cost_usd: Annotated[float, Field(description="Total cost in USD.")]
    total_cost_cop: Annotated[float, Field(description="Total cost in COP (manual rate).")]
    calls: Annotated[int, Field(description="Number of AI calls.")]
    input_tokens: Annotated[int, Field(description="Total input tokens.")]
    output_tokens: Annotated[int, Field(description="Total output tokens.")]


class HourlyUsageResponse(BaseModel):
    limit_usd: Annotated[float, Field(description="Hourly limit in USD.")]
    used_usd: Annotated[float, Field(description="Consumed in the last hour, USD.")]
    limit_cop: Annotated[float, Field(description="Hourly limit in COP.")]
    used_cop: Annotated[float, Field(description="Consumed in the last hour, COP.")]
    remaining_cop: Annotated[float, Field(description="Remaining budget in COP (can be negative).")]


class ExchangeRateResponse(BaseModel):
    usd_to_cop: Annotated[float, Field(description="Manual USD→COP rate.")]
    updated_at: Annotated[datetime, Field(description="Last update timestamp.")]


class ExchangeRateUpdate(BaseModel):
    usd_to_cop: Annotated[float, Field(description="New manual USD→COP rate.", gt=0)]