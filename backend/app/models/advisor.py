import uuid
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class AdvisorSession(Base):
    __tablename__ = "advisor_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Legal Advisory Session"
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="India"
    )
    context_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
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

    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="advisor_sessions"
    )
    messages: Mapped[List["AdvisorMessage"]] = relationship(
        "AdvisorMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AdvisorMessage.created_at"
    )


class AdvisorMessage(Base):
    __tablename__ = "advisor_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("advisor_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False  # "user" or "assistant"
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    structured_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    sources: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    session: Mapped["AdvisorSession"] = relationship(
        "AdvisorSession",
        back_populates="messages"
    )
