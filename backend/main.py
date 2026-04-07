import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Arize AX tracing — must initialize before any LLM client creation
try:
    from arize.otel import register
    from openinference.instrumentation.openai import OpenAIInstrumentor

    tracer_provider = register(
        space_id=os.environ["ARIZE_SPACE_ID"],
        api_key=os.environ["ARIZE_API_KEY"],
        project_name=os.getenv("ARIZE_PROJECT_NAME", "thalia-msme-agent"),
    )
    OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)
    logging.info("Arize tracing initialized")
except Exception as e:
    logging.warning(f"Arize tracing disabled: {e}", exc_info=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from agent import run_agent

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Thalia Agent API")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please slow down."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://*.railway.app", "https://*.vercel.app", "https://*.awsapprunner.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str | None = None       # None for opening message
    tester_name: str | None = None
    approved_amount: int = 8000
    max_amount: int = 12000
    mode: str = "onboarding"
    collected: dict = {}             # Business profile from onboarding (for servicing)
    # Survey-provided context (pre-chat)
    business_type: str | None = None
    loan_purpose: str | None = None
    is_first_visit: bool = True
    image_data: str | None = None    # Base64 data URL for vision
    customer_id: str | None = None   # Supabase customer UUID
    customer_name: str | None = None # "First Last" for logging
    locale: str = "en"               # "en" or "es-MX"
    tester_context: str | None = None  # e.g. "Loyal customer since June 2023 — on their 28th loan."


class ChatResponse(BaseModel):
    messages: list[str]              # Array of chat bubble texts
    phase: str
    collected: dict
    is_complete: bool
    offer_amount: int = 0
    is_offer: bool = False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(req: ChatRequest, request: Request):
    result = await run_agent(
        session_id=req.session_id,
        message=req.message,
        tester_name=req.tester_name,
        approved_amount=req.approved_amount,
        max_amount=req.max_amount,
        mode=req.mode,
        collected=req.collected,
        business_type=req.business_type,
        loan_purpose=req.loan_purpose,
        is_first_visit=req.is_first_visit,
        image_data=req.image_data,
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        locale=req.locale,
        tester_context=req.tester_context,
    )

    phase = result["phase"]
    is_complete = phase == "complete"
    offer_amount = result.get("offer_amount", 0)

    return ChatResponse(
        messages=result["messages"],
        phase=phase,
        collected=result.get("collected", {}),
        is_complete=is_complete,
        offer_amount=offer_amount,
        is_offer=result.get("is_offer", False),
    )
