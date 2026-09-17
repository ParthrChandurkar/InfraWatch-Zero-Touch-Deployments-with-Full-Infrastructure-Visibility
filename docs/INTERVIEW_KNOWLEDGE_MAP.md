# InfraWatch Interview Knowledge Map

## FastAPI

Must know:

- Pydantic validation.
- REST endpoints.
- `/deploy`, `/deployments`, `/metrics/{service}`, `/logs/{service}`.
- Prometheus metrics export.

Should know:

- Middleware.
- Error handling.
- Environment-based settings.

## React

Must know:

- Single dashboard app.
- API wrapper.
- Polling every 5 seconds for metrics/logs.
- Demo Mode vs real local mode.

Should know:

- Recharts.
- State management with hooks.

## Docker

Must know:

- Backend image runs FastAPI and kubectl.
- Frontend image serves React through Nginx.
- Images are tagged with Git SHA in CI.

Should know:

- Multi-stage builds.
- Non-root containers.

## Kubernetes

Must know:

- Pod, Deployment, ReplicaSet, Service.
- Readiness vs liveness probes.
- Resource requests/limits.
- ConfigMap, Secret.
- ServiceAccount, Role, RoleBinding.
- Rollout status and rollback.

Should know:

- Scheduler.
- kubelet.
- controller reconciliation.

## HPA

Must know:

- Target: `infrawatch-backend`.
- Min 2, max 6.
- CPU target 70%.
- Requires metrics-server and CPU requests.

Should know:

- Scale-up/down delay.
- `kubectl describe hpa`.

## GitHub Actions

Must know:

- Validate job.
- Publish job.
- Deploy job.
- DockerHub secrets.
- Kubeconfig secret.
- SHA image tags.

## Terraform

Must know:

- Terraform does not create Minikube.
- It installs observability Helm releases into an existing cluster.

Should know:

- `terraform init`, `validate`, `plan`, `apply`.
- State files must not be committed.

## Helm

Must know:

- Used for kube-prometheus-stack, Loki, Promtail.
- Values files customize resources, rules, and scrape config.

## Prometheus

Must know:

- Scrape model.
- Targets.
- PromQL basics.
- kube-state-metrics vs cAdvisor vs app metrics.

## Grafana

Must know:

- Datasources: Prometheus and Loki.
- Dashboards are provisioned from JSON.

## Alertmanager

Must know:

- Prometheus fires alerts.
- Alertmanager routes notifications.
- Local webhook receiver can prove delivery.

## Loki and Promtail

Must know:

- Logs come from stdout/stderr.
- Promtail ships logs to Loki.
- LogQL label queries.

## PostgreSQL

Must know:

- Used for deployments and audit events when `DATABASE_URL` exists.
- JSON fallback remains for Vercel/tests.

## Linux/kubectl troubleshooting

Must know:

- `kubectl get`
- `kubectl describe`
- `kubectl logs`
- `kubectl logs --previous`
- `kubectl get events`
- `kubectl top`
- `kubectl rollout status`
- `kubectl rollout undo`

