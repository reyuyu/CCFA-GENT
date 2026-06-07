from __future__ import annotations

from typing import Any

from agents import function_tool

from app.core.config import get_settings
from app.services.semantic_scholar import (
    get_paper_citations,
    get_paper_references,
    search_papers,
)


@function_tool
async def semantic_paper_search(query: str, limit: int = 10, year: str = "") -> dict[str, Any]:
    """Search Semantic Scholar papers by query, optionally filtering by publication year range."""
    return await search_papers(query=query, limit=limit, year=year, settings=get_settings())


@function_tool
async def semantic_paper_citation_search(paper_id: str, limit: int = 20) -> dict[str, Any]:
    """Search later papers that cite the given Semantic Scholar paperId."""
    return await get_paper_citations(paper_id=paper_id, limit=limit, settings=get_settings())


@function_tool
async def semantic_paper_reference_search(paper_id: str, limit: int = 20) -> dict[str, Any]:
    """Search references cited by the given Semantic Scholar paperId."""
    return await get_paper_references(paper_id=paper_id, limit=limit, settings=get_settings())


SEMANTIC_SCHOLAR_TOOLS = [
    semantic_paper_search,
    semantic_paper_citation_search,
    semantic_paper_reference_search,
]
