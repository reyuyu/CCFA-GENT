from __future__ import annotations

from agents import Agent

from app.core.config import Settings
from app.models import create_deepseek_model
from app.tools.project_tools import list_reference_papers
from app.tools.semantic_scholar_tools import SEMANTIC_SCHOLAR_TOOLS


SEMANTIC_SCHOLAR_RETRIEVAL_INSTRUCTIONS = """
你是一个学术论文检索 Agent，目标是为 CCFA/SCI 英文论文写作寻找相关论文。

你有三种检索策略：

1. 开放式检索：
如果本地语料不足，或没有明显相关论文，则根据用户需求生成英文关键词，调用 semantic_paper_search。

2. 被引扩展：
如果本地已有相关论文，并且该论文有 semanticScholarPaperId，则调用 semantic_paper_citation_search，寻找后续引用它的论文。

3. 参考文献扩展：
如果本地已有相关论文，并且该论文有 semanticScholarPaperId，则调用 semantic_paper_reference_search，寻找它引用的基础论文。

你需要根据用户问题和本地参考论文情况选择合适策略。

检索完成后，你需要筛选最相关的论文。优先考虑：
- 与用户研究问题高度相关；
- venue 看起来是顶级会议或高质量期刊；
- 年份较新；
- citationCount 较高；
- 摘要中明确涉及用户关心的问题。

最终只返回 5-10 篇候选论文。不要自动加入参考库，最终由用户确认。

每篇论文返回：
- title
- semanticScholarPaperId
- year
- venue
- authors
- citationCount
- url
- openAccessPdf url，如果有
- relevanceReason
- whyUsefulForThisProject

最后说明本次使用了哪种策略：
open_search / citation_expansion / reference_expansion / mixed。
"""


def create_semantic_scholar_retrieval_agent(settings: Settings) -> Agent:
    return Agent(
        name="SemanticScholarRetrievalAgent",
        handoff_description="Search and rank candidate academic papers using Semantic Scholar.",
        instructions=SEMANTIC_SCHOLAR_RETRIEVAL_INSTRUCTIONS,
        model=create_deepseek_model(settings),
        tools=[
            list_reference_papers,
            *SEMANTIC_SCHOLAR_TOOLS,
        ],
    )


def create_retrieve_academic_papers_tool(settings: Settings):
    retrieval_agent = create_semantic_scholar_retrieval_agent(settings)
    return retrieval_agent.as_tool(
        tool_name="retrieve_academic_papers",
        tool_description=(
            "Search academic papers using Semantic Scholar when local references are insufficient. "
            "Return candidate papers only; do not add them to the reference library."
        ),
        max_turns=12,
    )
