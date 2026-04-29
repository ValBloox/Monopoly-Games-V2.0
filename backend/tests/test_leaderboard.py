"""Backend API tests for Monopoli Merdeka 1945 leaderboard endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://papan-sejarah.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Health --------
def test_root(session):
    r = session.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "message" in data


# -------- Leaderboard --------
class TestLeaderboard:
    def test_get_initial(self, session):
        r = session.get(f"{API}/leaderboard", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_post_and_persist(self, session):
        payload = {
            "name": "TEST_Soekarno",
            "mode": "KEMERDEKAAN",
            "rounds": 12,
            "money": 1500,
            "properties_count": 8,
            "correct_answers": 3,
        }
        r = session.post(f"{API}/leaderboard", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # Validate fields
        for k, v in payload.items():
            assert body[k] == v, f"{k} mismatch"
        assert "id" in body and isinstance(body["id"], str) and len(body["id"]) > 0
        assert "timestamp" in body
        assert "_id" not in body

        # Verify persisted via GET
        r2 = session.get(f"{API}/leaderboard", timeout=15)
        assert r2.status_code == 200
        rows = r2.json()
        assert any(e.get("id") == body["id"] for e in rows)
        # Ensure no _id in response
        for row in rows:
            assert "_id" not in row

    def test_post_classic_mode(self, session):
        payload = {
            "name": "TEST_Hatta",
            "mode": "KLASIK",
            "rounds": 20,
            "money": 800,
            "properties_count": 5,
            "correct_answers": 0,
        }
        r = session.post(f"{API}/leaderboard", json=payload, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["mode"] == "KLASIK"
        assert body["correct_answers"] == 0

    def test_post_validation_missing_field(self, session):
        # missing money etc
        r = session.post(f"{API}/leaderboard", json={"name": "TEST_Bad"}, timeout=15)
        assert r.status_code in (400, 422)

    def test_post_validation_wrong_type(self, session):
        payload = {
            "name": "TEST_Wrong",
            "mode": "KLASIK",
            "rounds": "ten",  # should be int
            "money": 100,
            "properties_count": 2,
            "correct_answers": 1,
        }
        r = session.post(f"{API}/leaderboard", json=payload, timeout=15)
        assert r.status_code in (400, 422)


# -------- Status (existing endpoint) --------
class TestStatus:
    def test_post_status(self, session):
        r = session.post(f"{API}/status", json={"client_name": "TEST_client"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["client_name"] == "TEST_client"
        assert "id" in body
        assert "_id" not in body

    def test_get_status(self, session):
        r = session.get(f"{API}/status", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        for row in rows:
            assert "_id" not in row
