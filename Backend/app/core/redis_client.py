from fastapi import Request
from redis.asyncio import Redis

def get_redis(request: Request) -> Redis:
    """Dependency to get the Redis client attached to the FastAPI app state."""
    return request.app.state.redis
