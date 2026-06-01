import logging
import time
from typing import Any

from agents import RunHooks


logger = logging.getLogger("paper_agent")


class PaperAgentHooks(RunHooks):
    def __init__(self) -> None:
        self.started_at = time.perf_counter()

    async def on_agent_start(self, context: Any, agent: Any) -> None:
        logger.info("agent_start name=%s", getattr(agent, "name", "unknown"))

    async def on_agent_end(self, context: Any, agent: Any, output: Any) -> None:
        elapsed_ms = int((time.perf_counter() - self.started_at) * 1000)
        logger.info(
            "agent_end name=%s elapsed_ms=%s output_type=%s",
            getattr(agent, "name", "unknown"),
            elapsed_ms,
            type(output).__name__,
        )

    async def on_tool_start(self, context: Any, agent: Any, tool: Any) -> None:
        logger.info(
            "tool_start agent=%s tool=%s",
            getattr(agent, "name", "unknown"),
            getattr(tool, "name", type(tool).__name__),
        )

    async def on_tool_end(self, context: Any, agent: Any, tool: Any, result: str) -> None:
        logger.info(
            "tool_end agent=%s tool=%s result_len=%s",
            getattr(agent, "name", "unknown"),
            getattr(tool, "name", type(tool).__name__),
            len(result or ""),
        )
