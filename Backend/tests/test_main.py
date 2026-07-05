"""
Servinow API — Health Check Endpoint Tests.

Validates the /api/v1/health endpoint returns the expected
response structure and status code.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_returns_200(client: AsyncClient) -> None:
    """GET /api/v1/health should return HTTP 200."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_check_response_schema(client: AsyncClient) -> None:
    """GET /api/v1/health should return {status, db_connection}."""
    response = await client.get("/api/v1/health")
    data = response.json()

    assert "status" in data
    assert "db_connection" in data
    assert data["status"] == "ok"
    assert isinstance(data["db_connection"], bool)


@pytest.mark.asyncio
async def test_health_check_db_connection_is_bool(client: AsyncClient) -> None:
    """The db_connection field must be a boolean, regardless of connectivity."""
    response = await client.get("/api/v1/health")
    data = response.json()
    assert isinstance(data["db_connection"], bool)
