import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base


class AiGenerationTask(Base):
    __tablename__ = "ai_generation_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True)

    status = Column(String, default="pending", nullable=False, index=True)  # pending, success, failed
    video_url = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    estimated_cost_usd = Column(Numeric(precision=10, scale=4), nullable=True)
    error_message = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)


class CopyRequest(Base):
    """
    AI copy generation request (CR-3).

    Stores the input snapshot (product name / description / tone / platform)
    plus the generated text so the frontend can show a generation history and
    re-archive successful results. ``product_id``/``service_id`` are optional
    references kept for analytics.
    """

    __tablename__ = "ai_copy_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String, default="pending", nullable=False, index=True)  # pending, success, failed
    product_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    tone = Column(String, nullable=True)
    platform = Column(String, nullable=True)
    generated_text = Column(Text, nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True)
    error_message = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class ArchivedCopy(Base):
    """
    A copy the user explicitly saved for later reuse (posts, captions, etc.).

    ``kind``: copy | video | image | all. ``source_task_id`` links back to the
    ``ai_copy_requests`` row when the archive came from a copy generation.
    """

    __tablename__ = "archived_copies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    kind = Column(String, default="copy", nullable=False)
    source_task_id = Column(UUID(as_uuid=True), ForeignKey("ai_copy_requests.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)