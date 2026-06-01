from dataclasses import dataclass
from pathlib import Path


SKILLS_ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class WritingSkill:
    id: str
    name: str
    section_targets: tuple[str, ...]
    description: str
    directory: Path

    @property
    def instruction_path(self) -> Path:
        return self.directory / "SKILL.md"


WRITING_SKILL_DEFINITIONS: tuple[dict[str, object], ...] = (
    {
        "id": "writing-introduction-skill",
        "name": "IntroductionSkill",
        "section_targets": ("introduction", "motivation", "research gap", "contribution"),
        "description": "Write and revise introduction, motivation, gap, and contribution paragraphs.",
    },
    {
        "id": "writing-method-skill",
        "name": "MethodSkill",
        "section_targets": ("method", "methodology", "approach", "framework", "model"),
        "description": "Write and revise method overviews, modules, objectives, and algorithm framing.",
    },
    {
        "id": "writing-result-skill",
        "name": "ResultSkill",
        "section_targets": ("experiment", "result", "discussion", "ablation", "analysis"),
        "description": "Write and revise experiments, results, ablations, and discussion sections.",
    },
    {
        "id": "writing-abstract-skill",
        "name": "AbstractSkill",
        "section_targets": ("abstract", "summary"),
        "description": "Write and revise compact abstracts grounded in the manuscript and evidence.",
    },
    {
        "id": "writing-title-problem-phrase-skill",
        "name": "TitleProblemPhraseSkill",
        "section_targets": ("title", "section heading", "subtitle", "problem naming", "method naming"),
        "description": "Create and revise titles, section headings, method-name-like titles, and scientific problem phrases.",
    },
)


def _skill_from_definition(definition: dict[str, object]) -> WritingSkill:
    skill_id = str(definition["id"])
    return WritingSkill(
        id=skill_id,
        name=str(definition["name"]),
        section_targets=tuple(str(item) for item in definition["section_targets"]),
        description=str(definition["description"]),
        directory=SKILLS_ROOT / skill_id,
    )


def list_writing_skills() -> list[WritingSkill]:
    return [_skill_from_definition(definition) for definition in WRITING_SKILL_DEFINITIONS]


def get_writing_skill(skill_id: str) -> WritingSkill:
    normalized_id = skill_id.strip()
    for skill in list_writing_skills():
        if skill.id == normalized_id or skill.name.lower() == normalized_id.lower():
            return skill
    raise ValueError(f"Unknown writing skill: {skill_id}")


def build_writing_skill_registry_text() -> str:
    lines = ["Registered writing skills:"]
    for skill in list_writing_skills():
        status = "available" if skill.instruction_path.exists() else "missing SKILL.md"
        targets = ", ".join(skill.section_targets)
        lines.append(
            f"- {skill.name} (`{skill.id}`): {skill.description} "
            f"Targets: {targets}. Status: {status}."
        )
    return "\n".join(lines)
