import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

REGISTER_PAYLOAD_USER1 = {
    "email": "vault_user1@example.com",
    "password": "Password123!Safe",
    "display_name": "Vault User 1",
}

REGISTER_PAYLOAD_USER2 = {
    "email": "vault_user2@example.com",
    "password": "Password123!Safe",
    "display_name": "Vault User 2",
}


def get_token(email: str, password: str, display_name: str) -> str:
    # Attempt register
    client.post("/api/v1/auth/register", json={"email": email, "password": password, "display_name": display_name})
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    return login_res.json()["access_token"]


def test_unauthenticated_vault_rejected():
    """Ensure all vault endpoints require valid authentication."""
    res_list = client.get("/api/v1/vault/documents")
    assert res_list.status_code == 401

    res_search = client.get("/api/v1/vault/search?q=agreement")
    assert res_search.status_code == 401


def test_vault_upload_and_lifecycle():
    """Verify upload, metadata, search, download, preview, and update."""
    token = get_token("vault_lifecycle@example.com", "Password123!Safe", "Lifecycle User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload a text document
    sample_content = b"This is a formal Residential Tenancy Agreement between Landlord Priya and Tenant Rahul."
    files = {
        "file": ("lease_agreement_2026.txt", io.BytesIO(sample_content), "text/plain")
    }
    data = {
        "title": "Residential Tenancy Agreement 2026",
        "category": "Agreements & Contracts",
        "description": "Executed apartment lease in Indiranagar",
        "tags": '["lease", "apartment", "2026"]',
        "document_date": "2026-05-01",
        "related_entity": "Landlord Priya",
    }
    upload_res = client.post("/api/v1/vault/documents", headers=headers, files=files, data=data)
    assert upload_res.status_code == 201, upload_res.text
    doc = upload_res.json()
    doc_id = doc["id"]
    assert doc["title"] == "Residential Tenancy Agreement 2026"
    assert doc["category"] == "Agreements & Contracts"
    assert "lease" in doc["tags"]
    assert doc["status"] == "extracted"
    assert "Residential Tenancy Agreement" in doc["extracted_text"]

    # 2. List documents with category filter
    list_res = client.get("/api/v1/vault/documents?category=Agreements+%26+Contracts", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total_count"] >= 1
    assert any(d["id"] == doc_id for d in list_data["documents"])

    # 3. Content search
    search_res = client.get("/api/v1/vault/search?q=Tenancy", headers=headers)
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total_matches"] >= 1
    matched_doc = next((r for r in search_data["results"] if r["document"]["id"] == doc_id), None)
    assert matched_doc is not None
    assert "Tenancy" in matched_doc["matching_excerpt"]

    # 4. Preview stream
    preview_res = client.get(f"/api/v1/vault/documents/{doc_id}/preview", headers=headers)
    assert preview_res.status_code == 200
    assert b"Residential Tenancy Agreement" in preview_res.content

    # 5. Download original
    download_res = client.get(f"/api/v1/vault/documents/{doc_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.headers["content-disposition"].startswith("attachment;")

    # 6. Update metadata
    patch_res = client.patch(
        f"/api/v1/vault/documents/{doc_id}",
        headers=headers,
        json={"title": "Updated Lease Agreement 2026", "tags": ["lease", "renewed"]},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Lease Agreement 2026"
    assert "renewed" in patch_res.json()["tags"]

    # 7. Generate AI Overview
    overview_res = client.post(f"/api/v1/vault/documents/{doc_id}/overview", headers=headers)
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    assert overview_data["ai_overview"] is not None
    assert "summary" in overview_data["ai_overview"]

    # 8. Delete document
    del_res = client.delete(f"/api/v1/vault/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Confirm 404
    get_res = client.get(f"/api/v1/vault/documents/{doc_id}", headers=headers)
    assert get_res.status_code == 404


def test_vault_cross_user_isolation():
    """Verify User 1 cannot access, download, update, or delete User 2's documents."""
    token1 = get_token("vault_iso1@example.com", "Password123!Safe", "Iso User 1")
    token2 = get_token("vault_iso2@example.com", "Password123!Safe", "Iso User 2")
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 2 uploads confidential document
    files = {
        "file": ("confidential_nda.txt", io.BytesIO(b"Strictly confidential NDA agreement for User 2"), "text/plain")
    }
    upload_res = client.post(
        "/api/v1/vault/documents",
        headers=headers2,
        files=files,
        data={"title": "Private Confidential NDA", "category": "Agreements & Contracts"},
    )
    assert upload_res.status_code == 201
    doc2_id = upload_res.json()["id"]

    # User 1 tries to read User 2's document -> 404
    read_res = client.get(f"/api/v1/vault/documents/{doc2_id}", headers=headers1)
    assert read_res.status_code == 404

    # User 1 tries to preview User 2's document -> 404
    preview_res = client.get(f"/api/v1/vault/documents/{doc2_id}/preview", headers=headers1)
    assert preview_res.status_code == 404

    # User 1 tries to download User 2's document -> 404
    dl_res = client.get(f"/api/v1/vault/documents/{doc2_id}/download", headers=headers1)
    assert dl_res.status_code == 404

    # User 1 tries to update User 2's document -> 404
    patch_res = client.patch(
        f"/api/v1/vault/documents/{doc2_id}",
        headers=headers1,
        json={"title": "Hacked Title"},
    )
    assert patch_res.status_code == 404

    # User 1 tries to delete User 2's document -> 404
    del_res = client.delete(f"/api/v1/vault/documents/{doc2_id}", headers=headers1)
    assert del_res.status_code == 404

    # User 1 searches -> User 2's document must not appear
    search_res = client.get("/api/v1/vault/search?q=confidential", headers=headers1)
    assert search_res.status_code == 200
    assert not any(r["document"]["id"] == doc2_id for r in search_res.json()["results"])
