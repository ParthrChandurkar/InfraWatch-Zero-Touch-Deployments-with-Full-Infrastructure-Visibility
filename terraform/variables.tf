# Input variables for InfraWatch Terraform deployments.
variable "namespace" {
  description = "Kubernetes namespace for InfraWatch."
  type        = string
  default     = "infrawatch"
}

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file used for Minikube or a target cluster."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubeconfig context; Minikube users can keep the default."
  type        = string
  default     = "minikube"
}

variable "grafana_admin_password" {
  description = "Grafana admin password supplied outside source control."
  type        = string
  sensitive   = true
}

variable "kube_prometheus_stack_version" {
  description = "Helm chart version for kube-prometheus-stack."
  type        = string
  default     = "66.3.1"
}

variable "loki_chart_version" {
  description = "Helm chart version for Loki."
  type        = string
  default     = "6.24.0"
}

variable "promtail_chart_version" {
  description = "Helm chart version for Promtail."
  type        = string
  default     = "6.16.6"
}
