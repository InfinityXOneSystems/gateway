#!/bin/bash
# Deploy Infinity X One Gateway to Kubernetes

set -e

NAMESPACE="infinity-gateway"
KUBECTL="kubectl"

echo "Deploying Infinity X One Gateway to Kubernetes"
echo "Namespace: ${NAMESPACE}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "❌ kubectl not found. Please install kubectl first."
  exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
${KUBECTL} apply -f k8s/namespace.yaml

# Create service account and RBAC
echo "🔐 Setting up service account and RBAC..."
${KUBECTL} apply -f k8s/serviceaccount.yaml

# Create secrets
echo "🔑 Creating secrets..."
${KUBECTL} apply -f k8s/secret.yaml

# Create config map
echo "⚙️  Creating config map..."
${KUBECTL} apply -f k8s/configmap.yaml

# Deploy application
echo "🚀 Deploying gateway..."
${KUBECTL} apply -f k8s/deployment.yaml

# Create service
echo "🌐 Creating service..."
${KUBECTL} apply -f k8s/service.yaml

# Create HPA
echo "📊 Setting up autoscaling..."
${KUBECTL} apply -f k8s/hpa.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check deployment status:"
echo "  ${KUBECTL} get pods -n ${NAMESPACE}"
echo "  ${KUBECTL} get svc -n ${NAMESPACE}"
echo ""
echo "View logs:"
echo "  ${KUBECTL} logs -f deployment/infinity-gateway -n ${NAMESPACE}"
echo ""
echo "Get service URL:"
echo "  ${KUBECTL} get svc infinity-gateway -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
