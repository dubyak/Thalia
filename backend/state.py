from typing import Optional

from pydantic import BaseModel, Field


class ExtractedFields(BaseModel):
    """Profile data extracted from the customer's latest message.
    Set a field only when the customer provides a clear, confirmed value.
    Leave as null otherwise."""

    # Business profile questions (Phases 1-3)
    sellingChannel: Optional[str] = Field(
        default=None,
        description="How/where the customer primarily operates or sells (e.g. 'Market stall', 'From home on social media')."
    )
    tenure: Optional[str] = Field(
        default=None,
        description="How long the customer has been running the business (e.g. '3 years', '6 months')."
    )
    typicalCustomer: Optional[str] = Field(
        default=None,
        description="Description of their typical customer (e.g. 'Neighbors, mostly women 25-40')."
    )

    # Business health questions (Phases 4-7)
    recentChanges: Optional[str] = Field(
        default=None,
        description="What has changed in the business since their last loan (e.g. 'Added delivery', 'Nothing major')."
    )
    nearTermOutlook: Optional[str] = Field(
        default=None,
        description="Sales outlook for the next ~2 weeks (e.g. 'Good, holiday season coming', 'Slow, rainy season')."
    )
    outlookReason: Optional[str] = Field(
        default=None,
        description="If outlook is negative, the brief reason why. Only set when outlook is clearly negative."
    )
    cashCycleSpeed: Optional[str] = Field(
        default=None,
        description="How quickly they get cash back after spending on stock/supplies (e.g. 'Same week', '2-3 weeks')."
    )
    workingCapital: Optional[str] = Field(
        default=None,
        description="How much of their total working capital need Tala currently meets (e.g. 'About half', 'Most of it')."
    )

    def to_dict(self) -> dict[str, str]:
        """Return only the non-None fields as a plain dict."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


class AgentDecision(BaseModel):
    messages: list[str] = Field(
        description=(
            "Array of short messages to send as separate chat bubbles. "
            "Each message should be 40-47 words max. "
            "Break longer responses into 2-3 bubbles. "
            "The LAST message in the array must end with a clear question or call to action — no dead ends."
        )
    )
    extracted: ExtractedFields = Field(
        default_factory=ExtractedFields,
        description="Any new profile data extracted from the customer's latest message."
    )
    advance_phase: bool = Field(
        default=False,
        description=(
            "Set to true ONLY when the current phase objective is complete. "
            "Phase 0: after welcome delivered. "
            "Phase 1: after sellingChannel extracted. "
            "Phase 2: after tenure extracted. "
            "Phase 3: after typicalCustomer extracted. "
            "Phase 4: after recentChanges extracted. "
            "Phase 5: after nearTermOutlook extracted (and outlookReason if negative). "
            "Phase 6: after cashCycleSpeed extracted. "
            "Phase 7: after workingCapital extracted. "
            "Phase 8: after evidence shared or skipped. "
            "Phase 9: after coaching demo complete (3-4 turns). "
            "Phase 10: after offer accepted and installment confirmed. "
            "Phase 11: after closing delivered."
        )
    )
    offer_amount: int = Field(
        default=0,
        description="Phase 10 only: credit offer amount in MXN. 0 in all other phases."
    )
