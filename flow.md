# InfraWatch Project Flow

InfraWatch is a DevOps command center. It helps a team deploy services and see what is happening inside the infrastructure from one place.

Think of it like this:

- `localhost:3000` is the main control room.
- `localhost:3001` is Grafana, the deep monitoring screen.
- `localhost:9090` is Prometheus, the metrics collector.
- `localhost:8000/docs` is the backend API manual.

Quick mental model:

- A developer asks the platform to deploy or remove a service.
- FastAPI records the action and returns the current service state.
- Docker or Kubernetes runs the service.
- Prometheus, Loki, and PostgreSQL provide the operational evidence.
- React turns that evidence into a dashboard a reviewer can understand quickly.

## 1. What Problem This Project Solves

In a real company, one website is usually made of many smaller services.

Example for a Wellfound-like startup/job platform:

- `jobs-api` shows jobs.
- `profiles-api` shows candidate and startup profiles.
- `search-service` handles search.
- `notifications` sends emails and alerts.
- `messaging-api` handles founder/candidate messages.

If one service breaks, the team needs to know:

- What service is broken?
- What was deployed recently?
- Are CPU, memory, request rate, or errors increasing?
- What do the logs say?
- Who triggered the latest deployment action?

InfraWatch answers these questions in one dashboard.

## 2. Architecture Flow

```text
Developer
   |
   v
GitHub Push -> GitHub Actions CI/CD -> DockerHub Images
                                      |
                                      v
                              Docker / Kubernetes Runtime
                                      |
                                      v
                              Running Microservices
                              /        |        \
                             v         v         v
                      Prometheus     Loki     PostgreSQL
                          |           |          |
                          v           v          v
                       FastAPI Control Plane <---+
                          |
                          v
                    React InfraWatch Dashboard
                          |
                          v
                    Grafana Dashboards + Alerts
```

Three flows happen together:

- Delivery flow: GitHub Actions builds, tests, publishes images, and prepares deployment.
- Runtime flow: Docker Compose or Kubernetes runs the frontend, backend, database, and observability services.
- Visibility flow: Prometheus collects metrics, Loki stores logs, audit events record changes, and the dashboard presents the story.

## 3. Request And Signal Lifecycle

1. A user opens the dashboard and creates a deployment request.
2. The React frontend sends the request to the FastAPI backend.
3. FastAPI validates the request and records an audit event.
4. In local mode, the backend returns safe demo deployment data.
5. In Kubernetes mode, manifests and cluster APIs handle real rollout behavior.
6. Prometheus and Loki expose runtime metrics and logs.
7. The dashboard combines deployment state, telemetry, logs, and audit history for review.

## 4. What Each Part Does

| Part | Meaning |
|---|---|
| React frontend | The dashboard shown at `localhost:3000`. |
| FastAPI backend | Handles deploy, delete, metrics, logs, audit logs, and health APIs. |
| PostgreSQL | Database service for the local stack. |
| Prometheus | Collects metrics like CPU, memory, requests, and errors. |
| Grafana | Shows monitoring dashboards from Prometheus and Loki. |
| Loki | Stores logs. |
| Promtail | Sends container logs to Loki. |
| Audit trail | Records deployment and delete activity for accountability. |
| Docker Compose | Runs the full project locally. |
| Kubernetes | Production-style deployment target. |
| GitHub Actions | CI/CD pipeline for tests, builds, images, and deployment. |

## 5. Prerequisites

Install these:

- Git
- Docker Desktop
- Python 3.12+
- Node.js 22+
- Optional: kubectl, Minikube, Terraform, Helm

For the full local demo, Docker Desktop is the most important tool.

## 6. Run The Full Project Locally

Open PowerShell in the project root:

```powershell
cd "P:\Placement\Projects\Github Projects\InfraWatch-Zero-Touch-Deployments-with-Full-Infrastructure-Visibility"
```

Create the local environment file:

```powershell
copy .env.example .env
```

Edit `.env` and set:

```text
POSTGRES_PASSWORD=your-local-password
GRAFANA_ADMIN_PASSWORD=your-local-password
```

Start everything:

```powershell
docker compose up --build
```

## 7. Open The Project

After Docker starts, open:

| URL | Use |
|---|---|
| `http://localhost:3000` | Main InfraWatch dashboard. Start demo here. |
| `http://localhost:3001` | Grafana dashboards. |
| `http://localhost:9090` | Prometheus metrics and targets. |
| `http://localhost:8000/docs` | FastAPI backend API docs. |
| `http://localhost:3100` | Loki API. Usually not opened directly. |

Grafana login:

```text
Username: admin
Password: value from GRAFANA_ADMIN_PASSWORD in .env
```

## 8. How To Use The Dashboard

1. Open `http://localhost:3000`.
2. Look at the left sidebar named `Service Fleet`.
3. Check the top cards:
   - Health score
   - Running services
   - Active replicas
   - Open failures
4. Use `Deploy Service` to deploy a demo service.
5. Example values:

```text
Service name: jobs-api
Container image: docker.io/example/jobs-api:latest
Replicas: 2
Port: 8080
```

6. Click `Deploy`.
7. Select the service from the sidebar.
8. Watch CPU, memory, request throughput, and error-rate cards.
9. Check `Deployment Inventory` for all services.
10. Check `Runtime Logs` for log output.
11. Check `Audit Trail` to prove the deploy/delete action was recorded.

Expected proof on screen:

| Dashboard area | What to point out |
|---|---|
| Service Fleet | Shows all known services and their health state. |
| Top summary cards | Shows health score, running services, replicas, and failures. |
| Metrics panels | Shows CPU, memory, throughput, and error rate for the selected service. |
| Runtime Logs | Shows recent service events without leaving the dashboard. |
| Audit Trail | Shows who changed what and when. |

## 9. Audit Log Feature

The audit log records important operational actions.

Current audit events include:

- Deployment simulated locally
- Deployment requested for Kubernetes
- Deployment applied successfully
- Deployment failed
- Deployment deleted
- Delete requested for missing deployment
- Delete failed

API endpoint:

```text
GET http://localhost:8000/audit-logs
```

Example use:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/audit-logs
```

Why this matters:

- It proves what happened.
- It helps debugging.
- It creates accountability.
- It is an industry-level feature because real platforms need audit trails.

## 10. Backend API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/deploy` | Trigger a deployment. |
| `GET` | `/deployments` | List deployments. |
| `GET` | `/audit-logs` | List audit trail events. |
| `GET` | `/metrics/{service}` | Get service metrics. |
| `GET` | `/logs/{service}` | Get service logs. |
| `DELETE` | `/deployment/{name}` | Delete deployment. |
| `GET` | `/healthz` | Backend health check. |
| `GET` | `/internal/metrics` | Prometheus scrape endpoint. |

## 11. Demo Script

Use this in front of a reviewer:

```text
This project is InfraWatch, a DevOps control plane for zero-touch deployments and infrastructure visibility.

The main dashboard at localhost:3000 shows service health, deployment inventory, metrics, logs, and audit events.

When I deploy a service, the FastAPI backend records the deployment, updates the dashboard, and writes an audit log event.

Prometheus collects metrics, Loki stores logs, and Grafana gives deeper monitoring dashboards.

For a platform like Wellfound, services such as jobs-api, profiles-api, search-service, notifications, and messaging-api can be deployed and watched from one place.

This helps teams release faster, debug faster, and understand what changed in production.
```

Reviewer proof points:

- The platform has a real FastAPI backend and typed React frontend.
- The local stack includes PostgreSQL, Prometheus, Grafana, Loki, and Promtail.
- The API surface covers deploy, delete, metrics, logs, health, and audit events.
- The documentation explains both local demo mode and Kubernetes delivery mode.
- The CI/CD flow is wired for linting, testing, image publishing, and deployment.

## 12. Local vs Kubernetes Mode

| Mode | Best for | Behavior |
|---|---|---|
| Local Docker Compose | Fast reviewer demo and development | Runs the dashboard, backend, database, metrics, logs, and Grafana together on localhost. |
| Safe demo backend | UI and API walkthrough without a cluster | Returns controlled deployment and telemetry data so the dashboard remains usable. |
| Kubernetes mode | Production-style deployment story | Uses manifests, namespace, secrets, service definitions, and rollout commands. |
| CI/CD mode | GitHub-to-runtime release story | Uses GitHub Actions, DockerHub credentials, and Kubernetes config secrets when available. |

## 13. Stop The Project

Stop running containers:

```powershell
docker compose down
```

Stop and remove saved volumes:

```powershell
docker compose down --volumes --remove-orphans
```

## 14. Kubernetes Demo Mode

Start Minikube:

```powershell
minikube start
```

Create namespace and secrets:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic infrawatch-secrets `
  --namespace infrawatch `
  --from-literal=POSTGRES_PASSWORD=use-a-strong-password `
  --from-literal=DATABASE_URL=postgresql://infrawatch:use-a-strong-password@infrawatch-postgres:5432/infrawatch
```

Deploy:

```powershell
make deploy
```

Open frontend:

```powershell
minikube service infrawatch-frontend --namespace infrawatch
```

## 15. GitHub Actions CI/CD Flow

When code is pushed to `main`:

1. Backend dependencies install.
2. Ruff lint runs.
3. Pytest runs.
4. Frontend dependencies install.
5. ESLint runs.
6. React production build runs.
7. Docker images build.
8. If DockerHub secrets exist, images are pushed.
9. If Kubernetes config exists, deployment rolls out.

Required GitHub secrets for full deployment:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
KUBE_CONFIG_B64
```

## 16. Troubleshooting

| Problem | Fix |
|---|---|
| Docker API error | Open Docker Desktop and wait until the engine is running. |
| `localhost:3000` does not open | Run `docker compose ps` and check frontend is running. |
| Grafana login fails | Reset password using Grafana CLI or remove Grafana volume. |
| Prometheus has no login | Normal. Prometheus does not need login locally. |
| Charts show demo baseline | Prometheus has no real service samples yet, so the frontend shows demo-safe telemetry. |
| Audit logs are empty | Deploy or delete a service from the dashboard first. |

## 17. What Makes This Industry-Level For Demo

- Full Docker Compose stack
- FastAPI backend
- React command-center dashboard
- Prometheus metrics
- Grafana dashboards
- Loki logs
- Audit trail
- Kubernetes manifests
- Terraform/Helm infrastructure setup
- GitHub Actions CI/CD
- DockerHub image publishing flow

For real production, future upgrades should include authentication, role-based access control, real cloud deployment, Slack/email alerts, rollback, canary deployments, HTTPS, and long-term database-backed audit storage.
