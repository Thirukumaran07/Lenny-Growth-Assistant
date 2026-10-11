"""Deterministic Skill Router classifying user prompt intent."""

import re
import structlog
from backend.app.agent.skills.base import SkillType

logger = structlog.get_logger()


class SkillRouter:
    """Evaluates user prompt semantics and explicit slash commands to route intent."""

    # Keywords signaling Artifact generation (HTML/CSS or Markdown)
    ARTIFACT_TRIGGERS = [
        r"^/artifact\b",
        r"^/generate-artifact\b",
        r"\bgenerate\s+(?:an?\s+)?artifact\b",
        r"\bcreate\s+(?:an?\s+)?artifact\b",
        r"\b(?:html|markdown)\s+artifact\b",
        r"\b(?:create|build|generate|code|make)\s+(?:an?\s+)?(?:html|interactive\s+dashboard|landing\s+page|prototype\s+page|widget\s+html)\b",
        r"\b(?:create|generate|write)\s+(?:an?\s+)?(?:markdown\s+document|cheatsheet\s+document|framework\s+guide\s+document|playbook\s+document)\b",
    ]

    # Keywords signaling Ship 30 for 30 essay generation
    ESSAY_TRIGGERS = [
        r"^/essay\b",
        r"\bship\s*30\b",
        r"\batomic\s*essay\b",
        r"\bwrite\s+(?:an?\s+)?essay\b",
        r"\bdeep\s*dive\s*essay\b",
        r"\bpublishable\s*article\b",
    ]

    # Conversational greetings where retrieval is unnecessary
    GREETING_TRIGGERS = [
        r"^(?:hi|hello|hey|greetings|good\s+morning|good\s+afternoon|who\s+are\s+you)\b[\s.!]*$",
    ]

    def route(self, prompt: str) -> SkillType:
        """Deterministically classifies prompt into SkillType."""
        cleaned = prompt.strip().lower()

        # 1. Check for explicit artifact requests
        for pattern in self.ARTIFACT_TRIGGERS:
            if re.search(pattern, cleaned):
                logger.info("skill_routed", prompt_preview=prompt[:40], skill=SkillType.ARTIFACT_GENERATOR.value)
                return SkillType.ARTIFACT_GENERATOR

        # 2. Check for explicit essay requests
        for pattern in self.ESSAY_TRIGGERS:
            if re.search(pattern, cleaned):
                logger.info("skill_routed", prompt_preview=prompt[:40], skill=SkillType.SHIP30_ESSAY.value)
                return SkillType.SHIP30_ESSAY

        # 3. Check for simple greeting
        for pattern in self.GREETING_TRIGGERS:
            if re.search(pattern, cleaned):
                logger.info("skill_routed", prompt_preview=prompt[:40], skill=SkillType.DIRECT_CHAT.value)
                return SkillType.DIRECT_CHAT

        # 4. Default to Grounded Q&A for all knowledge questions
        logger.info("skill_routed", prompt_preview=prompt[:40], skill=SkillType.GROUNDED_QA.value)
        return SkillType.GROUNDED_QA
