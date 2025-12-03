#!/bin/bash
# Delete Infinity X One Gateway from Kubernetes

set -e

NAMESPACE="infinity-gateway"
KUBECTL="kubectl"

echo "Deleting Infinity X One Gateway from Kubernetes"
echo "Namespace: ${NAMESPACE}"
echo ""

read -p "Are you sure you want to delete the gateway? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Deletion cancelled."
  exit 0
fi

# Delete HPA
echo "📊 Deleting autoscaling..."
${KUBECTL} delete -f k8s/hpa.yaml --ignore-not-found=true

# Delete service
echo "🌐 Deleting service..."
${KUBECTL} delete -f k8s/service.yaml --ignore-not-found=true

# Delete deployment
echo "🚀 Deleting deployment..."
${KUBECTL} delete -f k8s/deployment.yaml --ignore-not-found=true

# Delete config map
echo "⚙️  Deleting config map..."
${KUBECTL} delete -f k8s/configmap.yaml --ignore-not-found=true

# Delete secrets
echo "🔑 Deleting secrets..."
${KUBECTL} delete -f k8s/secret.yaml --ignore-not-found=true

# Delete service account and RBAC
echo "🔐 Deleting service account and RBAC..."
${KUBECTL} delete -f k8s/serviceaccount.yaml --ignore-not-found=true

# Delete namespace
echo "📦 Deleting namespace..."
${KUBECTL} delete -f k8s/namespace.yaml --ignore-not-found=true

echo ""
echo "✅ Gateway deleted successfully!"
