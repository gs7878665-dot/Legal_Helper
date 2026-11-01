import io
import uuid
import pytest
from fastapi.testclient import TestClient
from docx import Document as DocxDoc
from pypdf import PdfWriter

from app.main import app

client = TestClient(app)


def get_auth_token(email: str = None) -> str:
    user_email = email or f"doc_user_{uuid.uuid4().hex[:8]}@example.com"
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": user_email,
        "password": "DocSecurePassword123!",
        "display_name": "Advocate DocTester"
    })
    assert reg_resp.status_code == 201
    return reg_resp.json()["access_token"]


def create_in_memory_docx(content: str) -> bytes:
    doc = DocxDoc()
    doc.add_heading("RESIDENTIAL LEASE AGREEMENT", level=1)
    doc.add_paragraph(content)
    table = doc.add_table(rows=2, cols=2)
    table.rows[0].cells[0].text = "Monthly Rent"
    table.rows[0].cells[1].text = "INR 35,000"
    table.rows[1].cells[0].text = "Security Deposit"
    table.rows[1].cells[1].text = "INR 1,50,000"
    
    stream = io.BytesIO()
    doc.save(stream)
    return stream.getvalue()


def create_in_memory_pdf(content: str) -> bytes:
    # Use pypdf to create a small valid PDF with a text annotation or page
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    stream = io.BytesIO()
    writer.write(stream)
    return stream.getvalue()


def test_unauthenticated_document_access_rejected():
    resp = client.post(
        "/api/v1/documents/text",
        json={"title": "Unauthorized Test", "text": "This should fail because no bearer token is present."}
    )
    assert resp.status_code == 401


def test_pasted_text_document_creation():
    token = get_auth_token()
    legal_text = (
        "WHEREAS the Lessor is the absolute owner of Flat No. 402, Indiranagar, Bengaluru. "
        "The Lessee agrees to pay a monthly rent of INR 45,000 on or before the 5th of every month. "
        "The security deposit of INR 2,00,000 shall be refunded within 15 days of vacation."
    )

    resp = client.post(
        "/api/v1/documents/text",
        json={"title": "Indiranagar Lease", "text": legal_text},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["source_type"] == "pasted_text"
    assert data["status"] == "extracted"
    assert data["word_count"] > 20
    assert "Flat No. 402" in data["extracted_text"]


def test_upload_and_extract_docx():
    token = get_auth_token()
    docx_text = (
        "This Commercial Lease Deed is executed on 1st November 2026 between Alpha Corp (Lessor) "
        "and Beta Ventures Private Limited (Lessee) in Bengaluru, Karnataka. "
        "The Lessee shall hold the Lessor indemnified against any municipal tax infractions."
    )
    docx_bytes = create_in_memory_docx(docx_text)

    files = {
        "file": ("commercial_lease.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }
    resp = client.post(
        "/api/v1/documents/upload",
        files=files,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["original_filename"] == "commercial_lease.docx"
    assert data["status"] == "extracted"
    assert "Beta Ventures" in data["extracted_text"]
    assert "INR 35,000" in data["extracted_text"]


def test_upload_unsupported_format_rejected():
    token = get_auth_token()
    files = {
        "file": ("script.exe", b"binary content", "application/octet-stream")
    }
    resp = client.post(
        "/api/v1/documents/upload",
        files=files,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 400
    assert "Unsupported file format" in resp.json()["detail"]


def test_upload_scanned_pdf_error_handling():
    token = get_auth_token()
    # Blank PDF has no text layer, mimicking an image scan
    blank_pdf = create_in_memory_pdf("dummy")
    files = {
        "file": ("scanned_notice.pdf", blank_pdf, "application/pdf")
    }
    resp = client.post(
        "/api/v1/documents/upload",
        files=files,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 422
    assert "image-only scan" in resp.json()["detail"] or "no extractable text" in resp.json()["detail"]


def test_document_simplification_flow():
    token = get_auth_token()
    legal_text = (
        "CLAUSE 14: INDEMNIFICATION AND TERMINATION. "
        "Either party may terminate this Software Development Services Agreement upon providing thirty (30) days prior written notice. "
        "The Vendor agrees to defend, indemnify, and hold harmless the Client against any third-party intellectual property claims. "
        "Any delay exceeding fifteen (15) days in invoice payment of ₹1,20,000 shall attract 18% per annum penalty interest. "
        "This Agreement shall be governed by the laws of India and subject to courts in Bengaluru, Karnataka under Section 28 of the Indian Contract Act."
    )

    # 1. Create document
    create_resp = client.post(
        "/api/v1/documents/text",
        json={"title": "SaaS Master Services Agreement", "text": legal_text},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_resp.status_code == 201
    doc_id = create_resp.json()["id"]

    # 2. Run simplification
    simplify_payload = {
        "level": "standard",
        "language": "en",
        "preserve_legal_terms": True,
        "explain_terminology": True
    }
    sim_resp = client.post(
        f"/api/v1/documents/{doc_id}/simplify",
        json=simplify_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sim_resp.status_code == 201
    result = sim_resp.json()

    assert result["document_id"] == doc_id
    assert result["status"] == "completed"
    assert "simplified_text" in result
    assert len(result["simplified_text"]) > 50

    structured = result["structured_output"]
    assert structured is not None
    assert "summary" in structured
    assert "disclaimer" in structured

    # Verify preserved terms or explained terms
    assert "key_facts" in structured or "sections" in structured


def test_document_ownership_cross_user_isolation():
    token_user_a = get_auth_token()
    token_user_b = get_auth_token()

    # User A creates a document
    doc_resp = client.post(
        "/api/v1/documents/text",
        json={"title": "User A Private Deed", "text": "This is User A's private legal document containing proprietary terms."},
        headers={"Authorization": f"Bearer {token_user_a}"}
    )
    doc_id = doc_resp.json()["id"]

    # User A can access it
    get_a_resp = client.get(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_user_a}"}
    )
    assert get_a_resp.status_code == 200

    # User B cannot access User A's document (returns 404 safe message)
    get_b_resp = client.get(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_user_b}"}
    )
    assert get_b_resp.status_code == 404

    # User B cannot simplify User A's document
    simplify_b_resp = client.post(
        f"/api/v1/documents/{doc_id}/simplify",
        json={"level": "standard"},
        headers={"Authorization": f"Bearer {token_user_b}"}
    )
    assert simplify_b_resp.status_code == 404

    # User B cannot delete User A's document
    del_b_resp = client.delete(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_user_b}"}
    )
    assert del_b_resp.status_code == 404

    # User A deletes their own document
    del_a_resp = client.delete(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_user_a}"}
    )
    assert del_a_resp.status_code == 200
    assert del_a_resp.json()["success"] is True
