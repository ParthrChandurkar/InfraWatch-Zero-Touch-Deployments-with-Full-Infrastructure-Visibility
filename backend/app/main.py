"""FastAPI application factory for InfraWatch.

The factory pattern keeps tests isolated and makes production runtime wiring
explicit for deployment platforms.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from app.api import build_router
from app.config import Settings, get_settings
from app.repository import FileAuditLogRepository, FileDeploymentRepository
from app.schemas import DeploymentRequest
from app.services.deployments import DeploymentService
from app.services.observability import LokiClient, PrometheusClient


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""

    active_settings = settings or get_settings()
    app = FastAPI(
        title=active_settings.app_name,
        version="0.1.0",
        description="Cloud-native deployment and observability control plane.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    repository = FileDeploymentRepository(active_settings.state_file)
    audit_repository = FileAuditLogRepository(active_settings.audit_file)
    app.state.settings = active_settings
    app.state.deployment_service = DeploymentService(active_settings, repository, audit_repository)
    app.state.prometheus_client = PrometheusClient(active_settings)
    app.state.loki_client = LokiClient(active_settings)

    if active_settings.seed_demo_data and not repository.list():
        _seed_demo_deployments(app.state.deployment_service)

    app.include_router(build_router())

    @app.get("/", tags=["system"])
    async def root() -> dict[str, str]:
        """Return a friendly API discovery message."""

        return {"service": "InfraWatch API", "docs": "/docs", "health": "/healthz"}

    @app.get("/internal/metrics", include_in_schema=False)
    async def internal_metrics() -> Response:
        """Expose Prometheus metrics for the InfraWatch API itself."""

        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app


def _seed_demo_deployments(service: DeploymentService) -> None:
    """Populate hosted demo runtimes with useful, non-sensitive sample services."""

    for payload in (
        DeploymentRequest(
            name="checkout-api",
            image="ghcr.io/infrawatch/checkout-api:2.4.1",
            replicas=3,
            port=8080,
            environment={"ENVIRONMENT": "demo"},
        ),
        DeploymentRequest(
            name="catalog-api",
            image="ghcr.io/infrawatch/catalog-api:1.9.0",
            replicas=2,
            port=8080,
            environment={"ENVIRONMENT": "demo"},
        ),
        DeploymentRequest(
            name="payments-worker",
            image="ghcr.io/infrawatch/payments-worker:3.2.0",
            replicas=2,
            port=9090,
            environment={"ENVIRONMENT": "demo", "QUEUE": "payments"},
        ),
    ):
        service.deploy(payload)


app = create_app()
