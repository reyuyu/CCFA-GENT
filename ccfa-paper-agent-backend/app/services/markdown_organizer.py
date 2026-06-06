import json
import re
from dataclasses import dataclass
from typing import Any, Literal

from openai import APIConnectionError, APIError, AsyncOpenAI, AuthenticationError, RateLimitError

from app.core.config import Settings
from app.schemas.markdown import OrganizeMarkdownRequest, OrganizeMarkdownResponse


class MarkdownOrganizeError(RuntimeError):
    pass


UnitKind = Literal["heading", "body"]


@dataclass
class MarkdownUnit:
    id: int
    kind: UnitKind
    text: str


SYSTEM_PROMPT = """
You are an academic paper section-heading editor.

You do not rewrite paper content. Your only job is to suggest Markdown headings
for an ordered list of parsed Markdown units.

Return JSON only, with this exact shape:
{
  "changes": [
    { "id": 12, "heading": "## 1 Introduction" }
  ]
}

How changes are applied:
- If id points to a heading unit, that heading line will be replaced.
- If id points to a body unit, the heading will be inserted immediately before
  that body unit.

Rules:
- Only return changes for ids present in the input batch.
- Use valid Markdown ATX headings only, from # to ######.
- Do not ask to remove, rewrite, summarize, translate, or move any body unit.
- Do not change image links, figure captions, tables, table captions, formulas,
  references, footnotes, code blocks, or details blocks.
- Prefer replacing unclear existing headings over inserting duplicate headings.
- Insert a heading before a body unit only when a new academic-paper section
  clearly starts at that exact body unit.
- If unsure, leave the unit unchanged by omitting it from changes.

Prefer conventional research-paper headings when supported by the content:
# Paper Title
## Abstract
## Keywords
## 1 Introduction
## 2 Related Work
## 3 Method
## 4 Experiments
## 5 Results and Discussion
## 6 Conclusion
## References
## Appendix
""".strip()


USER_PROMPT_TEMPLATE = """
File name: {file_name}
Batch: {batch_index} of {batch_count}

Suggest section-heading changes for this Markdown unit batch. Return JSON only.
The ids are global ids from the original Markdown file.

Units:
{units_json}
""".strip()


def _is_fence_start(line: str) -> bool:
    stripped = line.lstrip()
    return stripped.startswith("```") or stripped.startswith("~~~")


def _is_heading_line(line: str) -> bool:
    return bool(re.match(r"^#{1,6}\s+.+?\s*$", line))


def _is_blank(line: str) -> bool:
    return line.strip() == ""


def _details_delta(line: str) -> int:
    lower = line.lower()
    return lower.count("<details") - lower.count("</details>")


def _remove_parser_details_artifacts(markdown: str) -> str:
    return re.sub(
        r"(?is)<details\b[^>]*>\s*<summary\b[^>]*>\s*(?:flow\s*chart|text_image)\s*</summary>[\s\S]*?</details>\s*",
        "",
        markdown,
    )


def _parse_markdown_units(markdown: str) -> list[MarkdownUnit]:
    lines = markdown.splitlines(keepends=True)
    units: list[MarkdownUnit] = []
    body_lines: list[str] = []
    in_fence = False
    details_depth = 0

    def push_body() -> None:
        nonlocal body_lines
        if body_lines:
            units.append(MarkdownUnit(id=len(units), kind="body", text="".join(body_lines)))
            body_lines = []

    for line in lines:
        outside_protected_block = not in_fence and details_depth <= 0
        if outside_protected_block and _is_heading_line(line):
            push_body()
            units.append(MarkdownUnit(id=len(units), kind="heading", text=line))
            continue

        body_lines.append(line)

        if _is_fence_start(line):
            in_fence = not in_fence
        if not in_fence:
            details_depth = max(0, details_depth + _details_delta(line))

        if not in_fence and details_depth <= 0 and _is_blank(line):
            push_body()

    push_body()
    return units


def _plain_preview(text: str, max_chars: int) -> str:
    text = re.sub(r"```[\s\S]*?```", " [code block] ", text)
    text = re.sub(r"<details[\s\S]*?</details>", " [details block] ", text, flags=re.IGNORECASE)
    text = re.sub(r"!\[[^\]]*]\([^)]+\)", " [image] ", text)
    text = re.sub(r"<img\b[^>]*>", " [image] ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def _build_outline_units(units: list[MarkdownUnit], preview_chars: int) -> list[dict[str, Any]]:
    outline: list[dict[str, Any]] = []
    for unit in units:
        if unit.kind == "heading":
            outline.append({"id": unit.id, "kind": unit.kind, "current_heading": unit.text.strip()})
        else:
            preview = _plain_preview(unit.text, preview_chars)
            if preview:
                outline.append({"id": unit.id, "kind": unit.kind, "preview": preview})
    return outline


def _strip_json_fence(text: str) -> str:
    stripped = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*([\s\S]*?)\s*```", stripped)
    if fenced:
        return fenced.group(1).strip()
    return stripped


def _extract_json_object(text: str) -> str:
    stripped = _strip_json_fence(text)
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        return stripped[start : end + 1]
    return stripped


def _parse_heading_plan(text: str, valid_ids: set[int]) -> dict[int, str]:
    try:
        payload = json.loads(_extract_json_object(text))
    except json.JSONDecodeError as exc:
        raise MarkdownOrganizeError(
            "The section organizer returned invalid JSON. The original Markdown was not changed."
        ) from exc

    changes = payload.get("changes")
    if not isinstance(changes, list):
        raise MarkdownOrganizeError(
            "The section organizer returned an invalid heading plan. The original Markdown was not changed."
        )

    plan: dict[int, str] = {}
    for item in changes:
        if not isinstance(item, dict):
            continue
        unit_id = item.get("id")
        if isinstance(unit_id, str) and unit_id.isdigit():
            unit_id = int(unit_id)
        heading = item.get("heading")
        if not isinstance(unit_id, int) or unit_id not in valid_ids or not isinstance(heading, str):
            continue
        normalized = heading.strip()
        if "\n" in normalized or not _is_heading_line(normalized):
            continue
        plan[unit_id] = normalized + "\n"
    return plan


def _outline_batches(outline: list[dict[str, Any]], batch_size: int) -> list[list[dict[str, Any]]]:
    safe_batch_size = max(1, batch_size)
    return [outline[index : index + safe_batch_size] for index in range(0, len(outline), safe_batch_size)]


def _apply_heading_plan(units: list[MarkdownUnit], plan: dict[int, str]) -> str:
    pieces: list[str] = []
    for unit in units:
        planned_heading = plan.get(unit.id)
        if unit.kind == "heading":
            pieces.append(planned_heading if planned_heading is not None else unit.text)
        else:
            if planned_heading is not None:
                pieces.append(planned_heading)
            pieces.append(unit.text)
    return "".join(pieces)


def _body_fingerprint(units: list[MarkdownUnit]) -> str:
    return "".join(unit.text for unit in units if unit.kind == "body")


def _assert_body_unchanged(source_units: list[MarkdownUnit], organized: str) -> None:
    organized_units = _parse_markdown_units(organized)
    if _body_fingerprint(source_units) != _body_fingerprint(organized_units):
        raise MarkdownOrganizeError(
            "The section organizer attempted to change body content. The original Markdown was not changed."
        )


async def _request_heading_plan_batch(
    client: AsyncOpenAI,
    settings: Settings,
    file_name: str,
    outline_batch: list[dict[str, Any]],
    batch_index: int,
    batch_count: int,
) -> dict[int, str]:
    valid_ids = {int(unit["id"]) for unit in outline_batch}
    units_json = json.dumps(outline_batch, ensure_ascii=False, indent=2)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": USER_PROMPT_TEMPLATE.format(
                file_name=file_name,
                batch_index=batch_index,
                batch_count=batch_count,
                units_json=units_json,
            ),
        },
    ]

    response = await client.chat.completions.create(
        model=settings.deepseek_model,
        temperature=0.1,
        max_tokens=settings.markdown_section_organize_max_tokens,
        messages=messages,
    )
    choice = response.choices[0] if response.choices else None
    if getattr(choice, "finish_reason", None) == "length":
        raise MarkdownOrganizeError(
            "The section organizer heading plan was cut off by the model token limit. "
            "The original Markdown was not changed."
        )

    content = choice.message.content if choice and choice.message else ""
    return _parse_heading_plan(content or "", valid_ids)


async def organize_markdown_sections(
    request: OrganizeMarkdownRequest,
    settings: Settings,
) -> OrganizeMarkdownResponse:
    if not settings.deepseek_api_key:
        raise MarkdownOrganizeError("DEEPSEEK_API_KEY is not configured.")

    markdown = _remove_parser_details_artifacts(request.markdown)
    if not markdown.strip():
        raise MarkdownOrganizeError("Markdown content is empty.")

    if len(markdown) > settings.markdown_section_organize_max_chars:
        raise MarkdownOrganizeError(
            f"Markdown is too large to organize "
            f"({len(markdown)} characters, limit {settings.markdown_section_organize_max_chars})."
        )

    units = _parse_markdown_units(markdown)
    outline = _build_outline_units(units, settings.markdown_section_organize_preview_chars)
    if not outline:
        raise MarkdownOrganizeError("Markdown content has no organizable text.")

    client = AsyncOpenAI(api_key=settings.deepseek_api_key, base_url=settings.deepseek_base_url)

    try:
        plan: dict[int, str] = {}
        batches = _outline_batches(outline, settings.markdown_section_organize_batch_size)
        for index, outline_batch in enumerate(batches, start=1):
            plan.update(
                await _request_heading_plan_batch(
                    client=client,
                    settings=settings,
                    file_name=request.fileName,
                    outline_batch=outline_batch,
                    batch_index=index,
                    batch_count=len(batches),
                )
            )
    except AuthenticationError as exc:
        raise MarkdownOrganizeError("DeepSeek authentication failed.") from exc
    except RateLimitError as exc:
        raise MarkdownOrganizeError("DeepSeek rate limit hit. Please try again later.") from exc
    except APIConnectionError as exc:
        raise MarkdownOrganizeError("Failed to connect to DeepSeek API.") from exc
    except APIError as exc:
        message = getattr(exc, "message", str(exc))
        raise MarkdownOrganizeError(f"DeepSeek API returned an error: {message}") from exc

    organized = _apply_heading_plan(units, plan)
    _assert_body_unchanged(units, organized)

    return OrganizeMarkdownResponse(
        organizedMarkdown=organized,
        summary="Agent suggested section headings; only Markdown headings were changed.",
    )
