import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class GenerateCopyRequest(BaseModel):
    product_name: str = Field(..., description="Name of the product or service")
    description: str = Field(..., description="Description of the product or service")
    tone: str = Field(default="persuasivo", description="Tone of the generated copy")
    platform: str = Field(default="general", description="Target platform for the copy")


class GenerateCopyResponse(BaseModel):
    task_id: uuid.UUID = Field(..., description="Copy request UUID.")
    status: str = Field(..., description="pending | success | failed")
    text: str | None = Field(default=None, description="Generated copy text (when completed).")
    error_message: str | None = Field(default=None, description="Error detail when failed.")


class CopyRequestResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    status: str
    product_name: str
    description: str
    tone: str | None = None
    platform: str | None = None
    generated_text: str | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class ArchivedCopyCreate(BaseModel):
    title: str = Field(..., max_length=200, description="Archived copy title.")
    content: str = Field(..., min_length=1, description="Text content to archive.")
    kind: str = Field(default="copy", description="copy | video | image | all")
    source_task_id: uuid.UUID | None = Field(default=None, description="Origin copy request, if applicable.")


class ArchivedCopyResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str | None = None
    content: str
    kind: str
    source_task_id: uuid.UUID | None = None
    created_at: datetime


class ImprovePostCopyRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Wall post draft to improve.")
    tone: str | None = Field(default=None, description="Optional tone hint.")
    post_id: uuid.UUID | None = Field(default=None, description="Optional source post (for usage attribution).")


class ImprovePostCopyResponse(BaseModel):
    text: str = Field(..., description="Improved wall post text.")