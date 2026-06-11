import json
import re
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any, Optional

from agents import Runner
from openai import APIConnectionError, APIError, AuthenticationError, RateLimitError
from pydantic import ValidationError

from app.agents.paper_agent import (
    create_paper_agent,
    create_paper_check_agent,
    create_reference_learning_agent,
    create_writing_agent,
)
from app.agents.retrieval_agent import create_semantic_scholar_retrieval_agent
from app.context import build_agent_input
from app.context.runtime import PaperAgentRunContext
from app.core.config import Settings
from app.memory import get_thread_session
from app.memory.session_store import clear_thread_session
from app.observability import PaperAgentHooks
from app.schemas.agent import AgentMode, AgentRequest, AgentResponse


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

TOOL_PROGRESS_MESSAGES["handoff_to_reference_learning_agent"] = "正在交接给参考学习agent..."

TOOL_PROGRESS_DETAILS = {
    "list_draft_sections": {
        "label": "读取初稿结构",
        "description": "列出当前 draft manuscript 的章节标题和层级，用来判断应阅读或修改哪一部分。",
    },
    "get_draft_section_content": {
        "label": "读取初稿章节",
        "description": "按章节标题提取正文片段，供 Agent 做针对性的检查、改写或续写。",
    },
    "list_draft_paragraphs": {
        "label": "读取段落清单",
        "description": "查看初稿中已拆分的段落、段落编号和用户指定小标题。",
    },
    "get_draft_paragraph_content": {
        "label": "读取段落内容",
        "description": "获取指定段落的完整文本，避免只凭摘要进行写作判断。",
    },
    "get_draft_paragraph_status": {
        "label": "读取段落状态",
        "description": "查看段落当前写作状态和用户标注，判断是否需要补写、润色或检查。",
    },
    "list_reference_papers": {
        "label": "读取参考论文清单",
        "description": "列出核心和可选参考文献，帮助选择相关证据来源。",
    },
    "list_reference_sections": {
        "label": "读取参考论文结构",
        "description": "查看参考论文的章节目录，定位摘要、方法、实验或讨论等可用材料。",
    },
    "get_reference_section_content": {
        "label": "读取参考论文章节",
        "description": "提取参考论文指定章节内容，用于对齐论证、写作结构或相关工作表述。",
    },
    "edit_draft": {
        "label": "生成整篇初稿修改",
        "description": "为整篇 draft manuscript 生成待确认的文件修改 patch，不会直接写入本地文件。",
    },
    "edit_draft_section": {
        "label": "生成章节修改",
        "description": "替换指定章节内容并生成前端可预览、可确认的修改建议。",
    },
    "edit_draft_paragraph_content": {
        "label": "生成段落修改",
        "description": "替换指定段落内容，适合局部润色、改写、补写或续写。",
    },
    "edit_draft_paragraph_status": {
        "label": "更新段落状态",
        "description": "更新段落写作状态或用户指定小标题，帮助后续写作管理。",
    },
    "edit_project_status": {
        "label": "更新项目状态",
        "description": "更新项目标题、目标会议、写作阶段或整体进度描述。",
    },
    "get_introduction_outline": {
        "label": "读取 Introduction 大纲",
        "description": "读取 Introduction 段落规划，用来保持后续写作和检查的结构一致。",
    },
    "edit_introduction_outline": {
        "label": "更新 Introduction 大纲",
        "description": "生成或调整 Introduction 段落规划，并交给前端同步到项目状态。",
    },
    "get_scientific_problem_memory": {
        "label": "读取科学问题记忆",
        "description": "查看论文核心问题、关键 gap、贡献点和风险记录。",
    },
    "edit_scientific_problem_memory": {
        "label": "更新科学问题记忆",
        "description": "更新论文的问题定义、动机、贡献点或检查笔记。",
    },
    "list_writing_skill_registry": {
        "label": "查看写作 Skill 注册表",
        "description": "查找可用写作 skill，选择与当前任务最匹配的写作指导。",
    },
    "read_writing_skill_instruction": {
        "label": "读取写作 Skill 指令",
        "description": "读取特定写作 skill 的规则，确保生成内容符合本地写作规范。",
    },
    "list_writing_skill_files": {
        "label": "查看写作 Skill 文件",
        "description": "列出 skill 内的参考材料、脚本或写作积累文件。",
    },
    "read_writing_skill_file": {
        "label": "读取写作 Skill 文件",
        "description": "读取本地写作积累或参考说明，用来增强表达和结构选择。",
    },
    "edit_writing_skill_file": {
        "label": "更新写作 Skill 文件",
        "description": "把新的写作经验或表达积累写入 skill 文件，供后续任务复用。",
    },
    "list_checking_skill_registry": {
        "label": "查看检查 Skill 注册表",
        "description": "查找可用检查 skill，选择适合当前稿件诊断的检查流程。",
    },
    "read_checking_skill_instruction": {
        "label": "读取检查 Skill 指令",
        "description": "读取检查规则，确保反馈覆盖逻辑、证据、结构和风险。",
    },
    "list_checking_skill_files": {
        "label": "查看检查 Skill 文件",
        "description": "列出检查 skill 内的参考文件或检查模板。",
    },
    "read_checking_skill_file": {
        "label": "读取检查 Skill 文件",
        "description": "读取检查参考材料，辅助生成更具体的诊断意见。",
    },
    "semantic_paper_search": {
        "label": "Semantic Scholar 搜索",
        "description": "按关键词检索相关论文，寻找可加入阅读队列或支撑论证的文献。",
    },
    "semantic_paper_citation_search": {
        "label": "检索后续被引工作",
        "description": "查找引用某篇论文的后续研究，用于追踪近期发展和影响。",
    },
    "semantic_paper_reference_search": {
        "label": "检索参考文献",
        "description": "查看某篇论文引用的前置工作，补齐理论或方法背景。",
    },
    "request_reference_paper_reading": {
        "label": "加入参考阅读请求",
        "description": "把候选论文交给前端，等待用户确认是否下载解析并加入项目文献库。",
    },
    "retrieve_academic_papers": {
        "label": "调用学术检索 Agent",
        "description": "把检索任务交给专门的文献检索 Agent，返回可阅读的候选论文。",
    },
    "get_current_local_time": {
        "label": "读取本机时间",
        "description": "获取当前本地时间，处理和日期相关的任务或记录。",
    },
    "handoff_to_paper_check_agent": {
        "label": "切换到论文检查 Agent",
        "description": "将任务转交给检查 Agent，专注诊断稿件问题和改进建议。",
    },
    "handoff_to_writing_agent": {
        "label": "切换到论文写作 Agent",
        "description": "将任务转交给写作 Agent，专注生成、改写或补全文本。",
    },
    "handoff_to_reference_learning_agent": {
        "label": "切换到参考学习agent",
        "description": "将任务转交给参考学习agent，专门学习本地参考论文、梳理可借鉴语料、写作逻辑、技术和实验设计。",
    },
}


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
    "\u601d\u8def",
    "\u5199\u4f5c\u601d\u8def",
    "\u540e\u7eed\u601d\u8def",
    "\u7406\u6e05",
    "\u68b3\u7406",
    "\u6784\u601d",
    "\u60f3\u4e00\u4e0b",
    "\u5148\u60f3",
    "\u5148\u7406",
    "\u540e\u9762\u600e\u4e48\u5199",
    "\u63a5\u4e0b\u6765\u600e\u4e48\u5199",
    "\u540e\u7eed\u600e\u4e48\u5199",
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

TEXT_STRONG_FILE_MUTATION_TERMS = (
    "\u5199\u5165",
    "\u5199\u56de",
    "\u4fee\u6539\u521d\u7a3f",
    "\u6539\u5199\u521d\u7a3f",
    "\u6da6\u8272\u521d\u7a3f",
    "\u66ff\u6362",
    "\u5e94\u7528\u5230",
    "\u5e94\u7528\u5728",
    "\u4fdd\u5b58\u5230",
    "\u843d\u5230",
    "\u751f\u6210patch",
    "\u751f\u6210 patch",
    "write into",
    "write back",
    "apply to",
    "save to",
    "replace",
    "patch",
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
    if not _contains_any_text(message, TEXT_STRONG_FILE_MUTATION_TERMS):
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


def _missing_edit_patch_response(original_content: str = "") -> AgentResponse:
    warning = (
        "安全提醒：本次没有生成真正的 `proposeFileChange` patch，所以前端不会出现"
        "“查看修改/确认应用”，初稿文件也没有被改动。"
        "如果你希望真正写入初稿，请明确说明“写入/修改/替换 Introduction 第 X 段”。"
    )
    cleaned_content = original_content.strip()
    if cleaned_content:
        return AgentResponse(content=f"{cleaned_content}\n\n---\n\n{warning}")
    return AgentResponse(content=warning)


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


def _settings_for_request(settings: Settings, request: AgentRequest) -> Settings:
    requested_model = (request.model or "").strip()
    if not requested_model:
        return settings
    return settings.model_copy(update={"deepseek_model": requested_model})


AGENT_MODE_LABELS: dict[AgentMode, str] = {
    "auto": "智能调度",
    "writing": "写作agent",
    "checking": "检查agent",
    "learning": "学习agent",
    "retrieval": "检索agent",
}


def _agent_mode_label(agent_mode: AgentMode) -> str:
    return AGENT_MODE_LABELS.get(agent_mode, AGENT_MODE_LABELS["auto"])


def _create_agent_for_mode(
    settings: Settings,
    agent_mode: AgentMode,
    tool_choice: str | None = None,
):
    if agent_mode == "writing":
        return create_writing_agent(settings, tool_choice=tool_choice)
    if agent_mode == "checking":
        return create_paper_check_agent(settings, tool_choice=tool_choice)
    if agent_mode == "learning":
        return create_reference_learning_agent(settings, tool_choice=tool_choice)
    if agent_mode == "retrieval":
        return create_semantic_scholar_retrieval_agent(settings)
    return create_paper_agent(settings, tool_choice=tool_choice)


def _tool_detail(tool_name: str) -> dict[str, str]:
    detail = TOOL_PROGRESS_DETAILS.get(tool_name)
    if detail:
        return detail
    return {
        "label": tool_name.replace("_", " "),
        "description": "Agent 正在调用这个工具获取项目材料、执行检索或生成修改结果。",
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
            f"正在交接给 {agent_name}...",
            {
                "phase": "agent_handoff",
                "agentName": agent_name,
                "handoffDescription": "任务正在从当前 Agent 转交给更适合的专门 Agent 处理。",
            },
        )

    if event_type != "run_item_stream_event":
        return None

    event_name = getattr(event, "name", "")
    item = getattr(event, "item", None)
    tool_name = _tool_name_from_item(item)

    if event_name == "tool_called":
        tool_message = TOOL_PROGRESS_MESSAGES.get(tool_name)
        tool_detail = _tool_detail(tool_name)
        display_message = (
            f"{tool_message}（{tool_detail['label']}）"
            if tool_message
            else f"正在调用工具 {tool_detail['label']}..."
        )
        return _progress_event(
            "writing" if tool_name in WRITING_TOOL_NAMES else "tool_start",
            display_message,
            {
                "phase": "tool_call",
                "toolName": tool_name,
                "toolLabel": tool_detail["label"],
                "toolDescription": tool_detail["description"],
            },
        )

    if event_name == "tool_output":
        tool_detail = _tool_detail(tool_name)
        display_tool = "" if tool_name == "unknown_tool" else f" {tool_detail['label']}"
        return _progress_event(
            "tool_end",
            f"工具{display_tool}执行完成，正在整理结果...",
            {
                "phase": "tool_result",
                "toolName": tool_name,
                "toolLabel": tool_detail["label"],
                "toolDescription": tool_detail["description"],
            },
        )

    if event_name == "message_output_created":
        return _progress_event("writing", "正在生成最终回答...")

    if event_name == "reasoning_item_created":
        return _progress_event("thinking", "正在判断当前材料是否足够支撑回答...")

    if event_name in {"handoff_requested", "handoff_occured"}:
        return _progress_event(
            "thinking",
            "正在发起 Agent 交接...",
            {
                "phase": "agent_handoff",
                "handoffDescription": "系统判断当前任务需要切换到写作或检查专门 Agent。",
            },
        )

    return None


def _supports_required_tool_choice(model_name: str) -> bool:
    lowered = model_name.lower()
    unsupported_markers = ("reasoner", "thinking", "v4-flash", "v4-pro")
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
            return _missing_edit_patch_response(raw_output)
        return AgentResponse(
            content=raw_output,
            patches=run_context.patches or None,
            referenceRequests=run_context.reference_requests or None,
        )

    has_manual_file_change_patch = _contains_manual_file_change_patch(parsed)
    if has_manual_file_change_patch and not _has_file_change_patch(run_context.patches):
        return _missing_edit_patch_response(str(parsed.get("content") or raw_output))

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
        return _missing_edit_patch_response(parsed_content or raw_output)

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


def _is_unsupported_tool_choice_error(error: Exception) -> bool:
    message = str(getattr(error, "message", error)).lower()
    return "tool_choice" in message and (
        "does not support" in message
        or "not support" in message
        or "unsupported" in message
    )


async def run_paper_agent(request: AgentRequest, settings: Settings) -> AgentResponse:
    run_settings = _settings_for_request(settings, request)
    agent_mode = request.agentMode
    if not run_settings.deepseek_api_key:
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
    required_tool_choice = is_edit_command and _supports_required_tool_choice(run_settings.deepseek_model)
    agent = _create_agent_for_mode(
        run_settings,
        agent_mode,
        tool_choice="required" if required_tool_choice else None,
    )
    session = get_thread_session(run_settings, request.projectId, request.threadId)
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
        if required_tool_choice and _is_unsupported_tool_choice_error(error):
            fallback_agent = _create_agent_for_mode(run_settings, agent_mode, tool_choice=None)
            fallback_context = PaperAgentRunContext(project_context=request.context)
            try:
                fallback_result = await Runner.run(
                    fallback_agent,
                    input=build_agent_input(request),
                    context=fallback_context,
                    session=session,
                    hooks=PaperAgentHooks(),
                    max_turns=40,
                )
            except (AuthenticationError, RateLimitError, APIConnectionError, APIError) as fallback_error:
                return _error_response(fallback_error)
            return _response_from_final_output(
                fallback_result.final_output,
                fallback_context,
                requires_file_change_patch,
                allow_non_manuscript_file_edit,
            )

        if not _is_broken_tool_history_error(error):
            return _error_response(error)

        await clear_thread_session(run_settings, request.projectId, request.threadId)
        retry_session = get_thread_session(run_settings, request.projectId, request.threadId)
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
    run_settings = _settings_for_request(settings, request)
    agent_mode = request.agentMode
    yield {
        "type": "progress",
        "event": _progress_event(
            "thinking",
            "正在读取论文工程信息...",
            {
                "model": run_settings.deepseek_model,
                "agentMode": agent_mode,
                "agentModeLabel": _agent_mode_label(agent_mode),
            },
        ),
    }

    if not run_settings.deepseek_api_key:
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
    required_tool_choice = is_edit_command and _supports_required_tool_choice(run_settings.deepseek_model)
    agent = _create_agent_for_mode(
        run_settings,
        agent_mode,
        tool_choice="required" if required_tool_choice else None,
    )
    session = get_thread_session(run_settings, request.projectId, request.threadId)
    run_context = PaperAgentRunContext(project_context=request.context)

    yield {
        "type": "progress",
        "event": _progress_event(
            "thinking",
            f"正在使用 {run_settings.deepseek_model} 分析任务并规划可用工具...",
            {
                "model": run_settings.deepseek_model,
                "agentMode": agent_mode,
                "agentModeLabel": _agent_mode_label(agent_mode),
            },
        ),
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
        if required_tool_choice and _is_unsupported_tool_choice_error(error):
            yield {
                "type": "progress",
                "event": _progress_event(
                    "thinking",
                    "DeepSeek thinking mode 不支持强制工具调用，正在改为普通工具模式重试...",
                    {
                        "phase": "tool_choice_fallback",
                        "model": run_settings.deepseek_model,
                    },
                ),
            }
            fallback_agent = _create_agent_for_mode(run_settings, agent_mode, tool_choice=None)
            fallback_context = PaperAgentRunContext(project_context=request.context)
            try:
                fallback_result = Runner.run_streamed(
                    fallback_agent,
                    input=build_agent_input(request),
                    context=fallback_context,
                    session=session,
                    hooks=PaperAgentHooks(),
                    max_turns=40,
                )

                async for stream_event in fallback_result.stream_events():
                    progress = _progress_from_stream_event(stream_event)
                    if progress:
                        yield {"type": "progress", "event": progress}

                response = _response_from_final_output(
                    fallback_result.final_output,
                    fallback_context,
                    requires_file_change_patch,
                    allow_non_manuscript_file_edit,
                )
                yield {
                    "type": "progress",
                    "event": _progress_event("done", "回答已生成。"),
                }
                yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
            except (AuthenticationError, RateLimitError, APIConnectionError, APIError) as fallback_error:
                response = _error_response(fallback_error)
                yield {"type": "progress", "event": _progress_event("error", response.content)}
                yield {"type": "final", "response": response.model_dump(mode="json", exclude_none=True)}
            return

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
        await clear_thread_session(run_settings, request.projectId, request.threadId)
        retry_session = get_thread_session(run_settings, request.projectId, request.threadId)
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
