import re
from typing import List, Optional, Dict, Any
from app.services.retrieval.base import (
    LegalRetriever,
    RetrievedDocument,
    RetrievalResult,
)

# Standard curated development fixtures clearly marked as development fixtures
DEV_FIXTURE_DATABASE: List[RetrievedDocument] = [
    RetrievedDocument(
        id="dev-cpa-2019-s2",
        title="Consumer Protection Act, 2019 — Section 2(7) & Section 35",
        citation="Act No. 35 of 2019, Section 2(7)",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=2019,
        content_excerpt=(
            "Defines 'consumer' as any person who buys any goods or hires any services "
            "for a consideration. Section 35 empowers consumers to file complaints before "
            "the District Consumer Disputes Redressal Commission for unfair trade practices, "
            "deficiency in service, or failure to refund consideration."
        ),
        full_text=(
            "The Consumer Protection Act, 2019 provides for protection of the interests of consumers "
            "and for the establishment of authorities for timely and effective administration and "
            "settlement of consumers' disputes. Section 35 governs the manner in which complaints "
            "shall be made before the District Commission electronically or in physical form."
        ),
        url="https://www.indiacode.nic.in/handle/123456789/15256",
        confidence_score=0.92,
        is_development_fixture=True,
        tags=["consumer", "refund", "deficiency", "e-commerce", "goods", "services", "complaint", "fraud"]
    ),
    RetrievedDocument(
        id="dev-it-act-s66d",
        title="Information Technology Act, 2000 — Section 66D",
        citation="Act No. 21 of 2000, Section 66D",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=2000,
        content_excerpt=(
            "Punishment for cheating by personation by using computer resource: "
            "Whoever, by means of any communication device or computer resource, "
            "cheats by personation, shall be punished with imprisonment of either "
            "description for a term which may extend to three years and fine."
        ),
        full_text=(
            "Section 66D of the Information Technology Act, 2000 addresses cyber financial fraud, "
            "phishing, identity impersonation, and fraudulent online digital transactions. "
            "Victims can report such incidents on the National Cyber Crime Reporting Portal (cybercrime.gov.in)."
        ),
        url="https://www.indiacode.nic.in/handle/123456789/1999",
        confidence_score=0.90,
        is_development_fixture=True,
        tags=["cyber", "fraud", "scam", "online", "cheating", "phishing", "upi", "banking", "impersonation"]
    ),
    RetrievedDocument(
        id="dev-tpa-1882-s106",
        title="Transfer of Property Act, 1882 — Section 106 & Section 108",
        citation="Act No. 4 of 1882, Section 106",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=1882,
        content_excerpt=(
            "Duration of certain leases in absence of written contract or local usage. "
            "Lease of immovable property for residential purpose deemed month-to-month, "
            "terminable on 15 days notice. Lessor is bound to return the security deposit "
            "subject to legitimate deductions upon peaceful handover of possession."
        ),
        full_text=(
            "Section 106 stipulates the statutory notice period for termination of tenancy. "
            "In rental disputes involving deposit refunds, state-specific Tenancy Acts (such as the "
            "Model Tenancy Act or Rent Control Acts) require return of security deposit within "
            "prescribed timeframes after deducting reasonable arrears or repairs."
        ),
        url="https://www.indiacode.nic.in/handle/123456789/2338",
        confidence_score=0.88,
        is_development_fixture=True,
        tags=["rent", "landlord", "tenant", "lease", "deposit", "eviction", "security", "flat", "apartment", "property"]
    ),
    RetrievedDocument(
        id="dev-bns-2023-s318",
        title="Bharatiya Nyaya Sanhita, 2023 (BNS) — Section 318 (Cheating)",
        citation="Act No. 45 of 2023, Section 318",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=2023,
        content_excerpt=(
            "Defines and penalizes cheating and dishonestly inducing delivery of property. "
            "Replaces Section 420 of the Indian Penal Code 1860 with updated provisions "
            "for financial inducement, deception, and contractual fraud."
        ),
        full_text=(
            "Section 318 provides that whoever cheats and thereby dishonestly induces the person "
            "deceived to deliver any property to any person, or to make, alter or destroy the whole "
            "or any part of a valuable security, shall be punished with imprisonment up to seven years."
        ),
        url="https://www.mha.gov.in/en/acts",
        confidence_score=0.86,
        is_development_fixture=True,
        tags=["criminal", "cheating", "fraud", "bns", "fir", "police", "money", "dishonest", "deception"]
    ),
    RetrievedDocument(
        id="dev-contract-1872-s73",
        title="Indian Contract Act, 1872 — Section 73 (Compensation for Loss or Damage)",
        citation="Act No. 9 of 1872, Section 73",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=1872,
        content_excerpt=(
            "When a contract has been broken, the party who suffers by such breach is entitled "
            "to receive, from the party who has broken the contract, compensation for any loss "
            "or damage caused to him thereby, which naturally arose in the usual course of things."
        ),
        full_text=(
            "Section 73 establishes the fundamental common-law principles for breach of contract "
            "and damages in India. The injured party is entitled to compensation for direct and proximate "
            "loss, but not remote or indirect damages."
        ),
        url="https://www.indiacode.nic.in/handle/123456789/2187",
        confidence_score=0.85,
        is_development_fixture=True,
        tags=["contract", "breach", "agreement", "salary", "employment", "damages", "compensation", "freelance", "vendor"]
    ),
    RetrievedDocument(
        id="dev-sc-puttaswamy-2017",
        title="Justice K.S. Puttaswamy (Retd.) v. Union of India",
        citation="(2017) 10 SCC 1",
        source_type="judgment",
        jurisdiction="India",
        court_or_authority="Supreme Court of India (9-Judge Constitution Bench)",
        year=2017,
        content_excerpt=(
            "Unanimously held that the right to privacy is protected as an intrinsic part of the "
            "right to life and personal liberty under Article 21 and as a part of the freedoms "
            "guaranteed by Part III of the Constitution."
        ),
        full_text=(
            "The 9-Judge Constitution Bench ruled that informational privacy, bodily privacy, "
            "and spatial privacy are fundamental rights. State intrusion into privacy must satisfy "
            "the three-fold test of legality, legitimate state aim, and proportionality."
        ),
        url="https://main.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_24-Aug-2017.pdf",
        confidence_score=0.91,
        is_development_fixture=True,
        tags=["privacy", "data", "article 21", "fundamental rights", "surveillance", "constitution", "aadhaar"]
    ),
    RetrievedDocument(
        id="dev-sc-pranay-sethi-2017",
        title="National Insurance Co. Ltd. v. Pranay Sethi & Ors.",
        citation="(2017) 16 SCC 680",
        source_type="judgment",
        jurisdiction="India",
        court_or_authority="Supreme Court of India (Constitution Bench)",
        year=2017,
        content_excerpt=(
            "Standardized the formula for computing compensation under Section 166 of the "
            "Motor Vehicles Act, 1988, including future prospects, conventional heads (loss of estate, "
            "consortium, funeral expenses), and multiplier application."
        ),
        full_text=(
            "Settled long-standing inconsistencies across High Courts regarding motor accident claims. "
            "Prescribed standard percentages for future prospects based on deceased age and employment type."
        ),
        url="https://main.sci.gov.in/judgment",
        confidence_score=0.84,
        is_development_fixture=True,
        tags=["motor accident", "insurance", "compensation", "vehicle", "claim", "accident", "tribunal"]
    ),
    RetrievedDocument(
        id="dev-arbitration-1996-s9",
        title="Arbitration and Conciliation Act, 1996 — Section 9 & Section 11",
        citation="Act No. 26 of 1996, Section 9",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=1996,
        content_excerpt=(
            "Interim measures by Court before, during, or after arbitral proceedings. "
            "Parties may apply to court for interim injunction, preservation of goods, "
            "or securing amount in dispute pending arbitration."
        ),
        full_text=(
            "Section 9 allows parties to a commercial dispute with an arbitration clause to obtain "
            "urgent interim relief from a commercial court or High Court. Section 11 regulates court "
            "appointment of arbitrators when parties fail to agree."
        ),
        url="https://www.indiacode.nic.in/handle/123456789/1978",
        confidence_score=0.82,
        is_development_fixture=True,
        tags=["arbitration", "commercial", "dispute", "interim", "injunction", "clause", "agreement"]
    ),
    RetrievedDocument(
        id="dev-dpdp-2023-s6",
        title="Digital Personal Data Protection Act, 2023 — Section 6 & Section 8",
        citation="Act No. 22 of 2023, Section 6",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=2023,
        content_excerpt=(
            "Consent requirements for processing digital personal data. Consent must be free, "
            "specific, informed, unconditional, and unambiguous with clear affirmative action. "
            "Data Fiduciaries must implement reasonable security safeguards to prevent personal data breaches."
        ),
        full_text=(
            "The DPDP Act establishes duties for Data Fiduciaries and rights for Data Principals, "
            "including right to access summary of personal data, right to correction, and grievance redressal."
        ),
        url="https://www.meity.gov.in/content/digital-personal-data-protection-act-2023",
        confidence_score=0.89,
        is_development_fixture=True,
        tags=["dpdp", "data protection", "privacy", "consent", "breach", "security", "digital", "fiduciary"]
    ),
    RetrievedDocument(
        id="dev-industrial-disputes-1947",
        title="Industrial Disputes Act, 1947 — Section 25F (Retrenchment & Notice)",
        citation="Act No. 14 of 1947, Section 25F",
        source_type="legislation",
        jurisdiction="India",
        court_or_authority="Parliament of India",
        year=1947,
        content_excerpt=(
            "Conditions precedent to retrenchment of workmen: one month notice in writing "
            "indicating reasons or wages in lieu thereof, and compensation equivalent to 15 days "
            "average pay for every completed year of continuous service."
        ),
        full_text=(
            "Governs termination, layoffs, and retrenchment in industrial establishments. "
            "Provides statutory protections against arbitrary termination without statutory due process."
        ),
        url="https://www.indiacode.nic.in/handle/123456789/2232",
        confidence_score=0.83,
        is_development_fixture=True,
        tags=["employment", "labour", "termination", "retrenchment", "severance", "workman", "salary", "notice"]
    )
]

class DevelopmentLegalRetriever(LegalRetriever):
    """
    Development adapter implementing the stable LegalRetriever interface.
    Uses strictly marked fixtures representing Indian statutory sections and precedents.
    Returns clear development fixture metadata and supports realistic keyword ranking.
    Will be swapped with the trained RAG retriever without any frontend changes.
    """

    def __init__(self, fixtures: Optional[List[RetrievedDocument]] = None):
        self.fixtures = fixtures if fixtures is not None else DEV_FIXTURE_DATABASE

    async def retrieve(
        self,
        query: str,
        jurisdiction: str = "India",
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5
    ) -> RetrievalResult:
        query_clean = query.strip().lower()
        if not query_clean:
            return RetrievalResult(
                query=query,
                jurisdiction=jurisdiction,
                filters=filters or {},
                documents=[],
                total_found=0,
                retrieval_mode="development_adapter"
            )

        # Extract tokens for matching
        tokens = [t for t in re.split(r'[^a-zA-Z0-9]', query_clean) if len(t) > 2]
        if not tokens:
            return RetrievalResult(
                query=query,
                jurisdiction=jurisdiction,
                filters=filters or {},
                documents=[],
                total_found=0,
                retrieval_mode="development_adapter"
            )

        source_type_filter = None
        if filters and "source_type" in filters:
            source_type_filter = filters["source_type"].lower()

        scored_docs: List[tuple[float, RetrievedDocument]] = []

        for doc in self.fixtures:
            # Check source_type filter
            if source_type_filter and source_type_filter != "all":
                if doc.source_type.lower() != source_type_filter:
                    continue

            # Compute match score
            score = 0.0
            doc_text = f"{doc.title} {doc.citation} {doc.content_excerpt} {' '.join(doc.tags)}".lower()

            for token in tokens:
                if token in doc.tags:
                    score += 3.0
                elif token in doc.title.lower():
                    score += 2.5
                elif token in doc.citation.lower():
                    score += 2.0
                elif token in doc_text:
                    score += 1.0

            if score > 0:
                # Normalize confidence to [0.5, 0.98]
                normalized_score = min(0.98, max(0.50, 0.50 + (score * 0.06)))
                # Clone doc with updated confidence
                doc_copy = doc.model_copy(update={"confidence_score": round(normalized_score, 2)})
                scored_docs.append((score, doc_copy))

        # Sort descending by score
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        top_documents = [doc for _, doc in scored_docs[:top_k]]

        return RetrievalResult(
            query=query,
            jurisdiction=jurisdiction,
            filters=filters or {},
            documents=top_documents,
            total_found=len(scored_docs),
            retrieval_mode="development_adapter"
        )

    async def get_document_by_id(self, document_id: str) -> Optional[RetrievedDocument]:
        for doc in self.fixtures:
            if doc.id == document_id:
                return doc
        return None

# Singleton default instance
dev_retriever_instance = DevelopmentLegalRetriever()
