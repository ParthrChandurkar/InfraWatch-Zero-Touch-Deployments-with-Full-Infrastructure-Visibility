// Shared TypeScript types for InfraWatch API responses.
export type DeploymentStatus = "Running" | "Failed" | "Pending" | "Deleting";

export interface DeploymentRecord {
  name: string;
  image: string;
  namespace: string;
  replicas: number;
  port: number;
  status: DeploymentStatus;
  url?: string;
  commit_sha?: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface DeployPayload {
  name: string;
  image: string;
  replicas: number;
  port: number;
  environment: Record<string, string>;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface ServiceMetrics {
  service: string;
  cpu_cores: MetricPoint[];
  memory_megabytes: MetricPoint[];
  request_rate: MetricPoint[];
  error_rate: MetricPoint[];
  source: string;
}

export interface LogLine {
  timestamp: string;
  line: string;
}

export interface LogsResponse {
  service: string;
  lines: LogLine[];
  source: string;
}
