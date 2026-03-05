from typing import Optional

from pydantic import BaseModel, Field


class ExtractedFields(BaseModel):
    """Profile data extracted from the customer's latest message.
    Set a field only when the customer provides a clear, confirmed value.
    Leave as null otherwise."""

    businessType: Optional[str] = Field(
        default=None,
        description="The type of business the customer runs (e.g. 'Clothing store', 'Food stand')."
    )
    weeklyRevenue: Optional[str] = Field(
        default=None,
        description="Customer's stated weekly revenue (e.g. 'About $5,000', 'Under $3,000')."
    )
    mainCosts: Optional[str] = Field(
        default=None,
        description="Customer's main business costs (e.g. 'Inventory and rent')."
    )
    loanPurpose: Optional[str] = Field(
        default=None,
        description="What the customer plans to use the loan for (e.g. 'Restock inventory')."
    )

    def to_dict(self) -> dict[str, str]:
        """Return only the non-None fields as a plain dict."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


class AgentDecision(BaseModel):
    response: str = Field(
        description="The message to send to the customer. Warm, conversational English. Short and empowering."
    )
    extracted: ExtractedFields = Field(
        default_factory=ExtractedFields,
        description="Any new profile data extracted from the customer's latest message."
    )
    advance_phase: bool = Field(
        default=False,
        description=(
            "Set to true ONLY when the current phase objective is complete. "
            "Phase 1: after businessType extracted. "
            "Phase 1.5: always (optional step). "
            "Phase 2: after weeklyRevenue extracted (or already collected). "
            "Phase 3: after mainCosts extracted. "
            "Phase 3.5: after loanPurpose extracted. "
            "Phase 4: after coaching demo exchange complete (2 turns). "
            "Phase 5: after installment selection confirmed. "
            "Phase 0, 6: advance after one good exchange."
        )
    )
    offer_amount: int = Field(
        default=0,
        description="Phase 5 only: calculated credit offer in MXN. 0 in all other phases."
    )
    quick_replies: list[str] = Field(
        default_factory=list,
        description=(
            "2-4 short suggested reply options in English that directly answer the question you just asked. "
            "Match the options to the specific question: "
            "e.g. if asking business type -> ['Clothing store', 'Food/cooking', 'Beauty', 'Other']; "
            "if asking weekly revenue -> ['Under $3,000', '$3,000–$8,000', '$8,000–$15,000', 'Over $15,000']; "
            "if asking about costs -> ['Inventory/supplies', 'Rent + utilities', 'Staff wages', 'Other']; "
            "if asking loan purpose -> ['Restock inventory', 'Buy equipment', 'Working capital', 'Other']; "
            "if it's Phase 0 -> ['Let\\'s go!', 'How does this work?']; "
            "if it's Phase 1.5 -> ['Upload a photo', 'Skip this step']; "
            "if it's Phase 3.5 loan purpose collected -> ['Show me Part 2']; "
            "if it's Phase 5 offer -> ['1 payment – 30 days', '2 payments – 60 days', 'I have a question']; "
            "if it's an open coaching question or transition message -> leave empty []."
        )
    )
