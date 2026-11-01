import uuid
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, Integer, Boolean, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class LawyerPreparationSession(Base):
    __tablename__ = "lawyer_preparation_sessions"

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
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    situation_description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    relevant_dates: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    has_notice_or_deadline: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    notice_details: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    # Output structure
    case_summary: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    user_provided_facts: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    ai_interpretation: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    information_to_gather: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    questions_to_ask: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    potential_legal_issues: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    consultation_document: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user = relationship("User", backref="lawyer_prep_sessions")


class LegalAidOrganization(Base):
    __tablename__ = "legal_aid_organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )  # e.g., "Free Legal Aid", "Legal Services Authority", "Legal Aid Clinic", "Assistance for Women", "Assistance for Children", "Vulnerable Groups"
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    district: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    address: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True
    )
    website: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    eligibility_info: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    services_offered: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    source_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    source_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    verification_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class ScamAnalysis(Base):
    __tablename__ = "scam_analyses"

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
    submitted_content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    sender_info: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    claimed_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # "low", "medium", "high", "inconclusive"
    confidence_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )  # 0 to 100
    red_flags: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )  # [{"signal": str, "quote": str, "explanation": str, "severity": str}]
    plain_explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    safer_next_steps: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    verified_reporting_resources: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user = relationship("User", backref="scam_analyses")
