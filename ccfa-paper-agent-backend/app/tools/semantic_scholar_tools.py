from __future__ import annotations

from typing import Any, Literal, Optional
from uuid import uuid4

from agents import RunContextWrapper, function_tool

from app.context.runtime import PaperAgentRunContext
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


@function_tool
def request_reference_paper_reading(
    wrapper: RunContextWrapper[PaperAgentRunContext],
    title: str,
    pdf_url: str,
    relevance_reason: str,
    why_useful_for_this_project: str,
    semantic_scholar_paper_id: str = "",
    year: Optional[int] = None,
    venue: str = "",
    authors: Optional[list[str]] = None,
    citation_count: Optional[int] = None,
    paper_url: str = "",
    doi: str = "",
    arxiv_id: str = "",
    acl_id: str = "",
    corpus_id: str = "",
    suggested_reference_scope: Literal["coreReferences", "optionalReferences"] = "optionalReferences",
    useful_for_sections: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Queue a user-confirmed request to parse a retrieved paper PDF as a local reference."""
    cleaned_pdf_url = pdf_url.strip()
    if not cleaned_pdf_url:
        raise ValueError("pdf_url is required for a reference reading request")

    external_ids = {
        key: value
        for key, value in {
            "DOI": doi.strip(),
            "ArXiv": arxiv_id.strip(),
            "ACL": acl_id.strip(),
            "CorpusId": corpus_id.strip(),
        }.items()
        if value
    }

    request = {
        "id": f"refreq_{uuid4().hex[:12]}",
        "title": title.strip() or "Untitled paper",
        "semanticScholarPaperId": semantic_scholar_paper_id.strip(),
        "year": year,
        "venue": venue.strip(),
        "authors": [author.strip() for author in authors or [] if author.strip()],
        "citationCount": citation_count,
        "paperUrl": paper_url.strip(),
        "pdfUrl": cleaned_pdf_url,
        "externalIds": external_ids,
        "relevanceReason": relevance_reason.strip(),
        "whyUsefulForThisProject": why_useful_for_this_project.strip(),
        "suggestedReferenceScope": suggested_reference_scope,
        "usefulForSections": [section.strip() for section in useful_for_sections or [] if section.strip()],
        "status": "pending",
    }
    wrapper.context.add_reference_request(request)
    return {
        "queued": True,
        "title": request["title"],
        "pdfUrl": request["pdfUrl"],
        "suggestedReferenceScope": request["suggestedReferenceScope"],
    }


SEMANTIC_SCHOLAR_TOOLS = [
    semantic_paper_search,
    semantic_paper_citation_search,
    semantic_paper_reference_search,
    request_reference_paper_reading,
]
