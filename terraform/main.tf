# Terraform entry point for provisioning InfraWatch on a kubeconfig-backed cluster.
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.34"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.16"
    }
  }
}

# Minikube and managed clusters are both addressed through kubeconfig.
provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}

# Helm uses the same kubeconfig context as the Kubernetes provider.
provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path
    config_context = var.kube_context
  }
}

# Namespace is provisioned by Terraform so Helm releases share one boundary.
resource "kubernetes_namespace" "infrawatch" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/name" = "infrawatch"
    }
  }
}

# kube-prometheus-stack installs Prometheus, Grafana, Alertmanager, and exporters.
resource "helm_release" "monitoring" {
  name       = "infrawatch"
  namespace  = kubernetes_namespace.infrawatch.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = var.kube_prometheus_stack_version

  values = [
    file("${path.module}/../monitoring/prometheus/kube-prometheus-stack-values.yaml")
  ]

  set_sensitive {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }
}

# Loki stores and queries centralized logs for InfraWatch workloads.
resource "helm_release" "loki" {
  name       = "infrawatch-loki"
  namespace  = kubernetes_namespace.infrawatch.metadata[0].name
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki"
  version    = var.loki_chart_version

  values = [
    file("${path.module}/../logging/loki/values.yaml")
  ]
}

# Promtail ships pod logs into Loki.
resource "helm_release" "promtail" {
  name       = "infrawatch-promtail"
  namespace  = kubernetes_namespace.infrawatch.metadata[0].name
  repository = "https://grafana.github.io/helm-charts"
  chart      = "promtail"
  version    = var.promtail_chart_version

  values = [
    file("${path.module}/../logging/promtail/values.yaml")
  ]

  depends_on = [helm_release.loki]
}
