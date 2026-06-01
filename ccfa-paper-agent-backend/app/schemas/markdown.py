from pydantic import BaseModel


class OrganizeMarkdownRequest(BaseModel):
    fileName: str
    markdown: str


class OrganizeMarkdownResponse(BaseModel):
    organizedMarkdown: str
    summary: str
