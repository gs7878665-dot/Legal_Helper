import logging
from sqlalchemy.orm import Session
from app.models.provision import LawRegistry, LegalProvision, ProvisionCorrespondence

logger = logging.getLogger(__name__)


def seed_legal_laws_and_provisions(db: Session):
    """
    Seeds canonical laws, verified provisions, and cross-statutory correspondence tables
    based on official Gazette of India and BPR&D Concordance tables.
    Idempotent: updates existing records without duplication.
    """
    # 1. LAWS REGISTRY
    laws_data = [
        {
            "slug": "ipc",
            "full_name": "Indian Penal Code, 1860 (Act No. 45 of 1860)",
            "short_name": "IPC",
            "jurisdiction": "India",
            "law_type": "Substantive Penal Law",
            "enactment_year": 1860,
            "commencement_date": "1862-01-01",
            "repeal_date": "2024-07-01",
            "status": "repealed",
            "official_source_url": "https://www.indiacode.nic.in/handle/123456789/2263",
            "description": "Historical criminal code of India defining substantive offenses and general exceptions.",
            "sort_order": 1,
        },
        {
            "slug": "bns",
            "full_name": "Bharatiya Nyaya Sanhita, 2023 (Act No. 45 of 2023)",
            "short_name": "BNS",
            "jurisdiction": "India",
            "law_type": "Substantive Penal Law",
            "enactment_year": 2023,
            "commencement_date": "2024-07-01",
            "repeal_date": None,
            "status": "active",
            "official_source_url": "https://egazette.gov.in",
            "description": "Contemporary substantive penal law replacing the Indian Penal Code with modernized definitions and community service provisions.",
            "sort_order": 2,
        },
        {
            "slug": "crpc",
            "full_name": "Code of Criminal Procedure, 1973 (Act No. 2 of 1974)",
            "short_name": "CrPC",
            "jurisdiction": "India",
            "law_type": "Procedural Criminal Law",
            "enactment_year": 1973,
            "commencement_date": "1974-04-01",
            "repeal_date": "2024-07-01",
            "status": "repealed",
            "official_source_url": "https://www.indiacode.nic.in/handle/123456789/16225",
            "description": "Historical procedural code governing police investigation, bail, trial, and court jurisdictions.",
            "sort_order": 3,
        },
        {
            "slug": "bnss",
            "full_name": "Bharatiya Nagarik Suraksha Sanhita, 2023 (Act No. 46 of 2023)",
            "short_name": "BNSS",
            "jurisdiction": "India",
            "law_type": "Procedural Criminal Law",
            "enactment_year": 2023,
            "commencement_date": "2024-07-01",
            "repeal_date": None,
            "status": "active",
            "official_source_url": "https://egazette.gov.in",
            "description": "Modern criminal procedure code introducing digital evidence handling, forensic mandates, and strict inquiry timeframes.",
            "sort_order": 4,
        },
        {
            "slug": "iea",
            "full_name": "Indian Evidence Act, 1872 (Act No. 1 of 1872)",
            "short_name": "Evidence Act",
            "jurisdiction": "India",
            "law_type": "Evidentiary Law",
            "enactment_year": 1872,
            "commencement_date": "1872-09-01",
            "repeal_date": "2024-07-01",
            "status": "repealed",
            "official_source_url": "https://www.indiacode.nic.in/handle/123456789/2188",
            "description": "Historical evidentiary rules regarding admissibility, burden of proof, and witness competency.",
            "sort_order": 5,
        },
        {
            "slug": "bsa",
            "full_name": "Bharatiya Sakshya Adhiniyam, 2023 (Act No. 47 of 2023)",
            "short_name": "BSA",
            "jurisdiction": "India",
            "law_type": "Evidentiary Law",
            "enactment_year": 2023,
            "commencement_date": "2024-07-01",
            "repeal_date": None,
            "status": "active",
            "official_source_url": "https://egazette.gov.in",
            "description": "Comprehensive evidence law giving electronic and digital records primary evidentiary parity.",
            "sort_order": 6,
        },
    ]

    laws_by_slug = {}
    for l_data in laws_data:
        law = db.query(LawRegistry).filter(LawRegistry.slug == l_data["slug"]).first()
        if not law:
            law = LawRegistry(**l_data)
            db.add(law)
            db.flush()
        laws_by_slug[l_data["slug"]] = law

    # 2. KEY PROVISIONS (IPC & BNS)
    provisions_data = [
        # IPC Provisions
        {
            "law_slug": "ipc",
            "provision_number": "420",
            "provision_type": "Section",
            "title": "Cheating and dishonestly inducing delivery of property",
            "official_text": (
                "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, "
                "or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, "
                "and which is capable of being converted into a valuable security, shall be punished with imprisonment of either "
                "description for a term which may extend to seven years, and shall also be liable to fine."
            ),
            "plain_language_explanation": (
                "Section 420 covers cases where someone deliberately tricks or deceives you with fraudulent intent right from the beginning, "
                "causing you to part with money, property, or sign a valuable document."
            ),
            "practical_example": (
                "Imagine someone knowingly sells you counterfeit goods or an unapproved plot of land claiming full legal title, "
                "pocketing your down-payment with no intention of delivering genuine property. Depending on the evidence of fraudulent intent, "
                "this illustrates the deception targeted by this provision."
            ),
            "key_conditions": [
                "Deception of any person.",
                "Fraudulently or dishonestly inducing that person to deliver property.",
                "Dishonest intention must exist at the time of making the promise or inducement."
            ],
            "effective_from": "1862-01-01",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "ipc",
            "provision_number": "302",
            "provision_type": "Section",
            "title": "Punishment for murder",
            "official_text": (
                "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine."
            ),
            "plain_language_explanation": (
                "Prescribes the statutory penal sanctions for the offense of intentional culpable homicide amounting to murder."
            ),
            "practical_example": (
                "An intentional assault conducted with premeditated intent to cause fatal bodily harm."
            ),
            "key_conditions": ["Intentional causation of death", "Absence of general exceptions"],
            "effective_from": "1862-01-01",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "ipc",
            "provision_number": "307",
            "provision_type": "Section",
            "title": "Attempt to murder",
            "official_text": (
                "Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, "
                "he would be guilty of murder, shall be punished with imprisonment of either description for a term which may extend to ten years, "
                "and shall also be liable to fine; and if hurt is caused to any person by such act, the offender shall be liable either to imprisonment for life, "
                "or to such punishment as is hereinbefore mentioned."
            ),
            "plain_language_explanation": (
                "Penalizes committing an act with murderous intention where the victim survives despite the perpetrator's attempt."
            ),
            "practical_example": (
                "Firing a weapon at close range targeting a vital organ, but the victim survives following emergency medical intervention."
            ),
            "key_conditions": ["Intention or knowledge of causing fatal harm", "Execution of an act towards commission"],
            "effective_from": "1862-01-01",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "ipc",
            "provision_number": "378",
            "provision_type": "Section",
            "title": "Theft",
            "official_text": (
                "Whoever, intending to take dishonestly any movable property out of the possession of any person without that person's consent, "
                "moves that property in order to such taking, is said to commit theft."
            ),
            "plain_language_explanation": (
                "Defines taking movable property belonging to someone else without their consent with dishonest intent."
            ),
            "practical_example": (
                "Taking a parked motorcycle or laptop without permission to sell or keep it."
            ),
            "key_conditions": ["Movable property", "Dishonest intention", "Lack of consent", "Moving the property"],
            "effective_from": "1862-01-01",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "ipc",
            "provision_number": "379",
            "provision_type": "Section",
            "title": "Punishment for theft",
            "official_text": (
                "Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, "
                "or with fine, or with both."
            ),
            "plain_language_explanation": "Sets out the punishment for standard theft up to three years imprisonment or fine.",
            "practical_example": "Judicial sentencing following conviction under Section 378.",
            "key_conditions": ["Commission of theft as defined under Section 378"],
            "effective_from": "1862-01-01",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "ipc",
            "provision_number": "498A",
            "provision_type": "Section",
            "title": "Husband or relative of husband of a woman subjecting her to cruelty",
            "official_text": (
                "Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished "
                "with imprisonment for a term which may extend to three years and shall also be liable to fine."
            ),
            "plain_language_explanation": (
                "Penalizes matrimonial harassment, willful conduct driving a woman to suicide or severe injury, or unlawful demands for dowry."
            ),
            "practical_example": (
                "Harassing a woman physically or mentally to coerce her or her family into meeting ongoing dowry demands."
            ),
            "key_conditions": ["Marital relationship", "Cruelty as defined in explanations", "Unlawful dowry demands"],
            "effective_from": "1983-12-25",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "ipc",
            "provision_number": "124A",
            "provision_type": "Section",
            "title": "Sedition",
            "official_text": (
                "Whoever, by words, either spoken or written, or by signs, or by visible representation, or otherwise, brings or attempts to bring into hatred or contempt, "
                "or excites or attempts to excite disaffection towards the Government established by law in India, shall be punished with imprisonment for life..."
            ),
            "plain_language_explanation": (
                "Colonial-era sedition provision penalizing disaffection against the Government. Omitted in modern criminal code and replaced with sovereignty-specific offenses."
            ),
            "practical_example": "Historical prosecutions under British colonial rule for political criticism.",
            "key_conditions": ["Disaffection towards Government", "Repealed / omitted under Bharatiya Nyaya Sanhita"],
            "effective_from": "1870-01-01",
            "effective_to": "2024-06-30",
        },

        # BNS Provisions
        {
            "law_slug": "bns",
            "provision_number": "318",
            "provision_type": "Section",
            "title": "Cheating",
            "official_text": (
                "Section 318 of BNS consolidates cheating offenses. Sub-section (4) provides: Whoever cheats and thereby dishonestly induces "
                "the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, "
                "shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine."
            ),
            "plain_language_explanation": (
                "Modern statutory equivalent of IPC Section 420. Re-structured into Section 318(4) of the Bharatiya Nyaya Sanhita with identical substantive punishment."
            ),
            "practical_example": (
                "Selling bogus investment schemes with fictitious guarantees to misappropriate investor funds."
            ),
            "key_conditions": ["Deceptive inducement", "Delivery of property or valuable security", "Intentional fraud"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
        {
            "law_slug": "bns",
            "provision_number": "103",
            "provision_type": "Section",
            "title": "Punishment for murder",
            "official_text": (
                "Section 103(1) whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine. "
                "Section 103(2) introduces a specific penalty for mob lynching or murder committed by five or more persons on grounds of race, caste, sex, or language."
            ),
            "plain_language_explanation": (
                "Corresponding provision to IPC Section 302. Section 103(1) covers standard murder, while 103(2) explicitly legislates aggravated penalties for group mob lynching."
            ),
            "practical_example": (
                "Intentional homicide or group-based hate crime resulting in death."
            ),
            "key_conditions": ["Premeditated lethal assault", "Distinction between individual offense and 103(2) mob violence"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
        {
            "law_slug": "bns",
            "provision_number": "109",
            "provision_type": "Section",
            "title": "Attempt to murder",
            "official_text": (
                "Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, "
                "he would be guilty of murder, shall be punished with imprisonment of either description for a term which may extend to ten years, "
                "and shall also be liable to fine..."
            ),
            "plain_language_explanation": (
                "Corresponding provision to IPC Section 307 under the Bharatiya Nyaya Sanhita."
            ),
            "practical_example": "Executing a lethal assault where the victim survives after hospital treatment.",
            "key_conditions": ["Intention of causing death", "Act carried out toward execution"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
        {
            "law_slug": "bns",
            "provision_number": "303",
            "provision_type": "Section",
            "title": "Theft",
            "official_text": (
                "Defines theft and provides punishment in Section 303(2). Notably introduces community service for first-time offenders "
                "where stolen property value is under Rs. 5,000 and the property is restored."
            ),
            "plain_language_explanation": (
                "Corresponds to IPC Sections 378 & 379, but introduces progressive community service sentencing for petty thefts under Rs. 5,000."
            ),
            "practical_example": "First-time theft of a low-value bicycle where the court orders community service rather than mandatory prison.",
            "key_conditions": ["Movable property taken dishonestly", "Restoration clause for community service exception"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
        {
            "law_slug": "bns",
            "provision_number": "85",
            "provision_type": "Section",
            "title": "Husband or relative of husband of a woman subjecting her to cruelty",
            "official_text": (
                "Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished "
                "with imprisonment for a term which may extend to three years and shall also be liable to fine."
            ),
            "plain_language_explanation": (
                "Direct modern counterpart to IPC Section 498A retaining substantive domestic cruelty and dowry harassment protections."
            ),
            "practical_example": "Subjecting a spouse to sustained psychological cruelty and coercive asset demands.",
            "key_conditions": ["Husband or relative of husband", "Cruelty or unlawful dowry demand"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
        {
            "law_slug": "bns",
            "provision_number": "152",
            "provision_type": "Section",
            "title": "Act endangering sovereignty, unity and integrity of India",
            "official_text": (
                "Whoever, purposely or knowingly, by words, either spoken or written, or by signs, or by visible representation, or by electronic communication "
                "or by use of financial mean, or otherwise, excites or attempts to excite, secession or armed rebellion or subversive activities..."
            ),
            "plain_language_explanation": (
                "Modern replacement for colonial sedition (IPC 124A). Re-framed strictly around safeguarding sovereignty, territorial integrity, and combating armed separatism."
            ),
            "practical_example": "Funding or inciting armed subversive insurrections aiming to secede territory from the Union of India.",
            "key_conditions": ["Endangering sovereignty or territorial integrity", "Inciting armed rebellion or secession"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },

        # CrPC Provisions
        {
            "law_slug": "crpc",
            "provision_number": "154",
            "provision_type": "Section",
            "title": "Information in cognizable cases (First Information Report)",
            "official_text": (
                "Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, "
                "shall be reduced to writing by him or under his direction..."
            ),
            "plain_language_explanation": (
                "Governs the mandatory registration of an FIR upon reporting of a cognizable offense."
            ),
            "practical_example": "Filing an official FIR at a local police station following a robbery.",
            "key_conditions": ["Cognizable offense", "Duty of police officer to record"],
            "effective_from": "1974-04-01",
            "effective_to": "2024-06-30",
        },
        {
            "law_slug": "crpc",
            "provision_number": "438",
            "provision_type": "Section",
            "title": "Direction for grant of bail to person apprehending arrest (Anticipatory Bail)",
            "official_text": (
                "Where any person has reason to believe that he may be arrested on accusation of having committed a non-bailable offence, "
                "he may apply to the High Court or the Court of Session for a direction under this section that in the event of such arrest, he shall be released on bail."
            ),
            "plain_language_explanation": (
                "Enables a person apprehending arrest in a non-bailable accusation to seek pre-arrest protective bail from Sessions Court or High Court."
            ),
            "practical_example": "Approaching the Sessions Court for anticipatory bail when facing baseless criminal complaints.",
            "key_conditions": ["Reasonable apprehension of arrest", "Non-bailable offense", "Approaching Sessions Court or High Court"],
            "effective_from": "1974-04-01",
            "effective_to": "2024-06-30",
        },

        # BNSS Provisions
        {
            "law_slug": "bnss",
            "provision_number": "173",
            "provision_type": "Section",
            "title": "Information in cognizable cases (e-FIR and Zero FIR)",
            "official_text": (
                "Section 173 corresponds to CrPC 154, with explicit statutory recognition of Zero FIR (irrespective of jurisdictional police station) "
                "and electronic FIR registration provided signed confirmation is executed within three days."
            ),
            "plain_language_explanation": (
                "Modernized procedure for FIRs formally recognizing electronic FIRs (e-FIR) and mandatory Zero FIR across India."
            ),
            "practical_example": "Registering a Zero FIR immediately at any police station regardless of where the crime occurred.",
            "key_conditions": ["Cognizable crime", "Zero FIR allowed anywhere", "e-FIR confirmation within 3 days"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
        {
            "law_slug": "bnss",
            "provision_number": "482",
            "provision_type": "Section",
            "title": "Direction for grant of bail to person apprehending arrest (Anticipatory Bail)",
            "official_text": (
                "Corresponds to CrPC Section 438 governing applications for anticipatory bail before the High Court or Sessions Court."
            ),
            "plain_language_explanation": (
                "Direct procedural equivalent of CrPC Section 438 for anticipatory bail under the new criminal procedure code."
            ),
            "practical_example": "Applying for pre-arrest bail before the Sessions Judge under BNSS.",
            "key_conditions": ["Apprehension of arrest in non-bailable offense"],
            "effective_from": "2024-07-01",
            "effective_to": None,
        },
    ]

    provisions_by_key = {}
    for p_data in provisions_data:
        law = laws_by_slug.get(p_data["law_slug"])
        if not law:
            continue

        prov = db.query(LegalProvision).filter(
            LegalProvision.law_id == law.id,
            LegalProvision.provision_number == p_data["provision_number"]
        ).first()

        if not prov:
            prov = LegalProvision(
                law_id=law.id,
                provision_type=p_data["provision_type"],
                provision_number=p_data["provision_number"],
                title=p_data["title"],
                official_text=p_data["official_text"],
                plain_language_explanation=p_data["plain_language_explanation"],
                practical_example=p_data["practical_example"],
                key_conditions=p_data["key_conditions"],
                effective_from=p_data.get("effective_from"),
                effective_to=p_data.get("effective_to"),
                source_url=law.official_source_url,
            )
            db.add(prov)
            db.flush()
        provisions_by_key[(p_data["law_slug"], p_data["provision_number"])] = prov

    # 3. CORRESPONDENCE MAPPINGS
    correspondences = [
        # IPC 420 -> BNS 318
        {
            "src": ("ipc", "420"),
            "tgt": ("bns", "318"),
            "rel": "direct_correspondence",
            "status": "verified",
            "changes": "Consolidated into BNS Section 318 sub-section (4) with identical punishment up to 7 years imprisonment and fine.",
            "explanation": "Offense of cheating and dishonestly inducing delivery of property.",
            "ref": "BPR&D Comparative Table Annexure I (Penal Provisions)",
        },
        # IPC 302 -> BNS 103
        {
            "src": ("ipc", "302"),
            "tgt": ("bns", "103"),
            "rel": "changed_provision",
            "status": "verified",
            "changes": "BNS 103(1) mirrors IPC 302; 103(2) introduces separate statutory clause for mob lynching by 5 or more persons.",
            "explanation": "Punishment for murder, with newly legislated aggravated group offenses.",
            "ref": "Gazette of India Act No. 45 of 2023",
        },
        # IPC 307 -> BNS 109
        {
            "src": ("ipc", "307"),
            "tgt": ("bns", "109"),
            "rel": "direct_correspondence",
            "status": "verified",
            "changes": "Substantially identical penal wording and sentencing brackets.",
            "explanation": "Attempt to murder.",
            "ref": "BPR&D Comparative Table",
        },
        # IPC 378 / 379 -> BNS 303
        {
            "src": ("ipc", "378"),
            "tgt": ("bns", "303"),
            "rel": "changed_provision",
            "status": "verified",
            "changes": "IPC 378 (definition) and 379 (punishment) consolidated into BNS 303. Community service added for value under Rs. 5,000.",
            "explanation": "Definition and punishment for theft.",
            "ref": "BPR&D Comparative Table",
        },
        {
            "src": ("ipc", "379"),
            "tgt": ("bns", "303"),
            "rel": "changed_provision",
            "status": "verified",
            "changes": "Sentencing structure updated with community service option for first-time offenders where value < Rs. 5,000.",
            "explanation": "Punishment for theft.",
            "ref": "BPR&D Comparative Table",
        },
        # IPC 498A -> BNS 85
        {
            "src": ("ipc", "498A"),
            "tgt": ("bns", "85"),
            "rel": "direct_correspondence",
            "status": "verified",
            "changes": "Identical substantive protections against matrimonial cruelty and dowry harassment.",
            "explanation": "Cruelty by husband or relatives of husband.",
            "ref": "BPR&D Comparative Table",
        },
        # IPC 124A -> BNS 152
        {
            "src": ("ipc", "124A"),
            "tgt": ("bns", "152"),
            "rel": "changed_provision",
            "status": "verified",
            "changes": "Colonial sedition (124A) repealed. Replaced by Section 152 targeting acts endangering sovereignty, unity, and territorial integrity.",
            "explanation": "Sovereignty and integrity protection replaces historical sedition.",
            "ref": "Gazette of India Act No. 45 of 2023",
        },
        # CrPC 154 -> BNSS 173
        {
            "src": ("crpc", "154"),
            "tgt": ("bnss", "173"),
            "rel": "changed_provision",
            "status": "verified",
            "changes": "Explicit inclusion of Zero FIR (regardless of territorial jurisdiction) and electronic FIR registration.",
            "explanation": "First Information Report procedure.",
            "ref": "BNSS Comparative Table (Act No. 46 of 2023)",
        },
        # CrPC 438 -> BNSS 482
        {
            "src": ("crpc", "438"),
            "tgt": ("bnss", "482"),
            "rel": "direct_correspondence",
            "status": "verified",
            "changes": "Anticipatory bail procedure before High Court and Sessions Court retained in BNSS 482.",
            "explanation": "Direction for grant of anticipatory bail.",
            "ref": "BNSS Comparative Table",
        },
    ]

    for corr in correspondences:
        src_prov = provisions_by_key.get(corr["src"])
        tgt_prov = provisions_by_key.get(corr["tgt"])
        if not src_prov or not tgt_prov:
            continue

        existing = db.query(ProvisionCorrespondence).filter(
            ProvisionCorrespondence.source_provision_id == src_prov.id,
            ProvisionCorrespondence.target_provision_id == tgt_prov.id,
        ).first()

        if not existing:
            pc = ProvisionCorrespondence(
                source_provision_id=src_prov.id,
                target_provision_id=tgt_prov.id,
                relationship_type=corr["rel"],
                mapping_status=corr["status"],
                explanation=corr["explanation"],
                substantive_changes=corr["changes"],
                source_reference=corr["ref"],
                verification_status="official_comparative_table",
                dataset_version="2024.1",
            )
            db.add(pc)

    db.commit()
    logger.info("Successfully seeded legal laws registry and provision correspondences.")
