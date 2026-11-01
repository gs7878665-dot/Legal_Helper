import uuid
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, Integer, Boolean, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class LawRegistry(Base):
    """
    Registry of legal codes, statutes, and enactments.
    Supports historical, repealed, and active modern laws.
    """
    __tablename__ = "laws"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    short_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    jurisdiction: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="India"
    )
    law_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Penal / Criminal"
    )
    enactment_year: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    commencement_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    repeal_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active"  # "active", "repealed", "amended", "historical"
    )
    official_source_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    version_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
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

    provisions: Mapped[List["LegalProvision"]] = relationship(
        "LegalProvision",
        back_populates="law",
        cascade="all, delete-orphan",
        order_by="LegalProvision.provision_number"
    )


class LegalProvision(Base):
    """
    Generic statutory unit (Section, Article, Rule, Order, Schedule, Clause).
    """
    __tablename__ = "legal_provisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    law_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("laws.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    provision_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Section"  # Section, Article, Rule, Order, Clause
    )
    provision_number: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False  # e.g., "420", "318", "21", "103(2)", "498A"
    )
    parent_provision_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("legal_provisions.id", ondelete="SET NULL"),
        nullable=True
    )
    title: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    official_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    plain_language_explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    practical_example: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    key_conditions: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    source_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    effective_from: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    effective_to: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    version_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
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

    law: Mapped["LawRegistry"] = relationship(
        "LawRegistry",
        back_populates="provisions"
    )
    outgoing_correspondences: Mapped[List["ProvisionCorrespondence"]] = relationship(
        "ProvisionCorrespondence",
        foreign_keys="ProvisionCorrespondence.source_provision_id",
        back_populates="source_provision",
        cascade="all, delete-orphan"
    )
    incoming_correspondences: Mapped[List["ProvisionCorrespondence"]] = relationship(
        "ProvisionCorrespondence",
        foreign_keys="ProvisionCorrespondence.target_provision_id",
        back_populates="target_provision",
        cascade="all, delete-orphan"
    )


class ProvisionCorrespondence(Base):
    """
    Cross-statutory mappings between provisions across different legal codes.
    Supports 1:1, 1:Many, Many:1, partial, changed, and repealed relationships.
    """
    __tablename__ = "provision_correspondences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    source_provision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("legal_provisions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    target_provision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("legal_provisions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="direct_correspondence"
        # direct_correspondence, partial_correspondence, changed_provision,
        # one_to_many, many_to_one, new_provision, repealed_provision,
        # related_provision
    )
    mapping_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="verified"  # verified, pending_review, historical
    )
    explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    substantive_changes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    source_reference: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    verification_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="official_comparative_table"
    )
    dataset_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="2024.1"
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    source_provision: Mapped["LegalProvision"] = relationship(
        "LegalProvision",
        foreign_keys=[source_provision_id],
        back_populates="outgoing_correspondences"
    )
    target_provision: Mapped["LegalProvision"] = relationship(
        "LegalProvision",
        foreign_keys=[target_provision_id],
        back_populates="incoming_correspondences"
    )
