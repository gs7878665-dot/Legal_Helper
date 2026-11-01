import uuid
from typing import List, Any
from sqlalchemy import String, Text, Integer, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class ResearchQuery(Base):
    __tablename__ = "research_queries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    query_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="India"
    )
    source_types: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    results_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
