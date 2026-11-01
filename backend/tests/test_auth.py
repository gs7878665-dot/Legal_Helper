import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User, RefreshToken
from app.models.advisor import AdvisorSession
from app.core.security import hash_token

client = TestClient(app)


def test_registration_success():
    unique_email = f"advocate_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "display_name": "Advocate Sharma"
    }

    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == unique_email.lower()
    assert data["user"]["display_name"] == "Advocate Sharma"
    assert data["user"]["is_active"] is True
    # Password hash must NEVER be present in the response
    assert "password" not in data["user"]
    assert "hashed_password" not in data["user"]

    # Verify cookie is set
    assert "refresh_token" in response.cookies

    # Verify database state
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == unique_email.lower()).first()
        assert user is not None
        # Password must be hashed (Argon2 starts with $argon2id$)
        assert user.hashed_password.startswith("$argon2id$")
        assert user.hashed_password != payload["password"]
    finally:
        db.close()


def test_duplicate_registration_rejected():
    unique_email = f"duplicate_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "display_name": "Duplicate User"
    }

    # First registration
    resp1 = client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    # Second registration with same email
    resp2 = client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400
    assert "already exists" in resp2.json()["detail"].lower()


def test_registration_validation_rules():
    # Password too short (< 8 chars)
    resp = client.post("/api/v1/auth/register", json={
        "email": "valid@example.com",
        "password": "short",
        "display_name": "Short Pass"
    })
    assert resp.status_code == 422

    # Invalid email format
    resp2 = client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "ValidPassword123!",
        "display_name": "Bad Email"
    })
    assert resp2.status_code == 422


def test_login_flow():
    email = f"login_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword123!"

    # Register user
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": "Login Tester"
    })
    assert reg_resp.status_code == 201

    # Valid Login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == email

    # Invalid Password Login
    bad_pass_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert bad_pass_resp.status_code == 401
    assert "Invalid email or password" in bad_pass_resp.json()["detail"]

    # Non-existent User Login
    no_user_resp = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "AnyPassword123!"
    })
    assert no_user_resp.status_code == 401
    assert "Invalid email or password" in no_user_resp.json()["detail"]


def test_current_user_profile():
    email = f"me_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "MyPassword123!"

    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": "Profile User"
    })
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]

    # Authenticated request to /me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == email
    assert me_data["display_name"] == "Profile User"
    assert "hashed_password" not in me_data

    # Unauthenticated request to /me
    unauth_resp = client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

    # Request with corrupted token
    corrupt_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.payload"}
    )
    assert corrupt_resp.status_code == 401


def test_refresh_token_rotation_and_revocation():
    email = f"refresh_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "RotationPassword123!"

    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": "Rotation User"
    })
    assert reg_resp.status_code == 201
    initial_refresh = reg_resp.json()["refresh_token"]

    # 1. Rotate refresh token
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh}
    )
    assert refresh_resp.status_code == 200
    refresh_data = refresh_resp.json()
    new_refresh = refresh_data["refresh_token"]
    assert new_refresh != initial_refresh

    # Verify old refresh token is now revoked in database
    db = SessionLocal()
    try:
        old_hash = hash_token(initial_refresh)
        old_record = db.query(RefreshToken).filter(RefreshToken.token_hash == old_hash).first()
        assert old_record is not None
        assert old_record.is_revoked is True
    finally:
        db.close()

    # 2. Reusing the old revoked refresh token MUST fail
    reused_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh}
    )
    assert reused_resp.status_code == 401


def test_logout_revokes_session():
    email = f"logout_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "LogoutPassword123!"

    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": "Logout User"
    })
    assert reg_resp.status_code == 201
    refresh_token = reg_resp.json()["refresh_token"]

    # Logout
    logout_resp = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["success"] is True

    # Refresh after logout should fail
    refresh_after_logout = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_after_logout.status_code == 401


def test_user_resource_ownership_scoping():
    # Create User A
    user_a_email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
    user_a_resp = client.post("/api/v1/auth/register", json={
        "email": user_a_email,
        "password": "PasswordUserA123!",
        "display_name": "User Alpha"
    })
    token_a = user_a_resp.json()["access_token"]

    # Create User B
    user_b_email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"
    user_b_resp = client.post("/api/v1/auth/register", json={
        "email": user_b_email,
        "password": "PasswordUserB123!",
        "display_name": "User Beta"
    })
    token_b = user_b_resp.json()["access_token"]

    # User A creates a private advisor session
    create_session_resp = client.post(
        "/api/v1/advisor/sessions",
        json={"title": "User A Private Advisory", "jurisdiction": "India"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert create_session_resp.status_code == 201
    session_id = create_session_resp.json()["id"]

    # User A can access their own session
    get_a_resp = client.get(
        f"/api/v1/advisor/sessions/{session_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert get_a_resp.status_code == 200
    assert get_a_resp.json()["title"] == "User A Private Advisory"

    # User B cannot access User A's session (returns 404 safe error)
    get_b_resp = client.get(
        f"/api/v1/advisor/sessions/{session_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert get_b_resp.status_code == 404

    # Anonymous user cannot access User A's private session
    get_anon_resp = client.get(f"/api/v1/advisor/sessions/{session_id}")
    assert get_anon_resp.status_code == 404
