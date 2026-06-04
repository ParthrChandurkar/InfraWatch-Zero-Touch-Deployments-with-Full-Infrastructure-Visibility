"""Deployment orchestration service.

This service translates InfraWatch deployment requests into Kubernetes
Deployment and Service manifests, then optionally applies them with kubectl.
"""

from __future__ import annotations

import subprocess
from typing import Any

import yaml

from app.config import Settings
from app.repository import FileDeploymentRepository, utc_now
from app.schemas import DeploymentRecord, DeploymentRequest, DeploymentResponse, DeploymentStatus


class DeploymentExecutionError(RuntimeError):
    """Raised when kubectl fails to apply or delete a workload."""


class DeploymentService:
    """Coordinates deployment persistence and Kubernetes operations."""

    def __init__(self, settings: Settings, repository: FileDeploymentRepository) -> None:
        self._settings = settings
        self._repository = repository

    def list_deployments(self) -> list[DeploymentRecord]:
        """List deployments known by InfraWatch."""

        return self._repository.list()

    def deploy(self, request: DeploymentRequest) -> DeploymentResponse:
        """Create or update Kubernetes resources for a service."""

        namespace = request.namespace or self._settings.kubectl_namespace
        now = utc_now()
        existing = self._repository.get(request.name)
        manifest = self._build_manifest(request, namespace)

        status = DeploymentStatus.pending if self._settings.execute_kubectl else DeploymentStatus.running
        message = "Deployment accepted and is pending Kubernetes rollout."
        if not self._settings.execute_kubectl:
            message = "Deployment simulated locally because kubectl execution is disabled."

        record = DeploymentRecord(
            name=request.name,
            image=request.image,
            namespace=namespace,
            replicas=request.replicas,
            port=request.port,
            status=status,
            url=f"http://{request.name}.{namespace}.svc.cluster.local:{request.port}",
            commit_sha=request.commit_sha,
            message=message,
            created_at=existing.created_at if existing else now,
            updated_at=now,
        )
        self._repository.upsert(record)

        if self._settings.execute_kubectl:
            self._kubectl_apply(manifest)
            record.status = DeploymentStatus.running
            record.message = "Kubernetes resources applied successfully."
            record.updated_at = utc_now()
            self._repository.upsert(record)

        return DeploymentResponse(deployment=record, kubernetes_manifest=manifest)

    def delete(self, name: str) -> DeploymentRecord | None:
        """Remove a service from Kubernetes and the local state store."""

        existing = self._repository.get(name)
        if existing is None:
            return None

        if self._settings.execute_kubectl:
            self._kubectl_delete(existing.name, existing.namespace)

        return self._repository.delete(name)

    def _build_manifest(self, request: DeploymentRequest, namespace: str) -> dict[str, Any]:
        """Build a Kubernetes List manifest for the service workload."""

        labels = {
            "app.kubernetes.io/name": request.name,
            "app.kubernetes.io/part-of": "infrawatch-managed",
            **request.labels,
        }
        env = [{"name": key, "value": value} for key, value in sorted(request.environment.items())]

        deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {"name": request.name, "namespace": namespace, "labels": labels},
            "spec": {
                "replicas": request.replicas,
                "selector": {"matchLabels": {"app.kubernetes.io/name": request.name}},
                "template": {
                    "metadata": {
                        "labels": labels,
                        "annotations": {
                            "prometheus.io/scrape": "true",
                            "prometheus.io/port": str(request.port),
                        },
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": request.name,
                                "image": request.image,
                                "imagePullPolicy": "IfNotPresent",
                                "ports": [{"containerPort": request.port, "name": "http"}],
                                "env": env,
                                "resources": {
                                    "requests": {"cpu": "100m", "memory": "128Mi"},
                                    "limits": {"cpu": "500m", "memory": "512Mi"},
                                },
                                "readinessProbe": {
                                    "httpGet": {"path": "/healthz", "port": "http"},
                                    "initialDelaySeconds": 10,
                                    "periodSeconds": 10,
                                },
                                "livenessProbe": {
                                    "httpGet": {"path": "/healthz", "port": "http"},
                                    "initialDelaySeconds": 20,
                                    "periodSeconds": 20,
                                },
                            }
                        ]
                    },
                },
            },
        }

        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {"name": request.name, "namespace": namespace, "labels": labels},
            "spec": {
                "selector": {"app.kubernetes.io/name": request.name},
                "ports": [{"port": request.port, "targetPort": "http", "name": "http"}],
            },
        }

        return {"apiVersion": "v1", "kind": "List", "items": [deployment, service]}

    def _kubectl_apply(self, manifest: dict[str, Any]) -> None:
        """Apply a manifest by streaming YAML to kubectl."""

        self._run_kubectl(["apply", "-f", "-"], stdin=yaml.safe_dump(manifest))

    def _kubectl_delete(self, name: str, namespace: str) -> None:
        """Delete workload resources for one service."""

        self._run_kubectl(
            [
                "delete",
                f"deployment/{name}",
                f"service/{name}",
                "--namespace",
                namespace,
                "--ignore-not-found=true",
            ]
        )

    def _run_kubectl(self, args: list[str], stdin: str | None = None) -> None:
        """Execute kubectl and surface a clean domain-specific error."""

        command = [self._settings.kubectl_binary, *args]
        result = subprocess.run(
            command,
            input=stdin,
            capture_output=True,
            check=False,
            text=True,
            timeout=45,
        )
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip() or "kubectl failed"
            raise DeploymentExecutionError(detail)
