"""Agent Runner coordinating skill routing, execution, and persistence."""

from collections.abc import AsyncGenerator
import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.agent.router import SkillRouter
from backend.app.agent.skills.base import SkillContext, SkillType
from backend.app.agent.skills.grounded_qa import GroundedQASkill
from backend.app.agent.skills.ship30 import Ship30EssaySkill
from backend.app.providers.base import ChatMessage, GenerationConfig
from backend.app.providers.manager import ProviderManager
from backend.app.repositories.message_repo import MessageRepository
from backend.app.repositories.session_repo import SessionRepository

logger = structlog.get_logger()


class AgentRunner:
    """Dispatches user messages to appropriate skills, streams output, and persists records."""

    def __init__(
        self,
        router: SkillRouter | None = None,
        grounded_qa_skill: GroundedQASkill | None = None,
        ship30_skill: Ship30EssaySkill | None = None,
        session_repo: SessionRepository | None = None,
        message_repo: MessageRepository | None = None,
        provider_manager: ProviderManager | None = None,
    ):
        self.router = router or SkillRouter()
        self.grounded_qa_skill = grounded_qa_skill or GroundedQASkill()
        self.ship30_skill = ship30_skill or Ship30EssaySkill()
        self.session_repo = session_repo or SessionRepository()
        self.message_repo = message_repo or MessageRepository()
        self.provider_manager = provider_manager or ProviderManager()

    async def run_turn_stream(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        user_prompt: str,
        provider_override: str | None = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        # 1. Verify session exists
        session = await self.session_repo.get_by_id(db, session_id)
        if not session:
            yield {"event": "error", "data": {"error": f"Session {session_id} not found."}}
            return

        # 2. Persist user message turn
        user_msg = await self.message_repo.append(
            db=db,
            session_id=session_id,
            role="user",
            content=user_prompt,
        )
        await db.commit()

        # 3. Load prior conversation history for this session (preventing cross-session leaks)
        messages_history, _ = await self.message_repo.list_for_session(db, session_id, limit=8)
        history_dicts = [{"role": m.role, "content": m.content} for m in messages_history]

        # 4. Route intent
        skill_type = self.router.route(user_prompt)
        yield {"event": "status", "data": {"stage": "routing", "skill": skill_type.value}}

        context = SkillContext(
            session_id=str(session_id),
            user_prompt=user_prompt,
            history_messages=history_dicts,
            provider_override=provider_override,
        )

        final_content = ""
        citations = []

        if skill_type == SkillType.SHIP30_ESSAY:
            stream_gen = self.ship30_skill.execute_stream(context, db)
        elif skill_type == SkillType.GROUNDED_QA:
            stream_gen = self.grounded_qa_skill.execute_stream(context, db)
        else:
            # DIRECT_CHAT fallback
            stream_gen = self._handle_direct_chat_stream(context)

        # 5. Stream events to consumer
        async for event in stream_gen:
            yield event
            if event["event"] == "done":
                done_data = event.get("data", {})
                final_content = done_data.get("final_content", "")
                citations = done_data.get("citations", [])

        # 6. Persist assistant response turn with citations atomically
        if final_content:
            await self.message_repo.append(
                db=db,
                session_id=session_id,
                role="assistant",
                content=final_content,
                citations=citations,
            )
            await db.commit()

    async def _handle_direct_chat_stream(
        self,
        context: SkillContext,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Simple conversational stream for greetings without RAG."""
        yield {"event": "status", "data": {"stage": "generating_direct"}}
        provider = self.provider_manager.get_provider(override=context.provider_override)
        messages = [
            ChatMessage(
                role="system",
                content=(
                    "You are The Lenny Growth Assistant. Greet the user warmly and concisely explain that "
                    "you are grounded in Lenny Rachitsky's podcast and newsletter archives, ready to answer "
                    "growth questions or craft Ship 30 for 30 essays."
                ),
            ),
            ChatMessage(role="user", content=context.user_prompt),
        ]
        tokens = []
        async for token in provider.generate_stream(messages, GenerationConfig(temperature=0.3, max_tokens=150)):
            tokens.append(token)
            yield {"event": "token", "data": {"token": token}}

        full_resp = "".join(tokens)
        yield {
            "event": "done",
            "data": {"citations": [], "has_sufficient_evidence": True, "final_content": full_resp},
        }
