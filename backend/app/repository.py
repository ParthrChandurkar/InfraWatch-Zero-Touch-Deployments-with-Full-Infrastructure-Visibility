"""Small persistence layer for deployment records.

The repository uses a JSON file so the app works out of the box in local
development, while keeping the API boundary easy to replace with PostgreSQL.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import uuid4

from app.schemas import AuditLogEntry, DeploymentRecord


class FileDeploymentRepository:
    """Thread-safe JSON-backed repository for deployment records."""

    def __init__(self, state_file: str) -> None:
        self._path = Path(state_file)
        self._lock = Lock()

    def list(self) -> list[DeploymentRecord]:
        """Return all known deployments sorted by most recent update."""

        with self._lock:
            records = self._read()
        return sorted(records.values(), key=lambda item: item.updated_at, reverse=True)

    def get(self, name: str) -> DeploymentRecord | None:
        """Return one deployment record by name."""

        with self._lock:
            return self._read().get(name)

    def upsert(self, record: DeploymentRecord) -> DeploymentRecord:
        """Insert or replace a deployment record."""

        with self._lock:
            records = self._read()
            records[record.name] = record
            self._write(records)
        return record

    def delete(self, name: str) -> DeploymentRecord | None:
        """Delete one deployment record if present."""

        with self._lock:
            records = self._read()
            removed = records.pop(name, None)
            self._write(records)
        return removed

    def _read(self) -> dict[str, DeploymentRecord]:
        """Read the state file and hydrate Pydantic records."""

        if not self._path.exists():
            return {}
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        return {name: DeploymentRecord.model_validate(item) for name, item in raw.items()}

    def _write(self, records: dict[str, DeploymentRecord]) -> None:
        """Persist records with an atomic replace to avoid partial writes."""

        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            name: record.model_dump(mode="json")
            for name, record in records.items()
        }
        tmp_path = self._path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        tmp_path.replace(self._path)


class FileAuditLogRepository:
    """Thread-safe JSON-backed append-only audit log repository."""

    def __init__(self, audit_file: str, max_entries: int = 500) -> None:
        self._path = Path(audit_file)
        self._max_entries = max_entries
        self._lock = Lock()

    def append(
        self,
        *,
        action: str,
        status: str,
        message: str,
        service: str | None = None,
        actor: str = "system",
        metadata: dict | None = None,
    ) -> AuditLogEntry:
        """Append one immutable event and keep the newest records."""

        entry = AuditLogEntry(
            id=str(uuid4()),
            action=action,
            service=service,
            actor=actor,
            status=status,
            message=message,
            metadata=metadata or {},
            created_at=utc_now(),
        )
        with self._lock:
            entries = self._read()
            entries.append(entry)
            entries = entries[-self._max_entries :]
            self._write(entries)
        return entry

    def list(self, limit: int = 100) -> list[AuditLogEntry]:
        """Return newest audit entries first."""

        with self._lock:
            entries = self._read()
        return list(reversed(entries))[:limit]

    def _read(self) -> list[AuditLogEntry]:
        """Read and hydrate persisted audit log entries."""

        if not self._path.exists():
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        return [AuditLogEntry.model_validate(item) for item in raw]

    def _write(self, entries: list[AuditLogEntry]) -> None:
        """Persist audit entries with an atomic replace."""

        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = [entry.model_dump(mode="json") for entry in entries]
        tmp_path = self._path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        tmp_path.replace(self._path)


def utc_now() -> datetime:
    """Return timezone-aware UTC timestamps for consistent API output."""

    return datetime.now(UTC)
