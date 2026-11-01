from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, Integer, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class RAGDocument(Base):
    __tablename__ = "rag_documents"

    id: Mapped[str] = mapped_column(
        String(100),
        primary_key=True
    )
    document_title: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    document_type: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
        default="Act"
    )
    document_jurisdiction: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
        default="India"
    )
    issuing_authority: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    issue_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    short_description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    source_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    raw_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    chunks: Mapped[List["RAGChunk"]] = relationship(
        "RAGChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="RAGChunk.chunk_index"
    )


class RAGChunk(Base):
    __tablename__ = "rag_chunks"

    id: Mapped[str] = mapped_column(
        String(150),
        primary_key=True
    )
    document_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("rag_documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        index=True,
        nullable=False
    )
    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    section_heading: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    source_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    embedding: Mapped[List[float]] = mapped_column(
        JSON,
        nullable=False
    )
    embedding_model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="BAAI/bge-small-en-v1.5"
    )
    embedding_dim: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=384
    )
    index_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="v1"
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

    document: Mapped["RAGDocument"] = relationship(
        "RAGDocument",
        back_populates="chunks"
    )


class RAGIndexMetadata(Base):
    __tablename__ = "rag_index_metadata"

    key: Mapped[str] = mapped_column(
        String(100),
        primary_key=True
    )
    value: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
