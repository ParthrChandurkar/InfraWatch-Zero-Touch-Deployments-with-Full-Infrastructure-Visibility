# CV Claim Audit

## Claim: production-grade cloud-native platform

Current implementation:

- Kubernetes manifests with Deployments, Services, StatefulSet, HPA, ConfigMaps, Secrets, RBAC, probes, resources, and non-root containers.
- Real local Kubernetes mode verifies rollouts before marking deployments running.
- PostgreSQL persistence is used when `DATABASE_URL` is configured.
- Observability stack is provisioned through Terraform/Helm.

Verified?

- Code and manifests exist.
- Full Minikube/Terraform apply must still be run in the target environment.

Honest wording:

> Production-inspired cloud-native SRE platform prototype with real local Kubernetes mode.

Do not say:

> Enterprise production-ready multi-user platform.

Reason:

- No authentication.
- No TLS/Ingress.
- No NetworkPolicy.
- No multi-tenant authorization.

## Claim: zero-touch deployment

Current implementation:

- GitHub Actions validates, builds, publishes DockerHub images with `${GITHUB_SHA}`, and deploys to Kubernetes when a reachable kubeconfig is configured.
- Backend `/deploy` can deploy user-submitted services to Kubernetes and verifies rollout.

Verified?

- Workflow is implemented.
- Real deployment requires DockerHub secrets and `KUBE_CONFIG_B64`.

Honest wording:

> The pipeline supports zero-touch deployment when registry and reachable Kubernetes credentials are configured.

Do not say:

> GitHub Actions deploys to my local Minikube without additional network setup.

## Claim: 60% cycle-time reduction

Current implementation:

- No historical measurement evidence exists in the repo.

Verified?

- No.

Honest wording:

> The repo now includes a path to measure manual vs automated deployment time, but the 60% number is not proven unless I run and document trials.

Do not say:

> I measured exactly 60%.

Evidence needed:

- Manual deployment baseline time.
- CI build/publish/deploy duration.
- Multiple trials.
- Calculation.

## Claim: full infrastructure visibility

Current implementation:

- Prometheus, Grafana, Loki, Promtail, Alertmanager configuration exists.
- Dashboard uses Prometheus and Loki in real mode.
- Grafana dashboards cover cluster, service health, and HPA.

Verified?

- Config is implemented.
- Full runtime verification requires Minikube + Terraform/Helm apply.

Honest wording:

> InfraWatch provides real local visibility for metrics/logs/alerts when the observability stack is running.

## Claim: live log streaming

Current implementation:

- React polls `/logs/{service}` every 5 seconds.
- FastAPI queries Loki.

Verified?

- Near-real-time polling is implemented.
- It is not WebSocket streaming.

Honest wording:

> Near-real-time log streaming via polling from Loki.

Do not say:

> WebSocket live log stream.

## Claim: pod crash-loop alerts

Current implementation:

- `PodCrashLooping` alert rule uses:

```promql
max_over_time(kube_pod_container_status_waiting_reason{namespace="infrawatch",reason="CrashLoopBackOff"}[5m]) >= 1
```

- Failure manifest exists: `k8s/failure-demos/crashloop.yaml`.

Verified?

- Config exists.
- Runtime proof requires running Prometheus/Alertmanager in Minikube.

