"""
Servinow API — Centralized HTTP Exception Handlers.

Defines custom exception classes and registers global handlers
on the FastAPI application to return consistent JSON error responses.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ── Custom Exception Classes ────────────────────────────────────────────────


class ServinowException(Exception):
    """Base exception for all Servinow domain errors."""

    def __init__(
        self,
        status_code: int = 500,
        detail: str = "An unexpected error occurred.",
    ) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class NotFoundException(ServinowException):
    """Raised when a requested resource does not exist."""

    def __init__(self, detail: str = "Resource not found.") -> None:
        super().__init__(status_code=404, detail=detail)


class UnauthorizedException(ServinowException):
    """Raised when authentication credentials are missing or invalid."""

    def __init__(self, detail: str = "Invalid or missing credentials.") -> None:
        super().__init__(status_code=401, detail=detail)


class ForbiddenException(ServinowException):
    """Raised when the user lacks permission for the requested action."""

    def __init__(self, detail: str = "You do not have permission to perform this action.") -> None:
        super().__init__(status_code=403, detail=detail)


class BadRequestException(ServinowException):
    """Raised when the client sends malformed or invalid data."""

    def __init__(self, detail: str = "Bad request.") -> None:
        super().__init__(status_code=400, detail=detail)


class ConflictException(ServinowException):
    """Raised when a resource conflict occurs (e.g. duplicate entry)."""

    def __init__(self, detail: str = "Resource conflict.") -> None:
        super().__init__(status_code=409, detail=detail)


# ── Handler Registration ────────────────────────────────────────────────────


def register_exception_handlers(app: FastAPI) -> None:
    """
    Attach global exception handlers to the FastAPI application instance.

    This ensures every ServinowException (and unhandled Exception)
    returns a uniform JSON envelope.
    """

    @app.exception_handler(ServinowException)
    async def servinow_exception_handler(
        _request: Request,
        exc: ServinowException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request,
        exc: Exception,
    ) -> JSONResponse:
        # In production, avoid leaking internal error details.
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error."},
        )
