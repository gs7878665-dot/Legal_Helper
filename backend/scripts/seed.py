import os
import sys
import uuid
from typing import Dict, Any, List

# Ensure app package is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.tool import Tool

INITIAL_DATA: List[Dict[str, Any]] = [
    {
        "slug": "ai-assistance",
        "name": "AI Assistance",
        "description": "AI-powered legal intelligence, contextual case guidance, and automated legal research",
        "sort_order": 1,
        "branch_position": {
            "level": 1,
            "height": 3.2,
            "angle": 0.0,
            "radius": 4.8,
            "color": "#c084fc",
            "glow": "rgba(192, 132, 252, 0.4)"
        },
        "tools": [
            {
                "slug": "legal-advisor",
                "name": "Legal Advisor",
                "description": "Personal AI legal assistant providing plain-language statutory guidance",
                "route": "/tools/legal-advisor",
                "icon": "sparkles",
                "sort_order": 1
            },
            {
                "slug": "legal-research",
                "name": "Legal Research",
                "description": "Comprehensive case law, acts, and precedent search engine",
                "route": "/tools/legal-research",
                "icon": "search",
                "sort_order": 2
            }
        ]
    },
    {
        "slug": "documents",
        "name": "Documents",
        "description": "Document comprehension, contract simplification, notice drafting, and secure legal storage",
        "sort_order": 2,
        "branch_position": {
            "level": 2,
            "height": 1.1,
            "angle": 1.73,
            "radius": 4.6,
            "color": "#818cf8",
            "glow": "rgba(129, 140, 248, 0.4)"
        },
        "tools": [
            {
                "slug": "document-simplifier",
                "name": "Document Simplifier",
                "description": "Transforms complex legal deeds and contracts into clear clauses",
                "route": "/tools/document-simplifier",
                "icon": "file-text",
                "sort_order": 1
            },
            {
                "slug": "drafting-assistant",
                "name": "Drafting Assistant",
                "description": "AI-assisted drafting of rental agreements, NDAs, and consumer affidavits",
                "route": "/tools/drafting-assistant",
                "icon": "pen-tool",
                "sort_order": 2
            },
            {
                "slug": "notice-reply",
                "name": "Notice Reply",
                "description": "Structured response generator for legal and demand notices",
                "route": "/tools/notice-reply",
                "icon": "mail",
                "sort_order": 3
            },
            {
                "slug": "legal-vault",
                "name": "Legal Vault",
                "description": "Encrypted document storage with key date alerts and clause indexing",
                "route": "/tools/legal-vault",
                "icon": "folder-lock",
                "sort_order": 4
            }
        ]
    },
    {
        "slug": "safety-help",
        "name": "Safety & Help",
        "description": "Fraud detection, evidence collation, lawyer preparation, and pro-bono aid navigation",
        "sort_order": 3,
        "branch_position": {
            "level": 3,
            "height": -1.1,
            "angle": 3.66,
            "radius": 4.8,
            "color": "#38bdf8",
            "glow": "rgba(56, 189, 248, 0.4)"
        },
        "tools": [
            {
                "slug": "scam-detector",
                "name": "Scam Detector",
                "description": "AI fraud & phishing analysis for suspicious messages and investment offers",
                "route": "/tools/scam-detector",
                "icon": "shield-alert",
                "sort_order": 1
            },
            {
                "slug": "evidence-timeline",
                "name": "Evidence & Timeline",
                "description": "Chronological incident builder with verifiable digital proof stamps",
                "route": "/tools/evidence-timeline",
                "icon": "clock",
                "sort_order": 2
            },
            {
                "slug": "lawyer-preparation",
                "name": "Lawyer Preparation",
                "description": "Client case briefing pack generator for advocate consultations",
                "route": "/tools/lawyer-preparation",
                "icon": "briefcase",
                "sort_order": 3
            },
            {
                "slug": "legal-aid-finder",
                "name": "Legal Aid Finder",
                "description": "Directory of DLSA, NALSA, and recognized pro-bono legal counsel",
                "route": "/tools/legal-aid-finder",
                "icon": "heart-handshake",
                "sort_order": 4
            }
        ]
    },
    {
        "slug": "legal-tools",
        "name": "Legal Tools",
        "description": "Procedural court trackers, litigation cost calculators, and penal code converters",
        "sort_order": 4,
        "branch_position": {
            "level": 4,
            "height": -3.2,
            "angle": 5.41,
            "radius": 4.6,
            "color": "#a855f7",
            "glow": "rgba(168, 85, 247, 0.4)"
        },
        "tools": [
            {
                "slug": "cost-estimator",
                "name": "Cost Estimator",
                "description": "Calculates anticipated court fees, advocate fees, and stamp duty",
                "route": "/tools/cost-estimator",
                "icon": "calculator",
                "sort_order": 1
            },
            {
                "slug": "cnr-tracker",
                "name": "CNR Tracker",
                "description": "Real-time case status and hearing tracking across Indian e-Courts",
                "route": "/tools/cnr-tracker",
                "icon": "hash",
                "sort_order": 2
            },
            {
                "slug": "ipc-bns-converter",
                "name": "IPC–BNS Converter",
                "description": "Direct mapping between Indian Penal Code (IPC) and Bharatiya Nyaya Sanhita (BNS)",
                "route": "/tools/ipc-bns-converter",
                "icon": "scale",
                "sort_order": 3
            }
        ]
    }
]

def seed_database():
    db = SessionLocal()
    try:
        categories_count = 0
        tools_count = 0

        for cat_data in INITIAL_DATA:
            tools_list = cat_data.get("tools", [])
            cat_slug = cat_data["slug"]

            # Idempotent lookup
            existing_cat = db.scalar(select(Category).where(Category.slug == cat_slug))
            if existing_cat:
                existing_cat.name = cat_data["name"]
                existing_cat.description = cat_data["description"]
                existing_cat.sort_order = cat_data["sort_order"]
                existing_cat.branch_position = cat_data["branch_position"]
                existing_cat.is_active = True
                category = existing_cat
            else:
                category = Category(
                    id=uuid.uuid4(),
                    slug=cat_slug,
                    name=cat_data["name"],
                    description=cat_data["description"],
                    sort_order=cat_data["sort_order"],
                    branch_position=cat_data["branch_position"],
                    is_active=True
                )
                db.add(category)
                db.flush()
                categories_count += 1

            for tool_data in tools_list:
                tool_slug = tool_data["slug"]
                existing_tool = db.scalar(select(Tool).where(Tool.slug == tool_slug))
                if existing_tool:
                    existing_tool.category_id = category.id
                    existing_tool.name = tool_data["name"]
                    existing_tool.description = tool_data["description"]
                    existing_tool.route = tool_data["route"]
                    existing_tool.icon = tool_data["icon"]
                    existing_tool.sort_order = tool_data["sort_order"]
                    existing_tool.is_active = True
                else:
                    new_tool = Tool(
                        id=uuid.uuid4(),
                        category_id=category.id,
                        slug=tool_slug,
                        name=tool_data["name"],
                        description=tool_data["description"],
                        route=tool_data["route"],
                        icon=tool_data["icon"],
                        sort_order=tool_data["sort_order"],
                        is_active=True
                    )
                    db.add(new_tool)
                    tools_count += 1

        db.commit()
        print(f"Seed complete. Successfully seeded/synced {len(INITIAL_DATA)} categories and all corresponding tools.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
