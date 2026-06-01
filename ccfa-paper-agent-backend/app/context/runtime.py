from dataclasses import dataclass, field
from typing import Any


@dataclass
class PaperAgentRunContext:
    project_context: dict[str, Any]
    patches: list[dict[str, Any]] = field(default_factory=list)

    def add_patch(self, patch: dict[str, Any]) -> None:
        self.patches.append(patch)
