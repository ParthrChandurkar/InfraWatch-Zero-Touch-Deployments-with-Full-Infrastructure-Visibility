// Thin API wrapper around the InfraWatch backend REST endpoints.
import type { AuditLogEntry, DeployPayload, DeploymentRecord, LogsResponse, ServiceMetrics } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export function listDeployments(): Promise<DeploymentRecord[]> {
  return request<DeploymentRecord[]>("/deployments");
}

export function deployService(payload: DeployPayload): Promise<{ deployment: DeploymentRecord }> {
  return request<{ deployment: DeploymentRecord }>("/deploy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteDeployment(name: string): Promise<{ status: string; name: string }> {
  return request<{ status: string; name: string }>(`/deployment/${name}`, {
    method: "DELETE",
  });
}

export function getMetrics(service: string): Promise<ServiceMetrics> {
  return request<ServiceMetrics>(`/metrics/${service}`);
}

export function getLogs(service: string): Promise<LogsResponse> {
  return request<LogsResponse>(`/logs/${service}`);
}

export function listAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  return request<AuditLogEntry[]>(`/audit-logs?limit=${limit}`);
}
