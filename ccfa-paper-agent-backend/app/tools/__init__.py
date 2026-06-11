from app.tools.project_tools import (
    PAPER_AGENT_TOOLS,
    PROJECT_RETRIEVAL_TOOLS,
    PROJECT_WRITING_TOOLS,
    edit_introduction_outline,
)
from app.tools.checking_skill_tools import CHECKING_SKILL_TOOLS
from app.tools.semantic_scholar_tools import request_reference_paper_reading
from app.tools.skill_tools import WRITING_SKILL_TOOLS

PAPER_MANAGER_TOOLS = [
    *PROJECT_RETRIEVAL_TOOLS,
    request_reference_paper_reading,
    *WRITING_SKILL_TOOLS,
    *PROJECT_WRITING_TOOLS,
]

WRITING_AGENT_TOOLS = [
    *PROJECT_RETRIEVAL_TOOLS,
    request_reference_paper_reading,
    *WRITING_SKILL_TOOLS,
    *PROJECT_WRITING_TOOLS,
]

CHECKING_AGENT_TOOLS = [
    *PROJECT_RETRIEVAL_TOOLS,
    request_reference_paper_reading,
    *CHECKING_SKILL_TOOLS,
    *PROJECT_WRITING_TOOLS,
]

REFERENCE_LEARNING_AGENT_TOOLS = [
    *PROJECT_RETRIEVAL_TOOLS,
    request_reference_paper_reading,
    *WRITING_SKILL_TOOLS,
    edit_introduction_outline,
]

__all__ = [
    "CHECKING_AGENT_TOOLS",
    "PAPER_AGENT_TOOLS",
    "PAPER_MANAGER_TOOLS",
    "REFERENCE_LEARNING_AGENT_TOOLS",
    "WRITING_AGENT_TOOLS",
]
