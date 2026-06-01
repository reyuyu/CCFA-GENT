from typing import Any


def _compact_file(file_item: dict[str, Any]) -> dict[str, Any]:
    compact = {
        "id": file_item.get("id"),
        "name": file_item.get("name"),
        "folderType": file_item.get("folderType"),
        "mimeType": file_item.get("mimeType"),
        "size": file_item.get("size"),
        "uploadedAt": file_item.get("uploadedAt"),
        "parseStatus": file_item.get("parseStatus"),
        "hasMarkdownContent": file_item.get("hasMarkdownContent", False),
        "hasImageData": file_item.get("hasImageData", False),
        "hasPendingChange": file_item.get("hasPendingChange", False),
    }
    return {key: value for key, value in compact.items() if value is not None}


def _has_reference_meta_content(item: dict[str, Any]) -> bool:
    meta = item.get("meta") or {}
    return any(str(meta.get(key) or "").strip() for key in meta)


def _has_image_meta_content(item: dict[str, Any]) -> bool:
    return bool(str(item.get("caption") or "").strip())


def build_model_project_context(frontend_context: dict[str, Any]) -> dict[str, Any]:
    context: dict[str, Any] = {
        "projectMeta": frontend_context.get("projectMeta", {}),
        "folderSummary": frontend_context.get("folderSummary", {}),
        "files": [_compact_file(file_item) for file_item in frontend_context.get("files", [])],
    }

    introduction_outline = frontend_context.get("introductionOutline")
    if isinstance(introduction_outline, dict):
        context["introductionOutline"] = introduction_outline

    scientific_problem_memory = frontend_context.get("scientificProblemMemory")
    if isinstance(scientific_problem_memory, dict):
        context["scientificProblemMemory"] = scientific_problem_memory

    reference_metas = [
        item
        for item in frontend_context.get("referencePaperMetas", [])
        if isinstance(item, dict) and _has_reference_meta_content(item)
    ]
    if reference_metas:
        context["referencePaperMetas"] = reference_metas

    image_assets = [
        item
        for item in frontend_context.get("imageAssets", [])
        if isinstance(item, dict) and _has_image_meta_content(item)
    ]
    if image_assets:
        context["imageAssets"] = image_assets

    return context
