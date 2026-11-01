import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def get_auth_token(email: str = None) -> str:
    user_email = email or f"drafter_{uuid.uuid4().hex[:8]}@example.com"
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": user_email,
        "password": "DraftSecurePassword123!",
        "display_name": "Advocate Drafter"
    })
    assert reg_resp.status_code == 201
    return reg_resp.json()["access_token"]


def test_unauthenticated_draft_access_rejected():
    resp = client.post("/api/v1/drafts", json={
        "document_type": "formal_letter",
        "title": "Unauthorized Test"
    })
    assert resp.status_code == 401


def test_draft_crud_and_generation_flow():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a draft
    create_payload = {
        "document_type": "formal_letter",
        "title": "Demand for Security Deposit Refund",
        "tone": "firm",
        "language": "en",
        "jurisdiction": "India",
        "structured_inputs": {
            "basics": {
                "document_type": "formal_letter",
                "title": "Demand for Security Deposit Refund",
                "purpose": "Recovery of unpaid security deposit post lease termination",
                "desired_outcome": "Full refund of INR 1,50,000 within 7 days",
                "jurisdiction": "India",
                "language": "en",
                "tone": "firm"
            },
            "sender": {
                "full_name": "Rohan Gupta",
                "address": "Flat 204, Indiranagar, Bengaluru",
                "phone": "+91 9876543210",
                "email": "rohan@example.com",
                "role": "Former Lessee"
            },
            "recipient": {
                "full_name": "Mr. Vikram Rao",
                "designation": "Property Owner / Lessor",
                "address": "#12, Koramangala 4th Block, Bengaluru"
            },
            "dates_and_references": {
                "date_of_drafting": "1st November 2026",
                "incident_date": "15th October 2026",
                "reference_number": "LEASE-BLR-2026-99",
                "deadline_date": "7 days from receipt"
            },
            "facts_and_circumstances": {
                "what_happened": "Vacated premises peacefully on 15th October 2026 after 2 months advance notice. Lessor withheld INR 1,50,000 without itemized damage proof.",
                "background": "Tenancy of 11 months completed with zero rent arrears.",
                "legal_provisions": "Section 73 and 74 of the Indian Contract Act, 1872"
            },
            "requested_action": {
                "what_should_recipient_do": "Remit INR 1,50,000 to sender bank account immediately",
                "requested_remedy": "Deposit return plus statutory interest",
                "desired_deadline": "7 days"
            }
        }
    }

    create_resp = client.post("/api/v1/drafts", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    draft_data = create_resp.json()
    draft_id = draft_data["id"]
    assert draft_data["title"] == "Demand for Security Deposit Refund"
    assert draft_data["status"] == "draft"

    # 2. Retrieve draft
    get_resp = client.get(f"/api/v1/drafts/{draft_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == draft_id

    # 3. List drafts
    list_resp = client.get("/api/v1/drafts", headers=headers)
    assert list_resp.status_code == 200
    assert any(d["id"] == draft_id for d in list_resp.json())

    # 4. Generate draft content
    gen_resp = client.post(f"/api/v1/drafts/{draft_id}/generate", headers=headers)
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["status"] == "generated"
    assert gen_data["generated_content"] is not None
    assert len(gen_data["generated_content"]) > 100
    assert "Rohan Gupta" in gen_data["generated_content"]
    assert "Vikram Rao" in gen_data["generated_content"]
    assert "1,50,000" in gen_data["generated_content"]

    # 5. User edits content
    custom_content = gen_data["generated_content"] + "\n\n[USER EDITED CLAUSE: Strictly Without Prejudice]"
    patch_resp = client.patch(
        f"/api/v1/drafts/{draft_id}",
        json={"user_edited_content": custom_content},
        headers=headers
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "edited"
    assert "Without Prejudice" in patch_resp.json()["user_edited_content"]

    # 6. Delete draft
    del_resp = client.delete(f"/api/v1/drafts/{draft_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Confirm 404 after deletion
    assert client.get(f"/api/v1/drafts/{draft_id}", headers=headers).status_code == 404


def test_draft_cross_user_isolation():
    token_a = get_auth_token()
    token_b = get_auth_token()

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a draft
    create_resp = client.post(
        "/api/v1/drafts",
        json={"document_type": "formal_complaint", "title": "User A Private Complaint"},
        headers=headers_a
    )
    draft_id = create_resp.json()["id"]

    # User B cannot read User A's draft
    assert client.get(f"/api/v1/drafts/{draft_id}", headers=headers_b).status_code == 404

    # User B cannot update User A's draft
    assert client.patch(f"/api/v1/drafts/{draft_id}", json={"title": "Hacked Title"}, headers=headers_b).status_code == 404

    # User B cannot generate User A's draft
    assert client.post(f"/api/v1/drafts/{draft_id}/generate", headers=headers_b).status_code == 404

    # User B cannot delete User A's draft
    assert client.delete(f"/api/v1/drafts/{draft_id}", headers=headers_b).status_code == 404

    # User A can safely delete it
    assert client.delete(f"/api/v1/drafts/{draft_id}", headers=headers_a).status_code == 200
