from pathlib import Path
from typing import Any

from agents import RunContextWrapper, function_tool

from app.context.runtime import PaperAgentRunContext
from app.skills.checking_registry import SKILLS_ROOT, get_checking_skill, list_checking_skills


MAX_SKILL_FILE_CHARS = 30000


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


def _skill_file_entry(path: Path, skill_directory: Path) -> dict[str, Any]:
    relative_path = path.relative_to(skill_directory).as_posix()
    return {
        "relativePath": relative_path,
        "sizeBytes": path.stat().st_size,
    }


@function_tool
def list_checking_skill_registry(
    wrapper: RunContextWrapper[PaperAgentRunContext],
) -> dict[str, Any]:
    """List all registered checking skills and their target section types."""
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
            for skill in list_checking_skills()
        ],
    }


@function_tool
def read_checking_skill_instruction(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
) -> dict[str, Any]:
    """Read the SKILL.md instruction file for one registered checking skill."""
    skill = get_checking_skill(skill_id)
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
def list_checking_skill_files(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
) -> dict[str, Any]:
    """List files under one checking skill folder."""
    skill = get_checking_skill(skill_id)
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
def read_checking_skill_file(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    skill_id: str,
    relative_path: str,
) -> dict[str, Any]:
    """Read a file from a checking skill folder by relative path."""
    skill = get_checking_skill(skill_id)
    path = _relative_skill_file(skill.directory, relative_path)
    content = path.read_text(encoding="utf-8")
    return {
        "skillId": skill.id,
        "name": skill.name,
        "relativePath": path.relative_to(skill.directory).as_posix(),
        "content": content[:MAX_SKILL_FILE_CHARS],
        "truncated": len(content) > MAX_SKILL_FILE_CHARS,
    }


CHECKING_SKILL_TOOLS = [
    list_checking_skill_registry,
    read_checking_skill_instruction,
    list_checking_skill_files,
    read_checking_skill_file,
]
