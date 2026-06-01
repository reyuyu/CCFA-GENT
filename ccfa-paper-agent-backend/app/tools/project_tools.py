from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Literal

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel, ConfigDict, Field

from app.context.runtime import PaperAgentRunContext

ParagraphWritingStatus = Literal["todo", "draft", "final"]
ProjectWritingStatus = Literal["writing", "finalized"]


class ScientificMemoryToolItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = ""
    title: str = ""
    description: str = ""
    relatedProblemIds: list[str] = Field(default_factory=list)


def _context(wrapper: RunContextWrapper[PaperAgentRunContext]) -> dict[str, Any]:
    return wrapper.context.project_context


def _project_meta(context: dict[str, Any]) -> dict[str, Any]:
    project_meta = context.get("projectMeta", {})
    return project_meta if isinstance(project_meta, dict) else {}


def _file_collections(context: dict[str, Any]) -> list[dict[str, Any]]:
    files = []
    for key in ("draftManuscripts", "referencePapers"):
        collection = context.get(key, [])
        if isinstance(collection, list):
            files.extend(item for item in collection if isinstance(item, dict))
    return files


def _draft_files(context: dict[str, Any]) -> list[dict[str, Any]]:
    drafts = context.get("draftManuscripts", [])
    return [item for item in drafts if isinstance(item, dict)]


def _reference_files(context: dict[str, Any]) -> list[dict[str, Any]]:
    references = context.get("referencePapers", [])
    return [item for item in references if isinstance(item, dict)]


def _find_file(context: dict[str, Any], file_id: str, folder_type: str | None = None) -> dict[str, Any]:
    for item in _file_collections(context):
        if item.get("id") == file_id and (folder_type is None or item.get("folderType") == folder_type):
            return item
    raise ValueError(f"File not found: {file_id}")


def _backend_workspace_path(context: dict[str, Any]) -> Path | None:
    project_meta = context.get("projectMeta", {})
    if not isinstance(project_meta, dict):
        return None
    raw_path = str(project_meta.get("backendWorkspacePath") or "").strip()
    if not raw_path:
        return None
    root = Path(raw_path).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Backend workspace path is not a readable directory: {root}")
    return root


def _local_file_path(context: dict[str, Any], file_item: dict[str, Any]) -> Path | None:
    root = _backend_workspace_path(context)
    relative_path = str(file_item.get("localPath") or "").replace("\\", "/").strip()
    if not root or not relative_path:
        return None
    candidate = (root / relative_path).resolve()
    if root != candidate and root not in candidate.parents:
        raise ValueError(f"File path escapes the backend workspace: {relative_path}")
    if not candidate.exists() or not candidate.is_file():
        raise ValueError(f"Workspace file does not exist: {relative_path}")
    return candidate


def _content(file_item: dict[str, Any], context: dict[str, Any] | None = None) -> str:
    if context is not None:
        local_path = _local_file_path(context, file_item)
        if local_path is not None:
            return local_path.read_text(encoding="utf-8")

    content = file_item.get("contentText")
    if isinstance(content, str) and content.strip():
        return content
    raise ValueError(f"File has no readable markdown/text content: {file_item.get('id')}")


def _safe_content(file_item: dict[str, Any], context: dict[str, Any]) -> str:
    try:
        return _content(file_item, context)
    except ValueError:
        return ""


def _headings(markdown: str) -> list[dict[str, Any]]:
    headings: list[dict[str, Any]] = []
    path: list[str] = []
    for line_number, raw_line in enumerate(markdown.splitlines(), start=1):
        match = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", raw_line.strip())
        if not match:
            continue
        level = len(match.group(1))
        title = match.group(2).strip()
        path = path[: level - 1]
        while len(path) < level - 1:
            path.append("")
        path.append(title)
        headings.append(
            {
                "level": level,
                "title": title,
                "headingPath": [part for part in path if part],
                "lineNumber": line_number,
            }
        )
    return headings


def _section_content(markdown: str, heading_query: str) -> dict[str, Any]:
    lines = markdown.splitlines()
    headings = _headings(markdown)
    normalized_query = heading_query.strip().lower()
    if not normalized_query:
        raise ValueError("heading_query is required")

    selected_index = -1
    for index, heading in enumerate(headings):
        title = str(heading["title"]).lower()
        path = " / ".join(heading["headingPath"]).lower()
        if normalized_query == title or normalized_query == path or normalized_query in path:
            selected_index = index
            break

    if selected_index < 0:
        raise ValueError(f"Section not found: {heading_query}")

    selected = headings[selected_index]
    start_line = int(selected["lineNumber"])
    end_line = len(lines) + 1
    for heading in headings[selected_index + 1 :]:
        if int(heading["level"]) <= int(selected["level"]):
            end_line = int(heading["lineNumber"])
            break

    return {
        "section": selected,
        "content": "\n".join(lines[start_line - 1 : end_line - 1]).strip(),
        "startLine": start_line,
        "endLine": end_line - 1,
    }


def _replace_section(markdown: str, heading_query: str, new_section_content: str) -> str:
    section = _section_content(markdown, heading_query)
    lines = markdown.splitlines()
    start_index = int(section["startLine"]) - 1
    end_index = int(section["endLine"])
    replacement = new_section_content.strip().splitlines()
    if end_index < len(lines) and replacement and replacement[-1].strip() and lines[end_index].strip():
        replacement.append("")
    next_lines = [*lines[:start_index], *replacement, *lines[end_index:]]
    return "\n".join(next_lines).rstrip() + "\n"


def _paragraphs(file_item: dict[str, Any]) -> list[dict[str, Any]]:
    paragraphs = file_item.get("draftParagraphs", [])
    return [item for item in paragraphs if isinstance(item, dict)]


def _find_paragraph(file_item: dict[str, Any], paragraph_id: str) -> dict[str, Any]:
    for paragraph in _paragraphs(file_item):
        if paragraph.get("id") == paragraph_id:
            return paragraph
    raise ValueError(f"Paragraph not found: {paragraph_id}")


def _replace_paragraph(markdown: str, old_paragraph_content: str, new_paragraph_content: str) -> str:
    old_content = old_paragraph_content.strip()
    occurrence_count = markdown.count(old_content)
    if occurrence_count == 0:
        raise ValueError("Paragraph text was not found in the current draft content")
    if occurrence_count > 1:
        raise ValueError("Paragraph text appears multiple times; cannot safely replace it")
    return markdown.replace(old_content, new_paragraph_content.strip(), 1).rstrip() + "\n"


def _normalize_outline_items(paragraph_outlines: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for index, outline in enumerate(paragraph_outlines, start=1):
        cleaned_outline = str(outline or "").strip()
        if not cleaned_outline:
            continue
        items.append(
            {
                "paragraphNumber": index,
                "outline": cleaned_outline,
            }
        )
    if not items:
        raise ValueError("At least one paragraph outline is required")
    return items


def _normalize_memory_items(items: list[ScientificMemoryToolItem]) -> list[dict[str, Any]]:
    normalized_items: list[dict[str, Any]] = []
    for index, item in enumerate(items, start=1):
        title = item.title.strip()
        description = item.description.strip()
        if not title and not description:
            continue
        related_problem_ids = [related_id.strip() for related_id in item.relatedProblemIds if related_id.strip()]
        normalized_items.append(
            {
                "id": item.id.strip() or f"memory-{index}",
                "title": title,
                "description": description,
                "relatedProblemIds": related_problem_ids,
            }
        )
    return normalized_items


@function_tool
def list_draft_sections(wrapper: RunContextWrapper[PaperAgentRunContext]) -> dict[str, Any]:
    """List markdown headings for all initial draft manuscripts."""
    context = _context(wrapper)
    return {
        "drafts": [
            {
                "fileId": file_item.get("id"),
                "fileName": file_item.get("name"),
                "localPath": file_item.get("localPath"),
                "sections": _headings(_safe_content(file_item, context)),
            }
            for file_item in _draft_files(context)
        ]
    }


@function_tool
def get_draft_section_content(
    wrapper: RunContextWrapper[PaperAgentRunContext], draft_file_id: str, heading_query: str
) -> dict[str, Any]:
    """Read the full content of one section from an initial draft manuscript."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    return {
        "fileId": file_item.get("id"),
        "fileName": file_item.get("name"),
        "localPath": file_item.get("localPath"),
        **_section_content(_content(file_item, context), heading_query),
    }


@function_tool
def list_draft_paragraphs(
    wrapper: RunContextWrapper[PaperAgentRunContext], draft_file_id: str
) -> dict[str, Any]:
    """List paragraph ids, headings, status, and previews for one initial draft manuscript."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    return {
        "fileId": file_item.get("id"),
        "fileName": file_item.get("name"),
        "localPath": file_item.get("localPath"),
        "paragraphs": [
            {
                "paragraphId": paragraph.get("id"),
                "headingPath": paragraph.get("headingPath", []),
                "userAssignedHeading": paragraph.get("userAssignedHeading"),
                "writingStatus": paragraph.get("writingStatus"),
                "updatedAt": paragraph.get("updatedAt"),
                "preview": str(paragraph.get("content") or "")[:360],
            }
            for paragraph in _paragraphs(file_item)
        ],
    }


@function_tool
def get_draft_paragraph_content(
    wrapper: RunContextWrapper[PaperAgentRunContext], draft_file_id: str, paragraph_id: str
) -> dict[str, Any]:
    """Read the full content of one draft paragraph."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    paragraph = _find_paragraph(file_item, paragraph_id)
    return {
        "fileId": file_item.get("id"),
        "fileName": file_item.get("name"),
        "localPath": file_item.get("localPath"),
        "paragraph": paragraph,
    }


@function_tool
def get_draft_paragraph_status(
    wrapper: RunContextWrapper[PaperAgentRunContext], draft_file_id: str, paragraph_id: str
) -> dict[str, Any]:
    """Read the writing status and heading assignment of one draft paragraph."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    paragraph = _find_paragraph(file_item, paragraph_id)
    return {
        "fileId": file_item.get("id"),
        "fileName": file_item.get("name"),
        "localPath": file_item.get("localPath"),
        "paragraphId": paragraph.get("id"),
        "writingStatus": paragraph.get("writingStatus"),
        "headingPath": paragraph.get("headingPath", []),
        "userAssignedHeading": paragraph.get("userAssignedHeading"),
        "updatedAt": paragraph.get("updatedAt"),
    }


@function_tool
def list_reference_papers(
    wrapper: RunContextWrapper[PaperAgentRunContext], reference_scope: Literal["all", "core", "optional"]
) -> dict[str, Any]:
    """List core and/or optional reference papers with curated metadata."""
    folder_by_scope = {"core": "coreReferences", "optional": "optionalReferences"}
    references = _reference_files(_context(wrapper))
    if reference_scope != "all":
        references = [
            item for item in references if item.get("folderType") == folder_by_scope[reference_scope]
        ]
    return {
        "references": [
            {
                "fileId": item.get("id"),
                "fileName": item.get("name"),
                "folderType": item.get("folderType"),
                "localPath": item.get("localPath"),
                "hasMarkdownContent": bool(item.get("contentText")),
                "meta": item.get("referenceMeta") or item.get("meta") or {},
            }
            for item in references
        ]
    }


@function_tool
def list_reference_sections(
    wrapper: RunContextWrapper[PaperAgentRunContext], reference_file_id: str
) -> dict[str, Any]:
    """List markdown headings for one reference paper."""
    context = _context(wrapper)
    file_item = _find_file(context, reference_file_id)
    if file_item.get("folderType") not in ("coreReferences", "optionalReferences"):
        raise ValueError("reference_file_id must point to a reference paper")
    return {
        "fileId": file_item.get("id"),
        "fileName": file_item.get("name"),
        "localPath": file_item.get("localPath"),
        "sections": _headings(_safe_content(file_item, context)),
    }


@function_tool
def get_reference_section_content(
    wrapper: RunContextWrapper[PaperAgentRunContext], reference_file_id: str, heading_query: str
) -> dict[str, Any]:
    """Read the full content of one section from a reference paper."""
    context = _context(wrapper)
    file_item = _find_file(context, reference_file_id)
    if file_item.get("folderType") not in ("coreReferences", "optionalReferences"):
        raise ValueError("reference_file_id must point to a reference paper")
    return {
        "fileId": file_item.get("id"),
        "fileName": file_item.get("name"),
        "localPath": file_item.get("localPath"),
        **_section_content(_content(file_item, context), heading_query),
    }


@function_tool
def edit_draft(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    draft_file_id: str,
    new_content: str,
    summary: str,
) -> dict[str, Any]:
    """Propose a full-content edit for an initial draft manuscript."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    patch = {
        "type": "proposeFileChange",
        "folderType": "draftManuscripts",
        "fileId": draft_file_id,
        "summary": summary,
        "newContent": new_content,
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "fileId": draft_file_id,
        "fileName": file_item.get("name"),
        "summary": summary,
    }


@function_tool
def edit_draft_section(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    draft_file_id: str,
    heading_query: str,
    new_section_content: str,
    summary: str,
) -> dict[str, Any]:
    """Propose an edit that replaces one complete draft section, including its heading line."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    new_content = _replace_section(_content(file_item, context), heading_query, new_section_content)
    patch = {
        "type": "proposeFileChange",
        "folderType": "draftManuscripts",
        "fileId": draft_file_id,
        "summary": summary,
        "newContent": new_content,
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "fileId": draft_file_id,
        "fileName": file_item.get("name"),
        "headingQuery": heading_query,
        "summary": summary,
    }


@function_tool
def edit_draft_paragraph_content(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    draft_file_id: str,
    paragraph_id: str,
    new_paragraph_content: str,
    summary: str,
) -> dict[str, Any]:
    """Propose an edit that replaces one draft paragraph's text content."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    paragraph = _find_paragraph(file_item, paragraph_id)
    new_content = _replace_paragraph(
        _content(file_item, context),
        str(paragraph.get("content") or ""),
        new_paragraph_content,
    )
    patch = {
        "type": "proposeFileChange",
        "folderType": "draftManuscripts",
        "fileId": draft_file_id,
        "summary": summary,
        "newContent": new_content,
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "fileId": draft_file_id,
        "fileName": file_item.get("name"),
        "paragraphId": paragraph_id,
        "summary": summary,
    }


@function_tool
def edit_draft_paragraph_status(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    draft_file_id: str,
    paragraph_id: str,
    writing_status: ParagraphWritingStatus,
    user_assigned_heading: str,
) -> dict[str, Any]:
    """Edit one draft paragraph's writing status and optional user-assigned heading."""
    context = _context(wrapper)
    file_item = _find_file(context, draft_file_id, "draftManuscripts")
    _find_paragraph(file_item, paragraph_id)
    patch = {
        "type": "updateDraftParagraphStatus",
        "fileId": draft_file_id,
        "paragraphId": paragraph_id,
        "payload": {
            "writingStatus": writing_status,
            "userAssignedHeading": user_assigned_heading,
        },
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "fileId": draft_file_id,
        "fileName": file_item.get("name"),
        "paragraphId": paragraph_id,
        "payload": patch["payload"],
    }


@function_tool
def edit_project_status(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    writing_status: ProjectWritingStatus,
    writing_progress: str,
) -> dict[str, Any]:
    """Edit the project's writing status and progress note."""
    patch = {
        "type": "updateProjectMeta",
        "payload": {
            "writingStatus": writing_status,
            "writingProgress": writing_progress,
        },
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "payload": patch["payload"],
    }


@function_tool
def get_introduction_outline(wrapper: RunContextWrapper[PaperAgentRunContext]) -> dict[str, Any]:
    """Read the current structured Introduction paragraph outline, if available."""
    context = _context(wrapper)
    return {
        "introductionOutline": context.get("introductionOutline"),
        "projectTitle": _project_meta(context).get("paperTitle"),
        "targetVenue": _project_meta(context).get("targetVenue"),
    }


@function_tool
def get_scientific_problem_memory(wrapper: RunContextWrapper[PaperAgentRunContext]) -> dict[str, Any]:
    """Read the project-level scientific problem memory, including problems, innovations, and key technologies."""
    context = _context(wrapper)
    memory = context.get("scientificProblemMemory")
    if not isinstance(memory, dict):
        memory = {
            "scientificProblems": [],
            "innovations": [],
            "keyTechnologies": [],
            "notes": "",
        }
    return {
        "scientificProblemMemory": memory,
        "projectTitle": _project_meta(context).get("paperTitle"),
        "targetVenue": _project_meta(context).get("targetVenue"),
    }


@function_tool
def edit_introduction_outline(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    paragraph_outlines: list[str],
    summary: str,
    draft_file_id: str = "",
) -> dict[str, Any]:
    """Update the structured Introduction outline; each item is one sentence describing one paragraph."""
    context = _context(wrapper)
    if draft_file_id:
        _find_file(context, draft_file_id, "draftManuscripts")
    outline_items = _normalize_outline_items(paragraph_outlines)
    patch = {
        "type": "updateIntroductionOutline",
        "payload": {
            "draftFileId": draft_file_id,
            "summary": summary,
            "paragraphs": outline_items,
        },
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "summary": summary,
        "paragraphCount": len(outline_items),
    }


@function_tool
def edit_scientific_problem_memory(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    scientific_problems: list[ScientificMemoryToolItem],
    innovations: list[ScientificMemoryToolItem],
    key_technologies: list[ScientificMemoryToolItem],
    notes: str = "",
) -> dict[str, Any]:
    """Update project-level memory for scientific problems, innovations, and key technologies."""
    payload = {
        "scientificProblems": _normalize_memory_items(scientific_problems),
        "innovations": _normalize_memory_items(innovations),
        "keyTechnologies": _normalize_memory_items(key_technologies),
        "notes": str(notes or "").strip(),
    }
    patch = {
        "type": "updateScientificProblemMemory",
        "payload": payload,
    }
    wrapper.context.add_patch(patch)
    return {
        "queued": True,
        "patchType": patch["type"],
        "scientificProblemCount": len(payload["scientificProblems"]),
        "innovationCount": len(payload["innovations"]),
        "keyTechnologyCount": len(payload["keyTechnologies"]),
    }


PROJECT_RETRIEVAL_TOOLS = [
    list_draft_sections,
    get_draft_section_content,
    list_draft_paragraphs,
    get_draft_paragraph_content,
    get_draft_paragraph_status,
    list_reference_papers,
    list_reference_sections,
    get_reference_section_content,
    get_introduction_outline,
    get_scientific_problem_memory,
]

PROJECT_WRITING_TOOLS = [
    edit_draft,
    edit_draft_section,
    edit_draft_paragraph_content,
    edit_draft_paragraph_status,
    edit_project_status,
    edit_introduction_outline,
    edit_scientific_problem_memory,
]

PAPER_AGENT_TOOLS = [
    *PROJECT_RETRIEVAL_TOOLS,
    *PROJECT_WRITING_TOOLS,
]
