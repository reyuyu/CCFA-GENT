from typing import List, Optional

from pydantic import BaseModel, Field


class MinerUSection(BaseModel):
    title: str
    level: int
    lineNumber: int


class MinerUMarkdownStats(BaseModel):
    sectionCount: int = 0
    imageCount: int = 0
    tableCount: int = 0
    formulaCount: int = 0


class MinerUAsset(BaseModel):
    path: str
    mimeType: str
    dataUrl: str


class MinerUParseResponse(BaseModel):
    taskId: str
    markdownUrl: str
    markdown: str
    assets: List[MinerUAsset] = Field(default_factory=list)
    sections: List[MinerUSection] = Field(default_factory=list)
    stats: MinerUMarkdownStats = Field(default_factory=MinerUMarkdownStats)


class MinerUParsePdfUrlRequest(BaseModel):
    pdfUrl: str
    fileName: Optional[str] = None
    language: str = "en"
    pageRange: str = ""
    enableTable: bool = True
    isOcr: bool = False
    enableFormula: bool = True
