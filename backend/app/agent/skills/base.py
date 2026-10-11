"""Base interfaces and result containers for Agent Skills."""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class SkillType(str, Enum):
    GROUNDED_QA = "grounded_qa"
    SHIP30_ESSAY = "ship30_essay"
    DIRECT_CHAT = "direct_chat"
    ARTIFACT_GENERATOR = "artifact_generator"


@dataclass
class SkillContext:
    session_id: str
    user_prompt: str
    history_messages: list[dict[str, Any]] = field(default_factory=list)
    provider_override: str | None = None


@dataclass
class SkillResult:
    skill_type: SkillType
    content: str
    citations: list[dict[str, Any]] = field(default_factory=list)
    has_sufficient_evidence: bool = True
    insufficient_reason: str | None = None
    suggested_followups: list[str] = field(default_factory=list)


class AgentSkill(ABC):
    """Abstract base class for all conversational skills."""

    @abstractmethod
    def skill_type(self) -> SkillType:
        pass

    @abstractmethod
    async def execute_stream(
        self,
        context: SkillContext,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Stream response events: status, citations, tokens, and done."""
        pass
