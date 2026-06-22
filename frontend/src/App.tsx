// Main InfraWatch dashboard experience.
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Gauge,
  GitBranch,
  HardDrive,
  Layers,
  RefreshCw,
  RotateCcw,
  Rocket,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  apiMode,
  deleteDeployment,
  deployService,
  getLogs,
  getMetrics,
  isDemoMode,
  listAuditLogs,
  listDeployments,
  resetSandbox,
} from "./api";
import type {
  AuditLogEntry,
  DeploymentRecord,
  DeploymentStatus,
  LogsResponse,
  ServiceMetrics,
} from "./types";

const STATUS_THEME: Record<DeploymentStatus, { color: string; label: string; icon: ReactNode }> = {
  Running: { color: "#3ddc97", label: "Healthy", icon: <CheckCircle2 size={14} /> },
  Pending: { color: "#f5b942", label: "Pending", icon: <Clock size={14} /> },
  Failed: { color: "#ff5f6d", label: "Failed", icon: <AlertTriangle size={14} /> },
  Deleting: { color: "#9aa4b2", label: "Deleting", icon: <RefreshCw size={14} /> },
};

const EMPTY_METRICS: ServiceMetrics = {
  service: "",
  cpu_cores: [],
  memory_megabytes: [],
  request_rate: [],
  error_rate: [],
  source: "empty",
};

const EMPTY_LOGS: LogsResponse = { service: "", lines: [], source: "empty" };
const REPOSITORY_URL = "https://github.com/ParthrChandurkar/InfraWatch-Zero-Touch-Deployments-with-Full-Infrastructure-Visibility";
const HOSTED_API_URL = "https://infrawatch-api.vercel.app";

function App() {
  const isHostedApi = apiMode === "hosted";
  const isLocalApi = apiMode === "local";
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [metrics, setMetrics] = useState<ServiceMetrics>(EMPTY_METRICS);
  const [logs, setLogs] = useState<LogsResponse>(EMPTY_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "catalog-api",
    image: "docker.io/example/catalog-api:latest",
    replicas: 2,
    port: 8080,
  });

  const selectedDeployment = deployments.find((item) => item.name === selected) ?? deployments[0] ?? null;

  const summary = useMemo(() => {
    return deployments.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        acc.replicas += item.replicas;
        return acc;
      },
      {
        Running: 0,
        Failed: 0,
        Pending: 0,
        Deleting: 0,
        replicas: 0,
      } as Record<DeploymentStatus, number> & { replicas: number },
    );
  }, [deployments]);

  const refreshDeployments = useCallback(async () => {
    const items = await listDeployments();
    setDeployments(items);
    setSelected((current) => items.find((item) => item.name === current)?.name ?? items[0]?.name ?? "");
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    const entries = await listAuditLogs(30);
    setAuditLogs(entries);
  }, []);

  const refreshObservability = useCallback(async (serviceName: string) => {
    const [metricResponse, logResponse] = await Promise.all([
      getMetrics(serviceName),
      getLogs(serviceName),
    ]);
    setMetrics(metricResponse);
    setLogs(logResponse);
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([refreshDeployments(), refreshAuditLogs()])
      .catch((reason: Error) => isMounted && setError(reason.message))
      .finally(() => isMounted && setIsLoading(false));
    return () => {
      isMounted = false;
    };
  }, [refreshAuditLogs, refreshDeployments]);

  useEffect(() => {
    const serviceName = selectedDeployment?.name;
    if (!serviceName) {
      setMetrics(EMPTY_METRICS);
      setLogs(EMPTY_LOGS);
      return;
    }

    let isMounted = true;
    const load = () =>
      refreshObservability(serviceName).catch((reason: Error) => {
        if (isMounted) {
          setError(reason.message);
        }
      });

    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [refreshObservability, selectedDeployment?.name]);

  async function handleRefresh() {
    setError("");
    try {
      await refreshDeployments();
      await refreshAuditLogs();
      if (selectedDeployment?.name) {
        await refreshObservability(selectedDeployment.name);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refresh failed");
    }
  }

  async function handleDeploy(event: FormEvent) {
    event.preventDefault();
    setIsDeploying(true);
    setError("");
    try {
      const response = await deployService({
        name: form.name.trim(),
        image: form.image.trim(),
        replicas: form.replicas,
        port: form.port,
        environment: { ENVIRONMENT: "production" },
      });
      await refreshDeployments();
      await refreshAuditLogs();
      setSelected(response.deployment.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  }

  async function handleDelete(name: string) {
    if (!window.confirm(`Remove ${name} from ${isDemoMode ? "your browser sandbox" : "InfraWatch"}?`)) {
      return;
    }
    setError("");
    try {
      await deleteDeployment(name);
      await refreshDeployments();
      await refreshAuditLogs();
      setSelected("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delete failed");
    }
  }

  async function handleResetSandbox() {
    resetSandbox();
    setError("");
    setIsLoading(true);
    try {
      await Promise.all([refreshDeployments(), refreshAuditLogs()]);
    } finally {
      setIsLoading(false);
    }
  }

  const liveChartData = useMemo(
    () =>
      metrics.cpu_cores.map((point, index) => ({
        time: new Date(point.timestamp * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cpu: point.value,
        memory: metrics.memory_megabytes[index]?.value ?? 0,
        requests: metrics.request_rate[index]?.value ?? 0,
        errors: metrics.error_rate[index]?.value ?? 0,
      })),
    [metrics],
  );
  const chartData = useMemo(
    () =>
      liveChartData.length
        ? liveChartData
        : selectedDeployment
          ? buildDemoChartData(selectedDeployment.name)
          : [],
    [liveChartData, selectedDeployment],
  );
  const telemetryMode = liveChartData.length ? sourceLabel(metrics.source) : selectedDeployment ? "Demo baseline" : "Waiting";

  const telemetry = useMemo(() => {
    const latest = chartData[chartData.length - 1];
    const latestErrorRate = Number(latest?.errors ?? 0);
    const healthScore = Math.max(
      0,
      Math.min(100, Math.round(100 - summary.Failed * 20 - summary.Pending * 6 - latestErrorRate * 12)),
    );

    return {
      cpu: Number(latest?.cpu ?? 0),
      memory: Number(latest?.memory ?? 0),
      requests: Number(latest?.requests ?? 0),
      errors: latestErrorRate,
      healthScore,
      peakMemory: maxValue(chartData.map((item) => Number(item.memory))),
      avgCpu: averageValue(chartData.map((item) => Number(item.cpu))),
    };
  }, [chartData, summary.Failed, summary.Pending]);

  const pipelineSteps = [
    { icon: <GitBranch size={17} />, label: "GitHub", value: "main synced", state: "ready" },
    { icon: <Rocket size={17} />, label: "Delivery", value: isHostedApi ? "Vercel production" : "validation gate", state: "ready" },
    { icon: <Layers size={17} />, label: "Deployments", value: isHostedApi ? "Manifest simulation" : "Docker images", state: "ready" },
    { icon: <Server size={17} />, label: "Runtime", value: isHostedApi ? "Vercel + FastAPI" : isDemoMode ? "Browser sandbox" : "Docker Compose", state: "live" },
    { icon: <Gauge size={17} />, label: "Telemetry", value: telemetryMode, state: "live" },
  ];

  const selectedStatus = selectedDeployment?.status ?? "Pending";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">IW</span>
          <div>
            <strong>InfraWatch</strong>
            <small>Zero-touch deployment control</small>
          </div>
        </div>

        <div className="environment-card">
          <div>
            <span>Environment</span>
            <strong>{isHostedApi ? "Hosted FastAPI demo" : isDemoMode ? "Browser sandbox" : "Local full stack"}</strong>
          </div>
          <span className="pulse-dot" />
        </div>

        <button className="refresh-button" type="button" onClick={handleRefresh} title="Refresh dashboard">
          <RefreshCw size={16} />
          Refresh
        </button>

        {isDemoMode && (
          <button className="reset-button" type="button" onClick={handleResetSandbox} title="Restore sample services">
            <RotateCcw size={16} />
            Reset sandbox
          </button>
        )}

        <nav className="service-list" aria-label="Deployed services">
          <div className="sidebar-label">Service Fleet</div>
          {deployments.map((deployment) => (
            <button
              className={`service-item ${deployment.name === selectedDeployment?.name ? "active" : ""}`}
              key={deployment.name}
              onClick={() => setSelected(deployment.name)}
              type="button"
            >
              <span className="status-dot" style={{ background: STATUS_THEME[deployment.status].color }} />
              <span>
                <strong>{deployment.name}</strong>
                <small>{deployment.namespace} / {deployment.replicas} replicas</small>
              </span>
              <StatusPill status={deployment.status} />
            </button>
          ))}
          {!deployments.length && !isLoading && (
            <div className="empty-service">
              <Server size={18} />
              <span>No active services</span>
            </div>
          )}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="command-header">
          <div>
            <span className="eyebrow">Production Operations Console</span>
            <h1>InfraWatch Command Center</h1>
            <p>Release orchestration, fleet health, live telemetry, and incident logs in one control plane.</p>
          </div>
          <div className="header-actions" aria-label="External operations tools">
            {!isLocalApi ? (
              <>
                <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                  <GitBranch size={16} />
                  GitHub
                  <ExternalLink size={14} />
                </a>
                <a href={`${REPOSITORY_URL}/blob/main/flow.md`} target="_blank" rel="noreferrer">
                  <GitBranch size={16} />
                  Architecture
                  <ExternalLink size={14} />
                </a>
                <a href={isHostedApi ? `${HOSTED_API_URL}/docs` : `${REPOSITORY_URL}#main-api-endpoints`} target="_blank" rel="noreferrer">
                  <Terminal size={16} />
                  {isHostedApi ? "Live API Docs" : "API Contract"}
                  <ExternalLink size={14} />
                </a>
              </>
            ) : (
              <>
                <a href="http://localhost:3001" target="_blank" rel="noreferrer">
                  <BarChart3 size={16} />
                  Grafana
                  <ExternalLink size={14} />
                </a>
                <a href="http://localhost:9090" target="_blank" rel="noreferrer">
                  <Activity size={16} />
                  Prometheus
                  <ExternalLink size={14} />
                </a>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                  <Terminal size={16} />
                  API Docs
                  <ExternalLink size={14} />
                </a>
              </>
            )}
          </div>
        </header>

        {(isDemoMode || isHostedApi) && <DemoModeBanner hosted={isHostedApi} />}

        {error && <div className="error-banner">{error}</div>}

        <section className="pipeline-strip" aria-label="Delivery pipeline">
          {pipelineSteps.map((step) => (
            <article className={`pipeline-step ${step.state}`} key={step.label}>
              <div className="pipeline-icon">{step.icon}</div>
              <div>
                <span>{step.label}</span>
                <strong>{step.value}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="status-grid" aria-label="Deployment status summary">
          <SummaryCard icon={<ShieldCheck size={20} />} label="Health score" value={`${telemetry.healthScore}%`} tone="green" />
          <SummaryCard icon={<Server size={20} />} label="Running services" value={summary.Running} tone="blue" />
          <SummaryCard icon={<Layers size={20} />} label="Active replicas" value={summary.replicas} tone="violet" />
          <SummaryCard icon={<AlertTriangle size={20} />} label="Open failures" value={summary.Failed} tone="red" />
        </section>

        <div className="dashboard-grid">
          <section className="panel service-overview">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Selected Service</span>
                <h2>{selectedDeployment?.name ?? "No service selected"}</h2>
                <p>{selectedDeployment?.message ?? "Deploy a service to populate the command center."}</p>
              </div>
              {selectedDeployment && <StatusPill status={selectedStatus} size="large" />}
            </div>

            <div className="service-facts">
              <Fact icon={<Layers size={17} />} label="Image" value={selectedDeployment?.image ?? "Waiting for deployment"} />
              <Fact icon={<Server size={17} />} label="Namespace" value={selectedDeployment?.namespace ?? "infrawatch"} />
              <Fact icon={<Zap size={17} />} label="Replicas" value={String(selectedDeployment?.replicas ?? 0)} />
              <Fact icon={<Clock size={17} />} label="Updated" value={selectedDeployment ? relativeTime(selectedDeployment.updated_at) : "Not available"} />
            </div>
          </section>

          <section className="panel deploy-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Release Control</span>
                <h2>Deploy Service</h2>
              </div>
            </div>

            <form className="deploy-form" onSubmit={handleDeploy}>
              {(isDemoMode || isHostedApi) && (
                <p className="sandbox-note">
                  {isHostedApi
                    ? "FastAPI validates this request and generates a Kubernetes manifest. No real workload is started without a connected cluster."
                    : "Try any valid service name and container image. Changes are private to this device."}
                </p>
              )}
              <label>
                Service name
                <input
                  aria-label="Service name"
                  required
                  minLength={2}
                  maxLength={63}
                  pattern="[a-z0-9]([-a-z0-9]*[a-z0-9])?"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="service-name"
                />
              </label>
              <label>
                Container image
                <input
                  aria-label="Container image"
                  required
                  minLength={3}
                  maxLength={255}
                  value={form.image}
                  onChange={(event) => setForm({ ...form, image: event.target.value })}
                  placeholder="registry/image:tag"
                />
              </label>
              <div className="deploy-number-row">
                <label>
                  Replicas
                  <input
                    aria-label="Replica count"
                    type="number"
                    min={1}
                    max={10}
                    value={form.replicas}
                    onChange={(event) => setForm({ ...form, replicas: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Port
                  <input
                    aria-label="Service port"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port}
                    onChange={(event) => setForm({ ...form, port: Number(event.target.value) })}
                  />
                </label>
              </div>
              <button type="submit" disabled={isDeploying}>
                <Rocket size={17} />
                {isDeploying ? "Deploying" : "Deploy"}
              </button>
            </form>
          </section>

          <MetricChart area="cpu-card" title="CPU Allocation" value={`${telemetry.cpu.toFixed(2)} cores`} data={chartData} dataKey="cpu" color="#4da3ff" icon={<Cpu size={18} />} />
          <MetricChart area="memory-card" title="Memory Pressure" value={`${Math.round(telemetry.memory)} MB`} data={chartData} dataKey="memory" color="#3ddc97" icon={<HardDrive size={18} />} />
          <MetricChart area="requests-card" title="Request Throughput" value={`${telemetry.requests.toFixed(1)} rps`} data={chartData} dataKey="requests" color="#b38cff" icon={<Activity size={18} />} />
          <MetricChart area="errors-card" title="Error Rate" value={`${telemetry.errors.toFixed(2)} rps`} data={chartData} dataKey="errors" color="#ff6b7a" icon={<AlertTriangle size={18} />} />

          <section className="panel fleet-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Deployment Inventory</span>
                <h2>Service Fleet</h2>
              </div>
              <span className="data-source">{deployments.length} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Replicas</th>
                    <th>Image</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((deployment) => (
                    <tr key={deployment.name}>
                      <td>
                        <button className="table-service" type="button" onClick={() => setSelected(deployment.name)}>
                          {deployment.name}
                        </button>
                      </td>
                      <td><StatusPill status={deployment.status} /></td>
                      <td>{deployment.replicas}</td>
                      <td className="image-cell">{deployment.image}</td>
                      <td>{relativeTime(deployment.updated_at)}</td>
                      <td>
                        <button className="table-action" type="button" onClick={() => handleDelete(deployment.name)} title="Delete deployment">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!deployments.length && (
                    <tr>
                      <td colSpan={6} className="empty-row">No services have been deployed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel logs-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Runtime Logs</span>
                <h2><Terminal size={18} /> Live Stream</h2>
              </div>
              <span className="data-source">{sourceLabel(logs.source)}</span>
            </div>
            <div className="log-viewer">
              {logs.lines.map((entry) => (
                <div className="log-line" key={`${entry.timestamp}-${entry.line}`}>
                  <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                  <code>{entry.line}</code>
                </div>
              ))}
              {!logs.lines.length && (
                <div className="empty-log">
                  <Terminal size={18} />
                  <span>Waiting for log events</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel audit-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Audit Trail</span>
                <h2><ShieldCheck size={18} /> Recent Actions</h2>
              </div>
              <span className="data-source">{auditLogs.length} events</span>
            </div>
            <div className="audit-list">
              {auditLogs.map((entry) => (
                <div className={`audit-entry ${auditTone(entry.status)}`} key={entry.id}>
                  <span className="audit-marker" />
                  <div>
                    <div className="audit-topline">
                      <strong>{formatAuditAction(entry.action)}</strong>
                      <time>{relativeTime(entry.created_at)}</time>
                    </div>
                    <p>{entry.message}</p>
                    <span>{entry.service ?? "platform"} / {entry.actor}</span>
                  </div>
                </div>
              ))}
              {!auditLogs.length && (
                <div className="empty-log">
                  <ShieldCheck size={18} />
                  <span>No audit events yet</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel readiness-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Platform Signals</span>
                <h2>Readiness</h2>
              </div>
            </div>
            <Signal label="Control plane" value={isHostedApi ? "Hosted FastAPI online" : isDemoMode ? "Browser sandbox ready" : "FastAPI online"} state="ok" />
            <Signal label="Metrics path" value={telemetryMode} state="ok" />
            <Signal label="Average CPU" value={`${telemetry.avgCpu.toFixed(2)} cores`} state="ok" />
            <Signal label="Peak memory" value={`${Math.round(telemetry.peakMemory)} MB`} state="ok" />
            <Signal label="Pending work" value={`${summary.Pending} rollout events`} state={summary.Pending ? "warn" : "ok"} />
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <article className={`summary-card ${tone}`}>
      <div className="summary-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function DemoModeBanner({ hosted }: { hosted: boolean }) {
  return (
    <section className="demo-mode-banner" role="note" aria-label="Demo Mode">
      <div className="demo-mode-title">
        <AlertTriangle size={22} aria-hidden="true" />
        <div>
          <strong>DEMO MODE</strong>
          <span>Portfolio environment</span>
        </div>
      </div>
      <p>
        {hosted
          ? "The FastAPI control plane is live. Kubernetes deployments, Prometheus metrics, and Loki logs use realistic simulation because no cluster is attached."
          : "This frontend-only sandbox keeps all changes in your browser and uses realistic simulated infrastructure data."}
      </p>
      <div className="demo-capabilities" aria-label="Demo capabilities">
        <span className="real">{hosted ? "Live FastAPI" : "Interactive UI"}</span>
        <span>Simulated Kubernetes</span>
        <span>Mock metrics & logs</span>
      </div>
    </section>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="fact">
      <div className="fact-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Signal({ label, value, state }: { label: string; value: string; state: "ok" | "warn" }) {
  return (
    <div className={`signal ${state}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status, size = "default" }: { status: DeploymentStatus; size?: "default" | "large" }) {
  const theme = STATUS_THEME[status];
  return (
    <span className={`status-pill ${size}`} style={{ color: theme.color }}>
      {theme.icon}
      {theme.label}
    </span>
  );
}

function MetricChart({
  area,
  title,
  value,
  data,
  dataKey,
  color,
  icon,
}: {
  area: string;
  title: string;
  value: string;
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <section className={`metric-card ${area}`}>
      <div className="metric-heading">
        <div>
          <span>{title}</span>
          <strong>{value}</strong>
        </div>
        <div className="metric-icon" style={{ color }}>{icon}</div>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#27313c" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#9aa4b2", fontSize: 11 }} stroke="#354252" />
          <YAxis tick={{ fill: "#9aa4b2", fontSize: 11 }} stroke="#354252" width={42} />
          <Tooltip
            contentStyle={{ background: "#121821", border: "1px solid #303b48", borderRadius: 8, color: "#f4f7fb" }}
            labelStyle={{ color: "#f4f7fb" }}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.4} fill={`url(#gradient-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

function sourceLabel(source: string) {
  if (source === "mock") {
    return "Simulated telemetry";
  }
  if (source === "empty") {
    return "Waiting";
  }
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function auditTone(status: string) {
  if (status === "failure") {
    return "failure";
  }
  if (status === "not_found") {
    return "warning";
  }
  return "success";
}

function formatAuditAction(action: string) {
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildDemoChartData(serviceName: string) {
  const seed = serviceName.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const now = Date.now();
  return Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((index + seed) / 2.2);
    const drift = Math.cos((index + seed) / 3.5);
    return {
      time: new Date(now - (11 - index) * 60_000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cpu: Number((0.24 + Math.abs(wave) * 0.19).toFixed(2)),
      memory: Math.round(220 + Math.abs(drift) * 96 + (seed % 37)),
      requests: Number((18 + Math.abs(wave) * 28 + (seed % 9)).toFixed(1)),
      errors: Number((Math.abs(drift) * 0.08).toFixed(2)),
    };
  });
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return new Date(value).toLocaleDateString();
}

function averageValue(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function maxValue(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return Math.max(...values);
}

export default App;
