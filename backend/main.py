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
except Exception as e:
    logging.warning(f"Arize tracing disabled: {e}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import run_agent

app = FastAPI(title="Thalia Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://*.railway.app", "https://*.vercel.app", "https://*.awsapprunner.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str | None = None       # None for opening message
    tester_name: str | None = None   # Optional after session is initialized
    approved_amount: int = 8000
    mode: str = "onboarding"
    collected: dict = {}             # Business profile from onboarding (for servicing)
    weeklyRevenue: str | None = None
    mainCosts: str | None = None
    loanPurpose: str | None = None
    is_first_visit: bool = True


class ChatResponse(BaseModel):
    content: str
    phase: str
    extracted: dict
    is_complete: bool
    quick_replies: list[str]
    offer_amount: int = 0
    is_offer: bool = False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    result = await run_agent(
        session_id=req.session_id,
        message=req.message,
        tester_name=req.tester_name,
        approved_amount=req.approved_amount,
        mode=req.mode,
        collected=req.collected,
        weekly_revenue=req.weeklyRevenue,
        main_costs=req.mainCosts,
        loan_purpose=req.loanPurpose,
        is_first_visit=req.is_first_visit,
    )

    phase = result["phase"]
    is_complete = phase == "complete"
    offer_amount = result.get("offer_amount", 0)

    return ChatResponse(
        content=result["content"],
        phase=phase,
        extracted=result.get("collected", {}),
        is_complete=is_complete,
        quick_replies=result.get("quick_replies", []),
        offer_amount=offer_amount,
        is_offer=offer_amount > 0 and phase == "5",
    )
