import uuid
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, Integer, Boolean, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    storage_key: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    file_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="upload"  # "upload" or "pasted_text"
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending"  # "pending", "extracted", "failed"
    )
    extracted_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    title: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Other",
        index=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    tags: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    document_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    related_entity: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    ai_overview: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    word_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="documents"
    )
    simplifications: Mapped[List["SimplificationResult"]] = relationship(
        "SimplificationResult",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="SimplificationResult.created_at.desc()"
    )


class SimplificationResult(Base):
    __tablename__ = "simplification_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    simplification_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="standard"  # "basic", "standard", "detailed"
    )
    language: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="en"
    )
    preserve_legal_terms: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    explain_terminology: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="completed"  # "pending", "completed", "failed"
    )
    simplified_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    structured_output: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    retrieved_sources: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    document: Mapped["Document"] = relationship(
        "Document",
        back_populates="simplifications"
    )
    user: Mapped["User"] = relationship(
        "User"
    )


class LegalDraft(Base):
    __tablename__ = "legal_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    document_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="draft"  # "draft", "generated", "edited"
    )
    language: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="en"
    )
    tone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="formal"  # "formal", "polite", "firm", "neutral"
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="India"
    )
    structured_inputs: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    generated_content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    user_edited_content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    explanatory_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    retrieved_sources: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="drafts"
    )


class NoticeReply(Base):
    __tablename__ = "notice_replies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Reply to Legal Notice"
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="uploaded"  # "uploaded", "analyzed", "responded", "generated", "edited"
    )
    tone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="firm"  # "formal", "polite", "firm", "neutral"
    )
    language: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="en"
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="India"
    )
    # Raw source text extracted from uploaded notice or pasted
    raw_notice_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    # Extracted metadata: sender, recipient, notice_date, explicit_deadline, amount_demanded, ref_no, matter, etc.
    extracted_notice_details: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    # Extracted allegations, demands, and assertions
    allegations_and_demands: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    # User's responses to each allegation + their additional facts/corrections
    user_responses: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    # Generated reply text
    generated_reply: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    # User-edited reply text
    user_edited_reply: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    explanatory_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    retrieved_sources: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="notice_replies"
    )
    document: Mapped[Optional["Document"]] = relationship(
        "Document"
    )


