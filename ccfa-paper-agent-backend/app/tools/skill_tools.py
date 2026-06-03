from pathlib import Path
from typing import Any, Literal

from agents import RunContextWrapper, function_tool

from app.context.runtime import PaperAgentRunContext
from app.skills import get_writing_skill, list_writing_skills
from app.skills.registry import SKILLS_ROOT


MAX_SKILL_FILE_CHARS = 30000
MAX_SKILL_WRITE_CHARS = 30000


def _relative_skill_file(skill_directory: Path, relative_path: str) -> Path:
    normalized = relative_path.replace("\\", "/").strip().lstrip("/")
    if not normalized:
        raise ValueError("relative_path is required")
    candidate = (skill_directory / normalized).resolve()
    if skill_directory.resolve() != candidate and skill_directory.resolve() not in candidate.parents:
        raise ValueError(f"Skill file path escapes the skill directory: {relative_path}")
    if not candidate.exists() or not candidate.is_file():
        raise ValueError(f"Skill file not found: {relative_path}")
    return candidate


def _relative_skill_file_for_write(skill_directory: Path, relative_path: str) -> Path:
    normalized = relative_path.replace("\\", "/").strip().lstrip("/")
    if not normalized:
        raise ValueError("relative_path is required")
    candidate = (skill_directory / normalized).resolve()
    if skill_directory.resolve() != candidate and skill_directory.resolve() not in candidate.parents:
        raise ValueError(f"Skill file path escapes the skill directory: {relative_path}")
    if candidate.suffix.lower() not in {".md", ".txt"}:
        raise ValueError("Only Markdown or text skill files can be edited")
    return candidate


def _skill_file_entry(path: Path, skill_directory: Path) -> dict[str, Any]:
    relative_path = path.relative_to(skill_directory).as_posix()
    return {
        "relativePath": relative_path,
        "sizeBytes": path.stat().st_size,
    }


@function_tool
def list_writing_skill_registry(
    wrapper: RunContextWrapper[PaperAgentRunContext],
) -> dict[str, Any]:
    """List all registered writing skills and their target section types."""
    return {
        "skillsRoot": str(SKILLS_ROOT),
        "skills": [
            {
                "skillId": skill.id,
                "name": skill.name,
                "description": skill.description,
                "sectionTargets": list(skill.section_targets),
                "directory": str(skill.directory),
                "hasSkillMarkdown": skill.instruction_path.exists(),
            }
            for skill in list_writing_skills()
        ],
    }


@function_tool
def read_writing_skill_instruction(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
) -> dict[str, Any]:
    """Read the SKILL.md instruction file for one registered writing skill."""
    skill = get_writing_skill(skill_id)
    if not skill.instruction_path.exists():
        raise ValueError(f"SKILL.md is missing for {skill.id}")
    content = skill.instruction_path.read_text(encoding="utf-8")
    return {
        "skillId": skill.id,
        "name": skill.name,
        "relativePath": "SKILL.md",
        "content": content[:MAX_SKILL_FILE_CHARS],
        "truncated": len(content) > MAX_SKILL_FILE_CHARS,
    }


@function_tool
def list_writing_skill_files(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
) -> dict[str, Any]:
    """List files under one writing skill folder, including references and scripts."""
    skill = get_writing_skill(skill_id)
    if not skill.directory.exists():
        raise ValueError(f"Skill directory is missing: {skill.id}")
    files = [
        _skill_file_entry(path, skill.directory)
        for path in skill.directory.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    ]
    return {
        "skillId": skill.id,
        "name": skill.name,
        "directory": str(skill.directory),
        "files": sorted(files, key=lambda item: item["relativePath"]),
    }


@function_tool
def read_writing_skill_file(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
    relative_path: str,
) -> dict[str, Any]:
    """Read a file from a writing skill folder by relative path."""
    skill = get_writing_skill(skill_id)
    path = _relative_skill_file(skill.directory, relative_path)
    content = path.read_text(encoding="utf-8")
    return {
        "skillId": skill.id,
        "name": skill.name,
        "relativePath": path.relative_to(skill.directory).as_posix(),
        "content": content[:MAX_SKILL_FILE_CHARS],
        "truncated": len(content) > MAX_SKILL_FILE_CHARS,
    }


@function_tool
def edit_writing_skill_file(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
    relative_path: str,
    content: str,
    mode: Literal["append", "replace"] = "append",
) -> dict[str, Any]:
    """Create, replace, or append to a Markdown/text file inside one writing skill folder."""
    skill = get_writing_skill(skill_id)
    path = _relative_skill_file_for_write(skill.directory, relative_path)
    if len(content) > MAX_SKILL_WRITE_CHARS:
        raise ValueError(f"content is too long; maximum is {MAX_SKILL_WRITE_CHARS} characters")

    path.parent.mkdir(parents=True, exist_ok=True)
    existed = path.exists()
    previous_content = path.read_text(encoding="utf-8") if existed else ""
    if mode == "append" and previous_content:
        separator = "" if previous_content.endswith("\n") else "\n"
        next_content = f"{previous_content}{separator}{content.strip()}\n"
    else:
        next_content = content.strip() + "\n"
    path.write_text(next_content, encoding="utf-8")

    return {
        "skillId": skill.id,
        "name": skill.name,
        "relativePath": path.relative_to(skill.directory).as_posix(),
        "mode": mode,
        "created": not existed,
        "sizeBytes": path.stat().st_size,
    }


WRITING_SKILL_TOOLS = [
    list_writing_skill_registry,
    read_writing_skill_instruction,
    list_writing_skill_files,
    read_writing_skill_file,
    edit_writing_skill_file,
]
