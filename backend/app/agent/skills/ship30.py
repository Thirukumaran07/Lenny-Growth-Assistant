"""Ship 30 for 30 Atomic Essay Skill grounded in Lenny's podcast archives."""

from collections.abc import AsyncGenerator
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.agent.skills.base import AgentSkill, SkillContext, SkillType
from backend.app.providers.base import ChatMessage, GenerationConfig
from backend.app.providers.manager import ProviderManager
from backend.app.rag.retriever import TranscriptRetriever

logger = structlog.get_logger()


class Ship30EssaySkill(AgentSkill):
    """Generates structured ~1,250-word atomic essays adhering to Ship 30 for 30 principles."""

    def __init__(
        self,
        retriever: TranscriptRetriever | None = None,
        provider_manager: ProviderManager | None = None,
    ):
        self.retriever = retriever or TranscriptRetriever(similarity_threshold=0.55, top_k=5)
        self.provider_manager = provider_manager or ProviderManager()

    def skill_type(self) -> SkillType:
        return SkillType.SHIP30_ESSAY

    async def execute_stream(
        self,
        context: SkillContext,
        db: AsyncSession,
    ) -> AsyncGenerator[dict[str, Any], None]:
        # 1. Emit retrieval status
        yield {"event": "status", "data": {"stage": "retrieving", "message": "Gathering transcript playbooks for Ship 30 essay..."}}

        # 2. Retrieve relevant transcript passages
        retrieval_res = await self.retriever.retrieve(db, context.user_prompt, top_k=5)

        # 3. Check for evidence
        if not retrieval_res.passages or retrieval_res.top_score < 0.50:
            refusal_text = (
                "Insufficient evidence found in the transcripts to craft a grounded Ship 30 for 30 essay. "
                "Please choose an episode topic present in the archives, such as:\n"
                "- Superhuman's Product-Market Fit Engine (Rahul Vohra)\n"
                "- Product-Led Growth & Retention Loops (Elena Verna)\n"
                "- Y Combinator PMF Benchmarks (Gustaf Alströmer)"
            )
            yield {"event": "status", "data": {"stage": "insufficient_evidence"}}
            yield {"event": "token", "data": {"token": refusal_text}}
            yield {
                "event": "done",
                "data": {"citations": [], "has_sufficient_evidence": False, "final_content": refusal_text},
            }
            return

        citations = [p.to_citation_dict() for p in retrieval_res.passages]
        yield {"event": "citations", "data": {"citations": citations}}

        # 4. Format context blocks
        context_blocks = []
        for i, p in enumerate(retrieval_res.passages, start=1):
            tag = p.format_citation_tag(i)
            context_blocks.append(f"--- SOURCE {tag} ---\n{p.content}\n")
        joined_context = "\n".join(context_blocks)

        # 5. Ship 30 for 30 Prompt System Specification
        system_prompt = (
            "You are an elite growth essayist trained in the 'Ship 30 for 30' atomic essay methodology.\n"
            "Your task is to craft an original, compelling, practitioner-grade atomic essay of approximately 1,250 words "
            "grounded in the provided podcast transcript excerpts.\n\n"
            "MANDATORY SHIP 30 FOR 30 ARCHITECTURE:\n"
            "1. THE HOOK (Opening Paragraph):\n"
            "   - Begin with a bold, counterintuitive 1-line hook that challenges conventional product wisdom.\n"
            "   - Frame the high-stakes problem clearly.\n\n"
            "2. THE NARRATIVE PROGRESSION (3 Core Pillars):\n"
            "   - Pillar 1: The Diagnostic Failure (Why standard practices fail).\n"
            "   - Pillar 2: The Breakthrough Framework (The exact practitioner playbook from the guest).\n"
            "   - Pillar 3: The Flywheel Mechanics (How this compounds into defensible growth).\n\n"
            "3. SCANNABLE FORMATTING & SELECTIVE BOLDING:\n"
            "   - Use short, punchy paragraphs (2-3 sentences max).\n"
            "   - Bold the first sentence of each key paragraph to ensure the essay is 100% skimmable in 60 seconds.\n"
            "   - Use bullet points with bold lead-ins for key rules.\n\n"
            "4. THE ACTIONABLE TAKEAWAY:\n"
            "   - Conclude with '3 Tactical Steps You Can Implement Today' containing exact questions or metrics.\n\n"
            "5. EVIDENCE GROUNDING & CITATIONS:\n"
            "   - Every major insight must cite the provided source tag e.g. [1 Guest Name - Episode Title - Timestamp].\n"
            "   - Ground all data points in the evidence; explicitly flag any unsupported speculation.\n\n"
            f"VERIFIED SOURCES:\n{joined_context}"
        )

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=f"Write a comprehensive Ship 30 for 30 essay on: {context.user_prompt}"),
        ]

        # 6. Stream tokens
        provider = self.provider_manager.get_provider(override=context.provider_override)
        yield {
            "event": "status",
            "data": {"stage": "generating_essay", "provider": provider.provider_type().value, "model": provider.active_model()},
        }

        full_chunks = []
        async for token in provider.generate_stream(messages, GenerationConfig(temperature=0.3, max_tokens=2500)):
            full_chunks.append(token)
            yield {"event": "token", "data": {"token": token}}

        final_essay = "".join(full_chunks)
        yield {
            "event": "done",
            "data": {
                "citations": citations,
                "has_sufficient_evidence": True,
                "final_content": final_essay,
                "is_essay": True,
            },
        }
