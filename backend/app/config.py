"""Runtime configuration for the InfraWatch API.

All operational settings are read from environment variables so secrets and
cluster-specific values never need to be hardcoded in source control.
"""

from functools import lru_cache
from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

    app_name: str = "InfraWatch API"
    environment: str = "development"
    log_level: str = "INFO"

    cors_origins: Annotated[
        list[str],
        Field(
            default_factory=lambda: [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        ),
    ]

    state_file: str = "/tmp/infrawatch/deployments.json"
    execute_kubectl: bool = False
    kubectl_binary: str = "kubectl"
    kubectl_namespace: str = "infrawatch"

    prometheus_url: str = "http://prometheus:9090"
    loki_url: str = "http://loki:3100"
    observability_timeout_seconds: float = 4.0
    allow_mock_observability: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="INFRAWATCH_",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings object for dependency injection."""

    return Settings()
