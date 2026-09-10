"""
Rural Business Advisory API — main entrypoint.

Phase 2 changes:
- Authentication via X-API-Key (auth.py)
- Authorization via role check (entrepreneur / admin)
- Stricter Pydantic validation (length limits, allow-listed categories)
- Request body size limit middleware
- CORS fixed for local demo

Phase 5 changes:
- Rate limiting using slowapi
- API routes grouped under /api/v1
"""

from fastapi import FastAPI, Depends, Request, HTTPException, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Any, List

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from auth import AuthContext, require_role
from logic import (
    calculate_loan_details,
    build_evidence_packet,
    generate_report,
    answer_chat_question,
)

from storage import cache_stats, cache_clear, village_store


# ---------------------------------------------------------------------------
# App + Rate Limiting
# ---------------------------------------------------------------------------

app = FastAPI(title="Rural Business Advisory API")


def _rate_limit_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key")

    if api_key:
        return f"key:{api_key}"

    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)


# ---------------------------------------------------------------------------
# API Router
# ---------------------------------------------------------------------------

api_v1 = APIRouter(
    prefix="/api/v1",
    tags=["v1"],
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["null"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request Body Size Limit
# ---------------------------------------------------------------------------

MAX_BODY_BYTES = 16_384


class LimitBodySizeMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        if request.method == "OPTIONS":
            return await call_next(request)

        content_length = request.headers.get("content-length")

        if content_length is not None:

            try:
                if int(content_length) > MAX_BODY_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": (
                                f"Request body too large. "
                                f"Max {MAX_BODY_BYTES} bytes."
                            )
                        },
                    )

            except ValueError:
                pass

        return await call_next(request)


app.add_middleware(LimitBodySizeMiddleware)


# ---------------------------------------------------------------------------
# Allowed Business Categories
# ---------------------------------------------------------------------------

ALLOWED_BUSINESS_CATEGORIES = {
    "dairy",
    "tailoring",
    "kirana",
    "agro-processing",
    "mobile_repair",
    "poultry",
    "handloom",
    "food_processing",
    "retail",
    "services",
}


# ---------------------------------------------------------------------------
# Report Request
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    village_id: str = Field(..., min_length=1, max_length=64)
    available_capital: float = Field(..., gt=0, le=10_000_000)
    business_category: str = Field(..., min_length=1, max_length=64)

    entrepreneur_name: str = Field(
        default="",
        max_length=100
    )

    experience_level: str = Field(
        default="beginner",
        max_length=20
    )

    language: str = Field(
        default="English",
        max_length=20
    )

    @field_validator("entrepreneur_name")
    @classmethod
    def entrepreneur_name_clean(cls, v: str) -> str:
        return v.strip()

    @field_validator("experience_level")
    @classmethod
    def experience_level_allowed(cls, v: str) -> str:
        v = v.strip().lower()

        allowed = {
            "beginner",
            "some experience",
            "experienced"
        }

        if v not in allowed:
            raise ValueError(
                "experience_level must be beginner, some experience, or experienced"
            )

        return v

    @field_validator("language")
    @classmethod
    def language_allowed(cls, v: str) -> str:
        v = v.strip().lower()

        if v not in {"english", "hindi"}:
            raise ValueError("language must be English or Hindi")

        return v.capitalize()

    @field_validator("village_id")
    @classmethod
    def village_id_format(cls, v: str) -> str:

        v = v.strip()

        if not v:
            raise ValueError(
                "village_id cannot be empty or whitespace"
            )

        if not all(
            c.isalnum() or c in "_-"
            for c in v
        ):
            raise ValueError(
                "village_id contains invalid characters"
            )

        return v

    @field_validator("business_category")
    @classmethod
    def business_category_allowed(cls, v: str) -> str:

        normalized = (
            v.strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )

        candidates = {
            v.strip().lower(),
            normalized,
            normalized.replace("_", "-"),
        }

        if not candidates.intersection(
            ALLOWED_BUSINESS_CATEGORIES
        ):

            if (
                len(v) > 64
                or any(
                    c in v
                    for c in "<>\"'`\\"
                )
            ):
                raise ValueError(
                    "business_category rejected. "
                    "Allowed examples: "
                    + ", ".join(
                        sorted(ALLOWED_BUSINESS_CATEGORIES)[:6]
                    )
                    + "…"
                )

        return v.strip()


# ---------------------------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException,
):

    message = exc.detail

    if isinstance(message, dict) and "error" in message:
        message = message["error"]

    elif isinstance(message, list):
        message = "; ".join(
            str(m)
            for m in message
        )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": str(message)
        },
        headers=getattr(
            exc,
            "headers",
            None,
        ) or {},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):

    errors = []

    for err in exc.errors():

        loc = " → ".join(
            str(x)
            for x in err.get("loc", [])
        )

        msg = err.get(
            "msg",
            "invalid value",
        )

        errors.append(
            f"{loc}: {msg}"
        )

    return JSONResponse(
        status_code=422,
        content={
            "error": (
                "Validation failed: "
                + "; ".join(errors)
            )
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(
    request: Request,
    exc: Exception,
):

    return JSONResponse(
        status_code=500,
        content={
            "error": (
                "Internal server error: "
                f"{type(exc).__name__}"
            )
        },
    )


# ---------------------------------------------------------------------------
# Generate Report
# ---------------------------------------------------------------------------

@api_v1.post("/generate-report")
@limiter.limit("10/minute")
async def create_report(
    request: Request,
    req: ReportRequest,
    auth: AuthContext = Depends(
        require_role(
            "entrepreneur",
            "admin",
        )
    ),
):

    try:

        evidence_packet = build_evidence_packet(
            village_id=req.village_id,
            business_category=req.business_category,
            available_capital=req.available_capital,
        )

    except ValueError as e:

        return JSONResponse(
            status_code=404,
            content={
                "error": (
                    f"Village lookup failed: {str(e)}"
                )
            },
        )

    # 1. (Existing code) Calculate the loan details
    financial_roadmap = calculate_loan_details(
        req.available_capital
    )
    
    # Import our new calculator from logic.py
    from logic import calculate_dscr
    
    # Extract the numbers we need for the formula
    demand_proxy = evidence_packet.get("demand_proxy", {}).get("value", 0)
    q_emi = financial_roadmap.get("quarterly_installment", 0)
    loan_amount = financial_roadmap.get("loan_amount", 0)

    # Run the deterministic math
    dscr_data = calculate_dscr(
        demand_proxy=demand_proxy,
        quarterly_installment=q_emi,
        business_category=req.business_category,
        assumptions=evidence_packet.get("assumptions", {}),
        loan_amount=loan_amount
    )
    
    # Inject the results into the "inputs_used" dictionary.
    # This automatically passes it to Gemini in the context_data block!
    evidence_packet["inputs_used"]["loan_repayment_capacity"] = dscr_data

    report_data = None
    report_error = None

    try:

        report_data = generate_report(
            evidence_packet
        )
        
        # ---------------------------------------------------------
        # NEW: FORCE backend truth over Gemini's output 
        # to guarantee no hallucination in the final report
        # ---------------------------------------------------------
        if report_data:
            report_data["loan_repayment_capacity"] = dscr_data

    except (ValueError, RuntimeError) as e:

        report_error = (
            f"AI Report generation failed: {str(e)}"
        )

    response_payload = {
        "financial_roadmap": financial_roadmap,
        "report": report_data,
        "evidence_packet": evidence_packet,
        "auth_role": auth.role,
    }

    if report_error:
        response_payload["report_error"] = report_error

    return response_payload

# ---------------------------------------------------------------------------
# Chat Advisor
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):

    role: str = Field(
        ...,
        min_length=1,
        max_length=20,
    )

    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )


class ChatRequest(BaseModel):

    report: Dict[str, Any]

    conversation_history: List[ChatMessage] = Field(
        default_factory=list,
        max_length=12,
    )

    new_question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
    )


@api_v1.post("/chat")
@limiter.limit("10/minute")
async def chat_advisor(
    request: Request,
    req: ChatRequest,
    auth: AuthContext = Depends(
        require_role(
            "entrepreneur",
            "admin",
        )
    ),
):

    try:

        history = [
            message.model_dump()
            for message in req.conversation_history
        ]

        return answer_chat_question(
            report=req.report,
            conversation_history=history,
            new_question=req.new_question,
        )

    except ValueError as e:

        raise HTTPException(
            status_code=422,
            detail=str(e),
        )

    except RuntimeError as e:

        raise HTTPException(
            status_code=502,
            detail=str(e),
        )


# ---------------------------------------------------------------------------
# Similar Villages
# ---------------------------------------------------------------------------

class SimilarVillagesRequest(BaseModel):

    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
    )

    top_k: int = Field(
        3,
        ge=1,
        le=10,
    )


@api_v1.post("/similar-villages")
@limiter.limit("20/minute")
async def similar_villages(
    request: Request,
    req: SimilarVillagesRequest,
    auth: AuthContext = Depends(require_role("entrepreneur", "admin")),
):

    results = village_store.query(
        req.query,
        top_k=req.top_k,
    )

    return {
        "query": req.query,
        "indexed_count": village_store.size(),
        "results": results,
    }


# ---------------------------------------------------------------------------
# Cache Stats
# ---------------------------------------------------------------------------

@api_v1.get("/cache-stats")
@limiter.limit("30/minute")
async def get_cache_stats(
    request: Request,
    auth: AuthContext = Depends(require_role("entrepreneur", "admin")),
):

    return cache_stats()


# ---------------------------------------------------------------------------
# Cache Clear
# ---------------------------------------------------------------------------

@api_v1.post("/cache-clear")
@limiter.limit("5/minute")
async def clear_cache(
    request: Request,
    auth: AuthContext = Depends(require_role("admin")),
):

    cache_clear()

    return {
        "status": "cleared",
        "stats": cache_stats(),
    }


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@api_v1.get("/health")
async def health():

    return {
        "status": "ok",
        "vector_store_size": village_store.size(),
        "cache": cache_stats(),
    }


# ---------------------------------------------------------------------------
# Register Router
# ---------------------------------------------------------------------------

app.include_router(api_v1)