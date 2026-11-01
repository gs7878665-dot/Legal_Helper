import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def get_auth_token(email: str = None) -> str:
    user_email = email or f"notice_user_{uuid.uuid4().hex[:8]}@example.com"
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": user_email,
        "password": "NoticeSecurePass123!",
        "display_name": "Advocate NoticeReplier"
    })
    assert reg_resp.status_code == 201
    return reg_resp.json()["access_token"]


SAMPLE_NOTICE_TEXT = """
LEGAL NOTICE FOR RECOVERY OF ARREARS

Date: 20th October 2026
Ref No: LN/BLR/2026/842

To:
Mr. Siddharth Malhotra
Flat 502, Green Glen Layout, Bellandur, Bengaluru - 560103

From:
Advocate S. K. Narang, High Court of Karnataka
On behalf of: M/s UrbanStay Living Properties Pvt Ltd, Bengaluru

Sir,

Under instructions from my client, I hereby serve upon you this formal Legal Notice:

1. That you were inducted as a tenant in respect of Flat 502 under lease agreement dated 1st January 2026 at a monthly rent of INR 45,000/-.

2. That you have defaulted in payment of rent for the months of August, September, and October 2026, totaling INR 1,35,000/-.

3. That you have caused severe unauthorized alterations to the electrical fittings in violation of Clause 8.

4. I therefore call upon you to pay the outstanding sum of INR 1,35,000/- within 15 days of receipt of this notice.

5. Failing compliance within 15 days of receipt, my client shall initiate recovery proceedings under the Karnataka Rent Act and criminal proceedings for breach of trust.

Yours faithfully,
Adv. S. K. Narang
"""


def test_unauthenticated_notice_reply_rejected():
    resp = client.post("/api/v1/notice-replies", json={
        "notice_text": SAMPLE_NOTICE_TEXT
    })
    assert resp.status_code == 401


def test_notice_reply_full_flow():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create notice reply with text
    create_payload = {
        "title": "Reply to UrbanStay Recovery Notice",
        "notice_text": SAMPLE_NOTICE_TEXT,
        "tone": "firm",
        "language": "en"
    }
    create_resp = client.post("/api/v1/notice-replies", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    data = create_resp.json()
    reply_id = data["id"]
    assert data["status"] == "uploaded"
    assert "Siddharth Malhotra" in data["raw_notice_text"]

    # 2. Analyze notice
    analyze_resp = client.post(f"/api/v1/notice-replies/{reply_id}/analyze", headers=headers)
    assert analyze_resp.status_code == 200
    analyzed = analyze_resp.json()
    assert analyzed["status"] == "analyzed"

    details = analyzed["extracted_notice_details"]
    assert details is not None
    # Stated deadline must be explicitly extracted
    assert details["explicit_deadline"] is not None
    assert "15 days" in details["explicit_deadline"].lower()
    assert details["amount_demanded"] is not None
    assert "1,35,000" in details["amount_demanded"]

    allegations = analyzed["allegations_and_demands"]
    assert len(allegations) >= 3

    # 3. Supply user factual positions
    user_responses = {
        "user_info": {
            "full_name": "Siddharth Malhotra",
            "address": "Flat 502, Green Glen Layout, Bellandur, Bengaluru",
            "email": "siddharth@example.com",
            "phone": "+91 98450 12345"
        },
        "matter_info": {
            "reply_date": "1st November 2026",
            "background": "Rent for August was paid via NEFT UTR #998877 on 3rd Aug; September was adjusted against agreed plumbing repair invoices.",
            "desired_action": "Withdraw the unsubstantiated notice and acknowledge NEFT receipts."
        },
        "allegation_responses": {
            allegations[0]["id"]: {
                "stance": "agree",
                "explanation": "Tenancy under the lease agreement dated 1st Jan 2026 is admitted."
            },
            allegations[1]["id"]: {
                "stance": "disagree",
                "explanation": "Deny rent arrears. August rent of INR 45,000 was paid via NEFT, September rent was mutually adjusted against documented plumbing repairs of INR 45,000."
            },
            allegations[2]["id"]: {
                "stance": "disagree",
                "explanation": "No unauthorized alteration was made; only necessary emergency repair of short-circuit wiring was performed with prior notice to landlord manager."
            }
        }
    }

    patch_resp = client.patch(
        f"/api/v1/notice-replies/{reply_id}",
        json={"user_responses": user_responses},
        headers=headers
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["user_responses"]["user_info"]["full_name"] == "Siddharth Malhotra"

    # 4. Generate reply
    gen_resp = client.post(f"/api/v1/notice-replies/{reply_id}/generate", headers=headers)
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["status"] == "generated"
    reply_text = gen_data["generated_reply"]
    assert reply_text is not None
    assert len(reply_text) > 100

    # Ensure user facts are preserved and not fabricated
    assert "Siddharth Malhotra" in reply_text
    assert "UrbanStay" in reply_text or "LN/BLR/2026/842" in reply_text

    # 5. User edits reply
    custom_text = reply_text + "\n\n[WITHOUT PREJUDICE TO STATUTORY COUNTER-CLAIMS]"
    patch_reply = client.patch(
        f"/api/v1/notice-replies/{reply_id}",
        json={"user_edited_reply": custom_text},
        headers=headers
    )
    assert patch_reply.status_code == 200
    assert patch_reply.json()["status"] == "edited"
    assert "WITHOUT PREJUDICE" in patch_reply.json()["user_edited_reply"]

    # 6. Delete reply
    del_resp = client.delete(f"/api/v1/notice-replies/{reply_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # 7. Confirm 404
    assert client.get(f"/api/v1/notice-replies/{reply_id}", headers=headers).status_code == 404


def test_notice_reply_cross_user_isolation():
    token_a = get_auth_token()
    token_b = get_auth_token()

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    create_resp = client.post(
        "/api/v1/notice-replies",
        json={"notice_text": SAMPLE_NOTICE_TEXT, "title": "User A Notice"},
        headers=headers_a
    )
    reply_id = create_resp.json()["id"]

    # User B cannot access User A's notice reply
    assert client.get(f"/api/v1/notice-replies/{reply_id}", headers=headers_b).status_code == 404
    assert client.patch(f"/api/v1/notice-replies/{reply_id}", json={"title": "Hacked"}, headers=headers_b).status_code == 404
    assert client.post(f"/api/v1/notice-replies/{reply_id}/analyze", headers=headers_b).status_code == 404
    assert client.post(f"/api/v1/notice-replies/{reply_id}/generate", headers=headers_b).status_code == 404
    assert client.delete(f"/api/v1/notice-replies/{reply_id}", headers=headers_b).status_code == 404

    # User A can safely delete it
    assert client.delete(f"/api/v1/notice-replies/{reply_id}", headers=headers_a).status_code == 200
