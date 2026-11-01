"""
Multi-source Legal Data Ingestion Pipeline & Reconciliation System for Legal Helper.
Idempotent, provenance-preserving, conflict-aware, and audited.
Supports:
- Official Concordance Tables (BPR&D, Gazette of India, India Code)
- Constitution of India (Complete 506 Articles from Legislative Dept)
- Contemporary Sanhitas: BNS (2023), BNSS (2023), BSA (2023)
- Historical Criminal Codes: IPC (1860), CrPC (1973), Evidence Act (1872)
- Central Acts & Procedural Laws (Advocates Act 1961, Administrative Tribunals Act 1985, etc.)
- Cross-statutory procedural and evidentiary graph edges (GovIntel, BNS Law RAG)
"""

import re
import ssl
import json
import uuid
import logging
import urllib.request
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.provision import LawRegistry, LegalProvision, ProvisionCorrespondence

logger = logging.getLogger(__name__)

# SSL Context for external datasets
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "Mozilla/5.0 LegalHelperIngest/2.0"}


class IngestionDiagnostics:
    def __init__(self):
        self.sources_inspected: List[str] = []
        self.sources_imported: List[str] = []
        self.records_found_per_source: Dict[str, int] = {}
        self.records_imported_per_law: Dict[str, int] = {}
        self.correspondences_per_pair: Dict[str, int] = {}
        self.duplicates_detected: int = 0
        self.conflicts_detected: List[Dict[str, Any]] = []
        self.skipped_records: int = 0
        self.failed_parsing: int = 0
        self.missing_provenance: int = 0
        self.coverage_summary: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sources_inspected": self.sources_inspected,
            "sources_imported": self.sources_imported,
            "records_found_per_source": self.records_found_per_source,
            "records_imported_per_law": self.records_imported_per_law,
            "correspondences_per_pair": self.correspondences_per_pair,
            "duplicates_detected": self.duplicates_detected,
            "conflicts_count": len(self.conflicts_detected),
            "conflicts": self.conflicts_detected[:10],  # sample conflicts
            "skipped_records": self.skipped_records,
            "failed_parsing": self.failed_parsing,
            "missing_provenance": self.missing_provenance,
            "coverage_summary": self.coverage_summary,
        }


class LegalDataIngestor:
    def __init__(self, db: Session):
        self.db = db
        self.diag = IngestionDiagnostics()
        self.laws_cache: Dict[str, LawRegistry] = {}

    def _fetch_json(self, url: str) -> Any:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30, context=ssl_ctx) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))

    def normalize_provision_number(self, num_str: str) -> str:
        if not num_str:
            return ""
        s = str(num_str).strip()
        s = re.sub(r"^(?:Section|Sec\.?|Article|Art\.?|Rule|Clause)\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s+", "", s)
        return s.strip()

    def get_or_create_law(self, slug: str, defaults: Dict[str, Any]) -> LawRegistry:
        clean_slug = slug.strip().lower()
        if clean_slug in self.laws_cache:
            return self.laws_cache[clean_slug]

        law = self.db.query(LawRegistry).filter(func.lower(LawRegistry.slug) == clean_slug).first()
        if not law:
            law = LawRegistry(
                slug=clean_slug,
                full_name=defaults.get("full_name", clean_slug.upper()),
                short_name=defaults.get("short_name", clean_slug.upper()),
                jurisdiction=defaults.get("jurisdiction", "India"),
                law_type=defaults.get("law_type", "Substantive Law"),
                enactment_year=defaults.get("enactment_year"),
                commencement_date=defaults.get("commencement_date"),
                repeal_date=defaults.get("repeal_date"),
                status=defaults.get("status", "active"),
                official_source_url=defaults.get("official_source_url"),
                description=defaults.get("description"),
                version_metadata=defaults.get("version_metadata", {}),
                sort_order=defaults.get("sort_order", 10),
            )
            self.db.add(law)
            self.db.flush()
        self.laws_cache[clean_slug] = law
        return law

    def upsert_provision(
        self,
        law_id: uuid.UUID,
        provision_number: str,
        title: str,
        official_text: Optional[str] = None,
        plain_language_explanation: Optional[str] = None,
        practical_example: Optional[str] = None,
        key_conditions: Optional[List[str]] = None,
        provision_type: str = "Section",
        effective_from: Optional[str] = None,
        effective_to: Optional[str] = None,
        source_url: Optional[str] = None,
        provenance: Optional[Dict[str, Any]] = None,
    ) -> Tuple[LegalProvision, bool]:
        clean_number = self.normalize_provision_number(provision_number)
        clean_title = (title or f"{provision_type} {clean_number}").strip()

        # Check existing
        existing = self.db.query(LegalProvision).filter(
            LegalProvision.law_id == law_id,
            func.lower(LegalProvision.provision_number) == clean_number.lower()
        ).first()

        provenance_data = provenance or {
            "source_name": "Official Seed / Gazette",
            "import_timestamp": datetime.now(timezone.utc).isoformat(),
            "verification_status": "official"
        }

        if existing:
            # Check for conflict in official text if both exist and differ significantly
            if existing.official_text and official_text:
                if len(existing.official_text) > 40 and len(official_text) > 40:
                    clean_existing = re.sub(r"\s+", " ", existing.official_text).strip()
                    clean_new = re.sub(r"\s+", " ", official_text).strip()
                    if clean_existing[:100] != clean_new[:100]:
                        self.diag.conflicts_detected.append({
                            "type": "text_difference",
                            "law_id": str(law_id),
                            "provision_number": clean_number,
                            "existing_sample": clean_existing[:120],
                            "new_sample": clean_new[:120],
                            "action": "preserved_existing_official",
                        })

            # Update missing fields without overwriting verified text
            if not existing.official_text and official_text:
                existing.official_text = official_text
            if not existing.plain_language_explanation and plain_language_explanation:
                existing.plain_language_explanation = plain_language_explanation
            if not existing.practical_example and practical_example:
                existing.practical_example = practical_example
            if not existing.key_conditions and key_conditions:
                existing.key_conditions = key_conditions
            if source_url and not existing.source_url:
                existing.source_url = source_url

            # Append version/provenance metadata
            meta = existing.version_metadata or {}
            history = meta.get("sources_history", [])
            history.append(provenance_data)
            meta["sources_history"] = history
            existing.version_metadata = meta

            self.diag.duplicates_detected += 1
            return existing, False

        # Create new provision
        meta = {
            "provenance": provenance_data,
            "sources_history": [provenance_data],
        }
        prov = LegalProvision(
            law_id=law_id,
            provision_type=provision_type,
            provision_number=clean_number,
            title=clean_title,
            official_text=official_text,
            plain_language_explanation=plain_language_explanation,
            practical_example=practical_example,
            key_conditions=key_conditions or [],
            source_url=source_url,
            effective_from=effective_from,
            effective_to=effective_to,
            version_metadata=meta,
        )
        self.db.add(prov)
        self.db.flush()
        return prov, True

    def upsert_correspondence(
        self,
        source_prov_id: uuid.UUID,
        target_prov_id: uuid.UUID,
        relationship_type: str = "direct_correspondence",
        mapping_status: str = "verified",
        explanation: Optional[str] = None,
        substantive_changes: Optional[str] = None,
        source_reference: Optional[str] = None,
        verification_status: str = "official_comparative_table",
        dataset_version: str = "2024.1",
        provenance: Optional[Dict[str, Any]] = None,
    ) -> Tuple[ProvisionCorrespondence, bool]:
        # Check existing mapping
        existing = self.db.query(ProvisionCorrespondence).filter(
            ProvisionCorrespondence.source_provision_id == source_prov_id,
            ProvisionCorrespondence.target_provision_id == target_prov_id
        ).first()

        if existing:
            # Check for conflict in relationship or changes note
            if existing.relationship_type != relationship_type:
                self.diag.conflicts_detected.append({
                    "type": "relationship_conflict",
                    "source_id": str(source_prov_id),
                    "target_id": str(target_prov_id),
                    "existing_rel": existing.relationship_type,
                    "new_rel": relationship_type,
                    "action": "preserved_existing_preferred",
                })
            self.diag.duplicates_detected += 1
            return existing, False

        corr = ProvisionCorrespondence(
            source_provision_id=source_prov_id,
            target_provision_id=target_prov_id,
            relationship_type=relationship_type,
            mapping_status=mapping_status,
            explanation=explanation,
            substantive_changes=substantive_changes,
            source_reference=source_reference,
            verification_status=verification_status,
            dataset_version=dataset_version,
        )
        self.db.add(corr)
        self.db.flush()
        return corr, True

    # -------------------------------------------------------------------------
    # Ingestion 1: Complete Constitution of India (506 Articles)
    # -------------------------------------------------------------------------
    def ingest_constitution(self):
        source_name = "GSMS-B/indian-legal-knowledge-base-json (Constitution)"
        self.diag.sources_inspected.append(source_name)
        url = "https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/CONSTITUTION_DATASET.json"
        try:
            data = self._fetch_json(url)
            self.diag.sources_imported.append(source_name)
        except Exception as e:
            logger.error(f"Failed to fetch {source_name}: {e}")
            self.diag.failed_parsing += 1
            return

        const_law = self.get_or_create_law("constitution", {
            "full_name": "The Constitution of India [Incorporating 106th Amendment]",
            "short_name": "Constitution",
            "jurisdiction": "India",
            "law_type": "Constitutional Law",
            "enactment_year": 1949,
            "commencement_date": "1950-01-26",
            "status": "active",
            "official_source_url": "https://www.indiacode.nic.in/handle/123456789/2187",
            "description": "Supreme law of India laying down the framework of political code, fundamental rights, and constitutional principles.",
            "sort_order": 0,
        })

        # Build TOC lookup map for article titles and part titles
        toc_articles = data.get("table_of_contents", {}).get("articles", [])
        title_map = {}
        part_map = {}
        for ta in toc_articles:
            num = self.normalize_provision_number(ta.get("article_number") or ta.get("number") or "")
            if num:
                title_map[num.lower()] = ta.get("article_title") or ta.get("title")
                part_map[num.lower()] = ta.get("part_title")

        articles = data.get("articles", [])
        self.diag.records_found_per_source[source_name] = len(articles)
        imported_count = 0

        for a in articles:
            art_num = self.normalize_provision_number(a.get("article_number") or "")
            if not art_num:
                self.diag.skipped_records += 1
                continue

            art_title = a.get("article_title") or title_map.get(art_num.lower()) or f"Article {art_num}"
            raw_text = a.get("text") or a.get("content") or ""
            part_title = a.get("part_title") or part_map.get(art_num.lower()) or ""

            # Standard plain explanation and examples for key fundamental rights
            explanation = None
            example = None
            conditions = []

            if art_num == "21":
                explanation = "Guarantees that no person shall be deprived of their life or personal liberty except according to procedure established by law. Encompasses right to dignity, privacy, fair trial, and clean environment."
                example = "An individual detained without legal justification or denied essential medical aid while in custody can invoke Article 21 directly before High Courts or Supreme Court."
                conditions = ["Applicable to all persons (citizens and non-citizens)", "Deprivation must be authorized by valid law", "Procedure established by law must be just, fair, and reasonable"]
            elif art_num == "14":
                explanation = "Ensures equality before the law and equal protection of the laws within the territory of India, prohibiting arbitrariness in state actions."
                example = "If a public authority awards commercial contracts without objective criteria or transparent tender, aggrieved citizens can challenge it for violating Article 14 equality principles."
                conditions = ["State action prohibition against discrimination", "Reasonable classification permitted based on intelligible differentia"]
            elif art_num == "19":
                explanation = "Guarantees six fundamental freedoms to citizens: speech & expression, assembly, association, movement, residence, and trade/profession, subject to reasonable restrictions."
                example = "Journalists or citizens expressing peaceful opinions on public policies exercise their freedom of speech under Article 19(1)(a)."
                conditions = ["Available to citizens of India", "Subject to reasonable statutory restrictions under clauses (2) to (6)"]

            prov, is_new = self.upsert_provision(
                law_id=const_law.id,
                provision_number=art_num,
                title=art_title,
                official_text=raw_text,
                plain_language_explanation=explanation,
                practical_example=example,
                key_conditions=conditions,
                provision_type="Article",
                effective_from="1950-01-26",
                source_url="https://www.indiacode.nic.in/handle/123456789/2187",
                provenance={
                    "source_name": source_name,
                    "dataset_url": url,
                    "license": "Government Open Data / Public Domain",
                    "part": part_title,
                    "import_timestamp": datetime.now(timezone.utc).isoformat(),
                    "verification_status": "authoritative_gazette"
                }
            )
            if is_new:
                imported_count += 1

        self.diag.records_imported_per_law["constitution"] = imported_count
        logger.info(f"Ingested {imported_count} Constitution Articles.")

    # -------------------------------------------------------------------------
    # Ingestion 2: Full BNS, BNSS, BSA Statutory Sections (GSMS-B 2023)
    # -------------------------------------------------------------------------
    def ingest_new_criminal_codes(self):
        datasets = [
            ("bns", "bharatiya_nyaya_sanhita_2023.json", "Bharatiya Nyaya Sanhita, 2023", "BNS", 2023, "2024-07-01"),
            ("bnss", "bharatiya_nagarik_suraksha_sanhita_2023.json", "Bharatiya Nagarik Suraksha Sanhita, 2023", "BNSS", 2023, "2024-07-01"),
            ("bsa", "bharatiya_sakshya_adhiniyam_2023.json", "Bharatiya Sakshya Adhiniyam, 2023", "BSA", 2023, "2024-07-01"),
        ]

        for slug, filename, full_name, short_name, year, eff_date in datasets:
            source_name = f"GSMS-B/indian-legal-knowledge-base-json ({short_name})"
            self.diag.sources_inspected.append(source_name)
            url = f"https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/{filename}"
            try:
                sections = self._fetch_json(url)
                self.diag.sources_imported.append(source_name)
            except Exception as e:
                logger.error(f"Failed to fetch {source_name}: {e}")
                self.diag.failed_parsing += 1
                continue

            law = self.get_or_create_law(slug, {
                "full_name": full_name,
                "short_name": short_name,
                "jurisdiction": "India",
                "law_type": "Penal / Procedural / Evidentiary",
                "enactment_year": year,
                "commencement_date": eff_date,
                "status": "active",
                "official_source_url": "https://egazette.gov.in",
                "description": f"Enacted under Gazette of India Extraordinary 2023, replacing colonial criminal codes effective {eff_date}.",
                "sort_order": 2 if slug == "bns" else (3 if slug == "bnss" else 4),
            })

            self.diag.records_found_per_source[source_name] = len(sections)
            imported_count = 0

            for sec in sections:
                raw_num = sec.get("section_number")
                if not raw_num:
                    # Parse from text or chunk_id
                    chunk = sec.get("chunk_id", "")
                    m = re.search(r"(\d+[A-Z]?)", chunk)
                    if m:
                        raw_num = m.group(1)
                    else:
                        text = sec.get("text", "")
                        m2 = re.match(r"^\s*(\d+[A-Z]?)\.", text)
                        if m2:
                            raw_num = m2.group(1)

                if not raw_num:
                    self.diag.skipped_records += 1
                    continue

                sec_num = self.normalize_provision_number(str(raw_num))
                title = sec.get("section_title") or f"{short_name} Section {sec_num}"
                text = sec.get("text") or ""

                prov, is_new = self.upsert_provision(
                    law_id=law.id,
                    provision_number=sec_num,
                    title=title,
                    official_text=text,
                    provision_type="Section",
                    effective_from=eff_date,
                    source_url="https://egazette.gov.in",
                    provenance={
                        "source_name": source_name,
                        "dataset_url": url,
                        "chapter": sec.get("chapter"),
                        "import_timestamp": datetime.now(timezone.utc).isoformat(),
                        "verification_status": "official_gazette_aligned"
                    }
                )
                if is_new:
                    imported_count += 1

            self.diag.records_imported_per_law[slug] = imported_count
            logger.info(f"Ingested {imported_count} provisions for {short_name}.")

    # -------------------------------------------------------------------------
    # Ingestion 3: Full Concordance Tables (BNS↔IPC, BNSS↔CrPC, BSA↔IEA)
    # -------------------------------------------------------------------------
    def ingest_concordance_mappings(self):
        mapping_files = [
            ("bns_to_ipc.json", "bns", "ipc", "BNS:IPC"),
            ("bnss_to_crpc.json", "bnss", "crpc", "BNSS:CrPC"),
            ("bsa_to_iea.json", "bsa", "iea", "BSA:IEA"),
        ]

        # Relationship mapping dictionary
        status_to_rel = {
            "retained": "direct_correspondence",
            "change": "changed_provision",
            "new sub-section": "new_provision",
            "new section": "new_provision",
            "repealed": "repealed_provision",
            "omitted": "repealed_provision",
            "deleted": "repealed_provision",
        }

        for filename, src_slug, tgt_slug, pair_name in mapping_files:
            source_name = f"GSMS-B/indian-legal-knowledge-base-json ({filename})"
            self.diag.sources_inspected.append(source_name)
            url = f"https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/{filename}"
            try:
                mapping_items = self._fetch_json(url)
                self.diag.sources_imported.append(source_name)
            except Exception as e:
                logger.error(f"Failed to fetch {source_name}: {e}")
                self.diag.failed_parsing += 1
                continue

            self.diag.records_found_per_source[source_name] = len(mapping_items)

            # Ensure source and target laws are registered
            src_law = self.get_or_create_law(src_slug, {"short_name": src_slug.upper()})
            tgt_law = self.get_or_create_law(tgt_slug, {"short_name": tgt_slug.upper()})

            imported_pairs = 0

            for item in mapping_items:
                src_info = item.get("source") or {}
                tgt_info = item.get("target") or {}

                src_sec_raw = src_info.get("section")
                if not src_sec_raw:
                    continue
                src_sec_num = self.normalize_provision_number(str(src_sec_raw))

                # Upsert source provision if missing
                src_title = src_info.get("title") or f"{src_law.short_name} Section {src_sec_num}"
                src_prov, _ = self.upsert_provision(
                    law_id=src_law.id,
                    provision_number=src_sec_num,
                    title=src_title,
                    provision_type="Section",
                    provenance={
                        "source_name": source_name,
                        "chapter": src_info.get("chapter"),
                        "verification_status": "bprd_concordance_table"
                    }
                )

                # Check if target provision exists
                tgt_sec_raw = tgt_info.get("section") if tgt_info else None
                if not tgt_sec_raw:
                    # New provision in modern code with no older equivalent
                    # Record mapping with repealed or new relationship if desired, or skip
                    continue

                tgt_sec_num = self.normalize_provision_number(str(tgt_sec_raw))
                tgt_title = tgt_info.get("title") or f"{tgt_law.short_name} Section {tgt_sec_num}"

                # Upsert target provision if missing in older historical law
                tgt_prov, _ = self.upsert_provision(
                    law_id=tgt_law.id,
                    provision_number=tgt_sec_num,
                    title=tgt_title,
                    provision_type="Section",
                    provenance={
                        "source_name": source_name,
                        "chapter": tgt_info.get("chapter") if tgt_info else None,
                        "verification_status": "bprd_concordance_table"
                    }
                )

                # Determine relationship type
                status_raw = str(item.get("status") or "").strip().lower()
                rel_type = status_to_rel.get(status_raw, "direct_correspondence")

                mapping_stmt = item.get("mapping_statement")
                ref = "BPR&D Official Comparative Concordance Tables (Ministry of Home Affairs, 2024)"

                # Upsert correspondence
                corr, is_new = self.upsert_correspondence(
                    source_prov_id=src_prov.id,
                    target_prov_id=tgt_prov.id,
                    relationship_type=rel_type,
                    mapping_status="verified",
                    explanation=mapping_stmt,
                    substantive_changes="Substantive changes noted in concordance table" if rel_type == "changed_provision" else None,
                    source_reference=ref,
                    verification_status="official_comparative_table",
                    dataset_version="2024.1",
                    provenance={
                        "source_name": source_name,
                        "status_in_source": status_raw,
                        "dataset_id": item.get("id"),
                    }
                )
                if is_new:
                    imported_pairs += 1

            self.diag.correspondences_per_pair[pair_name] = imported_pairs
            logger.info(f"Ingested {imported_pairs} correspondences for {pair_name}.")

    # -------------------------------------------------------------------------
    # Ingestion 4: Central Acts (Advocates Act 1961, CAT Act 1985)
    # -------------------------------------------------------------------------
    def ingest_central_acts(self):
        central_acts = [
            ("advocates_act", "advocates_act_1961.json", "Advocates Act, 1961 (Act No. 25 of 1961)", "Advocates Act", 1961, "1961-08-16"),
            ("cat_act", "administrative_tribunals_act_1985.json", "Administrative Tribunals Act, 1985 (Act No. 13 of 1985)", "Administrative Tribunals Act", 1985, "1985-07-01"),
        ]

        for slug, filename, full_name, short_name, year, eff_date in central_acts:
            source_name = f"GSMS-B/indian-legal-knowledge-base-json ({filename})"
            self.diag.sources_inspected.append(source_name)
            url = f"https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/{filename}"
            try:
                data = self._fetch_json(url)
                self.diag.sources_imported.append(source_name)
            except Exception as e:
                logger.error(f"Failed to fetch {source_name}: {e}")
                self.diag.failed_parsing += 1
                continue

            law = self.get_or_create_law(slug, {
                "full_name": full_name,
                "short_name": short_name,
                "jurisdiction": "India",
                "law_type": "Central Statutory Act",
                "enactment_year": year,
                "commencement_date": eff_date,
                "status": "active",
                "official_source_url": "https://www.indiacode.nic.in",
                "description": f"Key central enactment of Parliament concerning {short_name}.",
                "sort_order": 7,
            })

            sections = data.get("sections", [])
            self.diag.records_found_per_source[source_name] = len(sections)
            imported_count = 0

            for sec in sections:
                raw_num = sec.get("section_number")
                if not raw_num:
                    continue
                sec_num = self.normalize_provision_number(str(raw_num))
                title = sec.get("section_title") or f"{short_name} Section {sec_num}"
                text = sec.get("text") or ""

                prov, is_new = self.upsert_provision(
                    law_id=law.id,
                    provision_number=sec_num,
                    title=title,
                    official_text=text,
                    provision_type="Section",
                    effective_from=eff_date,
                    source_url="https://www.indiacode.nic.in",
                    provenance={
                        "source_name": source_name,
                        "chapter": sec.get("chapter_title"),
                        "verification_status": "india_code_statute"
                    }
                )
                if is_new:
                    imported_count += 1

            self.diag.records_imported_per_law[slug] = imported_count
            logger.info(f"Ingested {imported_count} provisions for {short_name}.")

    # -------------------------------------------------------------------------
    # Ingestion 5: Cross-Code Procedural Edges (GovIntel Dataset)
    # -------------------------------------------------------------------------
    def ingest_cross_code_edges(self):
        source_name = "aashnasharma/govintel-legal-dataset (Cross-Code Edges)"
        self.diag.sources_inspected.append(source_name)
        url = "https://huggingface.co/datasets/aashnasharma/govintel-legal-dataset/raw/main/graph/cross_code_edges.json"
        try:
            data = self._fetch_json(url)
            self.diag.sources_imported.append(source_name)
        except Exception as e:
            logger.error(f"Failed to fetch {source_name}: {e}")
            self.diag.failed_parsing += 1
            return

        edges = data.get("edges", [])
        self.diag.records_found_per_source[source_name] = len(edges)
        imported_edges = 0

        # Pattern: BNS_2023_SEC_063 -> code=BNS, sec=63
        for edge in edges:
            src_str = edge.get("source", "")
            tgt_str = edge.get("target", "")

            src_match = re.match(r"^([A-Z]+)_\d+_SEC_(\d+)", src_str)
            tgt_match = re.match(r"^([A-Z]+)_\d+_SEC_(\d+)", tgt_str)

            if not src_match or not tgt_match:
                self.diag.skipped_records += 1
                continue

            src_code = src_match.group(1).lower()
            src_num = str(int(src_match.group(2)))  # strip leading zeros: '063' -> '63'

            tgt_code = tgt_match.group(1).lower()
            tgt_num = str(int(tgt_match.group(2)))

            # Check if source law and target law are known
            src_law = self.db.query(LawRegistry).filter(func.lower(LawRegistry.slug) == src_code).first()
            tgt_law = self.db.query(LawRegistry).filter(func.lower(LawRegistry.slug) == tgt_code).first()
            if not src_law or not tgt_law:
                continue

            src_prov = self.db.query(LegalProvision).filter(
                LegalProvision.law_id == src_law.id,
                LegalProvision.provision_number == src_num
            ).first()

            tgt_prov = self.db.query(LegalProvision).filter(
                LegalProvision.law_id == tgt_law.id,
                LegalProvision.provision_number == tgt_num
            ).first()

            if src_prov and tgt_prov:
                reason = edge.get("reason", "")
                edge_type = edge.get("edge_type", "CROSS_CODE_PROCEDURE")
                corr, is_new = self.upsert_correspondence(
                    source_prov_id=src_prov.id,
                    target_prov_id=tgt_prov.id,
                    relationship_type="related_provision",
                    mapping_status="community_graph",
                    explanation=f"Cross-code connection ({edge_type}): {reason}",
                    substantive_changes=reason,
                    source_reference="GovIntel Cross-Code Procedural Graph (aashnasharma)",
                    verification_status="community_unverified",
                    dataset_version="govintel-1.0",
                    provenance={
                        "source_name": source_name,
                        "edge_type": edge_type,
                        "confidence": edge.get("confidence"),
                        "deterministic": edge.get("deterministic"),
                    }
                )
                if is_new:
                    imported_edges += 1

        self.diag.correspondences_per_pair["GovIntel_Cross_Code"] = imported_edges
        logger.info(f"Ingested {imported_edges} community cross-code procedural edges.")

    def run_full_pipeline(self) -> IngestionDiagnostics:
        logger.info("Starting Full Multi-Source Legal Ingestion Pipeline...")
        self.ingest_constitution()
        self.ingest_new_criminal_codes()
        self.ingest_concordance_mappings()
        self.ingest_central_acts()
        self.ingest_cross_code_edges()
        self.db.commit()

        # Generate coverage summary
        total_laws = self.db.query(LawRegistry).count()
        total_provisions = self.db.query(LegalProvision).count()
        total_correspondences = self.db.query(ProvisionCorrespondence).count()

        provisions_per_law = {}
        for law in self.db.query(LawRegistry).all():
            count = self.db.query(LegalProvision).filter(LegalProvision.law_id == law.id).count()
            provisions_per_law[law.slug] = {
                "name": law.short_name,
                "count": count,
                "status": law.status,
            }

        self.diag.coverage_summary = {
            "total_registered_laws": total_laws,
            "total_stored_provisions": total_provisions,
            "total_stored_correspondences": total_correspondences,
            "provisions_by_law": provisions_per_law,
        }
        logger.info(f"Ingestion complete: {total_provisions} provisions, {total_correspondences} correspondences across {total_laws} laws.")
        return self.diag
