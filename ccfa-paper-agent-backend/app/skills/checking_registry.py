from dataclasses import dataclass
from pathlib import Path


SKILLS_ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class CheckingSkill:
    id: str
    name: str
    section_targets: tuple[str, ...]
    description: str
    directory: Path

    @property
    def instruction_path(self) -> Path:
        return self.directory / "SKILL.md"


CHECKING_SKILL_DEFINITIONS: tuple[dict[str, object], ...] = (
    {
        "id": "checking-introduction-skill",
        "name": "IntroductionCheckSkill",
        "section_targets": (
            "introduction",
            "motivation",
            "research gap",
            "contribution",
            "related work framing",
            "problem formulation",
        ),
        "description": (
            "Check Introduction paragraphs, sentences, and terms through reference grounding, "
            "logic, concept consistency, information alignment, tone, length, and first-reader readability."
        ),
    },
)


def _skill_from_definition(definition: dict[str, object]) -> CheckingSkill:
    skill_id = str(definition["id"])
    return CheckingSkill(
        id=skill_id,
        name=str(definition["name"]),
        section_targets=tuple(str(item) for item in definition["section_targets"]),
        description=str(definition["description"]),
        directory=SKILLS_ROOT / skill_id,
    )


def list_checking_skills() -> list[CheckingSkill]:
    return [_skill_from_definition(definition) for definition in CHECKING_SKILL_DEFINITIONS]


def get_checking_skill(skill_id: str) -> CheckingSkill:
    normalized_id = skill_id.strip()
    for skill in list_checking_skills():
        if skill.id == normalized_id or skill.name.lower() == normalized_id.lower():
            return skill
    raise ValueError(f"Unknown checking skill: {skill_id}")


def build_checking_skill_registry_text() -> str:
    lines = ["Registered checking skills:"]
    for skill in list_checking_skills():
        status = "available" if skill.instruction_path.exists() else "missing SKILL.md"
        targets = ", ".join(skill.section_targets)
        lines.append(
            f"- {skill.name} (`{skill.id}`): {skill.description} "
            f"Targets: {targets}. Status: {status}."
        )
    return "\n".join(lines)
