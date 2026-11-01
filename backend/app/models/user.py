import uuid
from typing import List, Optional, Any
from sqlalchemy import String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
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

    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="RefreshToken.created_at.desc()"
    )
    advisor_sessions: Mapped[List["AdvisorSession"]] = relationship(
        "AdvisorSession",
        back_populates="user"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    drafts: Mapped[List["LegalDraft"]] = relationship(
        "LegalDraft",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="LegalDraft.created_at.desc()"
    )
    notice_replies: Mapped[List["NoticeReply"]] = relationship(
        "NoticeReply",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="NoticeReply.created_at.desc()"
    )




class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

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
    # SHA-256 hex digest of the raw random refresh token (64 hex characters)
    token_hash: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False
    )
    expires_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        nullable=False
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="refresh_tokens"
    )
