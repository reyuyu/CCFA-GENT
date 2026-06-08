from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    projectId: str
    threadId: str
    userMessage: str
    context: dict[str, Any]
    model: Optional[str] = None


class UpdateProjectMetaPatch(BaseModel):
    type: Literal["updateProjectMeta"]
    payload: dict[str, Any] = Field(default_factory=dict)


class ProposeFileChangePatch(BaseModel):
    type: Literal["proposeFileChange"]
    folderType: str
    fileId: str
    summary: str
    newContent: str


class AppendSystemMessagePatch(BaseModel):
    type: Literal["appendSystemMessage"]
    threadId: str
    content: str


class UpdateDraftParagraphStatusPatch(BaseModel):
    type: Literal["updateDraftParagraphStatus"]
    fileId: str
    paragraphId: str
    payload: dict[str, Any] = Field(default_factory=dict)


class UpdateIntroductionOutlinePatch(BaseModel):
    type: Literal["updateIntroductionOutline"]
    payload: dict[str, Any] = Field(default_factory=dict)


class UpdateScientificProblemMemoryPatch(BaseModel):
    type: Literal["updateScientificProblemMemory"]
    payload: dict[str, Any] = Field(default_factory=dict)


class AgentReferenceRequest(BaseModel):
    id: str
    title: str
    semanticScholarPaperId: str = ""
    year: Optional[int] = None
    venue: str = ""
    authors: List[str] = Field(default_factory=list)
    citationCount: Optional[int] = None
    paperUrl: str = ""
    pdfUrl: str
    externalIds: dict[str, Any] = Field(default_factory=dict)
    relevanceReason: str
    whyUsefulForThisProject: str
    suggestedReferenceScope: Literal["coreReferences", "optionalReferences"] = "optionalReferences"
    usefulForSections: List[str] = Field(default_factory=list)
    status: Literal["pending", "accepted", "rejected", "parsing", "added", "failed"] = "pending"


AgentPatch = Union[
    UpdateProjectMetaPatch,
    ProposeFileChangePatch,
    AppendSystemMessagePatch,
    UpdateDraftParagraphStatusPatch,
    UpdateIntroductionOutlinePatch,
    UpdateScientificProblemMemoryPatch,
]


class AgentResponse(BaseModel):
    content: str
    patches: Optional[List[AgentPatch]] = None
    referenceRequests: Optional[List[AgentReferenceRequest]] = None


class HealthResponse(BaseModel):
    status: str
    model: str
    provider: str


class SessionClearResponse(BaseModel):
    cleared: bool
    projectId: str
    threadId: Optional[str] = None
    clearedSessionCount: int = 0


class LocalConfigRequest(BaseModel):
    deepseekApiKey: Optional[str] = None
    deepseekBaseUrl: Optional[str] = None
    deepseekModel: Optional[str] = None
    semanticScholarApiKey: Optional[str] = None
    semanticScholarBaseUrl: Optional[str] = None
    mineruApiToken: Optional[str] = None
    mineruParseMode: Optional[str] = None


class LocalConfigResponse(BaseModel):
    saved: bool = True
    envPath: str
    deepseekApiKeyConfigured: bool
    deepseekBaseUrl: str
    deepseekModel: str
    semanticScholarApiKeyConfigured: bool
    semanticScholarBaseUrl: str
    mineruApiTokenConfigured: bool
    mineruParseMode: str


class LocalShutdownResponse(BaseModel):
    message: str
    backendPids: List[int] = Field(default_factory=list)
    frontendPids: List[int] = Field(default_factory=list)
