from dataclasses import dataclass, field
from typing import Any


@dataclass
class PaperAgentRunContext:
    project_context: dict[str, Any]
    patches: list[dict[str, Any]] = field(default_factory=list)
    reference_requests: list[dict[str, Any]] = field(default_factory=list)

    def add_patch(self, patch: dict[str, Any]) -> None:
        self.patches.append(patch)

    def add_reference_request(self, request: dict[str, Any]) -> None:
        request_key = str(request.get("semanticScholarPaperId") or request.get("pdfUrl") or "").strip()
        if request_key:
            for existing in self.reference_requests:
                existing_key = str(
                    existing.get("semanticScholarPaperId") or existing.get("pdfUrl") or ""
                ).strip()
                if existing_key == request_key:
                    return
        self.reference_requests.append(request)
