import json

from app.context.project_context import build_model_project_context
from app.schemas.agent import AgentRequest


def build_agent_input(request: AgentRequest) -> str:
    payload = {
        "projectContext": build_model_project_context(request.context),
        "userMessage": request.userMessage,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)
