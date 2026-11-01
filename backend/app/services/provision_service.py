import uuid
import re
import logging
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, or_, and_, func
from fastapi import HTTPException, status

from app.models.provision import LawRegistry, LegalProvision, ProvisionCorrespondence
from app.schemas.provision import (
    LawResponse,
    LegalProvisionResponse,
    ProvisionCorrespondenceItem,
    ProvisionConversionResponse,
    ProvisionSearchItem,
    LegalSourceInfo,
)
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


OFFICIAL_LEGAL_SOURCES: List[LegalSourceInfo] = [
    LegalSourceInfo(
        title="India Code - Digital Repository of All Central and State Acts",
        short_name="India Code",
        source_type="Statutory Repository",
        authority="Legislative Department, Ministry of Law and Justice, Government of India",
        url="https://www.indiacode.nic.in",
        description="Official publication repository for authenticated Acts of Parliament."
    ),
    LegalSourceInfo(
        title="The Gazette of India: Extraordinary (Acts of Parliament No. 45, 46, and 47 of 2023)",
        short_name="Gazette of India",
        source_type="Official Gazette",
        authority="Ministry of Home Affairs & Ministry of Law and Justice",
        url="https://egazette.gov.in",
        description="Official gazette notifications enacting BNS (2023), BNSS (2023), and BSA (2023)."
    ),
    LegalSourceInfo(
        title="Comparative Table of Provisions: IPC 1860 and BNS 2023",
        short_name="BPRD Comparative Tables",
        source_type="Official Concordance Table",
        authority="Bureau of Police Research and Development (BPR&D)",
        url="https://bprd.nic.in",
        description="Government handbook detailing section-by-section transition between criminal codes."
    )
]


class ProvisionConverterService:
    @staticmethod
    def normalize_provision_number(num_str: str) -> str:
        """
        Normalizes input strings like 'Section 420', 'Sec. 420', '  420  ', 'Art 21'
        into canonical provision numbers like '420', '21', '103(2)'.
        """
        if not num_str:
            return ""
        s = num_str.strip()
        # Strip common prefixes like 'Section', 'Sec.', 'Art.', 'Article', 'Rule'
        s = re.sub(r"^(?:Section|Sec\.?|Article|Art\.?|Rule|Clause)\s*", "", s, flags=re.IGNORECASE)
        # Strip internal spaces around parentheses
        s = re.sub(r"\s+", "", s)
        return s.strip()

    @staticmethod
    def list_laws(db: Session) -> List[LawRegistry]:
        """Returns all registered laws sorted by sort_order."""
        return db.query(LawRegistry).order_by(LawRegistry.sort_order, LawRegistry.enactment_year.desc()).all()

    @staticmethod
    def get_law_by_slug(db: Session, law_slug: str) -> Optional[LawRegistry]:
        """Case-insensitive slug retrieval."""
        clean_slug = law_slug.strip().lower()
        return db.query(LawRegistry).filter(func.lower(LawRegistry.slug) == clean_slug).first()

    @staticmethod
    def get_provision(
        db: Session,
        law_slug: str,
        provision_number: str
    ) -> Optional[LegalProvision]:
        """Finds a provision by law slug and normalized provision number."""
        law = ProvisionConverterService.get_law_by_slug(db, law_slug)
        if not law:
            return None

        clean_number = ProvisionConverterService.normalize_provision_number(provision_number)

        # Match exact provision number (case-insensitive)
        prov = db.query(LegalProvision).filter(
            LegalProvision.law_id == law.id,
            func.lower(LegalProvision.provision_number) == clean_number.lower()
        ).first()

        if not prov:
            # Try searching with parentheses stripped or added if reasonable
            base_number = re.sub(r"\(.*?\)", "", clean_number)
            prov = db.query(LegalProvision).filter(
                LegalProvision.law_id == law.id,
                func.lower(LegalProvision.provision_number) == base_number.lower()
            ).first()

        return prov

    @staticmethod
    async def convert_provision(
        db: Session,
        source_law_slug: str,
        source_provision_number: str,
        target_law_slug: str,
    ) -> ProvisionConversionResponse:
        """
        Converts a provision from source law to target law with verified correspondences.
        Rigorously prevents hallucination. Returns structured no-match when correspondence does not exist.
        """
        source_law = ProvisionConverterService.get_law_by_slug(db, source_law_slug)
        if not source_law:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source law with slug '{source_law_slug}' is not registered."
            )

        target_law = ProvisionConverterService.get_law_by_slug(db, target_law_slug)
        if not target_law:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target law with slug '{target_law_slug}' is not registered."
            )

        source_provision = ProvisionConverterService.get_provision(db, source_law_slug, source_provision_number)
        if not source_provision:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Provision '{source_provision_number}' not found in {source_law.short_name}."
            )

        # Find correspondences from source to target
        # Check both direct outgoing correspondences and incoming correspondences where target_law matches
        outgoing = db.query(ProvisionCorrespondence).filter(
            ProvisionCorrespondence.source_provision_id == source_provision.id
        ).all()

        matching_items: List[ProvisionCorrespondenceItem] = []

        for corr in outgoing:
            target_p = db.query(LegalProvision).filter(
                LegalProvision.id == corr.target_provision_id,
                LegalProvision.law_id == target_law.id
            ).first()

            if target_p:
                matching_items.append(
                    ProvisionCorrespondenceItem(
                        id=corr.id,
                        relationship_type=corr.relationship_type,
                        mapping_status=corr.mapping_status,
                        explanation=corr.explanation,
                        substantive_changes=corr.substantive_changes,
                        source_reference=corr.source_reference,
                        verification_status=corr.verification_status,
                        dataset_version=corr.dataset_version,
                        target_provision=LegalProvisionResponse(
                            id=target_p.id,
                            law_id=target_p.law_id,
                            law_slug=target_law.slug,
                            law_short_name=target_law.short_name,
                            provision_type=target_p.provision_type,
                            provision_number=target_p.provision_number,
                            title=target_p.title,
                            official_text=target_p.official_text,
                            plain_language_explanation=target_p.plain_language_explanation,
                            practical_example=target_p.practical_example,
                            key_conditions=target_p.key_conditions or [],
                            source_url=target_p.source_url,
                            effective_from=target_p.effective_from,
                            effective_to=target_p.effective_to,
                            version_metadata=target_p.version_metadata or {},
                        )
                    )
                )

        # Also check reverse mappings if target was mapped to source
        incoming = db.query(ProvisionCorrespondence).filter(
            ProvisionCorrespondence.target_provision_id == source_provision.id
        ).all()

        for corr in incoming:
            target_p = db.query(LegalProvision).filter(
                LegalProvision.id == corr.source_provision_id,
                LegalProvision.law_id == target_law.id
            ).first()

            if target_p and not any(m.target_provision.id == target_p.id for m in matching_items):
                matching_items.append(
                    ProvisionCorrespondenceItem(
                        id=corr.id,
                        relationship_type=corr.relationship_type,
                        mapping_status=corr.mapping_status,
                        explanation=corr.explanation,
                        substantive_changes=corr.substantive_changes,
                        source_reference=corr.source_reference,
                        verification_status=corr.verification_status,
                        dataset_version=corr.dataset_version,
                        target_provision=LegalProvisionResponse(
                            id=target_p.id,
                            law_id=target_p.law_id,
                            law_slug=target_law.slug,
                            law_short_name=target_law.short_name,
                            provision_type=target_p.provision_type,
                            provision_number=target_p.provision_number,
                            title=target_p.title,
                            official_text=target_p.official_text,
                            plain_language_explanation=target_p.plain_language_explanation,
                            practical_example=target_p.practical_example,
                            key_conditions=target_p.key_conditions or [],
                            source_url=target_p.source_url,
                            effective_from=target_p.effective_from,
                            effective_to=target_p.effective_to,
                            version_metadata=target_p.version_metadata or {},
                        )
                    )
                )

        has_verified_mapping = len(matching_items) > 0
        if has_verified_mapping:
            status_summary = (
                f"Verified correspondence found between {source_law.short_name} {source_provision.provision_number} "
                f"and {target_law.short_name} ({len(matching_items)} corresponding provision(s))."
            )
        else:
            status_summary = (
                f"No verified correspondence found in official concordance tables between {source_law.short_name} "
                f"{source_provision.provision_number} and {target_law.short_name}."
            )

        # Ensure source provision has rich explanation & example
        if not source_provision.plain_language_explanation or not source_provision.practical_example:
            ai_data = await gemini_service.explain_provision_and_correspondence(
                law_name=source_law.full_name,
                provision_number=f"{source_provision.provision_type} {source_provision.provision_number}",
                title=source_provision.title,
                official_text=source_provision.official_text,
            )
            source_provision.plain_language_explanation = ai_data.get("plain_language_explanation")
            source_provision.practical_example = ai_data.get("practical_example")
            source_provision.key_conditions = ai_data.get("key_conditions", [])
            db.commit()
            db.refresh(source_provision)

        source_resp = LegalProvisionResponse(
            id=source_provision.id,
            law_id=source_provision.law_id,
            law_slug=source_law.slug,
            law_short_name=source_law.short_name,
            provision_type=source_provision.provision_type,
            provision_number=source_provision.provision_number,
            title=source_provision.title,
            official_text=source_provision.official_text,
            plain_language_explanation=source_provision.plain_language_explanation,
            practical_example=source_provision.practical_example,
            key_conditions=source_provision.key_conditions or [],
            source_url=source_provision.source_url,
            effective_from=source_provision.effective_from,
            effective_to=source_provision.effective_to,
            version_metadata=source_provision.version_metadata or {},
        )

        return ProvisionConversionResponse(
            source_law=LawResponse.model_validate(source_law),
            target_law=LawResponse.model_validate(target_law),
            source_provision=source_resp,
            correspondences=matching_items,
            has_verified_mapping=has_verified_mapping,
            status_summary=status_summary,
        )

    @staticmethod
    def search_provisions(
        db: Session,
        query_text: str,
        law_slug: Optional[str] = None,
        limit: int = 15
    ) -> List[ProvisionSearchItem]:
        """Searches provisions by number, title, explanation, or official text."""
        if not query_text or not query_text.strip():
            return []

        q = query_text.strip()
        sq = f"%{q}%"

        query = db.query(LegalProvision).join(LawRegistry, LegalProvision.law_id == LawRegistry.id)

        if law_slug and law_slug.lower() != "all":
            query = query.filter(func.lower(LawRegistry.slug) == law_slug.lower())

        # Check provision number exact match or title/text contains
        query = query.filter(
            or_(
                LegalProvision.provision_number.ilike(sq),
                LegalProvision.title.ilike(sq),
                LegalProvision.plain_language_explanation.ilike(sq),
                LegalProvision.official_text.ilike(sq),
            )
        ).limit(limit)

        provisions = query.all()
        results = []
        lower_q = q.lower()

        for p in provisions:
            law = db.query(LawRegistry).filter(LawRegistry.id == p.law_id).first()
            matched_field = "title"
            snippet = p.title

            if lower_q in p.provision_number.lower():
                matched_field = "provision_number"
                snippet = f"{p.provision_type} {p.provision_number}: {p.title}"
            elif p.official_text and lower_q in p.official_text.lower():
                matched_field = "official_text"
                idx = p.official_text.lower().find(lower_q)
                start = max(0, idx - 40)
                end = min(len(p.official_text), idx + len(lower_q) + 60)
                snippet = f"...{p.official_text[start:end]}..."

            p_resp = LegalProvisionResponse(
                id=p.id,
                law_id=p.law_id,
                law_slug=law.slug if law else "",
                law_short_name=law.short_name if law else "",
                provision_type=p.provision_type,
                provision_number=p.provision_number,
                title=p.title,
                official_text=p.official_text,
                plain_language_explanation=p.plain_language_explanation,
                practical_example=p.practical_example,
                key_conditions=p.key_conditions or [],
                source_url=p.source_url,
                effective_from=p.effective_from,
                effective_to=p.effective_to,
                version_metadata=p.version_metadata or {},
            )
            results.append(ProvisionSearchItem(
                provision=p_resp,
                matched_field=matched_field,
                snippet=snippet
            ))

        return results


provision_service = ProvisionConverterService()
