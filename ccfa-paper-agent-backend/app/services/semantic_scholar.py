from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings


PAPER_FIELD_NAMES = [
    "paperId",
    "title",
    "abstract",
    "authors",
    "year",
    "venue",
    "citationCount",
    "url",
    "externalIds",
    "openAccessPdf",
]
PAPER_FIELDS = ",".join(PAPER_FIELD_NAMES)

MAX_ABSTRACT_CHARS = 800


def _headers(settings: Settings) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if settings.semantic_scholar_api_key:
        headers["x-api-key"] = settings.semantic_scholar_api_key
    return headers


def _base_url(settings: Settings) -> str:
    return settings.semantic_scholar_base_url.rstrip("/")


def _limit(value: int, default: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(1, min(parsed, maximum))


def _truncate_abstract(abstract: Any) -> str:
    text = str(abstract or "").strip()
    if len(text) <= MAX_ABSTRACT_CHARS:
        return text
    return text[:MAX_ABSTRACT_CHARS].rstrip() + "..."


def _normalize_paper(raw: dict[str, Any] | None) -> dict[str, Any]:
    paper = raw or {}
    authors = paper.get("authors") or []
    return {
        "paperId": paper.get("paperId") or "",
        "title": paper.get("title") or "",
        "abstract": _truncate_abstract(paper.get("abstract")),
        "authors": [
            str(author.get("name") or "").strip()
            for author in authors
            if isinstance(author, dict) and str(author.get("name") or "").strip()
        ],
        "year": paper.get("year"),
        "venue": paper.get("venue") or "",
        "citationCount": paper.get("citationCount") or 0,
        "url": paper.get("url") or "",
        "externalIds": paper.get("externalIds") or {},
        "openAccessPdf": paper.get("openAccessPdf") or {},
    }


def _error_payload(message: str, status_code: int | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"ok": False, "error": message, "papers": []}
    if status_code is not None:
        payload["statusCode"] = status_code
    return payload


def _nested_paper_fields(prefix: str) -> str:
    return ",".join(f"{prefix}.{field}" for field in PAPER_FIELD_NAMES)


async def _get_json(
    path: str,
    params: dict[str, Any],
    settings: Settings,
) -> dict[str, Any]:
    timeout = httpx.Timeout(settings.semantic_scholar_request_timeout_seconds)
    url = f"{_base_url(settings)}{path}"
    async with httpx.AsyncClient(timeout=timeout, headers=_headers(settings)) as client:
        response = await client.get(url, params=params)
        if response.status_code == 429:
            raise RuntimeError(
                "Semantic Scholar rate limit hit (HTTP 429). Please wait and try again, or configure SEMANTIC_SCHOLAR_API_KEY."
            )
        if response.status_code >= 400:
            detail = response.text.strip()[:300]
            suffix = f": {detail}" if detail else ""
            raise RuntimeError(f"Semantic Scholar API returned HTTP {response.status_code}{suffix}")
        return response.json()


async def search_papers(
    query: str,
    limit: int = 10,
    settings: Settings | None = None,
    year: str = "",
) -> dict[str, Any]:
    """Search Semantic Scholar papers by query."""
    if settings is None:
        raise ValueError("settings is required")
    cleaned_query = query.strip()
    if not cleaned_query:
        return _error_payload("Semantic Scholar query is required.")
    safe_limit = _limit(limit, default=10, maximum=20)
    cleaned_year = str(year or "").strip()
    params: dict[str, Any] = {"query": cleaned_query, "limit": safe_limit, "fields": PAPER_FIELDS}
    if cleaned_year:
        params["year"] = cleaned_year
    try:
        data = await _get_json(
            "/paper/search",
            params,
            settings,
        )
        return {
            "ok": True,
            "strategy": "open_search",
            "query": cleaned_query,
            "year": cleaned_year or None,
            "papers": [_normalize_paper(item) for item in data.get("data", [])],
            "total": data.get("total"),
        }
    except httpx.TimeoutException:
        return _error_payload("Semantic Scholar request timed out.")
    except httpx.ConnectError:
        return _error_payload("Failed to connect to Semantic Scholar. Please check network or proxy settings.")
    except httpx.HTTPError as error:
        return _error_payload(f"Semantic Scholar request failed: {error}")
    except RuntimeError as error:
        return _error_payload(str(error))


async def get_paper_citations(
    paper_id: str, limit: int = 20, settings: Settings | None = None
) -> dict[str, Any]:
    """Get papers that cite the given Semantic Scholar paper."""
    if settings is None:
        raise ValueError("settings is required")
    cleaned_id = paper_id.strip()
    if not cleaned_id:
        return _error_payload("Semantic Scholar paper_id is required.")
    safe_limit = _limit(limit, default=20, maximum=50)
    try:
        data = await _get_json(
            f"/paper/{cleaned_id}/citations",
            {"limit": safe_limit, "fields": _nested_paper_fields("citingPaper")},
            settings,
        )
        return {
            "ok": True,
            "strategy": "citation_expansion",
            "paperId": cleaned_id,
            "papers": [_normalize_paper(item.get("citingPaper")) for item in data.get("data", [])],
        }
    except httpx.TimeoutException:
        return _error_payload("Semantic Scholar citation request timed out.")
    except httpx.ConnectError:
        return _error_payload("Failed to connect to Semantic Scholar. Please check network or proxy settings.")
    except httpx.HTTPError as error:
        return _error_payload(f"Semantic Scholar citation request failed: {error}")
    except RuntimeError as error:
        return _error_payload(str(error))


async def get_paper_references(
    paper_id: str, limit: int = 20, settings: Settings | None = None
) -> dict[str, Any]:
    """Get references cited by the given Semantic Scholar paper."""
    if settings is None:
        raise ValueError("settings is required")
    cleaned_id = paper_id.strip()
    if not cleaned_id:
        return _error_payload("Semantic Scholar paper_id is required.")
    safe_limit = _limit(limit, default=20, maximum=50)
    try:
        data = await _get_json(
            f"/paper/{cleaned_id}/references",
            {"limit": safe_limit, "fields": _nested_paper_fields("citedPaper")},
            settings,
        )
        return {
            "ok": True,
            "strategy": "reference_expansion",
            "paperId": cleaned_id,
            "papers": [_normalize_paper(item.get("citedPaper")) for item in data.get("data", [])],
        }
    except httpx.TimeoutException:
        return _error_payload("Semantic Scholar reference request timed out.")
    except httpx.ConnectError:
        return _error_payload("Failed to connect to Semantic Scholar. Please check network or proxy settings.")
    except httpx.HTTPError as error:
        return _error_payload(f"Semantic Scholar reference request failed: {error}")
    except RuntimeError as error:
        return _error_payload(str(error))
