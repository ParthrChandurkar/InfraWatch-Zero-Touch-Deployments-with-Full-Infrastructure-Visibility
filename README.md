# 🚀 InfraWatch

**Zero-touch deployment workflow + infrastructure visibility for containerized services.**

InfraWatch is a full-stack DevOps/SRE project that lets you submit a containerized service, track its deployment state, inspect metrics/logs, and review an audit trail from one dashboard.

It is intentionally honest about its modes:

- 🌐 **Hosted Vercel demo:** interactive portfolio/demo environment with simulated Kubernetes execution and simulated telemetry.
- 🐳 **Docker Compose local stack:** runs the frontend, FastAPI backend, PostgreSQL, Prometheus, Grafana, Loki, Alertmanager, and Promtail locally.
- ☸️ **Kubernetes mode:** applies generated Kubernetes manifests with `kubectl` when a real cluster and credentials are configured.
- 🔁 **GitHub Actions CI/CD:** validates, builds, publishes Docker images, and deploys to Kubernetes only when required repository secrets are configured.

> ⚠️ InfraWatch does **not** pretend Vercel is running Kubernetes. Public hosted mode is a demo. Real Kubernetes deployment requires a real Kubernetes cluster.

---

## ✨ What InfraWatch Does

- 🚀 Deploy or update a service by entering:
  - service name
  - container image
  - replica count
  - service port
- 📦 Generate Kubernetes `Deployment` and `Service` manifests.
- ✅ In Kubernetes mode, run `kubectl apply`, wait for rollout status, and verify ready/available replicas.
- 🔁 Roll back a managed deployment with Kubernetes rollout undo.
- 📊 Show CPU, memory, request-rate, and error-rate charts.
- 📜 Show recent service logs.
- 🧾 Store deployment and delete actions in an audit trail.
- 🐘 Use PostgreSQL when `DATABASE_URL` is configured, with JSON-file fallback for simple demo/test environments.
- 📈 Expose Prometheus-compatible FastAPI metrics at `/metrics` and `/internal/metrics`.
- 🧪 Run backend tests, frontend lint/build, and Docker image builds through GitHub Actions.

---

## ✅ What Is Real vs Demo

| Feature | Hosted Vercel Demo | Docker Compose Local | Kubernetes Mode |
|---|---|---|---|
| React dashboard | ✅ Real | ✅ Real | ✅ Real |
| FastAPI backend | ✅ Real | ✅ Real | ✅ Real |
| PostgreSQL persistence | ❌ Not on Vercel | ✅ Real | ✅ Real when configured |
| Kubernetes workload creation | ❌ Simulated | ❌ Simulated by default | ✅ Real with `INFRAWATCH_EXECUTE_KUBECTL=true` |
| Metrics/logs | 🧪 Realistic mock fallback | 🧪 Mock fallback unless workloads emit data | ✅ Prometheus/Loki when configured |
| Grafana dashboards | ❌ Not hosted on Vercel | ✅ Local Grafana | ✅ Cluster Grafana |
| CI/CD deployment | ❌ Not automatic without secrets | N/A | ✅ With DockerHub + kubeconfig secrets |

If you are opening the public site, you are using **Demo Mode**. Demo Mode is useful because the dashboard remains interactive without asking anyone to install Kubernetes.

---

## 🌍 Live Demo

- Frontend: [https://infrawatch-platform.vercel.app](https://infrawatch-platform.vercel.app)
- API: [https://infrawatch-api.vercel.app](https://infrawatch-api.vercel.app)
- API health: [https://infrawatch-api.vercel.app/healthz](https://infrawatch-api.vercel.app/healthz)
- API docs: [https://infrawatch-api.vercel.app/docs](https://infrawatch-api.vercel.app/docs)

The public demo uses the correctly spelled **InfraWatch** name. The shorter `infrawatch.vercel.app` alias is not used because it is already owned by another Vercel account.

---

## 🧱 Architecture

```mermaid
flowchart LR
    User[User] --> UI[React Dashboard]
    UI --> API[FastAPI Backend]
    API --> Store[(PostgreSQL or JSON State)]
    API --> Kube[kubectl / Kubernetes API]
    Kube --> Workloads[Managed Services]
    Workloads --> Prom[Prometheus]
    Workloads --> Loki[Loki]
    Prom --> API
    Loki --> API
    Prom --> Grafana[Grafana Dashboards]
```

In Demo Mode, the `kubectl`, Prometheus, and Loki paths are replaced by safe simulated responses.

---

## 🧰 Tech Stack

| Area | Tools |
|---|---|
| Frontend | React, Vite, TypeScript, Nginx |
| Backend | Python, FastAPI, Pydantic |
| State | PostgreSQL, JSON fallback |
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes manifests, Minikube-compatible setup |
| Observability | Prometheus, Grafana, Loki, Promtail, Alertmanager |
| Infrastructure config | Terraform, Helm values |
| CI/CD | GitHub Actions, Docker image build/publish/deploy flow |

---

## 📁 Project Structure

```text
backend/                  FastAPI API, deployment logic, observability clients
frontend/                 React dashboard served by Nginx
k8s/                      Kubernetes namespace, services, deployments, HPA, secrets examples
terraform/                Helm-based monitoring/logging stack setup
monitoring/               Prometheus, Grafana, and Alertmanager config
logging/                  Loki/Promtail config
scripts/                  Utility scripts for alerts and measurements
.github/workflows/        CI/CD pipeline
docker-compose.yml        Local full-stack runtime
```

Dockerfiles are intentionally service-specific:

- `backend/Dockerfile`
- `frontend/Dockerfile`

There is no root `Dockerfile` because the project runs multiple services, not one single container.

---

## ⚙️ Prerequisites

For the easiest local run:

- Git
- Docker Desktop

For source development:

- Python 3.12+
- Node.js 22+

For Kubernetes mode:

- kubectl
- Minikube or another reachable Kubernetes cluster
- Helm 3
- Terraform 1.6+
- DockerHub or another image registry

---

## 🐳 Run the Full Local Stack

From the project root:

```powershell
copy .env.example .env
```

Edit `.env` and set real local passwords:

```text
POSTGRES_PASSWORD=your-local-password
GRAFANA_ADMIN_PASSWORD=your-local-password
```

Start the stack:

```powershell
docker compose up --build
```

Open:

| Service | URL |
|---|---|
| 🚀 InfraWatch dashboard | http://localhost:3000 |
| 🧩 FastAPI docs | http://localhost:8000/docs |
| 📈 Prometheus | http://localhost:9090 |
| 📊 Grafana | http://localhost:3001 |
| 📜 Loki | http://localhost:3100 |
| 🚨 Alertmanager | http://localhost:9093 |

Grafana login:

```text
Username: admin
Password: value from GRAFANA_ADMIN_PASSWORD in .env
```

Stop the stack:

```powershell
docker compose down
```

Stop and remove local volumes:

```powershell
docker compose down --volumes --remove-orphans
```

---

## 🔌 If Ports Are Already Used

If another project already uses `3000`, `8000`, or `5432`, set alternate ports in `.env`:

```text
FRONTEND_PORT=13000
BACKEND_PORT=18000
POSTGRES_PORT=15432
PROMETHEUS_PORT=19090
GRAFANA_PORT=13001
LOKI_PORT=13100
ALERTMANAGER_PORT=19093
```

Then run:

```powershell
docker compose up --build
```

With the values above, open:

- Dashboard: http://localhost:13000
- API docs: http://localhost:18000/docs
- Prometheus: http://localhost:19090
- Grafana: http://localhost:13001

---

## 🧪 Demo Mode and Mock Data

Demo Mode exists so the dashboard is usable without a Kubernetes cluster.

In Demo Mode:

- Deploy actions validate input and generate Kubernetes-style records.
- No real workload is created.
- Metrics and logs are realistic mock data.
- Audit events are still recorded.
- The UI clearly shows a **Demo Mode** banner.

The Docker Compose stack enables this by default:

```text
INFRAWATCH_ALLOW_MOCK_OBSERVABILITY=true
INFRAWATCH_EXECUTE_KUBECTL=false
```

For strict real observability, set:

```text
INFRAWATCH_ALLOW_MOCK_OBSERVABILITY=false
```

If Prometheus or Loki has no data in strict mode, the API returns an error instead of hiding it with fake data.

---

## 💻 Run Backend and Frontend Without Docker

Install backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Start backend:

```powershell
cd backend
..\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If your shell does not like the relative path, activate the virtual environment first and run:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend in another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open:

- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs

---

## ☸️ Run Kubernetes Mode

Kubernetes mode is the real deployment path. It requires an active cluster.

Start Minikube:

```powershell
minikube start
minikube addons enable metrics-server
```

Create namespace and secrets:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic infrawatch-secrets `
  --namespace infrawatch `
  --from-literal=POSTGRES_PASSWORD=use-a-strong-password `
  --from-literal=DATABASE_URL=postgresql://infrawatch:use-a-strong-password@infrawatch-postgres:5432/infrawatch
```

Deploy InfraWatch:

```powershell
kubectl apply -k k8s
kubectl rollout status deployment/infrawatch-backend --namespace infrawatch --timeout=180s
kubectl rollout status deployment/infrawatch-frontend --namespace infrawatch --timeout=180s
```

Open the frontend:

```powershell
minikube service infrawatch-frontend --namespace infrawatch
```

Install observability with Terraform/Helm:

```powershell
cd terraform
terraform init
terraform apply -var="grafana_admin_password=replace-with-a-strong-password"
```

---

## 🔁 GitHub Actions CI/CD

Workflow file:

```text
.github/workflows/ci-cd.yml
```

On push or pull request, it runs:

- ✅ Backend dependency install
- ✅ Ruff lint
- ✅ Backend tests
- ✅ Frontend dependency install
- ✅ ESLint
- ✅ Frontend production build
- ✅ Backend Docker image build
- ✅ Frontend Docker image build

On push to `main`, it can also publish and deploy, but only if these GitHub repository secrets exist:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
KUBE_CONFIG_B64
```

Important:

- `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are required to publish images.
- `KUBE_CONFIG_B64` must point to a reachable Kubernetes cluster.
- A laptop-only Minikube cluster is not reachable from GitHub-hosted runners unless you explicitly expose/configure it.
- If DockerHub secrets exist but `KUBE_CONFIG_B64` is missing, the workflow still publishes Docker images and clearly skips the Kubernetes rollout.
- The workflow can also be started manually from the GitHub Actions tab with **Run workflow**.

---

## 🧭 Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/healthz` | Health and active mode summary |
| `POST` | `/deploy` | Create/update a deployment record or Kubernetes workload |
| `GET` | `/deployments` | List known deployments |
| `DELETE` | `/deployment/{name}` | Delete a deployment |
| `POST` | `/deployment/{name}/rollback` | Roll back a Kubernetes deployment |
| `GET` | `/metrics/{service}` | Read service metrics |
| `GET` | `/logs/{service}` | Read service logs |
| `GET` | `/audit-logs` | Read recent deployment/audit events |
| `GET` | `/metrics` | Prometheus scrape endpoint |
| `GET` | `/internal/metrics` | Alternate Prometheus scrape endpoint |

Example deploy request:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8000/deploy" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"name":"catalog-api","image":"docker.io/example/catalog-api:latest","replicas":2,"port":8080}'
```

---

## 🧪 Validate the Project

Backend:

```powershell
cd backend
..\.venv\Scripts\python -m ruff check app tests
..\.venv\Scripts\python -m pytest
```

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm run build
```

Docker Compose config:

```powershell
docker compose config --quiet
```

Kubernetes manifest output:

```powershell
kubectl kustomize k8s
```

---

## 🛠️ Troubleshooting

| Problem | Check |
|---|---|
| Docker stack does not start | Open Docker Desktop and run `docker compose ps` |
| Port already allocated | Set alternate `FRONTEND_PORT`, `BACKEND_PORT`, or `POSTGRES_PORT` in `.env` |
| Dashboard loads but API fails | Confirm backend health at `/healthz` |
| Charts show simulated telemetry | Expected when no real Prometheus/Loki workload data exists |
| Deployments do not create real pods | Set `INFRAWATCH_EXECUTE_KUBECTL=true` in a valid Kubernetes environment |
| GitHub Actions publish fails | Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets |
| GitHub Actions deploy fails | Add `KUBE_CONFIG_B64` for a reachable cluster |

More operational troubleshooting is in:

- `docs/ARCHITECTURE.md`
- `docs/TROUBLESHOOTING.md`

---

## 🧾 Honest Limitations

InfraWatch is a strong portfolio/SRE prototype, but it is not an enterprise SaaS product yet.

Not implemented:

- user accounts/authentication
- multi-tenant authorization
- GitHub OAuth/App repo onboarding
- building arbitrary user repositories from the UI
- TLS/Ingress production exposure
- canary or blue-green release strategy
- WebSocket log streaming

Current deployment scope:

- The UI/API can deploy an already-built container image to the connected Kubernetes cluster.
- The GitHub Actions workflow deploys the InfraWatch app itself when registry and Kubernetes secrets are configured.
- It does not yet let any random user connect their GitHub repository and deploy that repository automatically.

---

## 📌 Good One-Line Description

InfraWatch is a cloud-native SRE prototype that combines a React dashboard, FastAPI control plane, Docker/Kubernetes deployment flow, PostgreSQL audit state, and Prometheus/Loki/Grafana observability into one local/demo platform.
