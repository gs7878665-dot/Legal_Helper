import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_registered_laws():
    """Ensure dynamic retrieval of registered laws (IPC, BNS, CrPC, BNSS, IEA, BSA)."""
    res = client.get("/api/v1/legal/laws")
    assert res.status_code == 200
    laws = res.json()
    assert len(laws) >= 4
    slugs = [l["slug"] for l in laws]
    assert "ipc" in slugs
    assert "bns" in slugs
    assert "crpc" in slugs
    assert "bnss" in slugs


def test_get_law_detail_and_unknown_handling():
    """Verify single law metadata and 404 for unknown law."""
    res = client.get("/api/v1/legal/laws/ipc")
    assert res.status_code == 200
    data = res.json()
    assert data["short_name"] == "IPC"
    assert data["status"] == "repealed"

    # Unknown law slug
    res_404 = client.get("/api/v1/legal/laws/non_existent_code")
    assert res_404.status_code == 404


def test_ipc_to_bns_conversion():
    """Verify IPC 420 -> BNS 318 conversion with verified mapping and example."""
    res = client.get("/api/v1/legal/convert?source_law=ipc&source_provision=420&target_law=bns")
    assert res.status_code == 200
    data = res.json()
    assert data["has_verified_mapping"] is True
    assert data["source_provision"]["provision_number"] == "420"
    assert "cheating" in data["source_provision"]["title"].lower()

    # Corresponding provision
    assert len(data["correspondences"]) >= 1
    match = data["correspondences"][0]
    assert match["target_provision"]["provision_number"] == "318"
    assert match["mapping_status"] == "verified"
    assert match["relationship_type"] == "direct_correspondence"
    assert match["source_reference"] is not None

    # Plain language explanation and practical example
    assert data["source_provision"]["plain_language_explanation"] is not None
    assert data["source_provision"]["practical_example"] is not None
    assert "caveat" in data


def test_bns_to_ipc_reverse_conversion():
    """Verify bidirectional lookup BNS 318 -> IPC 420."""
    res = client.get("/api/v1/legal/convert?source_law=bns&source_provision=318&target_law=ipc")
    assert res.status_code == 200
    data = res.json()
    assert data["has_verified_mapping"] is True
    assert any(c["target_provision"]["provision_number"] == "420" for c in data["correspondences"])


def test_changed_provision_mapping():
    """Verify IPC 302 -> BNS 103 (changed provision with mob lynching clause)."""
    res = client.get("/api/v1/legal/convert?source_law=ipc&source_provision=302&target_law=bns")
    assert res.status_code == 200
    data = res.json()
    assert data["has_verified_mapping"] is True
    match = data["correspondences"][0]
    assert match["target_provision"]["provision_number"] == "103"
    assert match["relationship_type"] == "changed_provision"
    assert "mob lynching" in match["substantive_changes"].lower()


def test_crpc_to_bnss_procedural_conversion():
    """Verify procedural law conversion CrPC 154 (FIR) -> BNSS 173 (Zero FIR & e-FIR)."""
    res = client.get("/api/v1/legal/convert?source_law=crpc&source_provision=154&target_law=bnss")
    assert res.status_code == 200
    data = res.json()
    assert data["has_verified_mapping"] is True
    match = data["correspondences"][0]
    assert match["target_provision"]["provision_number"] == "173"
    assert "zero fir" in match["substantive_changes"].lower()


def test_unmapped_provision_returns_no_correspondence():
    """Verify unmapped or unknown provision handling returns structured message without guessing."""
    # Unknown provision number in IPC
    res_404 = client.get("/api/v1/legal/convert?source_law=ipc&source_provision=9999&target_law=bns")
    assert res_404.status_code == 404

    # Unknown source law
    res_unknown_law = client.get("/api/v1/legal/convert?source_law=unknown_act&source_provision=10&target_law=bns")
    assert res_unknown_law.status_code == 404


def test_provision_search():
    """Verify search endpoint across titles, numbers, and text."""
    res = client.get("/api/v1/legal/search?q=theft")
    assert res.status_code == 200
    data = res.json()
    assert data["total_matches"] >= 1
    assert any("theft" in item["provision"]["title"].lower() for item in data["results"])


def test_official_sources_endpoint():
    """Verify /sources returns official government repositories."""
    res = client.get("/api/v1/legal/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 3
    assert any("India Code" in s["title"] for s in sources)


def test_broad_coverage_and_diagnostics():
    """Verify coverage across 9 laws including Constitution, BSA, and Central Acts."""
    res = client.get("/api/v1/legal/diagnostics")
    assert res.status_code == 200
    diag = res.json()
    assert diag["total_laws"] >= 8
    assert diag["total_provisions"] > 2500
    assert diag["total_correspondences"] > 1000

    # Verify Constitution Article 21 exists
    res_art21 = client.get("/api/v1/legal/provisions/constitution/21")
    assert res_art21.status_code == 200
    art21 = res_art21.json()
    assert art21["provision_number"] == "21"
    assert "life" in art21["title"].lower() or "personal liberty" in art21["official_text"].lower()

    # Verify BSA 1 -> IEA 1 correspondence
    res_bsa = client.get("/api/v1/legal/convert?source_law=bsa&source_provision=1&target_law=iea")
    assert res_bsa.status_code == 200
    data_bsa = res_bsa.json()
    assert data_bsa["has_verified_mapping"] is True
    assert any(c["target_provision"]["provision_number"] == "1" for c in data_bsa["correspondences"])

