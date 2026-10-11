"""Grounded Question-Answering Skill referencing Lenny's podcast transcripts."""

from collections.abc import AsyncGenerator
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.agent.skills.base import AgentSkill, SkillContext, SkillType
from backend.app.providers.base import ChatMessage, GenerationConfig
from backend.app.providers.manager import ProviderManager
from backend.app.rag.retriever import TranscriptRetriever

logger = structlog.get_logger()


class GroundedQASkill(AgentSkill):
    """Executes grounded question answering using pgvector similarity search."""

    def __init__(
        self,
        retriever: TranscriptRetriever | None = None,
        provider_manager: ProviderManager | None = None,
    ):
        self.retriever = retriever or TranscriptRetriever()
        self.provider_manager = provider_manager or ProviderManager()

    def skill_type(self) -> SkillType:
        return SkillType.GROUNDED_QA

    async def execute_stream(
        self,
        context: SkillContext,
        db: AsyncSession,
    ) -> AsyncGenerator[dict[str, Any], None]:
        # 1. Emit retrieval status
        yield {"event": "status", "data": {"stage": "retrieving", "message": "Searching podcast archives..."}}

        # 2. Retrieve relevant transcript passages
        retrieval_res = await self.retriever.retrieve(db, context.user_prompt)

        # 3. Check for insufficient evidence guardrail (< 0.65 threshold)
        if not retrieval_res.has_sufficient_evidence:
            logger.info("insufficient_evidence_triggered", query=context.user_prompt, reason=retrieval_res.insufficient_reason)
            refusal_text = (
                "Insufficient evidence found in the ingested transcripts to answer this query. "
                "Lenny's guests in the current archive do not address this specific question.\n\n"
                "**Suggested topics you can ask about:**\n"
                "- How Superhuman measures product-market fit (Rahul Vohra)\n"
                "- B2B vs. B2C retention benchmarks and PLG flywheels (Elena Verna)\n"
                "- Y Combinator retention curves and Airbnb activation milestones (Gustaf Alströmer)"
            )
            yield {"event": "status", "data": {"stage": "insufficient_evidence", "reason": retrieval_res.insufficient_reason}}
            yield {"event": "token", "data": {"token": refusal_text}}
            yield {
                "event": "done",
                "data": {
                    "citations": [],
                    "has_sufficient_evidence": False,
                    "insufficient_reason": retrieval_res.insufficient_reason,
                    "final_content": refusal_text,
                },
            }
            return

        # 4. Format verified citations
        citations = [p.to_citation_dict() for p in retrieval_res.passages]
        yield {"event": "citations", "data": {"citations": citations}}

        # 5. Build Grounded Prompt with citations and session history
        context_blocks = []
        for i, p in enumerate(retrieval_res.passages, start=1):
            tag = p.format_citation_tag(i)
            context_blocks.append(f"--- SOURCE {tag} ---\n{p.content}\n")
        joined_context = "\n".join(context_blocks)

        system_prompt = (
            "You are The Lenny Growth Assistant, an expert AI product and growth partner.\n"
            "Answer the user's question accurately and exclusively using the provided podcast transcript excerpts.\n"
            "CRITICAL RULES:\n"
            "1. Ground all factual assertions in the supplied sources.\n"
            "2. Whenever citing a statement, include the exact citation tag e.g. [1 Guest Name - Episode Title - Timestamp].\n"
            "3. If a nuance is not supported by the sources, state clearly that it is not covered in the excerpts.\n"
            "4. Provide a structured, insightful answer with clear takeaways for product managers.\n\n"
            f"VERIFIED SOURCES:\n{joined_context}"
        )

        messages = [ChatMessage(role="system", content=system_prompt)]

        # Include prior conversation context (up to last 6 turns)
        for prev in context.history_messages[-6:]:
            messages.append(ChatMessage(role=prev.get("role", "user"), content=prev.get("content", "")))

        messages.append(ChatMessage(role="user", content=context.user_prompt))

        # 6. Stream tokens from LLM Provider
        provider = self.provider_manager.get_provider(
            override=context.provider_override if context.provider_override else None
        )
        yield {"event": "status", "data": {"stage": "generating", "provider": provider.provider_type().value, "model": provider.active_model()}}

        full_content_chunks = []
        async for token in provider.generate_stream(messages, GenerationConfig(temperature=0.2, max_tokens=1500)):
            full_content_chunks.append(token)
            yield {"event": "token", "data": {"token": token}}

        final_text = "".join(full_content_chunks)
        yield {
            "event": "done",
            "data": {
                "citations": citations,
                "has_sufficient_evidence": True,
                "final_content": final_text,
            },
        }
