# Measurement Plan

The old CV claim says deployment cycle time was reduced by around 60%. The repository does not contain historical evidence for that number. Do not claim it as proven until measurements are collected.

## What to measure

Measure two paths:

1. Manual baseline:
   - Build image manually.
   - Push to registry manually.
   - Update Kubernetes manifests manually.
   - Apply manifests manually.
   - Wait for rollout manually.

2. Automated path:
   - GitHub Actions validation duration.
   - DockerHub publish duration.
   - Kubernetes rollout duration.
   - FastAPI `/deploy` duration for dashboard-triggered service deployments.

## Manual baseline template

Record the time for each step:

| Trial | Build | Push | Manifest edit | Apply | Rollout wait | Total |
|---|---:|---:|---:|---:|---:|---:|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

## Automated template

| Trial | Trigger | CI validate | Publish | Deploy/Rollout | Total |
|---|---|---:|---:|---:|---:|
| 1 | git push | | | | |
| 2 | git push | | | | |
| 3 | git push | | | | |

## Calculate reduction

```text
reduction_percent = ((manual_average - automated_average) / manual_average) * 100
```

If the result is not near 60%, say the real number.

## Measure deployment API duration

In real Kubernetes mode:

```bash
python scripts/measure_deployment_time.py \
  --api-base http://localhost:8000 \
  --name measurement-api \
  --image docker.io/parthrchandurkar/infrawatch-backend:latest \
  --replicas 1 \
  --port 8000
```

This measures the `/deploy` request, including kubectl apply, rollout status, and ready/available replica verification.

Clean up:

```bash
kubectl delete deployment/measurement-api service/measurement-api -n infrawatch --ignore-not-found=true
```

## Measure API latency

```bash
python scripts/measure_api_latency.py --url http://localhost:8000/healthz --requests 100
```

For Kubernetes:

```bash
kubectl port-forward -n infrawatch svc/infrawatch-backend 8000:8000
python scripts/measure_api_latency.py --url http://localhost:8000/healthz --requests 100
```

## What not to do

- Do not cherry-pick only the fastest run.
- Do not compare a cold manual path against a warm automated path without saying so.
- Do not include Vercel Demo Mode as proof of Kubernetes deployment speed.
- Do not claim production performance from Minikube numbers.

