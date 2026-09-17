# Interview Questions Based on Final Implementation

## Project questions

- Tell me about InfraWatch. Trigger: README and architecture docs.
- What problem does it solve? Trigger: dashboard plus deployment API.
- What is Demo Mode? Trigger: Vercel configuration and frontend banner.
- What is Real Local Mode? Trigger: Kubernetes config.
- Walk me through a deployment. Trigger: `DeploymentService.deploy`.

## Kubernetes

- Deployment vs Pod? Trigger: generated manifest.
- Service vs Deployment? Trigger: generated Service and Deployment.
- Why readiness and liveness probes? Trigger: backend/frontend/user workload manifests.
- What does `kubectl rollout status` prove? Trigger: rollout verification.
- What does it not prove? Trigger: app-level behavior beyond probes.
- How do you rollback? Trigger: `kubectl rollout undo`.
- Why namespace-scoped RBAC? Trigger: backend ServiceAccount/Role.

## HPA

- How does the HPA work? Trigger: `k8s/hpa/backend-hpa.yaml`.
- Why are CPU requests required? Trigger: HPA utilization target.
- Why might HPA show `<unknown>`? Trigger: metrics-server dependency.
- How do you prove HPA scaled? Trigger: `kubectl get hpa -w`.

## CI/CD

- What happens after git push? Trigger: `.github/workflows/ci-cd.yml`.
- Why use `${GITHUB_SHA}` tags? Trigger: immutable image rollout.
- Why also push `latest`? Trigger: convenience only.
- What happens if DockerHub secrets are missing? Trigger: publish job fails.
- What happens if kubeconfig is missing? Trigger: deploy job fails clearly.
- Why can hosted GitHub runners not automatically deploy to laptop Minikube? Trigger: network reachability.

## Observability

- How does Prometheus collect metrics? Trigger: scrape configs.
- What is a scrape target? Trigger: Prometheus targets UI.
- What does kube-state-metrics provide? Trigger: HPA/crash-loop alerts.
- What does cAdvisor provide? Trigger: CPU/memory queries.
- How does Loki differ from Prometheus? Trigger: logs vs metrics.
- How does Promtail label logs? Trigger: `logging/promtail/values.yaml`.

## Troubleshooting

- Pod is CrashLoopBackOff. Trigger: `k8s/failure-demos/crashloop.yaml`.
- Pod is ImagePullBackOff. Trigger: image pull demo.
- Service has no endpoints. Trigger: readiness failure demo.
- HPA not scaling. Trigger: metrics-server/HPA docs.
- Prometheus has no data. Trigger: targets/scrape config.
- Loki has no logs. Trigger: labels and Promtail.
- Deployment is stuck. Trigger: rollout verification.

## Challenge questions

- Is this really production-grade? Trigger: CV claim audit.
- How did you measure 60%? Trigger: unsupported claim.
- What exactly did you build? Trigger: repo implementation.
- Why Minikube? Trigger: local demonstrability.
- Why Prometheus instead of CloudWatch? Trigger: local/Kubernetes-native design.
- Why Terraform and Helm? Trigger: Helm releases managed declaratively.
- Why PostgreSQL? Trigger: durable deployment/audit state.
- What happens if backend dies? Trigger: Deployment replicas and Postgres state.
- What happens if Prometheus dies? Trigger: metrics API errors in real mode.

