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
const demoModeRequested = import.meta.env.VITE_DEMO_MODE === "true";
const API_BASE_URL = demoModeRequested ? "" : configuredApiUrl || (isLocalBrowser ? "http://localhost:8000" : "/api");

export const isDemoMode = API_BASE_URL === "";
export const apiMode = isDemoMode ? "browser" : isLocalBrowser ? "local" : "hosted";

type FallbackListener = (active: boolean) => void;

let fallbackActive = isDemoMode;
const fallbackListeners = new Set<FallbackListener>();

class ApiResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function setFallbackActive(active: boolean) {
  if (fallbackActive === active) {
    return;
  }
  fallbackActive = active;
  fallbackListeners.forEach((listener) => listener(active));
}

export function subscribeToApiFallback(listener: FallbackListener) {
  fallbackListeners.add(listener);
  listener(fallbackActive);
  return () => {
    fallbackListeners.delete(listener);
  };
}

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
    throw new ApiResponseError(body.detail ?? response.statusText, response.status);
  }

  return response.json() as Promise<T>;
}

async function withDemoFallback<T>(apiCall: () => Promise<T>, demoCall: () => T): Promise<T> {
  if (isDemoMode) {
    return demoCall();
  }

  try {
    const result = await apiCall();
    if (apiMode === "hosted") {
      setFallbackActive(false);
    }
    return result;
  } catch (error) {
    const canFallback = apiMode === "hosted" && (!(error instanceof ApiResponseError) || error.status >= 500);
    if (!canFallback) {
      throw error;
    }
    setFallbackActive(true);
    return demoCall();
  }
}

export function listDeployments(): Promise<DeploymentRecord[]> {
  return withDemoFallback(
    () => request<DeploymentRecord[]>("/deployments"),
    () => listDemoDeployments(),
  );
}

export function deployService(payload: DeployPayload): Promise<{ deployment: DeploymentRecord }> {
  return withDemoFallback(
    () => request<{ deployment: DeploymentRecord }>("/deploy", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    () => deployDemoService(payload),
  );
}

export function deleteDeployment(name: string): Promise<{ status: string; name: string }> {
  return withDemoFallback(
    () => request<{ status: string; name: string }>(`/deployment/${name}`, { method: "DELETE" }),
    () => deleteDemoDeployment(name),
  );
}

export function getMetrics(service: string): Promise<ServiceMetrics> {
  return withDemoFallback(
    () => request<ServiceMetrics>(`/metrics/${service}`),
    () => getDemoMetrics(service),
  );
}

export function getLogs(service: string): Promise<LogsResponse> {
  return withDemoFallback(
    () => request<LogsResponse>(`/logs/${service}`),
    () => getDemoLogs(service),
  );
}

export function listAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  return withDemoFallback(
    () => request<AuditLogEntry[]>(`/audit-logs?limit=${limit}`),
    () => listDemoAuditLogs(limit),
  );
}

export function resetSandbox() {
  resetDemoState();
}
