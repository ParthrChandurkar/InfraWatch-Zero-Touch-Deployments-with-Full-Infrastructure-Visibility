// Main InfraWatch dashboard experience.
import {
  Activity,
  Cpu,
  Database,
  RefreshCw,
  Rocket,
  Server,
  Terminal,
  Trash2,
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  deleteDeployment,
  deployService,
  getLogs,
  getMetrics,
  listDeployments,
} from "./api";
import type { DeploymentRecord, LogsResponse, ServiceMetrics } from "./types";

const STATUS_COLORS = {
  Running: "#23d18b",
  Failed: "#ff5c7a",
  Pending: "#ffd166",
  Deleting: "#8ca3b5",
};

const EMPTY_METRICS: ServiceMetrics = {
  service: "",
  cpu_cores: [],
  memory_megabytes: [],
  request_rate: [],
  error_rate: [],
  source: "empty",
};

function App() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [metrics, setMetrics] = useState<ServiceMetrics>(EMPTY_METRICS);
  const [logs, setLogs] = useState<LogsResponse>({ service: "", lines: [], source: "empty" });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "catalog-api",
    image: "docker.io/example/catalog-api:latest",
    replicas: 2,
    port: 8080,
  });

  const selectedDeployment = deployments.find((item) => item.name === selected) ?? deployments[0];

  const summary = useMemo(() => {
    return deployments.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      { Running: 0, Failed: 0, Pending: 0, Deleting: 0 } as Record<string, number>,
    );
  }, [deployments]);

  const refreshDeployments = useCallback(async () => {
    const items = await listDeployments();
    setDeployments(items);
    setSelected((current) => current || items[0]?.name || "");
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
    refreshDeployments()
      .catch((reason: Error) => isMounted && setError(reason.message))
      .finally(() => isMounted && setIsLoading(false));
    return () => {
      isMounted = false;
    };
  }, [refreshDeployments]);

  useEffect(() => {
    const serviceName = selectedDeployment?.name;
    if (!serviceName) {
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

  async function handleDeploy(event: FormEvent) {
    event.preventDefault();
    setIsDeploying(true);
    setError("");
    try {
      const response = await deployService({
        name: form.name,
        image: form.image,
        replicas: form.replicas,
        port: form.port,
        environment: { ENVIRONMENT: "production" },
      });
      await refreshDeployments();
      setSelected(response.deployment.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  }

  async function handleDelete(name: string) {
    setError("");
    await deleteDeployment(name);
    await refreshDeployments();
    setSelected("");
  }

  const chartData = metrics.cpu_cores.map((point, index) => ({
    time: new Date(point.timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    cpu: point.value,
    memory: metrics.memory_megabytes[index]?.value ?? 0,
    requests: metrics.request_rate[index]?.value ?? 0,
    errors: metrics.error_rate[index]?.value ?? 0,
  }));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">IW</span>
          <div>
            <strong>InfraWatch</strong>
            <small>Deployments</small>
          </div>
        </div>

        <button className="refresh-button" type="button" onClick={refreshDeployments} title="Refresh deployments">
          <RefreshCw size={16} />
          Refresh
        </button>

        <nav className="service-list" aria-label="Deployed services">
          {deployments.map((deployment) => (
            <button
              className={`service-item ${deployment.name === selectedDeployment?.name ? "active" : ""}`}
              key={deployment.name}
              onClick={() => setSelected(deployment.name)}
              type="button"
            >
              <span className="status-dot" style={{ background: STATUS_COLORS[deployment.status] }} />
              <span>
                <strong>{deployment.name}</strong>
                <small>{deployment.namespace}</small>
              </span>
            </button>
          ))}
          {!deployments.length && !isLoading && <p className="empty-state">No services deployed yet.</p>}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Cloud-Native Application Monitoring</h1>
            <p>CI/CD control plane with service metrics, status, and logs.</p>
          </div>
          <form className="deploy-form" onSubmit={handleDeploy}>
            <input
              aria-label="Service name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="service-name"
            />
            <input
              aria-label="Container image"
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
              placeholder="registry/image:tag"
            />
            <input
              aria-label="Replica count"
              type="number"
              min={1}
              max={10}
              value={form.replicas}
              onChange={(event) => setForm({ ...form, replicas: Number(event.target.value) })}
            />
            <input
              aria-label="Service port"
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(event) => setForm({ ...form, port: Number(event.target.value) })}
            />
            <button type="submit" disabled={isDeploying}>
              <Rocket size={16} />
              {isDeploying ? "Deploying" : "Deploy"}
            </button>
          </form>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="status-grid" aria-label="Deployment status summary">
          <StatusCard icon={<Server size={20} />} label="Running" value={summary.Running} tone="green" />
          <StatusCard icon={<Activity size={20} />} label="Pending" value={summary.Pending} tone="yellow" />
          <StatusCard icon={<Cpu size={20} />} label="Failed" value={summary.Failed} tone="red" />
          <StatusCard icon={<Database size={20} />} label="Total" value={deployments.length} tone="blue" />
        </section>

        <section className="workspace">
          <div className="observability-panel">
            <div className="panel-heading">
              <div>
                <h2>{selectedDeployment?.name ?? "Select a service"}</h2>
                <p>{selectedDeployment?.message ?? "Deployment details will appear here."}</p>
              </div>
              {selectedDeployment && (
                <button className="icon-button" type="button" onClick={() => handleDelete(selectedDeployment.name)} title="Delete deployment">
                  <Trash2 size={17} />
                </button>
              )}
            </div>

            <div className="chart-row">
              <MetricChart title="CPU Cores" data={chartData} dataKey="cpu" color="#2f9bff" />
              <MetricChart title="Memory MB" data={chartData} dataKey="memory" color="#23d18b" />
            </div>
            <div className="chart-row">
              <MetricChart title="Request Rate" data={chartData} dataKey="requests" color="#9d7bff" />
              <MetricChart title="Error Rate" data={chartData} dataKey="errors" color="#ff5c7a" />
            </div>
          </div>

          <div className="logs-panel">
            <div className="panel-heading compact">
              <h2><Terminal size={18} /> Live Logs</h2>
              <span>{logs.source}</span>
            </div>
            <div className="log-viewer">
              {logs.lines.map((entry) => (
                <div className="log-line" key={`${entry.timestamp}-${entry.line}`}>
                  <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                  <code>{entry.line}</code>
                </div>
              ))}
              {!logs.lines.length && <p className="empty-state">Waiting for log lines.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) {
  return (
    <article className={`status-card ${tone}`}>
      <div className="status-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function MetricChart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
}) {
  return (
    <article className="metric-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fill: "#8ca3b5", fontSize: 11 }} stroke="#23384a" />
          <YAxis tick={{ fill: "#8ca3b5", fontSize: 11 }} stroke="#23384a" width={42} />
          <Tooltip
            contentStyle={{ background: "#101923", border: "1px solid #24384d", borderRadius: 8 }}
            labelStyle={{ color: "#e8f1fb" }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </article>
  );
}

export default App;
