# Red Hat SRE Interview Brief

## 1. 60-second explanation

InfraWatch is a cloud-native SRE portfolio platform that lets a user deploy a containerized service and observe its rollout, metrics, logs, and audit trail. The public Vercel version is clearly marked Demo Mode. The real local mode runs on Minikube with FastAPI, React, PostgreSQL, Kubernetes, Prometheus, Grafana, Loki, Promtail, Alertmanager, Terraform, Helm, and GitHub Actions.

## 2. 2-minute explanation

The dashboard sends deployment requests to FastAPI. FastAPI validates the payload, generates Kubernetes resources, applies them with kubectl, waits for rollout status, verifies ready/available replicas, and stores deployment/audit state in PostgreSQL. Prometheus collects Kubernetes and application metrics. Loki receives logs from Promtail. Grafana visualizes cluster/service/HPA data. Alertmanager handles alerts such as crash loops. GitHub Actions validates, builds, pushes SHA-tagged Docker images, and deploys to Kubernetes when a reachable kubeconfig is configured.

## 3. Complete architecture

```text
Browser -> React -> Nginx /api proxy -> FastAPI
FastAPI -> kubectl -> Kubernetes Deployment/Service
Kubernetes -> Prometheus/Loki -> FastAPI/Grafana -> React
Prometheus -> Alertmanager -> webhook receiver
metrics-server -> HPA -> backend replicas
```

## 4. Deployment workflow

1. User submits service name/image/replicas/port.
2. FastAPI validates input.
3. FastAPI generates Deployment and Service YAML.
4. FastAPI applies YAML.
5. FastAPI waits for `kubectl rollout status`.
6. FastAPI verifies ready and available replicas.
7. State becomes `Running` or `Failed`.

## 5. Observability workflow

- Metrics: Prometheus scrapes pod/app/Kubernetes metrics.
- Logs: Promtail ships stdout/stderr to Loki.
- Alerts: Prometheus rules fire into Alertmanager.
- Dashboard: React polls FastAPI every 5 seconds.

## 6. HPA workflow

Traffic increases backend CPU. metrics-server exposes CPU utilization. HPA compares current CPU utilization to 70% target and changes desired replicas between 2 and 6.

## 7. Failure troubleshooting

Crash loop:

```bash
kubectl describe pod <pod> -n infrawatch
kubectl logs <pod> -n infrawatch --previous
```

Image pull:

```bash
kubectl describe pod <pod> -n infrawatch
```

HPA:

```bash
kubectl describe hpa infrawatch-backend -n infrawatch
kubectl top pods -n infrawatch
```

## 8. Technology choices

- FastAPI: typed API and OpenAPI docs.
- React: interactive dashboard.
- Docker: reproducible runtime.
- Kubernetes: deployment, rollout, service discovery, autoscaling.
- Terraform/Helm: observability installation.
- Prometheus/Grafana: metrics and dashboards.
- Loki/Promtail: logs.
- Alertmanager: alert routing.
- PostgreSQL: durable deployment/audit state.

## 9. Tradeoffs

- Minikube is local and demonstrable, not production infrastructure.
- Nginx `/api` proxy is simpler than Ingress for local demo.
- Polling logs every 5 seconds is simpler than WebSockets.
- No auth yet, so this is not a multi-user production control plane.

## 10. Limitations

- No authentication/authorization.
- No TLS/Ingress production exposure.
- GitHub Actions deployment needs a reachable cluster.
- 60% cycle-time claim is unsupported until measured.
- Full runtime proof requires running Minikube/Terraform locally.

## 11. Likely interview questions

- Explain the architecture.
- What happens after deploy?
- How does HPA work?
- How do you debug CrashLoopBackOff?
- Are the metrics real?
- Why Postgres?
- Is this production-grade?
- How did you measure 60%?

## 12. Things not to claim

- Do not claim Vercel runs Kubernetes.
- Do not claim WebSocket log streaming.
- Do not claim the 60% number without measurements.
- Do not claim enterprise production readiness.
- Do not claim GitHub Actions can reach laptop Minikube without network setup.

