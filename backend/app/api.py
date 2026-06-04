"""HTTP routes for the InfraWatch REST API.

Routes are intentionally thin and delegate orchestration to services stored on
FastAPI application state.
"""

from fastapi import APIRouter, HTTPException, Request, status
from prometheus_client import Counter, Histogram

from app.schemas import DeploymentRequest, DeploymentResponse, LogsResponse, ServiceMetrics
from app.services.deployments import DeploymentExecutionError

DEPLOYMENT_COUNTER = Counter("infrawatch_deployments_total", "Deployment actions accepted by InfraWatch")
REQUEST_TIMER = Histogram("infrawatch_api_request_seconds", "InfraWatch API route execution time", ["route"])


def build_router() -> APIRouter:
    """Build the API router with all public InfraWatch endpoints."""

    router = APIRouter()

    @router.get("/healthz", tags=["system"])
    async def healthz() -> dict[str, str]:
        """Return a lightweight health signal for probes and load balancers."""

        return {"status": "ok"}

    @router.post(
        "/deploy",
        response_model=DeploymentResponse,
        status_code=status.HTTP_202_ACCEPTED,
        tags=["deployments"],
    )
    async def deploy(payload: DeploymentRequest, request: Request) -> DeploymentResponse:
        """Trigger or update a service deployment."""

        with REQUEST_TIMER.labels(route="/deploy").time():
            try:
                response = request.app.state.deployment_service.deploy(payload)
                DEPLOYMENT_COUNTER.inc()
                return response
            except DeploymentExecutionError as exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    @router.get("/deployments", tags=["deployments"])
    async def deployments(request: Request):
        """List all deployments known to InfraWatch."""

        with REQUEST_TIMER.labels(route="/deployments").time():
            return request.app.state.deployment_service.list_deployments()

    @router.get("/metrics/{service}", response_model=ServiceMetrics, tags=["observability"])
    async def metrics(service: str, request: Request) -> ServiceMetrics:
        """Return service-level Prometheus metrics for dashboard charts."""

        with REQUEST_TIMER.labels(route="/metrics/{service}").time():
            try:
                return await request.app.state.prometheus_client.service_metrics(service)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to read metrics from Prometheus",
                ) from exc

    @router.get("/logs/{service}", response_model=LogsResponse, tags=["observability"])
    async def logs(service: str, request: Request) -> LogsResponse:
        """Return recent Loki log lines for a service."""

        with REQUEST_TIMER.labels(route="/logs/{service}").time():
            try:
                return await request.app.state.loki_client.logs(service)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to read logs from Loki",
                ) from exc

    @router.delete("/deployment/{name}", status_code=status.HTTP_200_OK, tags=["deployments"])
    async def delete_deployment(name: str, request: Request) -> dict[str, str]:
        """Tear down a deployment and remove its InfraWatch state."""

        with REQUEST_TIMER.labels(route="/deployment/{name}").time():
            try:
                deleted = request.app.state.deployment_service.delete(name)
            except DeploymentExecutionError as exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
            if deleted is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found")
            return {"status": "deleted", "name": name}

    return router
