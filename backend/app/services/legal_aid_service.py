import uuid
import logging
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.safety_help import LegalAidOrganization
from app.services.legal_aid_seed_data import SEED_LEGAL_AID_ORGS

logger = logging.getLogger(__name__)


class LegalAidService:
    @staticmethod
    def ensure_seeded(db: Session) -> None:
        """
        Seeds verified legal aid authorities and clinics if table is empty.
        """
        try:
            count = db.query(LegalAidOrganization).count()
            if count == 0:
                logger.info("Seeding verified legal aid organizations...")
                for item in SEED_LEGAL_AID_ORGS:
                    org = LegalAidOrganization(
                        name=item["name"],
                        category=item["category"],
                        state=item["state"],
                        district=item["district"],
                        city=item.get("city"),
                        address=item["address"],
                        phone=item.get("phone"),
                        email=item.get("email"),
                        website=item.get("website"),
                        eligibility_info=item.get("eligibility_info"),
                        services_offered=item.get("services_offered", []),
                        source_name=item["source_name"],
                        source_url=item.get("source_url"),
                        verification_date=item.get("verification_date"),
                        is_active=True
                    )
                    db.add(org)
                db.commit()
                logger.info(f"Successfully seeded {len(SEED_LEGAL_AID_ORGS)} legal aid organizations.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to seed legal aid organizations: {e}")

    @staticmethod
    def search_organizations(
        db: Session,
        state: Optional[str] = None,
        district: Optional[str] = None,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 12
    ) -> Tuple[List[LegalAidOrganization], int, int, List[str], List[str], List[str]]:
        LegalAidService.ensure_seeded(db)

        query = db.query(LegalAidOrganization).filter(LegalAidOrganization.is_active == True)

        if state and state.strip() and state.strip().lower() != "all":
            query = query.filter(LegalAidOrganization.state.ilike(f"%{state.strip()}%"))

        if district and district.strip() and district.strip().lower() != "all":
            query = query.filter(LegalAidOrganization.district.ilike(f"%{district.strip()}%"))

        if category and category.strip() and category.strip().lower() != "all":
            query = query.filter(LegalAidOrganization.category.ilike(f"%{category.strip()}%"))

        if search_query and search_query.strip():
            term = f"%{search_query.strip()}%"
            query = query.filter(
                or_(
                    LegalAidOrganization.name.ilike(term),
                    LegalAidOrganization.address.ilike(term),
                    LegalAidOrganization.city.ilike(term),
                    LegalAidOrganization.district.ilike(term),
                    LegalAidOrganization.state.ilike(term)
                )
            )

        total = query.count()
        total_pages = max(1, (total + page_size - 1) // page_size)
        offset = (page - 1) * page_size

        items = query.order_by(LegalAidOrganization.state, LegalAidOrganization.name).offset(offset).limit(page_size).all()

        # Metadata for dropdowns
        all_states = [r[0] for r in db.query(LegalAidOrganization.state).distinct().order_by(LegalAidOrganization.state).all() if r[0]]
        all_districts = [r[0] for r in db.query(LegalAidOrganization.district).distinct().order_by(LegalAidOrganization.district).all() if r[0]]
        all_categories = [r[0] for r in db.query(LegalAidOrganization.category).distinct().order_by(LegalAidOrganization.category).all() if r[0]]

        return items, total, total_pages, all_states, all_districts, all_categories

    @staticmethod
    def get_by_id(db: Session, org_id: uuid.UUID) -> Optional[LegalAidOrganization]:
        LegalAidService.ensure_seeded(db)
        return db.query(LegalAidOrganization).filter(LegalAidOrganization.id == org_id, LegalAidOrganization.is_active == True).first()

    @staticmethod
    def get_locations(db: Session) -> Dict[str, Any]:
        LegalAidService.ensure_seeded(db)
        states = [r[0] for r in db.query(LegalAidOrganization.state).distinct().order_by(LegalAidOrganization.state).all() if r[0]]
        districts_map: Dict[str, List[str]] = {}
        for st in states:
            districts = [r[0] for r in db.query(LegalAidOrganization.district).filter(LegalAidOrganization.state == st).distinct().order_by(LegalAidOrganization.district).all() if r[0]]
            districts_map[st] = districts
        return {
            "states": states,
            "districts_by_state": districts_map
        }
