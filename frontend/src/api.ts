// Thin API wrapper around the InfraWatch backend REST endpoints.
import type { AuditLogEntry, DeployPayload, DeploymentRecord, LogsResponse, ServiceMetrics } from "./types";
import {
  deleteDemoDeployment,
  deployDemoService,
  getDemoLogs,
  getDemoMetrics,
  listDemoAuditLogs,
  listDemoDeployments,
  resetDemoState,
} from "./demoStore";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isLocalBrowser = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE_URL = configuredApiUrl || (isLocalBrowser ? "http://localhost:8000" : "");

export const isDemoMode = API_BASE_URL === "";

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
  if (isDemoMode) {
    return Promise.resolve(listDemoDeployments());
  }
  return request<DeploymentRecord[]>("/deployments");
}

export function deployService(payload: DeployPayload): Promise<{ deployment: DeploymentRecord }> {
  if (isDemoMode) {
    return Promise.resolve(deployDemoService(payload));
  }
  return request<{ deployment: DeploymentRecord }>("/deploy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteDeployment(name: string): Promise<{ status: string; name: string }> {
  if (isDemoMode) {
    return Promise.resolve(deleteDemoDeployment(name));
  }
  return request<{ status: string; name: string }>(`/deployment/${name}`, {
    method: "DELETE",
  });
}

export function getMetrics(service: string): Promise<ServiceMetrics> {
  if (isDemoMode) {
    return Promise.resolve(getDemoMetrics(service));
  }
  return request<ServiceMetrics>(`/metrics/${service}`);
}

export function getLogs(service: string): Promise<LogsResponse> {
  if (isDemoMode) {
    return Promise.resolve(getDemoLogs(service));
  }
  return request<LogsResponse>(`/logs/${service}`);
}

export function listAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  if (isDemoMode) {
    return Promise.resolve(listDemoAuditLogs(limit));
  }
  return request<AuditLogEntry[]>(`/audit-logs?limit=${limit}`);
}

export function resetSandbox() {
  if (isDemoMode) {
    resetDemoState();
  }
}
