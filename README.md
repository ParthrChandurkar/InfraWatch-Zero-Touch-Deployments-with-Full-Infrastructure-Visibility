# InfraWatch - Zero-Touch Deployments with Full Infrastructure Visibility

InfraWatch is a SaaS-ready cloud-native deployment and monitoring platform for teams that want the feel of a lightweight internal Heroku plus Grafana. It can trigger service deployments, track rollout status, show CPU and memory charts, and stream recent logs from one dashboard.

## Business Use Case

Small and mid-size companies can connect a GitHub repository, build and ship Docker images through CI/CD, and monitor services without maintaining a large DevOps team. The product can be packaged as a paid platform using per-deployment, per-service, or per-seat pricing.

## Architecture

```mermaid
flowchart LR
    User[Engineer] --> UI[React Dashboard]
    UI --> API[FastAPI Control Plane]
    API --> K8S[Kubernetes API]
    API --> PROM[Prometheus]
    API --> LOKI[Loki]
    GitHub[GitHub Actions] --> DockerHub[DockerHub Registry]
    GitHub --> K8S
    K8S --> Backend[InfraWatch Backend]
    K8S --> Frontend[InfraWatch Frontend]
    K8S --> Postgres[(PostgreSQL StatefulSet)]
    K8S --> Apps[Managed Microservices]
    Promtail[Promtail] --> LOKI
    PROM --> Grafana[Grafana Dashboards]
    Alertmanager[Alertmanager] --> Ops[Email or Slack]
```

## Repository Layout

```text
backend/                  FastAPI API, Kubernetes orchestration, tests
frontend/                 React dashboard with metrics charts and log viewer
k8s/                      Namespace, deployments, services, HPA, ConfigMaps
terraform/                Kubernetes namespace and Helm releases
monitoring/               Prometheus, Grafana, and Alertmanager configuration
logging/                  Loki and Promtail Helm/local values
.github/workflows/        CI/CD pipeline for tests, DockerHub, and kubectl
docker-compose.yml        Full local development stack
Makefile                  Common local and Kubernetes commands
```

## Prerequisites

- Docker and Docker Compose
- Python 3.12+
- Node.js 22+
- kubectl and Minikube for local Kubernetes
- Terraform 1.6+
- DockerHub account for image publishing

## Local Development

1. Copy the example environment and set local-only passwords:

```bash
cp .env.example .env
```

1. Start the full local stack:

```bash
make up
```

1. Open the apps:

```text
InfraWatch dashboard: http://localhost:3000
FastAPI docs:         http://localhost:8000/docs
Prometheus:           http://localhost:9090
Grafana:              http://localhost:3001
Loki:                 http://localhost:3100
```

The backend defaults to simulated deployment mode locally, so the dashboard can deploy demo services without requiring a live Kubernetes cluster.

## Backend API

```text
POST   /deploy              Trigger a service deployment
GET    /deployments         List deployments and statuses
GET    /metrics/{service}   Read Prometheus service metrics
GET    /logs/{service}      Read the last 100 Loki log lines
DELETE /deployment/{name}   Tear down a deployment
GET    /healthz             Health check endpoint
GET    /internal/metrics    Prometheus metrics for InfraWatch itself
```

Example deployment request:

```bash
curl -X POST http://localhost:8000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "catalog-api",
    "image": "docker.io/example/catalog-api:latest",
    "replicas": 2,
    "port": 8080,
    "environment": {
      "ENVIRONMENT": "production"
    }
  }'
```

## Kubernetes Deployment

1. Start Minikube:

```bash
minikube start
```

1. Create runtime secrets from your own values:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic infrawatch-secrets \
  --namespace infrawatch \
  --from-literal=POSTGRES_PASSWORD='use-a-strong-password' \
  --from-literal=DATABASE_URL='postgresql://infrawatch:use-a-strong-password@infrawatch-postgres:5432/infrawatch'
```

1. Deploy application manifests:

```bash
make deploy
```

1. Open the dashboard in Minikube:

```bash
minikube service infrawatch-frontend --namespace infrawatch
```

## Monitoring and Logging

Terraform installs the Helm-based monitoring stack:

```bash
cd terraform
terraform init
terraform apply -var='grafana_admin_password=replace-with-a-strong-password'
```

Open Grafana:

```bash
make monitor
```

Provisioned assets include:

- Prometheus scrape config and alert rules
- Grafana dashboards for service health and Kubernetes cluster overview
- Alertmanager local route plus email/Slack production template
- Loki and Promtail Helm values for centralized logging

## CI/CD Setup

The GitHub Actions workflow runs on every push to `main`:

- Installs backend dependencies and runs `pytest`
- Installs frontend dependencies and runs `npm run build`
- Builds backend and frontend Docker images
- Pushes DockerHub images tagged with the commit SHA and `latest`
- Applies Kubernetes manifests with `kubectl`
- Posts GitHub commit deployment status

Add these repository secrets before enabling production deployment:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
KUBE_CONFIG_B64
```

Create `KUBE_CONFIG_B64` with:

```bash
base64 -w 0 ~/.kube/config
```

## Deploying a New Service

Use the dashboard Deploy form or call the API:

```bash
curl -X POST "$INFRAWATCH_API/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payments-api",
    "image": "docker.io/acme/payments-api:2026.06.04",
    "replicas": 3,
    "port": 8080,
    "environment": {
      "ENVIRONMENT": "production"
    }
  }'
```

InfraWatch generates a Kubernetes Deployment and Service, applies resource requests and limits, annotates pods for Prometheus scraping, and records the deployment for the dashboard.

## Screenshots

Add screenshots here after the first hosted deployment:

```text
docs/screenshots/dashboard.png
docs/screenshots/grafana-service-health.png
docs/screenshots/deployment-flow.png
```

## Production Notes

- Replace Docker image placeholders with your DockerHub organization.
- Store secrets in GitHub Actions secrets, Kubernetes Secrets, or an external secret manager.
- Use Terraform remote state for shared environments.
- Enable managed PostgreSQL for production SaaS deployments.
- Put the frontend behind TLS and configure CORS for the final domain.
- Consider replacing local JSON deployment state with PostgreSQL tables before multi-tenant rollout.

## Roadmap

- Multi-tenant organizations and RBAC
- GitHub App integration for repository onboarding
- AWS EKS and GCP GKE Terraform modules
- Billing module for per-service and per-deployment pricing
- Blue-green and canary deployments through Istio or Linkerd
- SLO dashboards and incident timelines
