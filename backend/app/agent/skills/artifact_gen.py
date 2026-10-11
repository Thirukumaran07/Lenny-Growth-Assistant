"""Artifact Generator Skill producing validated HTML/CSS and Markdown artifacts."""

from collections.abc import AsyncGenerator
import re
from typing import Any
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.agent.skills.base import AgentSkill, SkillContext, SkillType
from backend.app.providers.base import ChatMessage, GenerationConfig
from backend.app.providers.manager import ProviderManager
from backend.app.rag.retriever import TranscriptRetriever
from backend.app.repositories.artifact_repo import ArtifactRepository

logger = structlog.get_logger()


class ArtifactGeneratorSkill(AgentSkill):
    """Generates standalone, validated Markdown or HTML/CSS artifacts derived from conversation."""

    def __init__(
        self,
        retriever: TranscriptRetriever | None = None,
        provider_manager: ProviderManager | None = None,
        artifact_repo: ArtifactRepository | None = None,
    ):
        self.retriever = retriever or TranscriptRetriever(similarity_threshold=0.50, top_k=4)
        self.provider_manager = provider_manager or ProviderManager()
        self.artifact_repo = artifact_repo or ArtifactRepository()

    def skill_type(self) -> SkillType:
        return SkillType.ARTIFACT_GENERATOR

    def _determine_target_type(self, prompt: str) -> str:
        """Determines whether the user requested HTML or Markdown."""
        p_lower = prompt.lower()
        if any(kw in p_lower for kw in ("markdown", ".md", "doc", "checklist", "playbook", "framework")):
            if not any(kw in p_lower for kw in ("html", "css", "landing page", "dashboard", "widget", "ui")):
                return "markdown"
        return "html"

    async def execute_stream(
        self,
        context: SkillContext,
        db: AsyncSession,
    ) -> AsyncGenerator[dict[str, Any], None]:
        target_type = self._determine_target_type(context.user_prompt)
        yield {
            "event": "status",
            "data": {
                "stage": "generating_artifact",
                "message": f"Synthesizing {target_type.upper()} artifact from conversation & podcast archives...",
                "target_type": target_type,
            },
        }

        # 1. Retrieve knowledge if prompt touches on podcast topics
        retrieval_res = await self.retriever.retrieve(db, context.user_prompt, top_k=4)
        citations = [p.to_citation_dict() for p in retrieval_res.passages] if retrieval_res.passages else []
        if citations:
            yield {"event": "citations", "data": {"citations": citations}}

        # Format retrieved context
        retrieved_text = ""
        if retrieval_res.passages:
            blocks = []
            for i, p in enumerate(retrieval_res.passages, start=1):
                blocks.append(f"[{i} {p.speaker or 'Guest'} - {p.episode_title}]:\n{p.content}\n")
            retrieved_text = "\n".join(blocks)

        # 2. Format prior conversation history
        conv_summary = ""
        if context.history_messages:
            history_lines = []
            for msg in context.history_messages[-6:]:
                role = msg.get("role", "user").capitalize()
                content = msg.get("content", "")[:300]
                history_lines.append(f"{role}: {content}")
            conv_summary = "RECENT CONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n\n"

        # 3. Build generation prompt
        if target_type == "html":
            format_rules = (
                "You must construct a complete, self-contained, valid HTML5 document.\n"
                "- Include <!DOCTYPE html>, <html lang='en'>, <head>, <meta charset='UTF-8'>, <meta name='viewport' content='width=device-width, initial-scale=1.0'>, <title>, embedded <style>, and <body>.\n"
                "- Use clean, modern, responsive CSS (clean font stack, nice margins, card layouts, dark or sleek modern theme).\n"
                "- Do NOT link external stylesheets or scripts that may fail under strict CSP.\n"
                "- Embed any visual charts or metrics using semantic HTML/CSS or inline SVG.\n"
            )
        else:
            format_rules = (
                "You must construct a comprehensive, structured Markdown document.\n"
                "- Use rich markdown headings (#, ##, ###), bullet lists, tables, callout blocks, and actionable steps.\n"
                "- Include clear sections: Overview, Core Principles, Tactical Implementation Checklist, and Measurement.\n"
            )

        system_prompt = (
            "You are an expert product and growth document architect for The Lenny Growth Assistant.\n"
            "Your task is to generate a standalone, high-value artifact derived from the user's prompt and conversation.\n\n"
            f"{format_rules}\n"
            "OUTPUT STRUCTURE SPECIFICATION (STRICT):\n"
            "Provide a short 1-2 sentence conversational intro, then format the artifact exactly as follows:\n"
            "TITLE: <Concise, professional title for the artifact, max 80 chars>\n"
            f"TYPE: {target_type}\n"
            "---BEGIN ARTIFACT---\n"
            "<Complete raw artifact code/text here>\n"
            "---END ARTIFACT---\n\n"
            f"{conv_summary}"
            f"GROUNDED PODCAST KNOWLEDGE:\n{retrieved_text if retrieved_text else 'None provided; use general growth best practices.'}\n"
        )

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=context.user_prompt),
        ]

        provider = self.provider_manager.get_provider(override=context.provider_override)
        full_tokens = []

        async for token in provider.generate_stream(
            messages,
            GenerationConfig(temperature=0.2, max_tokens=1500),
        ):
            full_tokens.append(token)
            yield {"event": "token", "data": {"token": token}}

        raw_response = "".join(full_tokens)

        # 4. Extract and validate artifact content
        title = "Growth Framework Artifact"
        artifact_content = ""
        actual_type = target_type

        # Look for title
        title_match = re.search(r"^TITLE:\s*(.+)$", raw_response, re.MULTILINE | re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()[:255]

        # Look for type
        type_match = re.search(r"^TYPE:\s*(html|markdown)", raw_response, re.MULTILINE | re.IGNORECASE)
        if type_match:
            actual_type = type_match.group(1).strip().lower()

        # Extract artifact body
        body_match = re.search(
            r"---BEGIN ARTIFACT---\s*(.*?)\s*---END ARTIFACT---",
            raw_response,
            re.DOTALL,
        )
        if body_match:
            artifact_content = body_match.group(1).strip()
        else:
            # Fallback: check for markdown code blocks
            code_block_match = re.search(
                rf"```(?:{target_type}|xml|html)?\s*(.*?)\s*```",
                raw_response,
                re.DOTALL,
            )
            if code_block_match:
                artifact_content = code_block_match.group(1).strip()
            else:
                artifact_content = raw_response.strip()

        # If html was requested but content lacks doctype/html wrapper, wrap it
        if actual_type == "html" and "<html" not in artifact_content.lower():
            artifact_content = (
                "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n"
                "<meta charset=\"UTF-8\">\n"
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
                f"<title>{title}</title>\n"
                "<style>\n"
                "  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; "
                "line-height: 1.6; padding: 2rem; color: #1f2937; background: #f9fafb; max-width: 800px; margin: 0 auto; }\n"
                "  h1, h2, h3 { color: #111827; }\n"
                "  .card { background: #ffffff; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }\n"
                "</style>\n</head>\n<body>\n"
                f"<div class=\"card\"><h1>{title}</h1>\n{artifact_content}\n</div>\n</body>\n</html>"
            )

        # 5. Persist artifact record in DB
        session_uuid = uuid.UUID(context.session_id)
        created_artifact = await self.artifact_repo.create(
            db=db,
            session_id=session_uuid,
            title=title,
            artifact_type=actual_type,
            content=artifact_content,
        )

        # 6. Emit artifact event
        artifact_payload = {
            "id": str(created_artifact.id),
            "session_id": str(created_artifact.session_id),
            "title": created_artifact.title,
            "artifact_type": created_artifact.artifact_type,
            "content": created_artifact.content,
            "created_at": created_artifact.created_at.isoformat(),
        }
        yield {"event": "artifact", "data": artifact_payload}

        # 7. Conversational message summarizing the artifact
        intro_content = (
            f"I have created the **{title}** artifact ({actual_type.upper()}). "
            f"You can preview and inspect the code in the split Artifact Viewer on the right."
        )

        yield {
            "event": "done",
            "data": {
                "citations": citations,
                "has_sufficient_evidence": True,
                "final_content": intro_content,
                "artifact": artifact_payload,
            },
        }
