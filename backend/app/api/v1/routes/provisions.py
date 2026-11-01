from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.provision import (
    LawResponse,
    LegalProvisionResponse,
    ProvisionConversionResponse,
    ProvisionSearchResponse,
    LegalSourceInfo,
)
from app.services.provision_service import provision_service, OFFICIAL_LEGAL_SOURCES

router = APIRouter(prefix="/legal", tags=["Legal Provision Converter"])


@router.get(
    "/laws",
    response_model=List[LawResponse],
    summary="List all registered legal codes and statutes"
)
def list_registered_laws(db: Session = Depends(get_db)):
    """
    Returns registered laws (IPC, BNS, CrPC, BNSS, IEA, BSA, and future enactments)
    dynamically from the database registry.
    """
    laws = provision_service.list_laws(db)
    return laws


@router.get(
    "/laws/{law_slug}",
    response_model=LawResponse,
    summary="Get details of a specific legal enactment"
)
def get_law_details(law_slug: str, db: Session = Depends(get_db)):
    """Retrieves law metadata, enactment dates, and official source URL."""
    law = provision_service.get_law_by_slug(db, law_slug)
    if not law:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Law '{law_slug}' is not registered in the system."
        )
    return law


@router.get(
    "/provisions/{law_slug}/{provision_number}",
    response_model=LegalProvisionResponse,
    summary="Get details of a specific statutory provision"
)
def get_provision_details(
    law_slug: str,
    provision_number: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves full provision record including official text, plain-language meaning,
    and practical everyday example.
    """
    law = provision_service.get_law_by_slug(db, law_slug)
    if not law:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Law '{law_slug}' is not registered."
        )

    prov = provision_service.get_provision(db, law_slug, provision_number)
    if not prov:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provision '{provision_number}' was not found in {law.short_name}."
        )

    return LegalProvisionResponse(
        id=prov.id,
        law_id=prov.law_id,
        law_slug=law.slug,
        law_short_name=law.short_name,
        provision_type=prov.provision_type,
        provision_number=prov.provision_number,
        title=prov.title,
        official_text=prov.official_text,
        plain_language_explanation=prov.plain_language_explanation,
        practical_example=prov.practical_example,
        key_conditions=prov.key_conditions or [],
        source_url=prov.source_url,
        effective_from=prov.effective_from,
        effective_to=prov.effective_to,
        version_metadata=prov.version_metadata or {},
    )


@router.get(
    "/convert",
    response_model=ProvisionConversionResponse,
    summary="Convert a legal provision between two registered statutes"
)
async def convert_provision(
    source_law: str = Query(..., description="Source law slug, e.g. ipc, bns, crpc, bnss"),
    source_provision: str = Query(..., description="Source provision number or identifier, e.g. 420, 318, 154"),
    target_law: str = Query(..., description="Target law slug, e.g. bns, ipc, bnss"),
    db: Session = Depends(get_db)
):
    """
    Cross-references a provision between laws using verified concordance tables.
    Returns corresponding provisions, relationship types (direct, changed, partial),
    official concordance source references, plain language explanations, and realistic examples.
    """
    return await provision_service.convert_provision(
        db=db,
        source_law_slug=source_law,
        source_provision_number=source_provision,
        target_law_slug=target_law,
    )


@router.get(
    "/search",
    response_model=ProvisionSearchResponse,
    summary="Search provisions across registered laws"
)
def search_provisions(
    q: str = Query(..., min_length=1, description="Search term, section number, or keyword"),
    law: Optional[str] = Query(None, description="Optional law slug filter, or 'all'"),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Searches across statutory provision numbers, titles, explanations, and official texts.
    """
    results = provision_service.search_provisions(
        db=db,
        query_text=q,
        law_slug=law,
        limit=limit,
    )
    return ProvisionSearchResponse(
        results=results,
        total_matches=len(results),
        query=q,
        law_slug=law,
    )


@router.get(
    "/sources",
    response_model=List[LegalSourceInfo],
    summary="Get verified official legal sources used by the converter"
)
def get_official_sources():
    """
    Returns official government publications, India Code repos, and Gazette concordance citations.
    """
    return OFFICIAL_LEGAL_SOURCES


@router.get(
    "/diagnostics",
    summary="Get legal dataset ingestion, coverage, and provenance diagnostics"
)
def get_ingestion_diagnostics(db: Session = Depends(get_db)):
    """
    Provides audit diagnostics of all ingested legal datasets, coverage per law,
    correspondence counts, and provenance verification status.
    """
    from app.models.provision import LawRegistry, LegalProvision, ProvisionCorrespondence

    laws = db.query(LawRegistry).order_by(LawRegistry.sort_order).all()
    provisions_by_law = {}
    for law in laws:
        count = db.query(LegalProvision).filter(LegalProvision.law_id == law.id).count()
        provisions_by_law[law.slug] = {
            "name": law.short_name,
            "full_name": law.full_name,
            "jurisdiction": law.jurisdiction,
            "law_type": law.law_type,
            "status": law.status,
            "provisions_count": count,
            "source_url": law.official_source_url,
        }

    total_correspondences = db.query(ProvisionCorrespondence).count()
    verified_correspondences = db.query(ProvisionCorrespondence).filter(
        ProvisionCorrespondence.mapping_status == "verified"
    ).count()

    return {
        "status": "operational",
        "total_laws": len(laws),
        "total_provisions": sum(v["provisions_count"] for v in provisions_by_law.values()),
        "total_correspondences": total_correspondences,
        "verified_correspondences": verified_correspondences,
        "provisions_by_law": provisions_by_law,
        "primary_sources": [s.short_name for s in OFFICIAL_LEGAL_SOURCES],
        "datasets_ingested": [
            "GSMS-B/indian-legal-knowledge-base-json (Constitution, BNS, BNSS, BSA, Concordance Tables, Central Acts)",
            "aashnasharma/govintel-legal-dataset (Cross-Code Procedural Edges)",
            "Official BPR&D Concordance Tables",
        ],
    }

