"""
Phase 2 — Authentication, Authorization, API Security helpers.

- Authentication: X-API-Key header validated against env var API_KEY
- Authorization: simple role/scope check (entrepreneur | admin)
- Errors always returned as {"error": "..."} for consistency with the rest of the API
"""

import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Config (loaded once at import time)
# ---------------------------------------------------------------------------

import os
from dotenv import load_dotenv
load_dotenv()

API_KEY: str = os.getenv("API_KEY", "my-secret-02101431908")
ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "my-admin-02101431908")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class AuthContext(BaseModel):
    """Lightweight identity object injected into route handlers."""
    api_key: str
    role: str  # "entrepreneur" | "admin"


# ---------------------------------------------------------------------------
# FastAPI security scheme (shows up in OpenAPI /docs)
# ---------------------------------------------------------------------------

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_auth_context(
    x_api_key: Optional[str] = Depends(_api_key_header),
) -> AuthContext:
    """
    Authentication dependency.
    Rejects missing / invalid keys with 401 + {"error": ...}.
    Maps the key to a role for the authorization layer.
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if x_api_key == API_KEY:
        return AuthContext(api_key=x_api_key, role="entrepreneur")
    if x_api_key == ADMIN_API_KEY:
        return AuthContext(api_key=x_api_key, role="admin")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key.",
        headers={"WWW-Authenticate": "ApiKey"},
    )


def require_role(*allowed_roles: str):
    """
    Authorization factory.
    Usage: Depends(require_role("entrepreneur", "admin"))
    """
    def _checker(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if ctx.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{ctx.role}' is not permitted for this endpoint. "
                    f"Allowed: {', '.join(allowed_roles)}."
                ),
            )
        return ctx
    return _checker