from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # check a known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    # Ensure test activity exists and start with clean copy
    activity_name = "Programming Class"
    test_email = "test.student@example.com"

    # Ensure not already present
    activity = activities[activity_name]
    # Remove if exists from previous runs
    activity["participants"] = [p for p in activity.get("participants", []) if p.strip().lower() != test_email]

    # Signup
    resp = client.post(f"/activities/{activity_name}/signup?email={test_email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # Confirm participant in activity
    resp = client.get("/activities")
    data = resp.json()
    participants = data[activity_name]["participants"]
    assert any(p.strip().lower() == test_email for p in participants)

    # Unregister
    resp = client.delete(f"/activities/{activity_name}/participants?email={test_email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Unregistered" in body.get("message", "")

    # Confirm removed
    resp = client.get("/activities")
    data = resp.json()
    participants = data[activity_name]["participants"]
    assert all(p.strip().lower() != test_email for p in participants)


def test_signup_duplicate_fails():
    activity_name = "Gym Class"
    email = "dup.student@example.com"

    # Ensure the email exists once
    activities[activity_name]["participants"] = [email]

    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 400
    body = resp.json()
    assert body.get("detail") == "Student is already signed up"


def test_unregister_nonexistent_fails():
    activity_name = "Soccer Team"
    email = "no.such@student.example"

    # Ensure email not present
    activities[activity_name]["participants"] = [p for p in activities[activity_name].get("participants", []) if p.strip().lower() != email]

    resp = client.delete(f"/activities/{activity_name}/participants?email={email}")
    assert resp.status_code == 404
    body = resp.json()
    assert body.get("detail") == "Participant not found"
