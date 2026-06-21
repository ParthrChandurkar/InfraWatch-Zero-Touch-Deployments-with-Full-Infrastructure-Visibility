# InfraWatch: Zero-Touch Deployments with Full Infrastructure Visibility

InfraWatch is a cloud-native DevOps control plane for deploying containerized services and watching their infrastructure signals from one dashboard. It combines a deployment API, a React command center, Prometheus metrics, Loki logs, Grafana dashboards, Docker Compose, Kubernetes manifests, Terraform/Helm infrastructure, and GitHub Actions CI/CD.

Think of it as a compact internal platform: a team can ship a service, inspect health, read logs, and prove what changed without jumping between five tools.

## Live Public Demo

Open **[infrawatch-platform.vercel.app](https://infrawatch-platform.vercel.app)** to use InfraWatch immediately—no account or credentials required. The shorter `infrawatch.vercel.app` alias is already owned by another Vercel account, so this deployment uses the correctly spelled `infrawatch-platform` project name.

The hosted dashboard is connected to a real FastAPI service at **[infrawatch-api.vercel.app](https://infrawatch-api.vercel.app)**. FastAPI validates deployment requests, generates Kubernetes manifests, records demo state and audit events, and serves metrics/log responses. Because Vercel does not provide a Kubernetes cluster, Prometheus, or Loki, workload execution and observability data remain explicitly simulated in the public demo.

## What You Can Demo

- Trigger service deployments from the dashboard or the FastAPI API.
- Track service inventory, replica counts, rollout state, and failures.
- Inspect CPU, memory, request-rate, and error-rate telemetry.
- Read recent service logs and audit events in the same workflow.
- Run the full stack locally with Docker Compose.
- Move toward Kubernetes delivery with CI/CD, DockerHub, Terraform, Helm, Prometheus, Grafana, Loki, and Promtail.

## Fast Reviewer Path

1. Open the [public InfraWatch demo](https://infrawatch-platform.vercel.app).
2. Select a service and review metrics, logs, deployment inventory, and audit history.
3. Deploy a demo service such as `jobs-api`, then update or remove it.
4. Open the [live FastAPI docs](https://infrawatch-api.vercel.app/docs) and inspect `/healthz` to see the active hosted capabilities.
5. For real workload execution and the full observability stack, run the Docker/Kubernetes environment and connect FastAPI to kubectl, Prometheus, and Loki.

## Project Screenshot

![InfraWatch Command Center](docs/screenshots/infrawatch-command-center.png)

## Architecture Diagram

**Diagram name:** InfraWatch End-to-End Architecture

```mermaid
flowchart LR
    Dev[Developer] --> GitHub[GitHub Push]
    GitHub --> Actions[GitHub Actions]
    Actions --> DockerHub[DockerHub Images]
    Actions --> K8S[Kubernetes Deploy]
    K8S --> Apps[Running Services]
    Apps --> Prometheus[Prometheus Metrics]
    Apps --> Loki[Loki Logs]
    Prometheus --> Grafana[Grafana Dashboards]
    Loki --> API[FastAPI Backend]
    Prometheus --> API
    API --> UI[React Dashboard]
```

System flow:

1. Developer pushes code to GitHub.
2. GitHub Actions runs tests and builds Docker images.
3. Images are pushed to DockerHub.
4. Kubernetes applies the latest deployment.
5. Prometheus collects service metrics.
6. Loki collects runtime logs through Promtail.
7. FastAPI exposes deployment, metrics, logs, health, and audit APIs.
8. React turns those signals into a single command-center dashboard.
9. Grafana provides deeper operational dashboards for infrastructure review.

## Tech Stack

| Area | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | React, Vite, TypeScript |
| Local stack | Docker Compose |
| Containers | Docker |
| Orchestration | Kubernetes, Minikube |
| CI/CD | GitHub Actions |
| Infrastructure | Terraform, Helm |
| Metrics | Prometheus, Grafana |
| Logs | Loki, Promtail |
| Database | PostgreSQL |

## Project Structure

```text
backend/                  FastAPI backend
frontend/                 React dashboard
k8s/                      Kubernetes manifests
terraform/                Terraform + Helm setup
monitoring/               Prometheus, Grafana, Alertmanager config
logging/                  Loki and Promtail config
.github/workflows/        GitHub Actions pipeline
docs/screenshots/         README and demo images
docker-compose.yml        Local full-stack setup
requirements.txt          Root Python dependency file
Makefile                  Common commands
```

## Prerequisites

Install these tools:

- Git
- Python 3.12+
- Node.js 22+
- Docker Desktop
- DockerHub account
- kubectl
- Minikube
- Terraform 1.6+
- Helm 3+

For only checking the backend/frontend locally, Python and Node are enough. For the full platform, Docker and Kubernetes tools are needed.

## Install Dependencies

### Backend Python Dependencies

From the project root:

```bash
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The root `requirements.txt` installs the Python backend, testing, and linting dependencies.

### Frontend Dependencies

```bash
cd frontend
npm ci
```

Frontend packages are managed by `frontend/package.json` and `frontend/package-lock.json`.

## Run Locally Without Docker

Start backend:

```bash
cd backend
..\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If your shell does not like relative paths, activate the environment first:

```bash
..\.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
Frontend: http://localhost:5173
Backend docs: http://localhost:8000/docs
```

The backend uses safe mock deployment/observability data by default, so you can test the dashboard without a Kubernetes cluster.

## Deploy the Hosted Demo to Vercel

The hosted demo uses two Vercel projects:

- `infrawatch-api` runs the FastAPI backend from `backend/`.
- `infrawatch-platform` builds the React app and proxies `/api/*` to the backend.

Deploy the API first, then the dashboard:

```bash
npx vercel --cwd backend --prod --project infrawatch-api
npx vercel --prod --project infrawatch-platform
```

On public hosts the frontend calls `/api`, which Vercel rewrites to the hosted FastAPI project. Local Vite development continues to default to `http://localhost:8000`. Set `VITE_DEMO_MODE=true` only when intentionally running the frontend-only browser sandbox.

The Vercel API uses ephemeral serverless storage, so public demo records can reset during cold starts or new deployments. Production Kubernetes mode needs a durable database, cluster credentials, and reachable Prometheus/Loki services; those are provided by the Docker/Kubernetes configuration in this repository, not by Vercel.

## Run Full Local Stack With Docker

Copy the example environment file:

```bash
copy .env.example .env
```

Edit `.env` and set:

```text
POSTGRES_PASSWORD=your-local-password
GRAFANA_ADMIN_PASSWORD=your-local-password
```

Start everything:

```bash
make up
```

Open:

```text
InfraWatch dashboard: http://localhost:3000
FastAPI docs:         http://localhost:8000/docs
Prometheus:           http://localhost:9090
Grafana:              http://localhost:3001
Loki:                 http://localhost:3100
```

Demo checklist:

- Confirm the dashboard loads and service fleet cards render.
- Deploy a sample service such as `jobs-api`.
- Open the deployed service and review metrics, logs, and current status.
- Confirm the audit trail records the deploy action.
- Open Grafana to show the monitoring layer behind the product UI.

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/deploy` | Trigger a deployment |
| GET | `/deployments` | List deployments |
| GET | `/audit-logs` | List deployment and delete audit events |
| GET | `/metrics/{service}` | Get service metrics |
| GET | `/logs/{service}` | Get service logs |
| DELETE | `/deployment/{name}` | Delete a deployment |
| GET | `/healthz` | Health check |
| GET | `/internal/metrics` | Prometheus scrape endpoint |

Example:

```bash
curl -X POST http://localhost:8000/deploy ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"catalog-api\",\"image\":\"docker.io/example/catalog-api:latest\",\"replicas\":2,\"port\":8080}"
```

## Kubernetes Deployment

Start Minikube:

```bash
minikube start
```

Create namespace and secrets:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic infrawatch-secrets ^
  --namespace infrawatch ^
  --from-literal=POSTGRES_PASSWORD=use-a-strong-password ^
  --from-literal=DATABASE_URL=postgresql://infrawatch:use-a-strong-password@infrawatch-postgres:5432/infrawatch
```

Deploy:

```bash
make deploy
```

Open frontend:

```bash
minikube service infrawatch-frontend --namespace infrawatch
```

## Monitoring Setup

Terraform installs Prometheus, Grafana, Alertmanager, Loki, and Promtail through Helm.

```bash
cd terraform
terraform init
terraform apply -var="grafana_admin_password=replace-with-a-strong-password"
```

Open Grafana in Kubernetes mode:

```bash
make monitor
```

## Where To Add DockerHub and Secrets

Do not commit real passwords, tokens, or kubeconfig files.

| Value | Where to add it |
|---|---|
| DockerHub username | GitHub repo secret `DOCKERHUB_USERNAME` |
| DockerHub token | GitHub repo secret `DOCKERHUB_TOKEN` |
| Kubernetes config for CI/CD | GitHub repo secret `KUBE_CONFIG_B64` |
| Local DB password | `.env` |
| Local Grafana password | `.env` |
| Kubernetes DB password | Kubernetes Secret `infrawatch-secrets` |
| Backend config | `backend/.env` or Kubernetes ConfigMap |
| Docker image names | `k8s/deployments/backend.yaml` and `k8s/deployments/frontend.yaml` |

GitHub secrets path:

```text
GitHub Repository -> Settings -> Secrets and variables -> Actions
```

## GitHub Actions

Workflow file:

```text
.github/workflows/ci-cd.yml
```

It does:

- Backend install, lint, and tests
- Frontend install, lint, and build
- Docker image build
- DockerHub push
- Kubernetes deployment
- GitHub commit deployment status

Required secrets for full deployment:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
KUBE_CONFIG_B64
```

## Useful Commands

| Command | Purpose |
|---|---|
| `python -m pip install -r requirements.txt` | Install Python dependencies |
| `npm ci` | Install frontend dependencies |
| `npm run build` | Build frontend |
| `docker compose up --build` | Start the complete local stack |
| `docker compose ps` | Inspect running containers |
| `make up` | Start local Docker stack |
| `make deploy` | Deploy Kubernetes manifests |
| `make monitor` | Port-forward Grafana |
| `make clean` | Clean Docker/Kubernetes resources |
| `kubectl kustomize k8s` | Validate Kubernetes output |
| `docker compose config` | Validate Docker Compose |

## Documentation

| File | Purpose |
|---|---|
| `flow.md` | Reviewer-friendly project flow, demo script, API tour, and troubleshooting. |
| `docs/screenshots/infrawatch-command-center.png` | Main dashboard screenshot used by the README. |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline for lint, tests, build, image publishing, and deployment. |

## Roadmap

- Multi-tenant users and organizations
- GitHub App integration
- AWS EKS deployment module
- Billing module
- Canary and blue-green deployments
- Better service-level SLO dashboards
