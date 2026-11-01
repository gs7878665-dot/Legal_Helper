import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_create_advisor_session():
    payload = {
        "title": "Tenant deposit recovery in Bengaluru",
        "jurisdiction": "India",
        "context_data": {
            "city": "Bengaluru",
            "state": "Karnataka (Bengaluru)",
            "category": "Tenancy & Security Deposit"
        }
    }
    response = client.post("/api/v1/advisor/sessions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["title"] == payload["title"]
    assert data["jurisdiction"] == "India"
    assert data["context_data"]["city"] == "Bengaluru"
    assert len(data["messages"]) == 0

def test_advisor_conversation_flow():
    # 1. Create a session
    create_resp = client.post(
        "/api/v1/advisor/sessions",
        json={"title": "Consumer refund inquiry", "jurisdiction": "India"}
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    # 2. Send initial user question
    msg_payload = {
        "content": "An e-commerce company delivered damaged goods and refused my refund request under Section 35."
    }
    msg_resp = client.post(
        f"/api/v1/advisor/sessions/{session_id}/messages",
        json=msg_payload
    )
    assert msg_resp.status_code == 201
    msg_data = msg_resp.json()
    assert msg_data["role"] == "assistant"
    assert msg_data["structured_data"] is not None
    assert "summary" in msg_data["structured_data"]
    assert "practical_steps" in msg_data["structured_data"]
    assert len(msg_data["structured_data"]["practical_steps"]) > 0
    assert "disclaimer" in msg_data["structured_data"]
    assert msg_data["sources"] is not None
    assert len(msg_data["sources"]) > 0

    # Verify sources returned with valid title and citation
    assert all(s.get("title") for s in msg_data["sources"])
    assert all(s.get("citation") for s in msg_data["sources"])

    # 3. Retrieve session with history
    session_resp = client.get(f"/api/v1/advisor/sessions/{session_id}")
    assert session_resp.status_code == 200
    session_data = session_resp.json()
    assert len(session_data["messages"]) == 2  # 1 user + 1 assistant
    assert session_data["messages"][0]["role"] == "user"
    assert session_data["messages"][1]["role"] == "assistant"

    # 4. Send follow-up question
    followup_resp = client.post(
        f"/api/v1/advisor/sessions/{session_id}/messages",
        json={"content": "What is the limitation period for filing a complaint before the District Commission?"}
    )
    assert followup_resp.status_code == 201
    followup_data = followup_resp.json()
    assert followup_data["role"] == "assistant"
    assert followup_data["structured_data"] is not None

    # Verify session now has 4 messages
    session_resp2 = client.get(f"/api/v1/advisor/sessions/{session_id}")
    assert len(session_resp2.json()["messages"]) == 4

def test_rag_health():
    response = client.get("/api/v1/rag/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "standby"]
    assert "vector_index_available" in data
    assert "embedding_model" in data
    assert data["embedding_dim"] == 384
    assert data["total_documents"] >= 25
    assert data["total_chunks"] >= 100
    assert data["retriever_configured"] is True

def test_research_search_sources():
    # 1. Search for indexed Karnataka Rent legislation
    payload = {
        "query": "Karnataka Rent Act amendments and offences penalty",
        "jurisdiction": "India",
        "source_types": ["legislation", "all"],
        "limit": 10,
        "offset": 0
    }
    response = client.post("/api/v1/research/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_found"] > 0
    assert len(data["results"]) > 0
    assert data["retrieval_mode"] == "trained_rag"

    top_result = data["results"][0]
    assert "karnataka" in top_result["title"].lower() or "rent" in top_result["title"].lower()
    assert top_result["is_development_fixture"] is False
    assert top_result["confidence_score"] > 0.0

def test_research_explicit_empty_result():
    # Query with no matching legal terms
    payload = {
        "query": "xyzunobtainium778899quantumflux",
        "jurisdiction": "India",
        "source_types": ["legislation", "judgment"],
        "limit": 10,
        "offset": 0
    }
    response = client.post("/api/v1/research/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_found"] == 0
    assert data["results"] == []

def test_research_source_detail():
    # 1. Get valid source by ID (from indexed chunk or fixture)
    search_resp = client.post(
        "/api/v1/research/search",
        json={"query": "Karnataka Rent", "limit": 1}
    )
    if search_resp.json()["results"]:
        top_id = search_resp.json()["results"][0]["id"]
        response = client.get(f"/api/v1/research/sources/{top_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == top_id
        assert "karnataka" in data["title"].lower() or "rent" in data["title"].lower()

    # 2. Get non-existent source
    response_404 = client.get("/api/v1/research/sources/non-existent-id-999")
    assert response_404.status_code == 404

