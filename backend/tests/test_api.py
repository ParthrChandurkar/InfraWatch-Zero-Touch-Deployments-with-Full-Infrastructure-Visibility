"""API regression tests for the InfraWatch backend."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def build_client(tmp_path) -> TestClient:
    """Create a test client with isolated JSON state."""

    settings = Settings(
        environment="test",
        state_file=str(tmp_path / "deployments.json"),
        audit_file=str(tmp_path / "audit-log.json"),
        execute_kubectl=False,
        allow_mock_observability=True,
    )
    return TestClient(create_app(settings))


def test_deployment_lifecycle(tmp_path) -> None:
    """A service can be deployed, listed, observed, and deleted."""

    client = build_client(tmp_path)
    payload = {
        "name": "catalog-api",
        "image": "docker.io/example/catalog-api:latest",
        "replicas": 2,
        "port": 8080,
        "environment": {"ENVIRONMENT": "test"},
    }

    deploy_response = client.post("/deploy", json=payload)
    assert deploy_response.status_code == 202
    assert deploy_response.json()["deployment"]["status"] == "Running"

    health = client.get("/healthz")
    assert health.status_code == 200
    assert health.json()["fastapi"] is True
    assert health.json()["deployment_mode"] == "manifest-simulation"

    deployments = client.get("/deployments")
    assert deployments.status_code == 200
    assert deployments.json()[0]["name"] == "catalog-api"

    metrics = client.get("/metrics/catalog-api")
    assert metrics.status_code == 200
    assert metrics.json()["source"] == "mock"
    assert len(metrics.json()["cpu_cores"]) == 15
    assert all(point["value"] >= 0 for point in metrics.json()["error_rate"])

    logs = client.get("/logs/catalog-api")
    assert logs.status_code == 200
    assert logs.json()["lines"]
    assert len({entry["line"] for entry in logs.json()["lines"]}) >= 5
    assert any("[warn]" in entry["line"] for entry in logs.json()["lines"])

    deleted = client.delete("/deployment/catalog-api")
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "deleted"

    audit_logs = client.get("/audit-logs")
    assert audit_logs.status_code == 200
    events = audit_logs.json()
    assert events[0]["action"] == "deployment.deleted"
    assert events[0]["service"] == "catalog-api"
    assert events[1]["action"] == "deployment.simulated"


def test_unknown_deployment_delete_returns_404(tmp_path) -> None:
    """Deleting a missing deployment returns a correct HTTP error."""

    client = build_client(tmp_path)
    response = client.delete("/deployment/missing-api")
    assert response.status_code == 404

    audit_logs = client.get("/audit-logs")
    assert audit_logs.status_code == 200
    assert audit_logs.json()[0]["action"] == "deployment.delete_missing"


def test_hosted_demo_can_seed_sample_services(tmp_path) -> None:
    """Hosted demo runtimes start with useful sample data when explicitly enabled."""

    settings = Settings(
        environment="vercel-demo",
        state_file=str(tmp_path / "deployments.json"),
        audit_file=str(tmp_path / "audit-log.json"),
        execute_kubectl=False,
        seed_demo_data=True,
        allow_mock_observability=True,
    )
    client = TestClient(create_app(settings))

    deployments = client.get("/deployments")
    assert deployments.status_code == 200
    assert {item["name"] for item in deployments.json()} == {
        "catalog-api",
        "checkout-api",
        "payments-worker",
    }
