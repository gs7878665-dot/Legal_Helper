"""
Verified Legal Aid Clinics, State Legal Services Authorities (SLSA),
and District Legal Services Authorities (DLSA) seed data for India.
"""
from typing import List, Dict, Any

SEED_LEGAL_AID_ORGS: List[Dict[str, Any]] = [
    {
        "name": "Delhi State Legal Services Authority (DSLSA)",
        "category": "Legal Services Authority",
        "state": "Delhi",
        "district": "Central Delhi",
        "city": "New Delhi",
        "address": "Central Office, Pre-Fab Building, Patiala House Courts Complex, New Delhi - 110001",
        "phone": "011-23384781 / Toll-Free: 1516",
        "email": "dslsa-phc@nic.in",
        "website": "https://dslsa.org",
        "eligibility_info": "Free legal services are provided under Section 12 of the Legal Services Authorities Act, 1987 to women, children, members of SC/ST, victims of trafficking, disabled persons, and citizens whose annual income does not exceed statutory limits (Rs. 3,00,000/- in Delhi).",
        "services_offered": [
            "Free Legal Aid Counsel",
            "Pre-Litigation Mediation",
            "Lok Adalat Settlement",
            "Legal Literacy & Victim Compensation"
        ],
        "source_name": "National Legal Services Authority (NALSA) & DSLSA Official Portal",
        "source_url": "https://nalsa.gov.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "Maharashtra State Legal Services Authority (MSLSA)",
        "category": "Legal Services Authority",
        "state": "Maharashtra",
        "district": "Mumbai City",
        "city": "Mumbai",
        "address": "105, High Court PWD Building, Fort, Mumbai - 400032",
        "phone": "022-22691358 / 15100",
        "email": "mslsa-bhc@nic.in",
        "website": "https://legalservices.maharashtra.gov.in",
        "eligibility_info": "Persons eligible under Section 12 of the LSA Act, 1987 including women, children, industrial workmen, custody persons, and persons with annual income under Rs. 3,00,000/-.",
        "services_offered": [
            "Free Legal Counsel for Civil & Criminal Matters",
            "Permanent Lok Adalat",
            "Prison Legal Aid Clinics",
            "Mediation Centre Services"
        ],
        "source_name": "MSLSA Official Directory & NALSA",
        "source_url": "https://nalsa.gov.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "Karnataka State Legal Services Authority (KSLSA)",
        "category": "Legal Services Authority",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "city": "Bengaluru",
        "address": "Nyaya Degula, 1st Floor, H. Siddaiah Road, Bengaluru - 560027",
        "phone": "080-22111725 / Helpline: 1800-425-90900",
        "email": "karnatakaslsa@gmail.com",
        "website": "https://kslsa.kar.nic.in",
        "eligibility_info": "Free legal aid to women, children, SC/ST community members, custody undertrials, and individuals with annual income below Rs. 3,00,000/-.",
        "services_offered": [
            "Panel Advocates for Court Proceedings",
            "Legal Aid Front Offices",
            "Dispute Resolution via Lok Adalat",
            "Free Drafting of Petitions"
        ],
        "source_name": "KSLSA Official Records & High Court of Karnataka",
        "source_url": "https://kslsa.kar.nic.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "District Legal Services Authority (DLSA) - Bengaluru Urban",
        "category": "Free Legal Aid",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "city": "Bengaluru",
        "address": "City Civil Court Complex, Kempegowda Road, Bengaluru - 560009",
        "phone": "080-22223847",
        "email": "dlsabangaloreurban@gmail.com",
        "website": "https://kslsa.kar.nic.in/dlsa.html",
        "eligibility_info": "Available to all eligible litigants as per Legal Services Authorities Act guidelines.",
        "services_offered": [
            "Legal Consultation Clinics",
            "Assistance for Senior Citizens & Women",
            "Lok Adalat Facilitation"
        ],
        "source_name": "DLSA Bengaluru Directory",
        "source_url": "https://nalsa.gov.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "Tamil Nadu State Legal Services Authority (TNSLSA)",
        "category": "Legal Services Authority",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "city": "Chennai",
        "address": "North Fort Road, High Court Campus, Chennai - 600104",
        "phone": "044-25342834 / Toll-Free: 1800-425-2441",
        "email": "tnslsa@yahoo.com",
        "website": "https://www.tnslsa.tn.gov.in",
        "eligibility_info": "All citizens eligible under Section 12 of LSA Act 1987 with annual family income under Rs. 3,00,000/-, women, and children.",
        "services_offered": [
            "Free Advocate Representation",
            "Lok Adalat Services",
            "Legal Literacy Camps",
            "Family Counseling"
        ],
        "source_name": "TNSLSA Official Directory",
        "source_url": "https://www.tnslsa.tn.gov.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "Telangana State Legal Services Authority (TGSLSA)",
        "category": "Legal Services Authority",
        "state": "Telangana",
        "district": "Hyderabad",
        "city": "Hyderabad",
        "address": "High Court Buildings Campus, Hyderabad - 500066",
        "phone": "040-23446700 / Helpline: 15100",
        "email": "telanganaslsa@gmail.com",
        "website": "https://tgaplms.cgg.gov.in",
        "eligibility_info": "Free legal aid to women, minors, industrial workmen, SC/ST, victims of disaster, and annual income under statutory threshold.",
        "services_offered": [
            "Free Legal Counsel",
            "Consumer & Labor Court Representation",
            "Permanent Lok Adalat"
        ],
        "source_name": "TGSLSA & High Court for the State of Telangana",
        "source_url": "https://nalsa.gov.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "Uttar Pradesh State Legal Services Authority (UPSLSA)",
        "category": "Legal Services Authority",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "city": "Lucknow",
        "address": "3rd Floor, Jawahar Bhawan, Annexe, Ashok Marg, Lucknow - 226001",
        "phone": "0522-2286395 / Toll-Free: 1800-419-0234",
        "email": "upslsa@nic.in",
        "website": "https://upslsa.up.nic.in",
        "eligibility_info": "Eligible citizens under LSA Act 1987 with income under Rs. 3,00,000/-, SC/ST individuals, women, and custodial detainees.",
        "services_offered": [
            "Panel Advocates Across District Courts",
            "Jail Legal Aid Clinics",
            "Lok Adalats",
            "Legal Awareness"
        ],
        "source_name": "UPSLSA Portal & Allahabad High Court Records",
        "source_url": "https://upslsa.up.nic.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "West Bengal State Legal Services Authority (WBSLSA)",
        "category": "Legal Services Authority",
        "state": "West Bengal",
        "district": "Kolkata",
        "city": "Kolkata",
        "address": "City Civil Court Building, 2&3 Kiran Sankar Roy Road, Kolkata - 700001",
        "phone": "033-22483892 / Helpline: 15100",
        "email": "wbstatelegal@gmail.com",
        "website": "https://wbslsa.bangla.gov.in",
        "eligibility_info": "Free legal aid for eligible citizens under Section 12, LSA Act, 1987.",
        "services_offered": [
            "Court Legal Aid Assistance",
            "Pre-Litigation Counselling",
            "ADR & Mediation Facilities"
        ],
        "source_name": "WBSLSA Official Registry",
        "source_url": "https://wbslsa.bangla.gov.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "National Commission for Women (NCW) Legal Cell",
        "category": "Assistance for Women",
        "state": "Delhi",
        "district": "South Delhi",
        "city": "New Delhi",
        "address": "Plot No. 21, Jasola Institutional Area, New Delhi - 110025",
        "phone": "011-26942369 / 24x7 Women Helpline: 7827170170",
        "email": "ncw@nic.in",
        "website": "https://ncw.nic.in",
        "eligibility_info": "Any woman facing domestic violence, harassment, marital disputes, cybercrimes, or denial of statutory rights across India.",
        "services_offered": [
            "Legal Counseling & Inquiry Cells",
            "Assistance in Filing Police Grievances",
            "Free Counseling for Domestic Matters"
        ],
        "source_name": "National Commission for Women Official Portal",
        "source_url": "https://ncw.nic.in",
        "verification_date": "2026-10-15"
    },
    {
        "name": "National Commission for Protection of Child Rights (NCPCR) Legal Cell",
        "category": "Assistance for Children",
        "state": "Delhi",
        "district": "Central Delhi",
        "city": "New Delhi",
        "address": "5th Floor, Chanderlok Building, 36 Janpath, New Delhi - 110001",
        "phone": "011-23478200 / Childline: 1098",
        "email": "cp.ncpcr@nic.in",
        "website": "https://ncpcr.gov.in",
        "eligibility_info": "Matters relating to rights of minors, custody disputes, juvenile justice, and child protection under POCSO Act and RTE Act.",
        "services_offered": [
            "Legal Guidance on POCSO & Child Rights",
            "Intervention with District Child Welfare Committees (CWC)",
            "Grievance Redressal Support"
        ],
        "source_name": "NCPCR Official Portal",
        "source_url": "https://ncpcr.gov.in",
        "verification_date": "2026-10-15"
    }
]
