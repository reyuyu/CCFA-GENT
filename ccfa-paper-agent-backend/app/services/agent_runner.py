import json
import re
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any, Optional

from agents import Runner
from openai import APIConnectionError, APIError, AuthenticationError, RateLimitError
from pydantic import ValidationError

from app.agents.paper_agent import create_paper_agent
from app.context import build_agent_input
from app.context.runtime import PaperAgentRunContext
from app.core.config import Settings
from app.memory import get_thread_session
from app.memory.session_store import clear_thread_session
from app.observability import PaperAgentHooks
from app.schemas.agent import AgentRequest, AgentResponse


TOOL_PROGRESS_MESSAGES = {
    "list_draft_sections": "正在查看初稿结构...",
    "get_draft_section_content": "正在阅读初稿章节...",
    "list_draft_paragraphs": "正在查看初稿段落...",
    "get_draft_paragraph_content": "正在阅读初稿段落...",
    "get_draft_paragraph_status": "正在查看段落写作状态...",
    "list_reference_papers": "正在查看参考论文清单...",
    "list_reference_sections": "正在查看参考论文结构...",
    "get_reference_section_content": "正在阅读参考论文内容...",
    "edit_draft": "正在写入初稿修改建议...",
    "edit_draft_section": "正在写入章节修改建议...",
    "edit_draft_paragraph_content": "正在写入段落修改建议...",
    "edit_draft_paragraph_status": "正在更新段落写作状态...",
    "edit_project_status": "正在更新项目写作进度...",
}
TOOL_PROGRESS_MESSAGES.update(
    {
        "get_introduction_outline": "正在读取 Introduction 写作大纲...",
        "edit_introduction_outline": "正在生成 Introduction 段落大纲...",
        "semantic_paper_search": "正在检索 Semantic Scholar 相关论文...",
        "semantic_paper_citation_search": "正在检索该论文的后续被引工作...",
        "semantic_paper_reference_search": "正在检索该论文的参考文献...",
        "get_current_local_time": "正在获取本机当前时间...",
        "retrieve_academic_papers": "正在调用学术检索 Agent...",
    }
)

TOOL_PROGRESS_MESSAGES.update(
    {
        "get_scientific_problem_memory": "正在回顾论文科学问题记忆...",
        "edit_scientific_problem_memory": "正在更新论文科学问题记忆...",
    }
)

TOOL_PROGRESS_MESSAGES["edit_writing_skill_file"] = "正在更新写作 skill 文件..."
TOOL_PROGRESS_MESSAGES.update(
    {
        "list_checking_skill_registry": "正在查看检查 skill 注册表...",
        "read_checking_skill_instruction": "正在读取检查 skill 指令...",
        "list_checking_skill_files": "正在查看检查 skill 文件...",
        "read_checking_skill_file": "正在读取检查 skill 文件...",
    }
)


WRITING_TOOL_NAMES = {
    "edit_draft",
    "edit_draft_section",
    "edit_draft_paragraph_content",
    "edit_draft_paragraph_status",
    "edit_project_status",
    "edit_introduction_outline",
    "edit_scientific_problem_memory",
    "edit_writing_skill_file",
}


EDIT_KEYWORD_PATTERN = re.compile(
    (
        r"(\u4fee\u6539|\u6539\u5199|\u6da6\u8272|\u91cd\u5199|"
        r"\u4f18\u5316|\u7f16\u8f91|\u5199|\u64b0\u5199|\u5199\u5165|"
        r"\u8ffd\u52a0|\u6dfb\u52a0|\u63d2\u5165|\u6269\u5199|\u7eed\u5199|"
        r"\u751f\u6210|\u8865\u5145|\u52a0\u5165|\u653e\u5165|"
        r"rewrite|revise|polish|modify|edit|write|draft|append|insert|add|continue)"
    ),
    re.IGNORECASE,
)

EDIT_COMMAND_PATTERN = re.compile(
    (
        r"(\u8bf7|\u8bf7\u4f60|\u5e2e\u6211|\u5e2e\u5fd9|\u9ebb\u70e6|"
        r"\u628a|\u5c06|\u7ed9\u6211|\u76f4\u63a5|\u73b0\u5728|"
        r"\u4fee\u6539\u521d\u7a3f|\u6539\u5199\u521d\u7a3f|\u6da6\u8272\u521d\u7a3f|"
        r"\u4fee\u6539\u7b2c|\u6539\u5199\u7b2c|\u6da6\u8272\u7b2c|"
        r"\u5199|\u64b0\u5199|\u5199\u5165|\u8ffd\u52a0|\u6dfb\u52a0|"
        r"\u63d2\u5165|\u6269\u5199|\u7eed\u5199|\u751f\u6210|\u8865\u5145|"
        r"\u52a0\u5165|\u653e\u5165|P\d+|\u7b2c.+\u6bb5|"
        r"rewrite|revise|polish|modify|edit|write|draft|append|insert|add|continue)"
    ),
    re.IGNORECASE,
)

CAPABILITY_QUESTION_PATTERN = re.compile(
    (
        r"(\u54ea\u4e9b\u5de5\u5177|\u4ec0\u4e48\u5de5\u5177|\u5de5\u5177|"
        r"\u53ef\u4ee5.*\u5417|\u80fd.*\u5417|\u4f1a.*\u5417|"
        r"what tools|which tools|can you|are you able)"
    ),
    re.IGNORECASE,
)

MEMORY_QUESTION_PATTERN = re.compile(
    (
        r"((\u672c\u5730|\u8bb0\u5fc6|\u79ef\u7d2f|\u5199\u4f5c\u79ef\u7d2f|"
        r"\u5199\u4f5c\u8868\u8fbe|\u5e38\u89c1.*intro|\u5e38\u89c1.*\u5199\u4f5c.*\u8868\u8fbe)"
        r".*(\u6709\u6ca1\u6709|\u6709.*\u5417|\u662f\u5426.*\u6709|"
        r"\u53ef\u4ee5.*\u5417|\u80fd.*\u5417|\u4f1a.*\u5417)|"
        r"(\u6709\u6ca1\u6709|\u6709.*\u5417|\u662f\u5426.*\u6709)"
        r".*(\u672c\u5730|\u8bb0\u5fc6|\u79ef\u7d2f|\u5199\u4f5c\u79ef\u7d2f|"
        r"\u5199\u4f5c\u8868\u8fbe|\u5e38\u89c1.*intro|\u5e38\u89c1.*\u5199\u4f5c.*\u8868\u8fbe))"
    ),
    re.IGNORECASE,
)

SKILL_RESOURCE_COMMAND_PATTERN = re.compile(
    (
        r"(\u5199\u4f5c\u79ef\u7d2f|\u672c\u5730.*(\u8bb0\u5fc6|\u79ef\u7d2f)|"
        r"intro.*\u5199\u4f5c\u79ef\u7d2f|\u5199\u4f5c\u8868\u8fbe\u5e93|"
        r"\u597d\u8bcd\u597d\u53e5|\u8868\u8fbe\u79ef\u7d2f|"
        r"SKILL\.md|skill file|writing skill|writing accumulation|"
        r"accumulation file|expression library)"
    ),
    re.IGNORECASE,
)

CHECK_REQUEST_PATTERN = re.compile(
    (
        r"(\u68c0\u67e5|\u8bc4\u4ef7|\u8bc4\u4f30|\u8bca\u65ad|\u5ba1\u7a3f|"
        r"\u770b\u770b|\u770b\u4e00\u4e0b|\u5199\u5f97\u600e\u4e48\u6837|"
        r"\u5199\u7684\u600e\u4e48\u6837|\u5199\u5f97\u597d\u4e0d\u597d|"
        r"\u5199\u7684\u597d\u4e0d\u597d|\u597d\u4e0d\u597d|\u600e\u4e48\u6837|"
        r"\u901a\u987a|\u5145\u8db3|\u5bf9\u9f50|\u5408\u9002|\u5408\u7406|"
        r"\u6709\u4ec0\u4e48\u95ee\u9898|\u95ee\u9898|"
        r"check|evaluate|assess|review|diagnose|what do you think|how is)"
    ),
    re.IGNORECASE,
)

EXPLICIT_FILE_EDIT_PATTERN = re.compile(
    (
        r"(\u4fee\u6539|\u6539\u5199|\u6da6\u8272|\u91cd\u5199|\u4f18\u5316|"
        r"\u7f16\u8f91|\u5199\u5165|\u8ffd\u52a0|\u6dfb\u52a0|\u63d2\u5165|"
        r"\u6269\u5199|\u7eed\u5199|\u751f\u6210|\u8865\u5145|\u52a0\u5165|"
        r"\u653e\u5165|\u586b\u5165|\u6309.*\u6539|\u6839\u636e.*\u6539|"
        r"patch|rewrite|revise|polish|modify|edit|append|insert|add)"
    ),
    re.IGNORECASE,
)

MANUSCRIPT_PATCH_TARGET_PATTERN = re.compile(
    (
        r"(\u521d\u7a3f|\u7a3f\u4ef6|\u6b63\u6587|\u624b\u7a3f|\u8bba\u6587\u521d\u7a3f|"
        r"\u7ae0\u8282|\u6bb5\u843d|\u7b2c.+\u6bb5|P\d+|"
        r"Introduction|Abstract|Method|Result|Discussion|Conclusion|"
        r"manuscript|draft manuscript|draft file|paper draft|section|paragraph)"
    ),
    re.IGNORECASE,
)

CLAIMED_FILE_CHANGE_PATTERN = re.compile(
    (
        r"(\u5df2.*proposeFileChange|\u5df2\u4fee\u6539|\u5df2\u6539\u5199|\u5df2\u6da6\u8272|"
        r"\u5df2\u66ff\u6362|\u5df2\u66f4\u65b0|\u5b8c\u6574\u66ff\u6362|"
        r"\u5df2\u751f\u6210.*\u4fee\u6539|\u5237\u65b0\u524d\u7aef\u6587\u4ef6\u67e5\u770b)"
    ),
    re.IGNORECASE,
)

TEXT_EDIT_KEYWORDS = (
    "修改",
    "改写",
    "润色",
    "重写",
    "优化",
    "编辑",
    "写",
    "撰写",
    "写入",
    "追加",
    "添加",
    "插入",
    "扩写",
    "续写",
    "生成",
    "补充",
    "加入",
    "放入",
    "填入",
    "rewrite",
    "revise",
    "polish",
    "modify",
    "edit",
    "write",
    "draft",
    "append",
    "insert",
    "add",
    "continue",
)

TEXT_EDIT_COMMAND_HINTS = (
    "请",
    "请你",
    "帮我",
    "帮忙",
    "麻烦",
    "把",
    "将",
    "给我",
    "直接",
    "现在",
    "修改第",
    "改写第",
    "润色第",
    "写",
    "撰写",
    "写入",
    "追加",
    "添加",
    "插入",
    "扩写",
    "续写",
    "生成",
    "补充",
    "加入",
    "放入",
    "填入",
    "rewrite",
    "revise",
    "polish",
    "modify",
    "edit",
    "write",
    "draft",
    "append",
    "insert",
    "add",
    "continue",
)

TEXT_CAPABILITY_QUESTION_TERMS = (
    "哪些工具",
    "什么工具",
    "工具",
    "可以吗",
    "能吗",
    "会吗",
    "what tools",
    "which tools",
    "can you",
    "are you able",
)

TEXT_SKILL_RESOURCE_TERMS = (
    "写作积累",
    "本地记忆",
    "本地积累",
    "intro写作积累",
    "introduction写作积累",
    "写作表达库",
    "好词好句",
    "表达积累",
    "skill.md",
    "skill file",
    "writing skill",
    "writing accumulation",
    "accumulation file",
    "expression library",
)

TEXT_MANUSCRIPT_PATCH_TARGET_TERMS = (
    "初稿",
    "稿件",
    "正文",
    "手稿",
    "论文初稿",
    "章节",
    "段落",
    "第",
    "Introduction",
    "Abstract",
    "Method",
    "Result",
    "Discussion",
    "Conclusion",
    "manuscript",
    "draft manuscript",
    "draft file",
    "paper draft",
    "section",
    "paragraph",
)

TEXT_PLANNING_REQUEST_TERMS = (
    "章节设计",
    "章节规划",
    "章节安排",
    "章节结构",
    "结构设计",
    "结构规划",
    "写作设计",
    "写作规划",
    "论文设计",
    "论文结构",
    "大纲",
    "提纲",
    "框架",
    "方案",
    "设计一下",
    "规划一下",
    "outline",
    "section design",
    "section plan",
    "section outline",
    "paper outline",
    "paper structure",
    "writing plan",
    "writing outline",
)

TEXT_FILE_MUTATION_TERMS = (
    "修改",
    "改写",
    "润色",
    "重写",
    "优化",
    "编辑",
    "写入",
    "追加",
    "添加",
    "插入",
    "扩写",
    "续写",
    "补充",
    "加入",
    "放入",
    "填入",
    "替换",
    "更新",
    "应用到",
    "应用在",
    "保存到",
    "写回",
    "落到",
    "生成patch",
    "生成 patch",
    "rewrite",
    "revise",
    "polish",
    "modify",
    "edit",
    "append",
    "insert",
    "add to",
    "put into",
    "apply to",
    "save to",
    "write into",
    "write back",
    "patch",
)

TEXT_NO_FILE_EDIT_TERMS = (
    "不要写入",
    "先不要写入",
    "不写入",
    "不要修改初稿",
    "不修改初稿",
    "不改初稿",
    "只输出",
    "只给我文本",
    "仅输出",
    "do not edit",
    "don't edit",
    "do not write into",
)


def _contains_any_text(message: str, terms: tuple[str, ...]) -> bool:
    lowered = message.lower()
    return any(term.lower() in lowered for term in terms)


def _extract_json_object(text: str) -> Optional[dict[str, Any]]:
    stripped = text.strip()
    if not stripped:
        return None

    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(stripped[start : end + 1])
        except json.JSONDecodeError:
            return None

    return None


def _has_file_change_patch(patches: Optional[list[Any]]) -> bool:
    return any(
        isinstance(patch, dict) and patch.get("type") == "proposeFileChange"
        for patch in patches or []
    )


def _has_tool_generated_patch(patches: Optional[list[Any]]) -> bool:
    return any(isinstance(patch, dict) and isinstance(patch.get("type"), str) for patch in patches or [])


def _is_capability_question(message: str) -> bool:
    return bool(
        CAPABILITY_QUESTION_PATTERN.search(message)
        or MEMORY_QUESTION_PATTERN.search(message)
        or _contains_any_text(message, TEXT_CAPABILITY_QUESTION_TERMS)
    )


def _is_edit_command(message: str) -> bool:
    has_edit_keyword = bool(EDIT_KEYWORD_PATTERN.search(message)) or _contains_any_text(
        message,
        TEXT_EDIT_KEYWORDS,
    )
    has_command_hint = bool(EDIT_COMMAND_PATTERN.search(message)) or _contains_any_text(
        message,
        TEXT_EDIT_COMMAND_HINTS,
    )
    return has_edit_keyword and has_command_hint and not _is_capability_question(message)


def _is_skill_resource_command(message: str) -> bool:
    return bool(
        SKILL_RESOURCE_COMMAND_PATTERN.search(message)
        or _contains_any_text(message, TEXT_SKILL_RESOURCE_TERMS)
    )


def _is_check_only_request(message: str) -> bool:
    return bool(CHECK_REQUEST_PATTERN.search(message)) and not bool(EXPLICIT_FILE_EDIT_PATTERN.search(message))


def _is_planning_only_request(message: str) -> bool:
    if not _contains_any_text(message, TEXT_PLANNING_REQUEST_TERMS):
        return False
    if _contains_any_text(message, TEXT_NO_FILE_EDIT_TERMS):
        return True
    return not _contains_any_text(message, TEXT_FILE_MUTATION_TERMS)


def _requires_file_change_patch(message: str) -> bool:
    if _is_check_only_request(message):
        return False
    if _is_planning_only_request(message):
        return False
    if not _is_edit_command(message):
        return False
    if _is_skill_resource_command(message):
        return False
    if _contains_any_text(message, TEXT_NO_FILE_EDIT_TERMS):
        return False
    return bool(
        MANUSCRIPT_PATCH_TARGET_PATTERN.search(message)
        or _contains_any_text(message, TEXT_MANUSCRIPT_PATCH_TARGET_TERMS)
    )


def _claims_file_change(content: str) -> bool:
    return bool(CLAIMED_FILE_CHANGE_PATTERN.search(content))


def _claims_manuscript_file_change(content: str) -> bool:
    if not _claims_file_change(content):
        return False
    return bool(
        MANUSCRIPT_PATCH_TARGET_PATTERN.search(content)
        or _contains_any_text(content, TEXT_MANUSCRIPT_PATCH_TARGET_TERMS)
    )


def _contains_manual_file_change_patch(parsed: dict[str, Any]) -> bool:
    patches = parsed.get("patches")
    return _has_file_change_patch(patches if isinstance(patches, list) else None)


def _looks_like_manual_patch_text(content: str) -> bool:
    return '"patches"' in content and '"proposeFileChange"' in content


def _merge_reference_requests(
    parsed_requests: Any,
    generated_requests: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()

    for request in [
        *(parsed_requests if isinstance(parsed_requests, list) else []),
        *generated_requests,
    ]:
        if not isinstance(request, dict):
            continue
        key = str(request.get("semanticScholarPaperId") or request.get("pdfUrl") or "").strip()
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        merged.append(request)

    return merged


def _missing_edit_patch_response() -> AgentResponse:
    return AgentResponse(
        content=(
            "我没有生成真正的 `proposeFileChange` patch，所以前端不会出现"
            "“查看修改/确认应用”，初稿文件也不会被改动。请重新发起一次编辑请求，"
            "例如：“请把这段追加到 Introduction 后面”或“请修改 Introduction 第 2 段”。"
        )
    )
    return AgentResponse(
        content=(
            "我没有生成真正的 `proposeFileChange` patch，所以前端不会出现“查看修改/确认应用”，"
            "初稿文件也没有被改动。请指定要修改的章节或段落，例如："
            "“请修改初稿的 Introduction 章节”或“请润色第 3 段”。"
        )
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _progress_event(
    event_type: str,
    message: str,
    data: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    return {
        "type": event_type,
        "message": message,
        "data": data or {},
        "createdAt": _now_iso(),
    }


def _raw_item_value(raw_item: Any, key: str) -> Any:
    if isinstance(raw_item, dict):
        return raw_item.get(key)
    return getattr(raw_item, key, None)


def _tool_name_from_item(item: Any) -> str:
    raw_item = getattr(item, "raw_item", None)
    raw_name = _raw_item_value(raw_item, "name")
    if isinstance(raw_name, str) and raw_name:
        return raw_name

    tool_origin = getattr(item, "tool_origin", None)
    origin_name = getattr(tool_origin, "agent_tool_name", None)
    if isinstance(origin_name, str) and origin_name:
        return origin_name

    return "unknown_tool"


def _progress_from_stream_event(event: Any) -> Optional[dict[str, Any]]:
    event_type = getattr(event, "type", "")

    if event_type == "agent_updated_stream_event":
        agent_name = getattr(getattr(event, "new_agent", None), "name", "agent")
        return _progress_event(
            "thinking",
            f"正在切换到 {agent_name}...",
            {"agentName": agent_name},
        )

    if event_type != "run_item_stream_event":
        return None

    event_name = getattr(event, "name", "")
    item = getattr(event, "item", None)
    tool_name = _tool_name_from_item(item)

    if event_name == "tool_called":
        tool_message = TOOL_PROGRESS_MESSAGES.get(tool_name)
        display_message = (
            f"{tool_message}（工具：{tool_name}）"
            if tool_message
            else f"正在调用工具 {tool_name}..."
        )
        return _progress_event(
            "writing" if tool_name in WRITING_TOOL_NAMES else "tool_start",
            display_message,
            {"toolName": tool_name},
        )

    if event_name == "tool_output":
        display_tool = "" if tool_name == "unknown_tool" else f" {tool_name}"
        return _progress_event(
            "tool_end",
            f"工具{display_tool}执行完成，正在整理结果...",
            {"toolName": tool_name},
        )

    if event_name == "message_output_created":
        return _progress_event("writing", "正在生成最终回答...")

    if event_name == "reasoning_item_created":
        return _progress_event("thinking", "正在判断当前材料是否足够支撑回答...")

    if event_name in {"handoff_requested", "handoff_occured"}:
        return _progress_event("thinking", "正在调整任务处理方式...")

    return None


def _supports_required_tool_choice(model_name: str) -> bool:
    lowered = model_name.lower()
    unsupported_markers = ("reasoner", "thinking", "v4-pro")
    return not any(marker in lowered for marker in unsupported_markers)


def _response_from_final_output(
    final_output: Any,
    run_context: PaperAgentRunContext,
    requires_file_change_patch: bool,
    allow_non_manuscript_file_edit: bool,
) -> AgentResponse:
    raw_output = str(final_output).strip()

    parsed = _extract_json_object(raw_output)
    if not parsed:
        if not allow_non_manuscript_file_edit and not _has_tool_generated_patch(run_context.patches) and (
            requires_file_change_patch
            or _claims_manuscript_file_change(raw_output)
            or _looks_like_manual_patch_text(raw_output)
        ):
            return _missing_edit_patch_response()
        return AgentResponse(
            content=raw_output,
            patches=run_context.patches or None,
            referenceRequests=run_context.reference_requests or None,
        )

    has_manual_file_change_patch = _contains_manual_file_change_patch(parsed)
    if has_manual_file_change_patch and not _has_file_change_patch(run_context.patches):
        return _missing_edit_patch_response()

    parsed["patches"] = run_context.patches or []
    reference_requests = _merge_reference_requests(
        parsed.get("referenceRequests"),
        run_context.reference_requests,
    )
    if reference_requests:
        parsed["referenceRequests"] = reference_requests

    parsed_content = str(parsed.get("content") or "")
    if not allow_non_manuscript_file_edit and not _has_tool_generated_patch(parsed.get("patches")) and (
        requires_file_change_patch
        or _claims_manuscript_file_change(parsed_content)
        or has_manual_file_change_patch
    ):
        return _missing_edit_patch_response()

    try:
        return AgentResponse(**parsed)
    except ValidationError:
        return AgentResponse(content=parsed.get("content") or raw_output)


def _error_response(error: Exception) -> AgentResponse:
    if isinstance(error, AuthenticationError):
        return AgentResponse(
            content="DeepSeek authentication failed. Please check `DEEPSEEK_API_KEY` in the backend `.env`."
        )
    if isinstance(error, RateLimitError):
        return AgentResponse(content="DeepSeek rate limit hit. Please try again later.")
    if isinstance(error, APIConnectionError):
        return AgentResponse(
            content=(
                "Backend received the request, but failed to connect to DeepSeek API. "
                "Please check network, proxy/VPN, and `DEEPSEEK_BASE_URL`."
            )
        )
    if isinstance(error, APIError):
        message = getattr(error, "message", str(error))
        return AgentResponse(content=f"DeepSeek API returned an error: {message}")
    return AgentResponse(content=f"Agent run failed: {error}")


def _is_broken_tool_history_error(error: Exception) -> bool:
    message = str(getattr(error, "message", error)).lower()
    return (
        "tool_calls" in message
        and "tool_call_id" in message
        and "insufficient tool messages" in message
    )


async def run_paper_agent(request: AgentRequest, settings: Settings) -> AgentResponse:
    if not settings.deepseek_api_key:
        return AgentResponse(
            content=(
                "Backend is running, but `DEEPSEEK_API_KEY` is not configured. "
                "Please add it to `ccfa-paper-agent-backend/.env` and restart the backend."
            )
        )

    is_check_only_request = _is_check_only_request(request.userMessage)
    is_planning_only_request = _is_planning_only_request(request.userMessage)
    is_edit_command = (
        _is_edit_command(request.userMessage)
        and not is_check_only_request
        and not is_planning_only_request
    )
    requires_file_change_patch = _requires_file_change_patch(request.userMessage)
    allow_non_manuscript_file_edit = _is_skill_resource_command(request.userMessage)
    required_tool_choice = is_edit_command and _supports_required_tool_choice(settings.deepseek_model)
    agent = create_paper_agent(settings, tool_choice="required" if required_tool_choice else None)
    session = get_thread_session(settings, request.projectId, request.threadId)
    run_context = PaperAgentRunContext(project_context=request.context)

    try:
        result = await Runner.run(
            agent,
            input=build_agent_input(request),
            context=run_context,
            session=session,
            hooks=PaperAgentHooks(),
            max_turns=40,
        )
    except (AuthenticationError, RateLimitError, APIConnectionError) as error:
        return _error_response(error)
    except APIError as error:
        if not _is_broken_tool_history_error(error):
            return _error_response(error)

        await clear_thread_session(settings, request.projectId, request.threadId)
        retry_session = get_thread_session(settings, request.projectId, request.threadId)
        retry_context = PaperAgentRunContext(project_context=request.context)
        try:
            result = await Runner.run(
                agent,
                input=build_agent_input(request),
                context=retry_context,
                session=retry_session,
                hooks=PaperAgentHooks(),
                max_turns=40,
            )
        except (AuthenticationError, RateLimitError, APIConnectionError, APIError) as retry_error:
            return _error_response(retry_error)
        return _response_from_final_output(
            result.final_output,
            retry_context,
            requires_file_change_patch,
            allow_non_manuscript_file_edit,
        )

    return _response_from_final_output(
        result.final_output,
        run_context,
        requires_file_change_patch,
        allow_non_manuscript_file_edit,
    )


async def run_paper_agent_stream(
    request: AgentRequest,
    settings: Settings,
) -> AsyncIterator[dict[str, Any]]:
    yield {
        "type": "progress",
        "event": _progress_event("thinking", "正在读取论文工程信息..."),
    }

    if not settings.deepseek_api_key:
        response = AgentResponse(
            content=(
                "Backend is running, but `DEEPSEEK_API_KEY` is not configured. "
                "Please add it to `ccfa-paper-agent-backend/.env` and restart the backend."
            )
        )
        yield {
            "type": "progress",
            "event": _progress_event("error", "DeepSeek API key 未配置。"),
        }
        yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
        return

    is_check_only_request = _is_check_only_request(request.userMessage)
    is_planning_only_request = _is_planning_only_request(request.userMessage)
    is_edit_command = (
        _is_edit_command(request.userMessage)
        and not is_check_only_request
        and not is_planning_only_request
    )
    requires_file_change_patch = _requires_file_change_patch(request.userMessage)
    allow_non_manuscript_file_edit = _is_skill_resource_command(request.userMessage)
    required_tool_choice = is_edit_command and _supports_required_tool_choice(settings.deepseek_model)
    agent = create_paper_agent(settings, tool_choice="required" if required_tool_choice else None)
    session = get_thread_session(settings, request.projectId, request.threadId)
    run_context = PaperAgentRunContext(project_context=request.context)

    yield {
        "type": "progress",
        "event": _progress_event("thinking", "正在分析任务并规划可用工具..."),
    }

    try:
        result = Runner.run_streamed(
            agent,
            input=build_agent_input(request),
            context=run_context,
            session=session,
            hooks=PaperAgentHooks(),
            max_turns=40,
        )

        async for stream_event in result.stream_events():
            progress = _progress_from_stream_event(stream_event)
            if progress:
                yield {"type": "progress", "event": progress}

        response = _response_from_final_output(
            result.final_output,
            run_context,
            requires_file_change_patch,
            allow_non_manuscript_file_edit,
        )
        yield {
            "type": "progress",
            "event": _progress_event("done", "回答已生成。"),
        }
        yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
    except (AuthenticationError, RateLimitError, APIConnectionError) as error:
        response = _error_response(error)
        yield {"type": "progress", "event": _progress_event("error", response.content)}
        yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
    except APIError as error:
        if not _is_broken_tool_history_error(error):
            response = _error_response(error)
            yield {"type": "progress", "event": _progress_event("error", response.content)}
            yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
            return

        yield {
            "type": "progress",
            "event": _progress_event(
                "thinking",
                "检测到本线程 Agent 会话历史不完整，正在清理记忆并重试...",
            ),
        }
        await clear_thread_session(settings, request.projectId, request.threadId)
        retry_session = get_thread_session(settings, request.projectId, request.threadId)
        retry_context = PaperAgentRunContext(project_context=request.context)

        try:
            retry_result = Runner.run_streamed(
                agent,
                input=build_agent_input(request),
                context=retry_context,
                session=retry_session,
                hooks=PaperAgentHooks(),
                max_turns=40,
            )

            async for stream_event in retry_result.stream_events():
                progress = _progress_from_stream_event(stream_event)
                if progress:
                    yield {"type": "progress", "event": progress}

            response = _response_from_final_output(
                retry_result.final_output,
                retry_context,
                requires_file_change_patch,
                allow_non_manuscript_file_edit,
            )
            yield {
                "type": "progress",
                "event": _progress_event("done", "回答已生成。"),
            }
            yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
        except (AuthenticationError, RateLimitError, APIConnectionError, APIError) as retry_error:
            response = _error_response(retry_error)
            yield {"type": "progress", "event": _progress_event("error", response.content)}
            yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
    except Exception as error:
        response = _error_response(error)
        yield {"type": "progress", "event": _progress_event("error", response.content)}
        yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
