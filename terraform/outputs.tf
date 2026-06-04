# Useful endpoints and commands after Terraform provisioning.
output "namespace" {
  description = "Namespace where InfraWatch monitoring resources were created."
  value       = kubernetes_namespace.infrawatch.metadata[0].name
}

output "grafana_port_forward" {
  description = "Command to open Grafana locally."
  value       = "kubectl port-forward --namespace ${var.namespace} svc/infrawatch-grafana 3000:80"
}

output "prometheus_port_forward" {
  description = "Command to open Prometheus locally."
  value       = "kubectl port-forward --namespace ${var.namespace} svc/infrawatch-kube-prometheus-prometheus 9090:9090"
}
