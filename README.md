# InfraWatch

InfraWatch is a cloud-native deployment and monitoring platform. It lets a team deploy containerized microservices and watch their status, metrics, and logs from one dashboard.

Think of it as a small internal Heroku plus Grafana:

- Deploy services from a dashboard or API
- Track deployment status
- View CPU, memory, request-rate, and error-rate charts
- Read recent service logs
- Run locally with Docker Compose
- Deploy to Kubernetes with CI/CD support

## How It Works

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

Basic flow:

1. Developer pushes code to GitHub.
2. GitHub Actions runs tests and builds Docker images.
3. Images are pushed to DockerHub.
4. Kubernetes applies the latest deployment.
5. Prometheus collects metrics.
6. Loki collects logs.
7. React dashboard shows deployments, charts, and logs through the FastAPI backend.

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

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/deploy` | Trigger a deployment |
| GET | `/deployments` | List deployments |
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
| `make up` | Start local Docker stack |
| `make deploy` | Deploy Kubernetes manifests |
| `make monitor` | Port-forward Grafana |
| `make clean` | Clean Docker/Kubernetes resources |
| `kubectl kustomize k8s` | Validate Kubernetes output |
| `docker compose config` | Validate Docker Compose |

## Documentation

A detailed Word guide is saved locally at:

```text
C:\Users\Parth\Downloads\InfraWatch_Project_Guide.docx
```

It explains project flow, prerequisites, package installation, DockerHub setup, GitHub secrets, Kubernetes secrets, and deployment steps.

## Roadmap

- Multi-tenant users and organizations
- GitHub App integration
- AWS EKS deployment module
- Billing module
- Canary and blue-green deployments
- Better service-level SLO dashboards
