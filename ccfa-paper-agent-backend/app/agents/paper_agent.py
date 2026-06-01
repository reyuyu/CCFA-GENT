from __future__ import annotations

from agents import Agent, ModelSettings, handoff, set_tracing_disabled

from app.core.config import Settings
from app.agents.retrieval_agent import create_retrieve_academic_papers_tool
from app.models import create_deepseek_model
from app.prompts import build_paper_manager_instructions, build_writing_agent_instructions
from app.tools import PAPER_MANAGER_TOOLS, WRITING_AGENT_TOOLS


def create_writing_agent(settings: Settings, tool_choice: str | None = None) -> Agent:
    retrieve_academic_papers = create_retrieve_academic_papers_tool(settings)
    return Agent(
        name="PaperWritingAgent",
        handoff_description=(
            "Academic manuscript writing, revision, polishing, structure improvement, "
            "and manuscript patch generation."
        ),
        instructions=build_writing_agent_instructions(),
        model=create_deepseek_model(settings),
        model_settings=ModelSettings(tool_choice=tool_choice),
        tools=[*WRITING_AGENT_TOOLS, retrieve_academic_papers],
    )


def create_paper_agent(settings: Settings, tool_choice: str | None = None) -> Agent:
    set_tracing_disabled(settings.disable_tracing)

    writing_agent = create_writing_agent(settings, tool_choice=tool_choice)
    retrieve_academic_papers = create_retrieve_academic_papers_tool(settings)

    return Agent(
        name="PaperManagerAgent",
        instructions=build_paper_manager_instructions(),
        model=create_deepseek_model(settings),
        model_settings=ModelSettings(tool_choice=tool_choice),
        tools=[*PAPER_MANAGER_TOOLS, retrieve_academic_papers],
        handoffs=[
            handoff(
                writing_agent,
                tool_name_override="handoff_to_writing_agent",
                tool_description_override=(
                    "Transfer writing, revision, polishing, title, abstract, contribution, "
                    "method, introduction, experiment/result/discussion, and manuscript "
                    "editing tasks to WritingAgent."
                ),
            )
        ],
    )
