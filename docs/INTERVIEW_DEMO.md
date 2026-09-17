# 10-15 Minute InfraWatch Interview Demo

## Part 1 - Architecture, 2 minutes

Say:

> InfraWatch has Demo Mode for Vercel and Real Local Kubernetes Mode for Minikube. Demo Mode is safe and simulated. Real local mode uses FastAPI, kubectl, PostgreSQL, Prometheus, Loki, Grafana, Alertmanager, and HPA.

Show:

```bash
kubectl get ns infrawatch
kubectl get all -n infrawatch
```

## Part 2 - Deploy infrastructure, 2 minutes

```bash
minikube start
minikube addons enable metrics-server

cd terraform
terraform init
terraform apply -var="grafana_admin_password=replace-with-a-strong-password"
cd ..
```

Terraform manages the observability stack only. It does not create Minikube.

## Part 3 - Deploy application, 2 minutes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic infrawatch-secrets \
  --namespace infrawatch \
  --from-literal=POSTGRES_PASSWORD=use-a-strong-password \
  --from-literal=DATABASE_URL=postgresql://infrawatch:use-a-strong-password@infrawatch-postgres:5432/infrawatch

kubectl apply -k k8s
kubectl rollout status deployment/infrawatch-backend -n infrawatch
kubectl rollout status deployment/infrawatch-frontend -n infrawatch
```

Open:

```bash
minikube service infrawatch-frontend -n infrawatch
```

## Part 4 - Deploy a service, 2 minutes

In the dashboard, deploy:

```text
service: demo-api
image: docker.io/parthrchandurkar/infrawatch-backend:latest
replicas: 2
port: 8000
```

Then show:

```bash
kubectl get deployment,svc,pods -n infrawatch -l app.kubernetes.io/name=demo-api
kubectl rollout status deployment/demo-api -n infrawatch
```

Explain:

- FastAPI generated the manifest.
- kubectl applied it.
- rollout verification ran.
- dashboard shows ready pods.

## Part 5 - Observability, 2 minutes

Port-forward:

```bash
kubectl port-forward -n infrawatch svc/infrawatch-kube-prometheus-prometheus 9090:9090
kubectl port-forward -n infrawatch svc/infrawatch-grafana 3001:80
```

Prometheus queries:

```promql
up
container_cpu_usage_seconds_total{namespace="infrawatch"}
http_requests_total
kube_deployment_status_replicas_available{namespace="infrawatch"}
```

Grafana dashboards:

- InfraWatch Cluster Overview
- InfraWatch Service Health
- InfraWatch HPA Overview

## Part 6 - Autoscaling, 2 minutes

Watch:

```bash
kubectl get hpa infrawatch-backend -n infrawatch -w
```

Generate traffic:

```bash
kubectl run load-generator --rm -i --tty \
  --image=busybox:1.36 \
  --namespace infrawatch \
  -- /bin/sh -c "while true; do wget -q -O- http://infrawatch-backend:8000/healthz >/dev/null; done"
```

If CPU does not exceed target during the short interview, explain that HPA needs sustained CPU pressure and metrics-server samples. Show:

```bash
kubectl describe hpa infrawatch-backend -n infrawatch
kubectl top pods -n infrawatch
```

## Part 7 - Failure and recovery, 2 minutes

Crash loop:

```bash
kubectl apply -f k8s/failure-demos/crashloop.yaml
kubectl get pods -n infrawatch -w
kubectl describe pod -l app.kubernetes.io/name=crashloop-demo -n infrawatch
kubectl logs -l app.kubernetes.io/name=crashloop-demo -n infrawatch --previous
```

Alert:

```bash
python scripts/alert_receiver.py
```

Then check Prometheus alerts and Alertmanager.

Recover:

```bash
kubectl delete -f k8s/failure-demos/crashloop.yaml
```

## Part 8 - CI/CD, 2 minutes

Show `.github/workflows/ci-cd.yml`.

Explain:

- PR/push validates backend and frontend.
- Push to `main` builds Docker images.
- Images are tagged with `${GITHUB_SHA}`.
- DockerHub secrets are required.
- Kubernetes deploy requires `KUBE_CONFIG_B64` for a reachable cluster.
- A local laptop Minikube is not automatically reachable from GitHub-hosted runners.

